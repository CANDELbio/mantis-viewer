import * as fs from "fs"
import * as PIXI from "pixi.js"
import * as concaveman from "concaveman"
import { PixelLocation } from "../interfaces/ImageInterfaces"
import { drawOutlines } from "./GraphicsHelper"
import { SegmentOutlineColor } from "../interfaces/UIDefinitions"

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
    width: number
    height: number
    data: Float32Array | Uint16Array
    // Mapping of a stringified pixel location (i.e. x_y) to a segmentId
    pixelMap: Record<string, number>
    // Mapping of a segmentId to pixel indices.
    segmentIndexMap: Record<number, number[]>
    // Mapping of a segmentId to pixel locations (x, y)
    segmentLocationMap: Record<number, PixelLocation[]>
    // Mapping of a segmentId to pixel locations (x, y) representing the convex hull
    segmentOutlineMap: Record<number, PixelLocation[]>
    // Mapping of segmentId to the pixel that represents the centroid
    centroidMap: Record<number, PixelLocation>

    private static getPixelColor(segmentId:number, colors: RGBColorCollection){
        if(!(segmentId in colors)){
            // Generate a random color
            let num = Math.round(0xffffff * Math.random())
            let r = num >> 16
            let g = num >> 8 & 255
            let b = num & 255
            let color = {r: r, g: g, b: b}

            // Store that color in the colors hash and then return in.
            colors[segmentId] = color
            return color
        }

        //Return the stored color for that segment if it has already been generated.
        return colors[segmentId]
    }

    private static drawPixel(segmentId: number, colors: {}, pixel: number, canvasData: Uint8ClampedArray){
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
            let color = this.getPixelColor(segmentId, colors)
            canvasData[canvasasIndex] = color['r']
            canvasData[canvasasIndex + 1] = color['g']
            canvasData[canvasasIndex + 2] = color['b']
            canvasData[canvasasIndex + 3] = 255
        }
    }

    // Generates a texture (to be used to create a PIXI sprite) from segmentation data.
    // Segmentation data is stored as a tiff where the a pixel has a value of 0 if it does not belong to a cell
    // or is a number corresponding to what we're calling the segmentId (i.e. all pixels that belong to cell/segment 1 have a value of 1)
    private static segmentationSpriteFromData(v: Float32Array | Uint16Array, width: number, height: number) {
        let offScreen = document.createElement("canvas")
        offScreen.width = width
        offScreen.height = height

        // Hash to store the segmentID to randomly generated color mapping
        let colors = {}

        let ctx = offScreen.getContext("2d")
        if(ctx) {
            let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
            let canvasData = imageData.data

            // Here we're iterating through the segmentation data and setting all canvas pixels that have no cell as transparent
            // or setting all of the pixels belonging to a cell to the same random color with 50% alpha (transparency)
            for(let i = 0; i < v.length; ++i) {
                this.drawPixel(v[i], colors, i, canvasData)
            }

            ctx.putImageData(imageData, 0, 0)

        }
        return(new PIXI.Sprite(PIXI.Texture.fromCanvas(offScreen)))
    }

    public static segmentMapKey(x: number, y: number){
        return ( x.toString() + "_" + y.toString() )
    }

    private static generateOutlineMap(segmentLocationMap:Record<number, PixelLocation[]>){
        let outlineMap:Record<number, PixelLocation[]> = {}
        for(let segment in segmentLocationMap){
            let segmentId = Number(segment)
            let segmentLocations = segmentLocationMap[segmentId].map((value: PixelLocation) => {return [value.x, value.y]} )
            let concavePolygon = concaveman(segmentLocations)
            outlineMap[segmentId] = concavePolygon.map((value: number[]) => { return {x: value[0], y: value[1]} })
        }
        return outlineMap
    }

    // Generates the pixelMap (key of x_y to segmentId) and segmentMap (key of segmentId to an array of pixels contained in that segment)
    private static generateMaps(v: Float32Array | Uint16Array, width: number, height: number) {
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

                pixelMap[this.segmentMapKey(x, y)] = segmentId

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
    private static calculateCentroids(segmentMap: {[key:number] : Array<PixelLocation>}) {
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

    public segmentSprite(){
        return SegmentationData.segmentationSpriteFromData(this.data, this.width, this.height)
    }

    public segmentOutlineGraphics(color = SegmentOutlineColor, segments?:number[]){
        let outlines = []
        for(let segment in this.segmentOutlineMap){
            let segmentId = Number(segment)
            if(segments){
                if(segments.indexOf(segmentId) != -1) outlines.push(this.segmentOutlineMap[segmentId])
            } else {
                outlines.push(this.segmentOutlineMap[segmentId])
            }
        }
        return drawOutlines(outlines, color)
    }

    constructor(width:number, height: number, data: Float32Array | Uint16Array) {

        this.width = width
        this.height = height
        this.data = data
        
        // Generating the pixelMap and segmentMaps that represent the segementation data
        let maps = SegmentationData.generateMaps(data, width, height)
        this.pixelMap = maps.pixelMap
        this.segmentLocationMap = maps.segmentLocationMap
        this.segmentIndexMap = maps.segmentIndexMap

        this.segmentOutlineMap = SegmentationData.generateOutlineMap(maps.segmentLocationMap)
        this.centroidMap = SegmentationData.calculateCentroids(maps.segmentLocationMap)
    }

    public static newFromFile(fName:string) {
        let input = fs.readFileSync(fName)
        let tiffData = tiff.decode(input)[0]
        return new SegmentationData(tiffData.width, tiffData.height, tiffData.data)
    }


}
