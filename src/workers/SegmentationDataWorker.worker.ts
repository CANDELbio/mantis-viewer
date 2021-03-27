/* eslint @typescript-eslint/no-explicit-any: 0 */

//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

import * as concaveman from 'concaveman'

import { RGBColorCollection } from '../interfaces/ImageInterfaces'
import {
    SegmentationDataWorkerInput,
    SegmentationDataWorkerResult,
    SegmentationDataWorkerError,
} from './SegmentationDataWorker'
import { PixelLocation } from '../interfaces/ImageInterfaces'
import { readTiffData } from '../lib/TiffHelper'
import { randomRGBColor } from '../lib/ColorHelper'
import { OptimizedSegmentationSubfolder } from '../definitions/FileDefinitions'

import * as path from 'path'
import * as fs from 'fs'

function optimizedSegmentationDirectoryPath(segmentationPath: string): string {
    const segmentationDirectory = path.dirname(segmentationPath)
    return path.join(segmentationDirectory, OptimizedSegmentationSubfolder)
}

function optimizedSegmentationPath(segmentationPath: string): string {
    const optimizedSegmentationFilename = path.basename(segmentationPath) + '.optimized.json'
    return path.join(optimizedSegmentationDirectoryPath(segmentationPath), optimizedSegmentationFilename)
}

function ensureOptimizedSegmentationDirectoryExists(segmentationPath: string): void {
    const optimizedSegmentationDirectory = optimizedSegmentationDirectoryPath(segmentationPath)
    if (!fs.existsSync(optimizedSegmentationDirectory)) fs.mkdirSync(optimizedSegmentationDirectory)
}

function saveOptimizedSegmentation(
    filepath: string,
    width: number,
    height: number,
    pixelData: number[],
    pixelMap: Record<string, number[]>,
    segmentLocationMap: Record<number, PixelLocation[]>,
    segmentIndexMap: Record<number, number[]>,
    segmentOutlineMap: Record<number, PixelLocation[]>,
    centroidMap: Record<number, PixelLocation>,
): void {
    ensureOptimizedSegmentationDirectoryExists(filepath)
    const optimizedPath = optimizedSegmentationPath(filepath)
    const data = {
        width: width,
        height: height,
        pixelMap: pixelMap,
        pixelData: pixelData,
        segmentLocationMap: segmentLocationMap,
        segmentIndexMap: segmentIndexMap,
        segmentOutlineMap: segmentOutlineMap,
        centroidMap: centroidMap,
    }
    const dataJSON = JSON.stringify(data)
    fs.writeFileSync(optimizedPath, dataJSON, { encoding: 'utf8' })
}

function getPixelColor(segmentId: number, colors: RGBColorCollection): { r: number; g: number; b: number } {
    if (!(segmentId in colors)) {
        const color = randomRGBColor()

        // Store that color in the colors hash and then return in.
        colors[segmentId] = color
        return color
    }

    //Return the stored color for that segment if it has already been generated.
    return colors[segmentId]
}

function drawPixel(segmentId: number, colors: {}, pixel: number, canvasData: Uint8ClampedArray): void {
    // Tiff data is an array with one index per pixel whereas canvasas have four indexes per pixel (r, g, b, a)
    // Get the index on the canvas by multiplying by 4 (i.e. bitshifting by 2)
    const canvasIndex = pixel << 2
    if (segmentId === 0) {
        canvasData[canvasIndex] = 0
        canvasData[canvasIndex + 1] = 0
        canvasData[canvasIndex + 2] = 0
        canvasData[canvasIndex + 3] = 0
    } else {
        const color = getPixelColor(segmentId, colors)
        canvasData[canvasIndex] = color['r']
        canvasData[canvasIndex + 1] = color['g']
        canvasData[canvasIndex + 2] = color['b']
        canvasData[canvasIndex + 3] = 255
    }
}

function generatePixelMapKey(x: number, y: number): string {
    return x.toString() + '_' + y.toString()
}

