import * as _ from "underscore"
import * as fs from "fs"
import * as path from "path"
import * as PIXI from "pixi.js"
import * as d3Scale from "d3-scale"

const tiff = require("tiff")

interface RGBColor {
    r: number,
    g: number,
    b: number
}

interface RGBColorCollection {
    [key: string] : RGBColor
}

export class SegmentationData {
    sprite : PIXI.Sprite

    static getPixelColor(segmentId:number, colors: RGBColorCollection){
        if(!(segmentId in colors)){
            // Generate a random color
            let num = Math.round(0xffffff * Math.random());
            let r = num >> 16;
            let g = num >> 8 & 255;
            let b = num & 255;
            let color = {r: r, g: g, b: b}

            // Store that color in the colors hash and then return in.
            colors[segmentId] = color
            return color
        }

        //Return the stored color for that segment if it has already been generated.
        return colors[segmentId]
    }

    static segmentationTextureFromData(v: Float32Array | Uint16Array, width: number, height: number) {
        let offScreen = document.createElement("canvas")
        offScreen.width = width
        offScreen.height = height

        let colors ={}

        let ctx = offScreen.getContext("2d")
        if(ctx) {
            let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
            let canvasData = imageData.data

            let dataIdx = new Array(v.length)

            // tiff data is an array with one index per pixel whereas canvasas have four indexes per pixel (r, g, b, a)
            for(let i = 0; i < v.length ; ++i) {
                //setup the dataIdx array by multiplying by 4 (i.e. bitshifting by 2)
                let idx = i << 2
                dataIdx[i] = idx
            }

            // Segmentation data is stored as a tiff where the a pixel has a value of 0 if it does not belong to a cell
            // or is a number corresponding to what we're calling the segmentId (i.e. all pixels that belong to cell/segment 1 have a value of 1)
            // Here we're iterating through the segmentation data and setting all canvas pixels that have no cell as transparent
            // or setting all of the pixels belonging to a cell to the same random color with 50% alpha (transparency)
            for(let i = 0; i < v.length; ++i) {
                let segmentId = v[i]
                if(segmentId === 0){
                    canvasData[dataIdx[i]] = 0
                    canvasData[dataIdx[i] + 1] = 0
                    canvasData[dataIdx[i] + 2] = 0
                    canvasData[dataIdx[i] + 3] = 0
                }
                else{
                    let color = this.getPixelColor(segmentId, colors)
                    canvasData[dataIdx[i]] = color['r']
                    canvasData[dataIdx[i] + 1] = color['g']
                    canvasData[dataIdx[i] + 2] = color['b']
                    canvasData[dataIdx[i] + 3] = 255
                }

            }

            ctx.putImageData(imageData, 0, 0)

        }
        return(PIXI.Texture.fromCanvas(offScreen))
    }

    constructor(fName:string) {
        console.log(fName)
        let input = fs.readFileSync(fName)
        let tiffData = tiff.decode(input)[0]
        this.sprite = new PIXI.Sprite(SegmentationData.segmentationTextureFromData(tiffData.data, tiffData.width, tiffData.height))
    }


}
