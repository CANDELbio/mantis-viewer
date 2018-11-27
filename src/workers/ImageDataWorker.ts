//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

import * as d3Scale from "d3-scale"
import { MinMax } from "../interfaces/ImageInterfaces"
import * as fs from "fs"
import * as path from "path"
import * as UTIF from "utif"

async function bitmapFromData(v: Float32Array | Uint16Array | Uint8Array, width: number, height: number, minmax: MinMax) {
    // @ts-ignore
    let offScreen = new OffscreenCanvas(width, height)

    let ctx = offScreen.getContext("2d")
    if(ctx) {
        let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
        let canvasData = imageData.data
        
        let colorScale = d3Scale.scaleLinear()
                .domain([minmax.min, minmax.max])
                .range([0, 255])

        // iterating through the values in the tiff and setting them in the canvas
        for(let i = 0; i < v.length; ++i) {
            let x = colorScale(v[i])
            // tiff data (v) has one value per pixel whereas a canvas has four (rgba)
            // Bitshift by 2 (same as multiplying by 4) to get the starting index on the canvas
            let canvasIndex = i << 2
            canvasData[canvasIndex] = x       // r
            canvasData[canvasIndex + 1] = x   // g
            canvasData[canvasIndex + 2] = x   // b
            canvasData[canvasIndex + 3] = 255 // a
        }
        ctx.putImageData(imageData, 0, 0)
    }

    let bitmap = await createImageBitmap(offScreen)
    
    return(bitmap)
}

function convertBinaryArray(v: Uint8Array, destinationBits:number, width:number, height:number, isLE: boolean){
    if(destinationBits == 8) return v

    let buffer = v.buffer
    let view = new DataView(buffer)
    let results = []
    let numValues = width * height

    for(let i = 0; i < numValues; ++i) {
        if(destinationBits == 16) results.push(view.getInt16(i*2, isLE))
        if(destinationBits == 32) results.push(view.getFloat32(i*4, isLE))
    }

    if(destinationBits == 16){
        return Uint16Array.from(results)
    } else if (destinationBits == 32) {
        return Float32Array.from(results)
    }
}

function readTiffData(filepath: string){
    //Decode tiff data
    let rawData = fs.readFileSync(filepath)

    let ifds = UTIF.decode(rawData)
    UTIF.decodeImages(rawData, ifds)
    let tiffData = ifds[0]

    let width = tiffData.width
    let height = tiffData.height
    let uint8Data = tiffData.data // utif returns data as a uint8 array
    let isLE = tiffData.isLE // Whether or not the uint8Data array is little-endian
    let imageBits = tiffData.t258[0] // Whether the image in 8-bit, 16-bit, or 32-bit image

    // Data comes back as a Uint8array. If the image is 16-bit or 32-bit we need to convert to the correct bits.
    let data = convertBinaryArray(uint8Data, imageBits, width, height, isLE)
    return {data: data, width: width, height: height}
}

function calculateMinMaxIntensity(v: Float32Array | Uint16Array | Uint8Array) {
    let min = v[0]
    let max = v[0]
    for (let curValue of v){
        if (curValue < min) min = curValue
        if (curValue > max) max = curValue 
    }
    return({min: min, max: max})
}

async function readFile(filepath: string, onError: (err:any) => void) {
    let parsed = path.parse(filepath)
    let chName = parsed.name
    try {
        let tiffData = readTiffData(filepath)
        let {data, width, height} = tiffData

        // Calculate the minimum and maximum channel intensity
        let minmax = calculateMinMaxIntensity(data)
        // Generate an ImageBitmap from the tiffData
        // ImageBitmaps are rendered canvases can be passed between processes
        let bitmap = await bitmapFromData(data, width, height, minmax)

        return({chName: chName, width: width, height: height, data: data, bitmap: bitmap, minmax: minmax})
    } catch (err) {
        onError({error: err.message, chName: chName})
    }
}

ctx.addEventListener('message', (message) => {
    var data = message.data
    readFile(data.filepath, (err) => {
        // If we have an error, send the message.
        ctx.postMessage(err)
    }).then((message) => {
        // Send the message and then specify the large data array and bitmap as transferrables
        // Using transferrables dramatically speeds up transfer back to the main thread
        // However, closing/terminating the worker causes this to fail and crash (bug in Chromium maybe?)
        if(message) ctx.postMessage(message, [message.data.buffer, message.bitmap])
    })
}, false)