// Generates a texture (to be used to create a PIXI sprite) from segmentation data.
// Segmentation data is stored as a tiff where the a pixel has a value of 0 if it does not belong to a cell
// or is a number corresponding to what we're calling the segmentId (i.e. all pixels that belong to cell/segment 1 have a value of 1)
// Generates a texture (to be used to create a PIXI sprite) from segmentation data.
// Segmentation data is stored as a tiff where the a pixel has a value of 0 if it does not belong to a cell
// or is a number corresponding to what we're calling the segmentId (i.e. all pixels that belong to cell/segment 1 have a value of 1)
async function generateFillBitmap(
    v: Float32Array | Uint16Array | Uint8Array | number[],
    width: number,
    height: number,
): Promise<ImageBitmap> {
    const offScreen = new OffscreenCanvas(width, height)

    // Hash to store the segmentID to randomly generated color mapping
    const colors = {}

    const ctx = offScreen.getContext('2d')
    if (ctx) {
        const imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
        const canvasData = imageData.data

        // Here we're iterating through the segmentation data and setting all canvas pixels that have no cell as transparent
        // or setting all of the pixels belonging to a cell to the same random color with 50% alpha (transparency)
        for (let i = 0; i < v.length; ++i) {
            drawPixel(v[i], colors, i, canvasData)
        }
        ctx.putImageData(imageData, 0, 0)
    }

    const bitmap = await createImageBitmap(offScreen)

    return bitmap
}

function generateOutlineMap(segmentLocationMap: Record<number, PixelLocation[]>): Record<number, PixelLocation[]> {
    const outlineMap: Record<number, PixelLocation[]> = {}
    for (const segment in segmentLocationMap) {
        const segmentId = Number(segment)
        const segmentLocations = segmentLocationMap[segmentId].map((value: PixelLocation) => {
            return [value.x, value.y]
        })
        const concavePolygon = concaveman(segmentLocations)
        outlineMap[segmentId] = concavePolygon.map((value: number[]) => {
            return { x: value[0], y: value[1] }
        })
    }
    return outlineMap
}

// Generates the following summary maps:
// pixelMap - Mapping of a stringified pixel location (i.e. x_y) to a segmentId
// segmentLocationMap - Mapping of a segmentId to pixel locations (x, y)
// segmentIndexMap - Mapping of a segmentId to pixel indices.
function generateMapsFromPixelArray(
    v: Float32Array | Uint16Array | Uint8Array | number[],
    width: number,
): {
    pixelMap: Record<string, number[]>
    segmentLocationMap: Record<number, PixelLocation[]>
    segmentIndexMap: Record<number, number[]>
} {
    const pixelMap: { [key: string]: number[] } = {}
    const segmentLocationMap: { [key: number]: PixelLocation[] } = {}
    const segmentIndexMap: { [key: number]: number[] } = {}

    for (let i = 0; i < v.length; ++i) {
        const segmentId = v[i]
        if (segmentId != 0) {
            // The incoming tiffdata (v) is an array with one entry per pixel.
            // To convert from this array index to x, y coordinates we need to
            // divide the current index by the image width to get the y coordinate
            // and then take the remainder of the divison to get the x coordinate
            const x = i % width
            const y = Math.floor(i / width)

            pixelMap[generatePixelMapKey(x, y)] = [segmentId]

            const pixelLocation = { x: x, y: y }

            // Adding pixel xy to segmentLocationMap
            if (!(segmentId in segmentLocationMap)) segmentLocationMap[segmentId] = []
            segmentLocationMap[segmentId].push(pixelLocation)

            // Adding pixel index to the segmentIndexMap
            if (!(segmentId in segmentIndexMap)) segmentIndexMap[segmentId] = []
            segmentIndexMap[segmentId].push(i)
        }
    }
    return {
        pixelMap: pixelMap,
        segmentLocationMap: segmentLocationMap,
        segmentIndexMap: segmentIndexMap,
    }
}

// Calculates the centroid of a segment by taking the average of the coordinates of all of the pixels in that segment
function calculateCentroids(segmentMap: { [key: number]: PixelLocation[] }): Record<number, PixelLocation> {
    const centroidMap: { [key: number]: PixelLocation } = {}

    for (const segmentId in segmentMap) {
        let xSum = 0
        let ySum = 0
        let numPixels = 0
        const pixelLocations = segmentMap[segmentId]
        pixelLocations.forEach((pixelLocation) => {
            xSum += pixelLocation.x
            ySum += pixelLocation.y
            numPixels += 1
        })
        const centroidLocation = { x: Math.round(xSum / numPixels), y: Math.round(ySum / numPixels) }
        centroidMap[segmentId] = centroidLocation
    }

    return centroidMap
}

