import * as _ from "underscore"
import * as PIXI from "pixi.js"
import * as fs from "fs"
import * as path from "path"
import { TiffDataMap, ImageDataWorkerResult, MinMaxMap, SpriteMap } from "../interfaces/ImageInterfaces"

import ImageWorker = require("worker-loader?name=dist/[name].js!../workers/ImageDataWorker")

// Class to store ImageData
// Needs to have loadFolder invoked after creation to actually load and store data.
export class ImageData {

    data: TiffDataMap
    minmax: MinMaxMap
    sprites: SpriteMap

    width: number
    height: number

    // Keep track of the number of channels. Used to know when all workers have completed.
    private numChannels: number
    // Keep track of workers created
    // Was going to terminate them when done, but broke using Transferrable objects.
    private workers: ImageWorker[]

    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (imageData: ImageData) => void

    get channelNames() : string[] {
        let channelNames = _.keys(this.data).sort()
        return(channelNames)
    }

    terminateWorkers() {
        for(let worker of this.workers){
            worker.terminate()
        }
    }

    meanPixelIntensity(chName:string, pixels:number[]):number {
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
            throw new Error('Channel name ' + chName + ' not found in ' + this.channelNames.toString())
        }
    }

    medianPixelIntensity(chName:string, pixels:number[]):number {
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
            throw new Error('Channel name ' + chName + ' not found in ' + this.channelNames.toString())
        }
    }

    private imageBitmapToSprite(bitmap: ImageBitmap) {
        let offScreen = document.createElement("canvas")

        offScreen.width = bitmap.width
        offScreen.height = bitmap.height

        let ctx = offScreen.getContext("2d")
        if(ctx) ctx.drawImage(bitmap, 0, 0)
        return new PIXI.Sprite(PIXI.Texture.fromCanvas(offScreen))
    }

    private fileLoadComplete() {
        let channelsLoaded = _.keys(this.data)
        // If the number of channels loaded is equal to the total number of channels we are done!
        if(channelsLoaded.length == this.numChannels){
            this.onReady(this)
        }
    }

    private async loadFileData(fData: ImageDataWorkerResult){
        let chName = fData.chName
        this.width = fData.width
        this.height = fData.height
        this.data[chName] = fData.data
        this.sprites[chName] = this.imageBitmapToSprite(fData.bitmap)
        this.minmax[chName] = fData.minmax
        this.fileLoadComplete()
    }

    // Loads a folder in the background using ImageDataWorkers
    loadFolder(dirName:string, onReady: (imageData: ImageData) => void) {
        this.onReady = onReady

        let files = fs.readdirSync(dirName)

        let tiffs = files.filter(f => f.endsWith(".tiff") )
        // Store the number of tiffs being loaded so we know when all the background workers have finished
        this.numChannels = tiffs.length

        console.log(tiffs)

        let loadFileData = (data: ImageDataWorkerResult) => this.loadFileData(data)

        // Create a webworker for each tiff and return the results to loadFileData.
        tiffs.forEach(f => {
            let worker = new ImageWorker()
            worker.addEventListener('message', function(e: {data: ImageDataWorkerResult}) {
                loadFileData(e.data)
            }, false)
            worker.postMessage({filepath: path.join(dirName, f)})
            this.workers.push(worker)
        })
    }

    constructor(){
        this.data = {}
        this.minmax = {}
        this.sprites = {}
        this.workers = []
    }
}