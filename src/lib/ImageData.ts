import * as _ from "underscore"
import * as fs from "fs"
import * as path from "path"
import { TiffDataMap, ImageDataWorkerResult, MinMaxMap, SpriteMap } from "../interfaces/ImageInterfaces"
import { imageBitmapToSprite } from "./GraphicsHelper"

import ImageWorker = require("worker-loader?name=dist/[name].js!../workers/ImageDataWorker")

// Class to store ImageData
// Needs to have loadFolder invoked after creation to actually load and store data.
export class ImageData {

    data: TiffDataMap
    minmax: MinMaxMap
    sprites: SpriteMap

    width: number
    height: number

    errors: string[]

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

    clearErrors() {
        this.errors = []
    }

    terminateWorkers() {
        for(let worker of this.workers){
            worker.terminate()
        }
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
        this.sprites[chName] = imageBitmapToSprite(fData.bitmap)
        this.minmax[chName] = fData.minmax
        this.fileLoadComplete()
    }

    private async loadFileError(fError: {error: string, chName: string}){
        let err = "Error loading channel " + fError.chName + ": " + fError.error
        console.log(err)
        this.errors.push(fError.chName)
        this.numChannels -= 1
        this.fileLoadComplete()
    }

    removeChannel(chName: string){
        if(chName in this.data){
            this.numChannels -= 1
            delete this.data[chName]
            delete this.sprites[chName]
            delete this.minmax[chName]
        }
    }

    // Loads a folder in the background using ImageDataWorkers
    loadFolder(dirName:string, onReady: (imageData: ImageData) => void) {
        this.onReady = onReady

        let files = fs.readdirSync(dirName)

        let tiffs = files.filter(f => f.endsWith(".tiff") || f.endsWith(".tif") )

        console.log(tiffs)
        // Store the number of tiffs being loaded so we know when all the background workers have finished
        this.numChannels = tiffs.length

        if(tiffs.length == 0){
            // If no tiffs are present in the directory, just return an empty image data.
            this.onReady(this)
        } else {
            let loadFileData = (data: ImageDataWorkerResult) => this.loadFileData(data)
            let loadFileError = (data: {error: any, chName: string}) => this.loadFileError(data)

            // Create a webworker for each tiff and return the results to loadFileData.
            tiffs.forEach(f => {
                let worker = new ImageWorker()
                worker.addEventListener('message', function(e: {data: any}) {
                    if('error' in e.data){
                        loadFileError(e.data)
                    } else {
                        loadFileData(e.data)
                    }
                }, false)
                worker.postMessage({filepath: path.join(dirName, f)})
                this.workers.push(worker)
            })
        }
    }

    constructor(){
        this.data = {}
        this.minmax = {}
        this.sprites = {}
        this.workers = []
        this.errors = []
    }
}