async function loadTiffData(
    filepath: string,
    data: Float32Array | Uint16Array | Uint8Array,
    width: number,
    height: number,
    optimize: boolean,
): Promise<SegmentationDataWorkerResult | SegmentationDataWorkerError> {
    try {
        // Generating the pixelMap and segmentMaps that represent the segementation data
        const maps = generateMapsFromPixelArray(data, width)
        const pixelMap = maps.pixelMap
        const segmentLocationMap = maps.segmentLocationMap
        const segmentIndexMap = maps.segmentIndexMap

        const segmentOutlineMap = generateOutlineMap(maps.segmentLocationMap)
        const centroidMap = calculateCentroids(maps.segmentLocationMap)
        // Generate an ImageBitmap from the tiffData
        // ImageBitmaps are rendered canvases can be passed between processes
        const bitmap = await generateFillBitmap(data, width, height)

        if (optimize) {
            saveOptimizedSegmentation(
                filepath,
                width,
                height,
                Array.from(data),
                pixelMap,
                segmentLocationMap,
                segmentIndexMap,
                segmentOutlineMap,
                centroidMap,
            )
        }

        return {
            filepath: filepath,
            width: width,
            height: height,
            pixelMap: pixelMap,
            segmentIndexMap: segmentIndexMap,
            segmentLocationMap: segmentLocationMap,
            segmentOutlineMap: segmentOutlineMap,
            centroidMap: centroidMap,
            fillBitmap: bitmap,
        }
    } catch (err) {
        return { filepath: filepath, error: err.message }
    }
}

// Splits the passed in array into multiple sub-arrays of chunkSize.
// e.g. chunkSize 2 for [1, 2, 3, 4] would yield [[1, 2], [3, 4]]
function chunkArray(arr: string[], chunkSize: number): string[][] {
    const chunks = []
    for (let i = 0; i < arr.length; i += chunkSize) {
        chunks.push(arr.slice(i, i + chunkSize))
    }
    return chunks
}

