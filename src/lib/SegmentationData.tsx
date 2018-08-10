import * as _ from "underscore"
import * as fs from "fs"
import * as path from "path"
import * as PIXI from "pixi.js"
import * as d3Scale from "d3-scale"
import { TouchBarSegmentedControl } from "electron";

const tiff = require("tiff")

interface RGBColor {
    r: number,
    g: number,
    b: number
}

interface RGBColorCollection {
    [key: string] : RGBColor
}

interface PixelLocation {
    x: number,
    y: number
}

export class SegmentationData {
    width: number
    height: number
    segmentSprite : PIXI.Sprite
    // Mapping of a stringified pixel location (i.e. x_y) to a segmentId
    pixelMap:  {[key:string] : number}
    // Mapping of a segmentId to pixel locations (x, y, index)
    segmentMap: {[key:number] : Array<PixelLocation>}
    // Mapping of segmentId to the pixel that represents the centroid
    centroidMap: {[key:number] :  PixelLocation} 

    private static getPixelColor(segmentId:number, colors: RGBColorCollection){
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

    private static drawPixel(segmentId: number, colors: {}, pixel: number, canvasData: Uint8ClampedArray, dataIdx: any[]){
        if(segmentId === 0){
            canvasData[dataIdx[pixel]] = 0
            canvasData[dataIdx[pixel] + 1] = 0
            canvasData[dataIdx[pixel] + 2] = 0
            canvasData[dataIdx[pixel] + 3] = 0
        }
        else{
            let color = this.getPixelColor(segmentId, colors)
            canvasData[dataIdx[pixel]] = color['r']
            canvasData[dataIdx[pixel] + 1] = color['g']
            canvasData[dataIdx[pixel] + 2] = color['b']
            canvasData[dataIdx[pixel] + 3] = 255
        }
    }

    // Generates a texture (to be used to create a PIXI sprite) from segmentation data.
    // Segmentation data is stored as a tiff where the a pixel has a value of 0 if it does not belong to a cell
    // or is a number corresponding to what we're calling the segmentId (i.e. all pixels that belong to cell/segment 1 have a value of 1)
    private static segmentationTextureFromData(v: Float32Array | Uint16Array, width: number, height: number) {
        let offScreen = document.createElement("canvas")
        offScreen.width = width
        offScreen.height = height

        // Hash to store the segmentID to randomly generated color mapping
        let colors = {}

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

            // Here we're iterating through the segmentation data and setting all canvas pixels that have no cell as transparent
            // or setting all of the pixels belonging to a cell to the same random color with 50% alpha (transparency)
            for(let i = 0; i < v.length; ++i) {
                this.drawPixel(v[i], colors, i, canvasData, dataIdx)
            }

            ctx.putImageData(imageData, 0, 0)

        }
        return(PIXI.Texture.fromCanvas(offScreen))
    }

    public static segmentMapKey(x: number, y: number){
        return ( x.toString() + "_" + y.toString() )
    }

    // Generates the pixelMap (key of x_y to segmentId) and segmentMap (key of segmentId to an array of pixels contained in that segment)
    private static generateMaps(v: Float32Array | Uint16Array, width: number, height: number) {
        let pixelMap:{[key:string] : number} = {}
        let segmentMap:{[key:number] :  Array<PixelLocation>} = {}
        
        for(let i = 0; i < v.length; ++i) {
            let segmentId = v[i]
            if(segmentId != 0){
                // The incoming tiffdata (v) is an array with one entry per pixel.
                // To convert from this array index to x, y coordinates we need to 
                // divide the current index by the image width to get the y coordinate
                // and then take the remainder of the divison to get the x coordinate
                let x =  i%width
                let y = Math.floor(i/width)

                pixelMap[this.segmentMapKey(x, y)] = segmentId

                let pixelLocation = {x: x, y: y}
                if(!(segmentId in segmentMap)) segmentMap[segmentId] = []
                segmentMap[segmentId].push(pixelLocation)
            }
        }
        return {pixelMap: pixelMap, segmentMap: segmentMap}
    }

    // Calculates the centroid of a segment by taking the average of the coordinates of all of the pixels in that segment
    private static calculateCentroids(segmentMap: {[key:number] : Array<PixelLocation>}) {
        let centroidMap:{[key:number] :  PixelLocation} = {}

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

    constructor(fName:string) {
        console.log(fName)
        let input = fs.readFileSync(fName)
        let tiffData = tiff.decode(input)[0]

        this.width = tiffData.width
        this.height = tiffData.height

        // Generating a PIXI sprite to vizualize the segmentation data
        this.segmentSprite = new PIXI.Sprite(SegmentationData.segmentationTextureFromData(tiffData.data, tiffData.width, tiffData.height))
        
        // Generating the pixelMap and segmentMaps that represent the segementation data
        let {pixelMap: pixelMap, segmentMap: segmentMap} = SegmentationData.generateMaps(tiffData.data, tiffData.width, tiffData.height)
        this.pixelMap = pixelMap
        this.segmentMap = segmentMap

        console.log(this.pixelMap)
        console.log(this.segmentMap)

        this.centroidMap = SegmentationData.calculateCentroids(segmentMap)
        console.log(this.centroidMap)
    }


}
