/* eslint-disable @typescript-eslint/ban-ts-ignore */
/* eslint @typescript-eslint/no-explicit-any: 0 */

//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

import * as d3Scale from 'd3-scale'
import * as path from 'path'
import * as xml2js from 'xml2js'

import { MinMax } from '../interfaces/ImageInterfaces'
import { ImageDataWorkerResult, ImageDataWorkerInput, ImageDataWorkerError } from './ImageDataWorker'
import { readTiffData } from '../lib/TiffHelper'

async function bitmapFromData(
    v: Float32Array | Uint16Array | Uint8Array,
    width: number,
    height: number,
    minmax: MinMax,
): Promise<ImageBitmap> {
    // @ts-ignore
    const offScreen = new OffscreenCanvas(width, height)

    const thisCtx = offScreen.getContext('2d')
    if (thisCtx) {
        // @ts-ignore
        const imageData = thisCtx.getImageData(0, 0, offScreen.width, offScreen.height)
        const canvasData = imageData.data

        const colorScale = d3Scale.scaleLinear().domain([minmax.min, minmax.max]).range([0, 255])

        // iterating through the values in the tiff and setting them in the canvas
        for (let i = 0; i < v.length; ++i) {
            const x = colorScale(v[i])
            // tiff data (v) has one value per pixel whereas a canvas has four (rgba)
            // Bitshift by 2 (same as multiplying by 4) to get the starting index on the canvas
            const canvasIndex = i << 2
            canvasData[canvasIndex] = x // r
            canvasData[canvasIndex + 1] = x // g
            canvasData[canvasIndex + 2] = x // b
            canvasData[canvasIndex + 3] = 255 // a
        }
        // @ts-ignore
        thisCtx.putImageData(imageData, 0, 0)
    }

    const bitmap = await createImageBitmap(offScreen)

    return bitmap
}

function calculateMinMaxIntensity(v: Float32Array | Uint16Array | Uint8Array): { min: number; max: number } {
    let min = v[0]
    let max = v[0]
    for (const curValue of v) {
        if (curValue < min) min = curValue
        if (curValue > max) max = curValue
    }
    return { min: min, max: max }
}

// Does a BFS of the imageDescription parsed XML looking for an object property named 'name'
// TODO: Make the xml field name/object property names configurable.
function getMarkerNameFromImageDescription(imageDescription: any): string | null {
    const descriptionValues = []
    for (const key in imageDescription) {
        if (key.toLowerCase() == 'name') {
            // xml2js parses xml elements into arrays
            //If there's a name field we want to make sure it has elements and then return the first.
            if (imageDescription[key].length > 0) {
                return imageDescription[key][0] as string
            }
        }
        const curValue = imageDescription[key]
        if (typeof curValue === 'object' && curValue !== null) descriptionValues.push(curValue)
    }
    for (const descriptionValue of descriptionValues) {
        const descriptionValueMarkerName = getMarkerNameFromImageDescription(descriptionValue)
        if (descriptionValueMarkerName) return descriptionValueMarkerName
    }
    return null
}

async function generateMarkerName(
    imageDescription: string,
    markerNameFromFilename: string,
    numImages: number,
    imageNumber: number,
): Promise<string> {
    let markerNameFromImageDescription = null
    // If we can find a name in the image description use that, otherwise use the filename.

    // Try parsing the image description as XML string
    try {
        const parsedImageDescription = await xml2js.parseStringPromise(imageDescription)
        markerNameFromImageDescription = getMarkerNameFromImageDescription(parsedImageDescription)
    } catch (error) {}

    // Try parsing the image description as JSON string from a mibitiff
    try {
        if (markerNameFromImageDescription == null) {
            // Clean up the imageDescription string and try to parse it as a JSON string.
            const parsedImageDescription = JSON.parse(imageDescription.replace(/(\r\n|\n|\r|\0)/gm, ''))
            if ('channel.target' in parsedImageDescription)
                markerNameFromImageDescription = parsedImageDescription['channel.target']
        }
    } catch (error) {}

    // Set the marker name based on what we found.
    let markerName
    if (markerNameFromImageDescription) {
        markerName = markerNameFromImageDescription
    } else if (numImages > 1) {
        // If we're using the filename and there is more than one image, append the image number to the marker name.
        markerName = 'Marker ' + (imageNumber + 1).toString()
    } else {
        markerName = markerNameFromFilename
    }
    return markerName
}

export async function readFile(input: ImageDataWorkerInput): Promise<ImageDataWorkerResult | ImageDataWorkerError> {
    const filepath = input.filepath
    const useExtInMarkerName = input.useExtInMarkerName
    const parsed = path.parse(filepath)
    const markerNameFromFilename = useExtInMarkerName ? parsed.base : parsed.name
    try {
        const imageNumber = input.imageNumber ? input.imageNumber : 0
        const tiffData = await readTiffData(filepath, imageNumber)
        const { data, width, height, scaled, numImages, imageDescription } = tiffData
        const markerName = await generateMarkerName(imageDescription, markerNameFromFilename, numImages, imageNumber)

        // Calculate the minimum and maximum marker intensity
        const minmax = calculateMinMaxIntensity(data)
        // Generate an ImageBitmap from the tiffData
        // ImageBitmaps are rendered canvases can be passed between processes
        const bitmap = await bitmapFromData(data, width, height, minmax)

        return {
            input: {
                filepath: filepath,
                useExtInMarkerName: useExtInMarkerName,
                imageNumber: imageNumber,
            },
            markerName: markerName,
            width: width,
            height: height,
            data: data,
            bitmap: bitmap,
            minmax: minmax,
            scaled: scaled,
            numImages: numImages,
        }
    } catch (err) {
        return { input: input, error: err.message, markerName: markerNameFromFilename }
    }
}

ctx.addEventListener(
    'message',
    (message) => {
        const data: ImageDataWorkerInput = message.data
        readFile(data).then((message) => {
            // Send the message and then specify the large data array and bitmap as transferrables
            // Using transferrables dramatically speeds up transfer back to the main thread
            if ('error' in message) {
                ctx.postMessage(message)
            } else {
                ctx.postMessage(message, [message.data.buffer, message.bitmap])
            }
        })
    },
    false,
)
