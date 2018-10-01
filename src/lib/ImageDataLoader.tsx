import * as d3Scale from "d3-scale"
import * as _ from "underscore"
import { ImageDataObject, MinMax } from "../interfaces/ImageInterfaces"
import { ImageData } from "../lib/ImageData"
import * as fs from "fs"
import * as path from "path"

const tiff = require("tiff")

export class ImageDataLoader {

    data: ImageDataObject
    minmax: {[key: string] : MinMax}
    bitmaps: {[key:string] : ImageBitmap}
    numChannels: number
    width: number
    height: number

    onImageDataLoaded: (imageData: ImageData) => void

   private async textureFromData(v: Float32Array | Uint16Array, width: number, height: number, minmax: MinMax) {
        // @ts-ignore
        let offScreen = new OffscreenCanvas(width, height);
    
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

        let bitmap = await createImageBitmap(offScreen)
        
        return(bitmap)
    }

    private calculateMinMax(v: Float32Array | Uint16Array) {
        let min = v[0]
        let max = v[0]
        for (let curValue of v){
            if (curValue < min) min = curValue
            if (curValue > max) max = curValue 
        }
        return({min: min, max: max})
    }

    private async loadFile(filepath: string) {
        let data = fs.readFileSync(filepath)
        let chName = path.basename(filepath, ".tiff")
        let tiffData = tiff.decode(data)[0]

        this.width = tiffData.width
        this.height = tiffData.height
        
        this.minmax[chName] = this.calculateMinMax(tiffData.data)
        this.bitmaps[chName] = await this.textureFromData(tiffData.data, this.width, this.height, this.minmax[chName])
        this.data[chName] = tiffData.data

        this.fileLoadComplete(chName)
    }

    private fileLoadComplete(chName: string) {
        console.log(chName + " done loading")
        let channelsLoaded = _.keys(this.data)
        console.log(channelsLoaded.length + " out of " + this.numChannels + " are done.")
        if(channelsLoaded.length == this.numChannels){
            let imageData = new ImageData(this.data, this.minmax, this.bitmaps, this.width, this.height)
            this.onImageDataLoaded(imageData)
        }
    }

    loadFolder(dirName:string, onImageDataLoaded: (imageData: ImageData) => void) {
        this.onImageDataLoaded = onImageDataLoaded

        let files = fs.readdirSync(dirName)
        
        console.log(files)

        let tiffs = files.filter(f => f.endsWith(".tiff") )
        this.numChannels = tiffs.length

        console.log("Loading " + this.numChannels + " files")
        
        tiffs.forEach(f => { this.loadFile(path.join(dirName, f)) })
    }

    constructor(){
        this.data = {}
        this.minmax = {}
        this.bitmaps = {}
    }
}