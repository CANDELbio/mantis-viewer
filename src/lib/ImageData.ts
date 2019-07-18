import * as _ from 'underscore'
import * as fs from 'fs'
import * as path from 'path'
import { TiffDataMap, MinMaxMap, SpriteMap } from '../interfaces/ImageInterfaces'
import { ImageDataWorkerResult } from '../interfaces/WorkerInterfaces'
import { imageBitmapToSprite } from './GraphicsHelper'
import { ImageDataWorker } from '../workers/ImageDataWorker'

// Class to store ImageData
// Needs to have loadFolder invoked after creation to actually load and store data.
export class ImageData {
    public data: TiffDataMap
    public minmax: MinMaxMap
    public sprites: SpriteMap

    public width: number
    public height: number

    public errors: string[]

    // Keep track of the number of channels. Used to know when all workers have completed.
    private numChannels: number
    // Keep track of workers created
    // Was going to terminate them when done, but broke using Transferrable objects.
    private workers: ImageDataWorker[]

    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (imageData: ImageData) => void

    public get channelNames(): string[] {
        let channelNames = _.keys(this.data).sort()
        return channelNames
    }

    public clearErrors(): void {
        this.errors = []
    }

    public terminateWorkers(): void {
        for (let worker of this.workers) {
            worker.terminate()
        }
    }

    private fileLoadComplete(): void {
        let channelsLoaded = _.keys(this.data)
        // If the number of channels loaded is equal to the total number of channels we are done!
        if (channelsLoaded.length == this.numChannels) {
            this.onReady(this)
        }
    }

    private async loadFileData(fData: ImageDataWorkerResult): Promise<void> {
        let chName = fData.chName
        this.width = fData.width
        this.height = fData.height
        this.data[chName] = fData.data
        this.sprites[chName] = imageBitmapToSprite(fData.bitmap)
        this.minmax[chName] = fData.minmax
        this.fileLoadComplete()
    }

    private async loadFileError(fError: { error: string; chName: string }): Promise<void> {
        let err = 'Error loading channel ' + fError.chName + ': ' + fError.error
        console.log(err)
        this.errors.push(fError.chName)
        this.numChannels -= 1
        this.fileLoadComplete()
    }

    public removeChannel(chName: string): void {
        if (chName in this.data) {
            this.numChannels -= 1
            delete this.data[chName]
            delete this.sprites[chName]
            delete this.minmax[chName]
        }
    }

    // Loads a folder in the background using ImageDataWorkers
    public loadFolder(dirName: string, onReady: (imageData: ImageData) => void): void {
        this.onReady = onReady

        let files = fs.readdirSync(dirName)

        let tiffs = files.filter(f => f.endsWith('.tiff') || f.endsWith('.tif'))

        console.log(tiffs)
        // Store the number of tiffs being loaded so we know when all the background workers have finished
        this.numChannels = tiffs.length

        if (tiffs.length == 0) {
            // If no tiffs are present in the directory, just return an empty image data.
            this.onReady(this)
        } else {
            let loadFileData = (data: ImageDataWorkerResult): Promise<void> => this.loadFileData(data)
            let loadFileError = (data: { error: any; chName: string }): Promise<void> => this.loadFileError(data)
            let baseNames = tiffs.map((v: string) => {
                return path.parse(v).name
            })

            // If there are any files with the same names and different extensions then we want to use extension for chNames
            let useExtForChName = baseNames.length !== new Set(baseNames).size

            // Create a webworker for each tiff and return the results to loadFileData.
            tiffs.forEach(f => {
                let worker = new ImageDataWorker()
                worker.addEventListener(
                    'message',
                    function(e: { data: any }) {
                        if ('error' in e.data) {
                            loadFileError(e.data)
                        } else {
                            loadFileData(e.data)
                        }
                    },
                    false,
                )
                worker.postMessage({ useExtForChName: useExtForChName, filepath: path.join(dirName, f) })
                this.workers.push(worker)
            })
        }
    }

    public constructor() {
        this.data = {}
        this.minmax = {}
        this.sprites = {}
        this.workers = []
        this.errors = []
    }
}
