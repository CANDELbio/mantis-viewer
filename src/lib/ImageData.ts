import * as _ from 'underscore'
import * as fs from 'fs'
import * as path from 'path'
import { TiffDataMap, MinMaxMap, SpriteMap } from '../interfaces/ImageInterfaces'
import { imageBitmapToSprite } from './GraphicsUtils'
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
        this.width = 0
        this.height = 0
    }

    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (imageData: ImageData) => void

    public get markerNames(): string[] {
        const markerNames = _.keys(this.data).sort()
        return markerNames
    }

    public clearErrors(): void {
        this.errors = []
    }

    private fileLoadComplete(): void {
        const markersLoaded = _.keys(this.data)
        // If the number of markers loaded is equal to the total number of markers we are done!
        if (markersLoaded.length == this.numMarkers) {
            this.onReady(this)
        }
    }

    private async loadImageWorkerResults(imageData: ImageDataWorkerResult, blurPixels: boolean): Promise<void> {
        const markerName = imageData.markerName
        this.width = imageData.width
        this.height = imageData.height
        if (imageData.scaled) this.scaled = imageData.scaled
        this.data[markerName] = imageData.data
        this.sprites[markerName] = imageBitmapToSprite(imageData.bitmap, blurPixels)
        this.minmax[markerName] = imageData.minmax

        // If the tiff that was just read contained multiple images, increase the number of markers we expect
        // and load the additional images in workers.
        const numImages = imageData.numImages
        if (!imageData.input.imageNumber || imageData.input.imageNumber == 0) {
            this.numMarkers += numImages - 1
            for (let i = 1; i < numImages; ++i) {
                this.loadImageInWorker(imageData.input.filepath, imageData.input.useExtInMarkerName, blurPixels, i)
            }
        }
        this.fileLoadComplete()
    }

    private async loadImageWorkerResultsError(imageError: ImageDataWorkerError): Promise<void> {
        const err = imageError.markerName + ': ' + imageError.error
        this.errors.push(err)
        this.numMarkers -= 1
        this.fileLoadComplete()
    }

    private async loadImageWorkerResultsCallback(
        imageData: ImageDataWorkerResult | ImageDataWorkerError,
        blurPixels: boolean,
    ): Promise<void> {
        if ('error' in imageData) {
            this.loadImageWorkerResultsError(imageData)
        } else if ((this.width && this.width != imageData.width) || (this.height && this.height != imageData.height)) {
            this.loadImageWorkerResultsError({
                input: imageData.input,
                markerName: imageData.markerName,
                error: 'Image dimensions do not match.',
            })
        } else if (this.data[imageData.markerName]) {
            this.loadImageWorkerResultsError({
                input: imageData.input,
                markerName: imageData.markerName,
                error: 'Data already loaded for marker.',
            })
        } else {
            this.loadImageWorkerResults(imageData, blurPixels)
        }
    }

    public removeMarker(markerName: string): void {
        if (markerName in this.data) {
            this.numMarkers -= 1
            this.sprites[markerName]?.destroy({ children: true, texture: true, baseTexture: true })
            delete this.sprites[markerName]
            delete this.data[markerName]
            delete this.minmax[markerName]
        }
    }

    private loadImageInWorker(
        filepath: string,
        useExtInMarkerName: boolean,
        blurPixels: boolean,
        imageNumber?: number,
    ): void {
        const onComplete = (data: ImageDataWorkerResult | ImageDataWorkerError): void => {
            this.loadImageWorkerResultsCallback(data, blurPixels)
        }
        submitImageDataJob(
            { useExtInMarkerName: useExtInMarkerName, filepath: filepath, imageNumber: imageNumber },
            onComplete,
        )
    }

    // Loads a folder in the background using ImageDataWorkers
    public loadFolder(dirName: string, blurPixels: boolean, onReady: (imageData: ImageData) => void): void {
        this.onReady = onReady

        const files = fs.readdirSync(dirName)

        const tiffs = files.filter((f) => f.endsWith('.tiff') || f.endsWith('.tif'))

        // Store the number of tiffs being loaded so we know when all the background workers have finished
        this.numMarkers = tiffs.length

        if (tiffs.length == 0) {
            // If no tiffs are present in the directory, just return an empty image data.
            this.onReady(this)
        } else {
            const baseNames = tiffs.map((v: string) => {
                return path.parse(v).name
            })

            // If there are any files with the same names and different extensions then we want to use extension for markerNames
            const useExtInMarkerName = baseNames.length !== new Set(baseNames).size

            tiffs.forEach((f) => {
                this.loadImageInWorker(path.join(dirName, f), useExtInMarkerName, blurPixels)
            })
        }
    }

    public destroyGraphics(): void {
        this.markerNames.forEach((marker: string) => {
            this.removeMarker(marker)
        })
    }
}
