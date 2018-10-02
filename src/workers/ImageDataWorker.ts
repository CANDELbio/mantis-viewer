//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any;

import * as d3Scale from "d3-scale"
import { ImageDataWorkerResult, MinMax } from "../interfaces/ImageInterfaces"
import * as fs from "fs"
import * as path from "path"

const tiff = require("tiff")

async function bitmapFromData(v: Float32Array | Uint16Array, width: number, height: number, minmax: MinMax) {
    // @ts-ignore
    let offScreen = new OffscreenCanvas(width, height)

    let ctx = offScreen.getContext("2d")
    if(ctx) {
        let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
        let canvasData = imageData.data
        
        let colorScale = d3Scale.scaleLinear()
                .domain([minmax.min, minmax.max])
                .range([0, 255])

        let dataIdx = new Array(v.length)

        for(let i = 0; i < v.length ; ++i) {
            //setup the dataIdx array by multiplying by 4 (i.e. bitshifting by 2)
            let idx = i << 2
            dataIdx[i] = idx
            canvasData[idx + 3] = 255

        }

        // tiff data (v) has one value per pixel whereas a canvas has four (rgba)
        // iterating through the values in the tiff and setting them in the canvas
        for(let i = 0; i < v.length; ++i) {
            let x = colorScale(v[i])
            canvasData[dataIdx[i]] = x
            canvasData[dataIdx[i] + 1] = x
            canvasData[dataIdx[i] + 2] = x
        }
        ctx.putImageData(imageData, 0, 0)
    }

    let bitmap = await createImageBitmap(offScreen)
    
    return(bitmap)
}

function calculateMinMax(v: Float32Array | Uint16Array) {
    let min = v[0]
    let max = v[0]
    for (let curValue of v){
        if (curValue < min) min = curValue
        if (curValue > max) max = curValue 
    }
    return({min: min, max: max})
}

async function loadFile(filepath: string):Promise<ImageDataWorkerResult> {
    let chName = path.basename(filepath, ".tiff")
    //Decode tiff data
    let data = fs.readFileSync(filepath)
    let tiffData = tiff.decode(data)[0]

    let width = tiffData.width
    let height = tiffData.height
    let minmax = calculateMinMax(tiffData.data)
    // Generate an ImageBitmap from the tiffData
    // ImageBitmaps are rendered canvases can be passed between processes
    let bitmap = await bitmapFromData(tiffData.data, width, height, minmax)

    return({chName: chName, width: width, height: height, data: tiffData.data, bitmap: bitmap, minmax: minmax})
}

ctx.addEventListener('message', (message) => {
    var data = message.data
    loadFile(data.filepath).then((message) => {
        // Send the message and then specify the large data array and bitmap as transferrables
        // Using transferrables dramatically speeds up transfer back to the main thread
        // However, closing/terminating the worker causes this to fail and crash (bug in Chromium maybe?)
        ctx.postMessage(message, [message.data.buffer, message.bitmap])
    })
}, false)

