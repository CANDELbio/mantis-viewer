//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

import * as concaveman from "concaveman"

import { RGBColorCollection,
    SegmentationDataWorkerResult } from "../interfaces/ImageInterfaces"
import { PixelLocation } from "../interfaces/ImageInterfaces"
import { readTiffData } from "../lib/TiffHelper"

// TO DO: DRY this up. randomRGB is also used in GraphicsHelper, but can't import from there as importing PIXI causes errors in webworkers.
function randomRGBColor(){
    let c = Math.round(0xffffff * Math.random())
    let r = c >> 16
    let g = c >> 8 & 255
    let b = c & 255
    return {r: r, g: g, b: b}
}

function getPixelColor(segmentId:number, colors: RGBColorCollection){
    if(!(segmentId in colors)){
        let color = randomRGBColor()

        // Store that color in the colors hash and then return in.
        colors[segmentId] = color
        return color
    }

    //Return the stored color for that segment if it has already been generated.
    return colors[segmentId]
}

function drawPixel(segmentId: number, colors: {}, pixel: number, canvasData: Uint8ClampedArray){
    // Tiff data is an array with one index per pixel whereas canvasas have four indexes per pixel (r, g, b, a)
    // Get the index on the canvas by multiplying by 4 (i.e. bitshifting by 2)
    let canvasasIndex = pixel << 2
    if(segmentId === 0){
        canvasData[canvasasIndex] = 0
        canvasData[canvasasIndex + 1] = 0
        canvasData[canvasasIndex + 2] = 0
        canvasData[canvasasIndex + 3] = 0
    }
    else{
        let color = getPixelColor(segmentId, colors)
        canvasData[canvasasIndex] = color['r']
        canvasData[canvasasIndex + 1] = color['g']
        canvasData[canvasasIndex + 2] = color['b']
        canvasData[canvasasIndex + 3] = 255
    }
}

// Generates a texture (to be used to create a PIXI sprite) from segmentation data.
// Segmentation data is stored as a tiff where the a pixel has a value of 0 if it does not belong to a cell
// or is a number corresponding to what we're calling the segmentId (i.e. all pixels that belong to cell/segment 1 have a value of 1)
async function segmentationFillBitmap(v: Float32Array | Uint16Array | Uint8Array, width: number, height: number) {
    // @ts-ignore
    let offScreen = new OffscreenCanvas(width, height)

    // Hash to store the segmentID to randomly generated color mapping
    let colors = {}

    let ctx = offScreen.getContext("2d")
    if(ctx) {
        let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
        let canvasData = imageData.data

        // Here we're iterating through the segmentation data and setting all canvas pixels that have no cell as transparent
        // or setting all of the pixels belonging to a cell to the same random color with 50% alpha (transparency)
        for(let i = 0; i < v.length; ++i) {
            drawPixel(v[i], colors, i, canvasData)
        }

        ctx.putImageData(imageData, 0, 0)

    }

    let bitmap = await createImageBitmap(offScreen)

    return(bitmap)
}

function generateOutlineMap(segmentLocationMap:Record<number, PixelLocation[]>){
    let outlineMap:Record<number, PixelLocation[]> = {}
    for(let segment in segmentLocationMap){
        let segmentId = Number(segment)
        let segmentLocations = segmentLocationMap[segmentId].map((value: PixelLocation) => {return [value.x, value.y]} )
        let concavePolygon = concaveman(segmentLocations)
        outlineMap[segmentId] = concavePolygon.map((value: number[]) => { return {x: value[0], y: value[1]} })
    }
    return outlineMap
}

function segmentMapKey(x: number, y: number){
    return ( x.toString() + "_" + y.toString() )
}

