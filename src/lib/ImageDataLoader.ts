import * as _ from "underscore"
import { ImageDataObject, MinMax } from "../interfaces/ImageInterfaces"
import { ImageData } from "./ImageData"
import * as fs from "fs"
import * as path from "path"
import { Image } from "plotly.js";

import ImageWorker = require("worker-loader?name=dist/[name].js!../workers/ImageDataWorker");

export class ImageDataLoader {

    data: ImageDataObject
    minmax: {[key: string] : MinMax}
    bitmaps: {[key:string] : ImageBitmap}
    numChannels: number
    width: number
    height: number
    
    workers: ImageWorker[]

    onImageDataLoaded: (imageData: ImageData) => void

    private terminateWorkers() {
        for(let worker of this.workers){
            worker.terminate()
        }
    }

    private fileLoadComplete() {
        let channelsLoaded = _.keys(this.data)
        if(channelsLoaded.length == this.numChannels){
            let imageData = new ImageData(this.data, this.minmax, this.bitmaps, this.width, this.height)
            this.onImageDataLoaded(imageData)
            this.terminateWorkers()
        }
    }

    loadFileData(fData: {chName: string, width: number, height: number, data: Float32Array | Uint16Array, bitmap: ImageBitmap, minmax: MinMax}){
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
        
        console.log(files)

        let tiffs = files.filter(f => f.endsWith(".tiff") )
        this.numChannels = tiffs.length

        let loadFileData = (data: {chName: string, width: number, height: number, data: Float32Array | Uint16Array, bitmap: ImageBitmap, minmax: MinMax}) => this.loadFileData(data)
        
        tiffs.forEach(f => {
            let worker = new ImageWorker()
            worker.addEventListener('message', function(e: any) {
                loadFileData(e.data)
            }, false);
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