import * as _ from "underscore"
import * as fs from "fs"
import * as path from "path"
import * as PIXI from "pixi.js"
import * as d3Scale from "d3-scale"
import { ImageDataObject } from "../interfaces/ImageInterfaces"

const tiff = require("tiff")

interface MinMax {
    min: number
    max: number
}

export type ImageDataInputType = "TIFF" | "folder"

export class ImageData {

    data: ImageDataObject
    minmax: {[key: string] : MinMax}
    sprites: {[key:string] : PIXI.Sprite}

    width: number
    height: number

    get channelNames() : string[] {
        // Remove X and Y from the channelNames before returning
        let channelNames = _.keys(this.data)
        channelNames.splice(channelNames.indexOf("X"), 1)
        channelNames.splice(channelNames.indexOf("Y"), 1)
        return(channelNames)
    }

    static calculateMinMax(v: Float32Array | Uint16Array) : MinMax {
        let min = v[0]
        let max = v[0]
        for (let curValue of v){
            if (curValue < min) min = curValue
            if (curValue > max) max = curValue 
        }
        return({min: min, max: max})
    }

    static textureFromData(v: Float32Array | Uint16Array, width: number, height: number, minmax: MinMax) {
        let offScreen = document.createElement("canvas")
        offScreen.width = width
        offScreen.height = height
    
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

            for(let i = 0; i < v.length; ++i) {
                let x = colorScale(v[i])
                canvasData[dataIdx[i]] = x
                canvasData[dataIdx[i] + 1] = x
                canvasData[dataIdx[i] + 2] = x
            }
            ctx.putImageData(imageData, 0, 0)

        }
        return(PIXI.Texture.fromCanvas(offScreen))
    }

    private loadFolder(dirName:string) {
        let files = fs.readdirSync(dirName)

        let lineNumber = 0
        let colNames: string[] = []
        let xIdx = 0
        let yIdx = 0

        console.log(files)
        
        files.forEach(f => {
            if(f.endsWith(".tiff")){
                let data = fs.readFileSync(path.join(dirName, f))
                let chName = path.basename(f, ".tiff")
                let tiffData = tiff.decode(data)[0]
                this.width = tiffData.width
                this.height = tiffData.height
                this.data[chName] = tiffData.data
                this.minmax[chName] = ImageData.calculateMinMax(tiffData.data)
                this.sprites[chName] = new PIXI.Sprite(ImageData.textureFromData(tiffData.data, this.width, this.height, this.minmax[chName]))
            }
        })

        let totPixels = this.width * this.height

        this.data.X = new Uint16Array(new ArrayBuffer(Uint16Array.BYTES_PER_ELEMENT * totPixels))
        this.data.Y = new Uint16Array(new ArrayBuffer(Uint16Array.BYTES_PER_ELEMENT * totPixels))

        let k = 0
        for(let i = 0; i < this.height; ++i)
            for(let j = 0; j < this.width; ++j) {
                this.data.X[k] = j
                this.data.Y[k] = i
                ++k
            }

        console.log("###")
        console.log(this.data)
        return null

    }

    private loadTIFF(fName:string) {}

    /*
    private loadTxtFile(fName: string) {
        let lineNumber = 0
        let colNames: string[] = []
        let xIdx = 0
        let yIdx = 0

        let lines = fs.readFileSync(fName, 'utf-8')
            .split("\n")
        

        while(lineNumber < lines.length) {
            let line = lines[lineNumber]
            let fields = line.split("\t")
            if(lineNumber == 0) {
                colNames = fields
                xIdx = colNames.findIndex((s) => {return(s == "X")})
                yIdx = colNames.findIndex((s) => {return(s == "Y")})
                let nRows = (this.stats.X[1] + 1) * (this.stats.Y[1] + 1)
                colNames.forEach((s) => {
                    //console.log("Allocating object of size ", Float32Array.BYTES_PER_ELEMENT * nRows)
                    //console.log("Total number of rows", nRows)
                    let buf = new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT * nRows)
                    this.data[s] = new Float32Array(buf)
                })
            } else {
                let v = fields.map(parseFloat)
                let X = Math.trunc(v[xIdx])
                let Y = Math.trunc(v[yIdx])
                let maxX = this.stats.X[1]
                let idx = (Y * ((maxX) + 1)) + X

                v.forEach((x, i) => {
                    let col = colNames[i]
                    this.data[col][idx] = x
                })

            }

            ++lineNumber
        }
      
    }
*/

    meanPixelIntensity(chName:string, pixels:Array<number>):number {
        if(chName in this.data) {
            let chData = this.data[chName]
            let sum = 0
            let count = 0
            for (let curPixel of pixels){
                sum += chData[curPixel]
                count += 1
            }
            return sum/count
        }
        else {
            throw new Error('Channel name ' + chName + ' not found in ' + this.channelNames.toString());
        }
    }

    medianPixelIntensity(chName:string, pixels:Array<number>):number {
        if(chName in this.data) {
            let chData = this.data[chName]
            let values = []
            for (let curPixel of pixels){
                values.push(chData[curPixel])
            }
            // Find the median! Sort the intensity values by intensity.
            values.sort()
            let length = values.length
            if(length % 2 == 0){
                // If even take the average of the two middle intensity values
                return (values[(length/2) - 1] + values[length/2])/2
            } else {
                // If odd return the middle intensity value
                return values[Math.ceil(length/2) - 1]
            }
        }
        else {
            throw new Error('Channel name ' + chName + ' not found in ' + this.channelNames.toString());
        }
    }

    constructor(path:string, inputType:ImageDataInputType) {
        this.data = {X: new Float32Array(0), Y: new Float32Array(0)}
        this.minmax = {}
        this.sprites = {}

        switch(inputType) {
            case("TIFF"):
                this.loadTIFF(path)
                break
            case("folder"):
                this.loadFolder(path)
                break
        }
    }
}