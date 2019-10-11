import * as _ from 'underscore'
import * as fs from 'fs'
import * as path from 'path'
import { TiffDataMap, MinMaxMap, SpriteMap } from '../interfaces/ImageInterfaces'
import { imageBitmapToSprite } from './GraphicsHelper'
import { ImageDataWorkerResult, ImageDataWorkerError } from '../workers/ImageDataWorker'
import { submitImageDataJob } from '../workers/ImageDataWorkerPool'

// Class to store ImageData
// Needs to have loadFolder invoked after creation to actually load and store data.
export class ImageData {
    public data: TiffDataMap
    public minmax: MinMaxMap
    public sprites: SpriteMap

    public width: number
    public height: number

    public scaled: boolean

    public errors: string[]

    // Keep track of the number of markers. Used to know when all workers have completed.
    private numMarkers: number

    public constructor() {
        this.data = {}
        this.minmax = {}
        this.sprites = {}
        this.errors = []
        this.scaled = false
    }

    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (imageData: ImageData) => void

    public get markerNames(): string[] {
        let markerNames = _.keys(this.data).sort()
        return markerNames
    }

    public clearErrors(): void {
        this.errors = []
    }

    private fileLoadComplete(): void {
        let markersLoaded = _.keys(this.data)
        // If the number of markers loaded is equal to the total number of markers we are done!
        if (markersLoaded.length == this.numMarkers) {
            this.onReady(this)
        }
    }

    private async loadFileData(fData: ImageDataWorkerResult): Promise<void> {
        let markerName = fData.markerName
        this.width = fData.width
        this.height = fData.height
        if (fData.scaled) this.scaled = fData.scaled
        this.data[markerName] = fData.data
        this.sprites[markerName] = imageBitmapToSprite(fData.bitmap)
        this.minmax[markerName] = fData.minmax
        this.fileLoadComplete()
    }

    private async loadFileError(fError: { error: string; markerName: string }): Promise<void> {
        let err = 'Error loading marker ' + fError.markerName + ': ' + fError.error
        console.log(err)
        this.errors.push(fError.markerName)
        this.numMarkers -= 1
        this.fileLoadComplete()
    }

    public removeMarker(markerName: string): void {
        if (markerName in this.data) {
            this.numMarkers -= 1
            delete this.data[markerName]
            delete this.sprites[markerName]
            delete this.minmax[markerName]
        }
    }

    // Loads a folder in the background using ImageDataWorkers
    public loadFolder(dirName: string, onReady: (imageData: ImageData) => void): void {
        this.onReady = onReady

        let files = fs.readdirSync(dirName)

        let tiffs = files.filter(f => f.endsWith('.tiff') || f.endsWith('.tif'))

        // Store the number of tiffs being loaded so we know when all the background workers have finished
        this.numMarkers = tiffs.length

        if (tiffs.length == 0) {
            // If no tiffs are present in the directory, just return an empty image data.
            this.onReady(this)
        } else {
            let onComplete = (data: ImageDataWorkerResult | ImageDataWorkerError): void => {
                if ('error' in data) {
                    this.loadFileError(data)
                } else {
                    this.loadFileData(data)
                }
            }

            let baseNames = tiffs.map((v: string) => {
                return path.parse(v).name
            })

            // If there are any files with the same names and different extensions then we want to use extension for markerNames
            let useExtForMarkerName = baseNames.length !== new Set(baseNames).size

            tiffs.forEach(f => {
                submitImageDataJob(
                    { useExtForMarkerName: useExtForMarkerName, filepath: path.join(dirName, f) },
                    onComplete,
                )
            })
        }
    }
}