// Generates the pixelMap (key of x_y to segmentId) and segmentMap (key of segmentId to an array of pixels contained in that segment)
function generateMaps(v: Float32Array | Uint16Array | Uint8Array, width: number, height: number) {
    let pixelMap:{[key:string] : number} = {}
    let segmentLocationMap:{[key:number] : PixelLocation[]} = {}
    let segmentIndexMap:{[key:number] : number[]} = {}
    
    for(let i = 0; i < v.length; ++i) {
        let segmentId = v[i]
        if(segmentId != 0){
            // The incoming tiffdata (v) is an array with one entry per pixel.
            // To convert from this array index to x, y coordinates we need to 
            // divide the current index by the image width to get the y coordinate
            // and then take the remainder of the divison to get the x coordinate
            let x =  i%width
            let y = Math.floor(i/width)

            pixelMap[segmentMapKey(x, y)] = segmentId

            let pixelLocation = {x: x, y: y}

            // Adding pixel xy to segmentLocationMap
            if(!(segmentId in segmentLocationMap)) segmentLocationMap[segmentId] = []
            segmentLocationMap[segmentId].push(pixelLocation)

            // Adding pixel index to the segmentIndexMap
            if(!(segmentId in segmentIndexMap)) segmentIndexMap[segmentId] = []
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
function calculateCentroids(segmentMap: {[key:number] : Array<PixelLocation>}) {
    let centroidMap:{[key:number] : PixelLocation} = {}

    for(let segmentId in segmentMap){
        let xSum = 0
        let ySum = 0
        let numPixels = 0
        let pixelLocations = segmentMap[segmentId] 
        pixelLocations.forEach( (pixelLocation) => {
            xSum += pixelLocation.x
            ySum += pixelLocation.y
            numPixels += 1
        })
        let centroidLocation = {x: Math.round(xSum/numPixels), y: Math.round(ySum/numPixels)}
        centroidMap[segmentId] = centroidLocation
    }

    return centroidMap
}

async function loadTiffData(data: Float32Array | Uint16Array | Uint8Array, width: number, height: number, onError?: (err:any) => void) {
    try {
        // Generating the pixelMap and segmentMaps that represent the segementation data
        let maps = generateMaps(data, width, height)
        let pixelMap = maps.pixelMap
        let segmentLocationMap = maps.segmentLocationMap
        let segmentIndexMap = maps.segmentIndexMap

        let segmentOutlineMap = generateOutlineMap(maps.segmentLocationMap)
        let centroidMap = calculateCentroids(maps.segmentLocationMap)
        // Generate an ImageBitmap from the tiffData
        // ImageBitmaps are rendered canvases can be passed between processes
        let bitmap = await segmentationFillBitmap(data, width, height)

        return({
            width: width,
            height: height,
            data: data,
            pixelMap: pixelMap,
            segmentIndexMap: segmentIndexMap,
            segmentLocationMap: segmentLocationMap,
            segmentOutlineMap: segmentOutlineMap,
            centroidMap: centroidMap,
            fillBitmap: bitmap,
        })
    } catch (err) {
        if(onError != null) {
            onError({error: err.message})
        } else {
            throw err
        }
    }
}

async function loadFile(filepath: string, onError: (err:any) => void):Promise<SegmentationDataWorkerResult> {
    try {
        //Decode tiff data
        let tiffData = readTiffData(filepath)
        return await loadTiffData(tiffData.data, tiffData.width, tiffData.height)
    } catch (err) {
        onError({error: err.message})
    }
}

ctx.addEventListener('message', (message) => {
    let data = message.data

    // Callback if an error is raised when loading data.
    let onError = (err) => {
        ctx.postMessage(err)
    }

    if('tiffData' in data){
        loadTiffData(data.tiffData, data.width, data.height, onError).then((message) => {
            // Send the message and then specify the large data array and bitmap as transferrables
            // Using transferrables dramatically speeds up transfer back to the main thread
            // However, closing/terminating the worker causes this to fail and crash (bug in Chromium maybe?)
            if(message && 'data' in message && 'fillBitmap' in message) ctx.postMessage(message, [message.data.buffer, message.fillBitmap])
        })
    } else {
        loadFile(data.filepath, onError).then((message) => {
            if(message && 'data' in message && 'fillBitmap' in message) ctx.postMessage(message, [message.data.buffer, message.fillBitmap])
        })
    }
}, false)