// Generates the following summary maps:
// pixelMap - Mapping of a stringified pixel location (i.e. x_y) to a segmentId
// segmentLocationMap - Mapping of a segmentId to pixel locations (x, y)
// segmentIndexMap - Mapping of a segmentId to pixel indices.
function generateMapsFromText(
    filepath: string,
    width: number,
    height: number,
): {
    pixelMap: Record<string, number[]>
    segmentLocationMap: Record<number, PixelLocation[]>
    segmentIndexMap: Record<number, number[]>
    pixelData: number[]
} {
    const pixelMap: { [key: string]: number[] } = {}
    const segmentLocationMap: { [key: number]: PixelLocation[] } = {}
    const segmentIndexMap: { [key: number]: number[] } = {}

    // Converts the segmentation data into an array format like we would get from reading a tiff segmentation file.
    // We do this to make generating the fillBitmap much faster than getting the pixel segment membership from the pixelMap.
    const pixelData = new Array(width * height).fill(0)

    // The incoming data is an file with one row per segment.
    // We use row index + 1 as segmentId.
    // Each row contains a list of comma separated values that make up the
    // x and y coordinates for the pixel.
    // e.g. x1, y1, x2, y2, ...
    const segmentationData = fs.readFileSync(filepath).toString()
    const lines = segmentationData
        .split(/\r\n|\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

    for (let curLine = 0; curLine < lines.length; ++curLine) {
        const segmentId = curLine + 1
        // Split the line for the current segment into an array of the format
        // [[x1, y1], [x2, y2], ...]
        const segmentCoordinates = chunkArray(lines[curLine].split(','), 2)
        segmentCoordinates.forEach(function (coordinate: string[]) {
            const x = parseInt(coordinate[0])
            const y = parseInt(coordinate[1])

            if (x > width || y > height) {
                throw new Error('Segment coordinates out of image bounds. Are your X and Y coordinates switched?')
            }

            // Get the pixel index for this x,y coordinate
            const i = y * width + x

            pixelData[i] = segmentId
            pixelMap[generatePixelMapKey(x, y)] = [segmentId]
            const pixelLocation = { x: x, y: y }

            // Adding pixel xy to segmentLocationMap
            if (!(segmentId in segmentLocationMap)) segmentLocationMap[segmentId] = []
            segmentLocationMap[segmentId].push(pixelLocation)

            // Adding pixel index to the segmentIndexMap
            if (!(segmentId in segmentIndexMap)) segmentIndexMap[segmentId] = []
            segmentIndexMap[segmentId].push(i)
        })
    }

    return {
        pixelMap: pixelMap,
        segmentLocationMap: segmentLocationMap,
        segmentIndexMap: segmentIndexMap,
        pixelData: pixelData,
    }
}

async function loadTextData(
    filepath: string,
    width: number,
    height: number,
    optimize: boolean,
): Promise<SegmentationDataWorkerResult | SegmentationDataWorkerError> {
    try {
        // Generating the pixelMap and segmentMaps that represent the segementation data
        const maps = generateMapsFromText(filepath, width, height)
        const pixelData = maps.pixelData
        const pixelMap = maps.pixelMap
        const segmentLocationMap = maps.segmentLocationMap
        const segmentIndexMap = maps.segmentIndexMap

        const segmentOutlineMap = generateOutlineMap(segmentLocationMap)
        const centroidMap = calculateCentroids(segmentLocationMap)

        // Generate an ImageBitmap from the tiffData
        // ImageBitmaps are rendered canvases can be passed between processes
        const bitmap = await generateFillBitmap(pixelData, width, height)

        if (optimize) {
            saveOptimizedSegmentation(
                filepath,
                width,
                height,
                pixelData,
                pixelMap,
                segmentLocationMap,
                segmentIndexMap,
                segmentOutlineMap,
                centroidMap,
            )
        }

        return {
            filepath: filepath,
            width: width,
            height: height,
            pixelMap: pixelMap,
            segmentIndexMap: segmentIndexMap,
            segmentLocationMap: segmentLocationMap,
            segmentOutlineMap: segmentOutlineMap,
            centroidMap: centroidMap,
            fillBitmap: bitmap,
        }
    } catch (err) {
        return { filepath: filepath, error: err.message }
    }
}

async function loadOptimizedSegmentation(
    filepath: string,
): Promise<SegmentationDataWorkerResult | SegmentationDataWorkerError> {
    try {
        const optimizedPath = optimizedSegmentationPath(filepath)

        const jsonString = fs.readFileSync(optimizedPath, { encoding: 'utf8' })
        const data: {
            width: number
            height: number
            pixelData: number[]
            pixelMap?: Record<string, number[]>
            segmentLocationMap?: Record<number, PixelLocation[]>
            segmentIndexMap?: Record<number, number[]>
            segmentOutlineMap?: Record<number, PixelLocation[]>
            centroidMap?: Record<number, PixelLocation>
        } = JSON.parse(jsonString)

        const width = data.width
        const height = data.height
        const pixelData = data.pixelData

        let pixelMap
        let segmentLocationMap
        let segmentIndexMap

        if (data.pixelMap && data.segmentLocationMap && data.segmentIndexMap) {
            pixelMap = data.pixelMap
            segmentLocationMap = data.segmentLocationMap
            segmentIndexMap = data.segmentIndexMap
        } else {
            const maps = generateMapsFromPixelArray(pixelData, width)
            pixelMap = maps.pixelMap
            segmentLocationMap = maps.segmentLocationMap
            segmentIndexMap = maps.segmentIndexMap
        }

        const segmentOutlineMap = data.segmentOutlineMap
            ? data.segmentOutlineMap
            : generateOutlineMap(segmentLocationMap)
        const centroidMap = data.centroidMap ? data.centroidMap : calculateCentroids(segmentLocationMap)

        // Generate an ImageBitmap from the tiffData
        // ImageBitmaps are rendered canvases can be passed between processes
        const bitmap = await generateFillBitmap(pixelData, width, height)

        return {
            filepath: filepath,
            width: width,
            height: height,
            pixelMap: pixelMap,
            segmentIndexMap: segmentIndexMap,
            segmentLocationMap: segmentLocationMap,
            segmentOutlineMap: segmentOutlineMap,
            centroidMap: centroidMap,
            fillBitmap: bitmap,
        }
    } catch (err) {
        return { filepath: filepath, error: err.message }
    }
}

async function loadFile(
    filepath: string,
    imageWidth: number,
    imageHeight: number,
    optimize: boolean,
): Promise<SegmentationDataWorkerResult | SegmentationDataWorkerError> {
    try {
        if (optimize && fs.existsSync(optimizedSegmentationPath(filepath))) {
            return loadOptimizedSegmentation(filepath)
        } else {
            //Decode tiff data
            const extension = path.extname(filepath).toLowerCase()
            if (['.csv', '.txt'].includes(extension)) {
                return await loadTextData(filepath, imageWidth, imageHeight, optimize)
            } else if (['.tif', '.tiff'].includes(extension)) {
                const tiffData = await readTiffData(filepath, 0)
                if (tiffData.width != imageWidth || tiffData.height != imageHeight) {
                    return {
                        filepath: filepath,
                        error: 'Segmentation file dimensions do not match image dimensions.',
                    }
                }
                return await loadTiffData(filepath, tiffData.data, tiffData.width, tiffData.height, optimize)
            } else {
                return {
                    filepath: filepath,
                    error: 'Segmentation filetype not supported. Must be a tif, tiff, csv, or txt.',
                }
            }
        }
    } catch (err) {
        return { filepath: filepath, error: err.message }
    }
}

ctx.addEventListener(
    'message',
    (message) => {
        const data: SegmentationDataWorkerInput = message.data
        // Callback if an error is raised when loading data.
        loadFile(data.filepath, data.width, data.height, data.optimizeFile).then((message) => {
            if (message) {
                ctx.postMessage(message)
            }
        })
    },
    false,
)
