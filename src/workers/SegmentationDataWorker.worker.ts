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

import * as path from 'path'
import * as fs from 'fs'

function getPixelColor(segmentId: number, colors: RGBColorCollection): { r: number; g: number; b: number } {
    if (!(segmentId in colors)) {
        let color = randomRGBColor()

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
    let canvasasIndex = pixel << 2
    if (segmentId === 0) {
        canvasData[canvasasIndex] = 0
        canvasData[canvasasIndex + 1] = 0
        canvasData[canvasasIndex + 2] = 0
        canvasData[canvasasIndex + 3] = 0
    } else {
        let color = getPixelColor(segmentId, colors)
        canvasData[canvasasIndex] = color['r']
        canvasData[canvasasIndex + 1] = color['g']
        canvasData[canvasasIndex + 2] = color['b']
        canvasData[canvasasIndex + 3] = 255
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
    v: Float32Array | Uint16Array | Uint8Array,
    width: number,
    height: number,
): Promise<ImageBitmap> {
    // @ts-ignore
    let offScreen = new OffscreenCanvas(width, height)

    // Hash to store the segmentID to randomly generated color mapping
    let colors = {}

    let ctx = offScreen.getContext('2d')
    if (ctx) {
        //@ts-ignore
        let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
        let canvasData = imageData.data

        // Here we're iterating through the segmentation data and setting all canvas pixels that have no cell as transparent
        // or setting all of the pixels belonging to a cell to the same random color with 50% alpha (transparency)
        for (let i = 0; i < v.length; ++i) {
            drawPixel(v[i], colors, i, canvasData)
        }
        //@ts-ignore
        ctx.putImageData(imageData, 0, 0)
    }

    let bitmap = await createImageBitmap(offScreen)

    return bitmap
}

function generateOutlineMap(segmentLocationMap: Record<number, PixelLocation[]>): Record<number, PixelLocation[]> {
    let outlineMap: Record<number, PixelLocation[]> = {}
    for (let segment in segmentLocationMap) {
        let segmentId = Number(segment)
        let segmentLocations = segmentLocationMap[segmentId].map((value: PixelLocation) => {
            return [value.x, value.y]
        })
        let concavePolygon = concaveman(segmentLocations)
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
function generateMapsFromTiff(
    v: Float32Array | Uint16Array | Uint8Array,
    width: number,
): {
    pixelMap: Record<string, number[]>
    segmentLocationMap: Record<number, PixelLocation[]>
    segmentIndexMap: Record<number, number[]>
} {
    let pixelMap: { [key: string]: number[] } = {}
    let segmentLocationMap: { [key: number]: PixelLocation[] } = {}
    let segmentIndexMap: { [key: number]: number[] } = {}

    for (let i = 0; i < v.length; ++i) {
        let segmentId = v[i]
        if (segmentId != 0) {
            // The incoming tiffdata (v) is an array with one entry per pixel.
            // To convert from this array index to x, y coordinates we need to
            // divide the current index by the image width to get the y coordinate
            // and then take the remainder of the divison to get the x coordinate
            let x = i % width
            let y = Math.floor(i / width)

            pixelMap[generatePixelMapKey(x, y)] = [segmentId]

            let pixelLocation = { x: x, y: y }

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
    let centroidMap: { [key: number]: PixelLocation } = {}

    for (let segmentId in segmentMap) {
        let xSum = 0
        let ySum = 0
        let numPixels = 0
        let pixelLocations = segmentMap[segmentId]
        pixelLocations.forEach(pixelLocation => {
            xSum += pixelLocation.x
            ySum += pixelLocation.y
            numPixels += 1
        })
        let centroidLocation = { x: Math.round(xSum / numPixels), y: Math.round(ySum / numPixels) }
        centroidMap[segmentId] = centroidLocation
    }

    return centroidMap
}

async function loadTiffData(
    filepath: string,
    data: Float32Array | Uint16Array | Uint8Array,
    width: number,
    height: number,
): Promise<SegmentationDataWorkerResult | SegmentationDataWorkerError> {
    try {
        // Generating the pixelMap and segmentMaps that represent the segementation data
        let maps = generateMapsFromTiff(data, width)
        let pixelMap = maps.pixelMap
        let segmentLocationMap = maps.segmentLocationMap
        let segmentIndexMap = maps.segmentIndexMap

        let segmentOutlineMap = generateOutlineMap(maps.segmentLocationMap)
        let centroidMap = calculateCentroids(maps.segmentLocationMap)
        // Generate an ImageBitmap from the tiffData
        // ImageBitmaps are rendered canvases can be passed between processes
        let bitmap = await generateFillBitmap(data, width, height)

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

function chunkArray(arr: string[], chunkSize: number): string[][] {
    let chunks = []
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
    pixelData: Uint16Array
} {
    let pixelMap: { [key: string]: number[] } = {}
    let segmentLocationMap: { [key: number]: PixelLocation[] } = {}
    let segmentIndexMap: { [key: number]: number[] } = {}

    // Converts the segmentation data into an array format like we would get from reading a tiff segmentation file.
    // We do this to make generating the fillBitmap much faster than getting the pixel segment membership from the pixelMap.
    let pixelData = new Uint16Array(width * height).fill(0)

    // The incoming data is an file with one row per segment.
    // We use row index as segmentId.
    // Each row contains a list of comma separated values that make up the
    // x and y coordinates for the pixel.
    // e.g. x1, y1, x2, y2, ...
    let segmentationData = fs.readFileSync(filepath).toString()
    let lines = segmentationData.split(/\r\n|\n/)

    for (let segmentId = 0; segmentId < lines.length; ++segmentId) {
        // Split the line for the current segment into an array of the format
        // [[x1, y1], [x2, y2], ...]
        let segmentCoordinates = chunkArray(lines[segmentId].split(','), 2)
        segmentCoordinates.forEach(function(coordinate: string[]) {
            let x = parseInt(coordinate[0])
            let y = parseInt(coordinate[1])

            if (x > width || y > height) {
                throw new Error('Segment coordinates out of image bounds. Are your X and Y coordinates switched?')
            }

            // Get the pixel index for this x,y coordinate
            let i = y * width + x

            pixelData[i] = segmentId
            pixelMap[generatePixelMapKey(x, y)] = [segmentId]
            let pixelLocation = { x: x, y: y }

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
): Promise<SegmentationDataWorkerResult | SegmentationDataWorkerError> {
    try {
        // Generating the pixelMap and segmentMaps that represent the segementation data
        let maps = generateMapsFromText(filepath, width, height)
        let pixelMap = maps.pixelMap
        let segmentLocationMap = maps.segmentLocationMap
        let segmentIndexMap = maps.segmentIndexMap

        let segmentOutlineMap = generateOutlineMap(maps.segmentLocationMap)
        let centroidMap = calculateCentroids(maps.segmentLocationMap)

        // Generate an ImageBitmap from the tiffData
        // ImageBitmaps are rendered canvases can be passed between processes
        let bitmap = await generateFillBitmap(maps.pixelData, width, height)
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
): Promise<SegmentationDataWorkerResult | SegmentationDataWorkerError> {
    try {
        //Decode tiff data
        let extension = path.extname(filepath).toLowerCase()
        if (['.csv', '.txt'].includes(extension)) {
            return await loadTextData(filepath, imageWidth, imageHeight)
        } else if (['.tif', '.tiff'].includes(extension)) {
            let tiffData = await readTiffData(filepath, 0)
            if (tiffData.width != imageWidth || tiffData.height != imageHeight) {
                return {
                    filepath: filepath,
                    error: 'Segmentation file dimensions do not match image dimensions.',
                }
            }
            return await loadTiffData(filepath, tiffData.data, tiffData.width, tiffData.height)
        } else {
            return {
                filepath: filepath,
                error: 'Segmentation filetype not supported. Must be a tif, tiff, csv, or txt.',
            }
        }
    } catch (err) {
        return { filepath: filepath, error: err.message }
    }
}

ctx.addEventListener(
    'message',
    message => {
        let data: SegmentationDataWorkerInput = message.data
        // Callback if an error is raised when loading data.
        loadFile(data.filepath, data.width, data.height).then(message => {
            ctx.postMessage(message)
        })
    },
    false,
)
