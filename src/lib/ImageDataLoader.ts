import * as _ from "underscore"
import { TiffDataMap, ImageDataWorkerResult, MinMaxMap, ImageBitmapMap } from "../interfaces/ImageInterfaces"
import { ImageData } from "./ImageData"
import * as fs from "fs"
import * as path from "path"

import ImageWorker = require("worker-loader?name=dist/[name].js!../workers/ImageDataWorker")

export class ImageDataLoader {

    data: TiffDataMap
    minmax: MinMaxMap
    bitmaps: ImageBitmapMap
    numChannels: number
    width: number
    height: number
    
    // Keep track of workers created
    // Was going to terminate them when done, but broke using Transferrable objects.
    workers: ImageWorker[]

    // Callback function to call with the built ImageData once it has been loaded.
    onImageDataLoaded: (imageData: ImageData) => void

    private fileLoadComplete() {
        let channelsLoaded = _.keys(this.data)
        // If the number of channels loaded is equal to the total number of channels we are done!
        if(channelsLoaded.length == this.numChannels){
            let imageData = new ImageData(this.data, this.minmax, this.bitmaps, this.width, this.height)
            this.onImageDataLoaded(imageData)
        }
    }

    loadFileData(fData: ImageDataWorkerResult){
        let chName = fData.chName
        this.width = fData.width
        this.height = fData.height
        this.data[chName] = fData.data
        this.bitmaps[chName] = fData.bitmap
        this.minmax[chName] = fData.minmax 
        this.fileLoadComplete()
    }

    loadFolder(dirName:string, onImageDataLoaded: (imageData: ImageData) => void) {
        this.onImageDataLoaded = onImageDataLoaded

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
        this.bitmaps = {}
        this.workers = []
    }
}