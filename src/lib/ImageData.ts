import * as parseCSV from 'csv-parse/lib/sync'
import * as fs from 'fs'
import * as path from 'path'

import { FileInfoMap, MinMaxMap, BitmapMap } from '../interfaces/ImageInterfaces'
import { ImageDataWorkerResult, ImageDataWorkerError } from '../workers/ImageDataWorker'
import { submitImageDataJob } from '../workers/ImageDataWorkerPool'

// Class to store ImageData
// Needs to have loadFolder invoked after creation to actually load and store data.
export class ImageData {
    public markerNames: string[]
    public fileInfo: FileInfoMap
    public minmax: MinMaxMap
    public bitmaps: BitmapMap

    public width: number
    public height: number

    public scaled: boolean

    public errors: string[]

    private markerNamesOverride: string[]

    // Keep track of the number of markers. Used to know when all workers have completed.
    private numMarkers: number

    public constructor() {
        this.markerNames = []
        this.fileInfo = {}
        this.minmax = {}
        this.bitmaps = {}
        this.errors = []
        this.markerNamesOverride = []
        this.scaled = false
        this.width = 0
        this.height = 0
    }

    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (imageData: ImageData) => void

    public clearErrors(): void {
        this.errors = []
    }

    private fileLoadComplete(): void {
        // If the number of markers loaded is equal to the total number of markers we are done!
        if (this.markerNames.length == this.numMarkers) {
            this.markerNames = this.markerNames.sort()
            this.onReady(this)
        }
    }

    private async loadImageWorkerResults(imageData: ImageDataWorkerResult): Promise<void> {
        const markerName = imageData.markerName
        this.width = imageData.width
        this.height = imageData.height
        if (imageData.scaled) this.scaled = imageData.scaled
        this.markerNames.push(markerName)
        this.fileInfo[markerName] = { path: imageData.input.filepath, imageNumber: imageData.input.imageNumber }
        this.bitmaps[markerName] = imageData.bitmap
        this.minmax[markerName] = imageData.minmax

        // If the tiff that was just read contained multiple images, increase the number of markers we expect
        // and load the additional images in workers.
        const numImages = imageData.numImages
        if (!imageData.input.imageNumber || imageData.input.imageNumber == 0) {
            this.numMarkers += numImages - 1
            for (let i = 1; i < numImages; ++i) {
                this.loadImageInWorker(imageData.input.filepath, imageData.input.useExtInMarkerName, i)
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
    ): Promise<void> {
        if ('numImages' in imageData) {
            const imageNumber = imageData.input.imageNumber
            const markerNameOverride = this.markerNamesOverride[imageNumber]
            if (markerNameOverride) imageData.markerName = markerNameOverride
        }
        if ('error' in imageData) {
            this.loadImageWorkerResultsError(imageData)
        } else if ((this.width && this.width != imageData.width) || (this.height && this.height != imageData.height)) {
            this.loadImageWorkerResultsError({
                input: imageData.input,
                markerName: imageData.markerName,
                error: 'Image dimensions do not match.',
            })
        } else if (this.markerNames.indexOf(imageData.markerName) != -1) {
            let deduplicatedMarkerName = imageData.markerName
            let i = 2
            while (this.markerNames.indexOf(deduplicatedMarkerName) != -1) {
                deduplicatedMarkerName = `${imageData.markerName}_${i}`
                i++
            }
            imageData.markerName = deduplicatedMarkerName
            this.loadImageWorkerResults(imageData)
        } else {
            this.loadImageWorkerResults(imageData)
        }
    }

    public removeMarker(markerName: string): void {
        if (this.markerNames.includes(markerName)) {
            this.numMarkers -= 1
            delete this.bitmaps[markerName]
            delete this.minmax[markerName]
            this.markerNames = this.markerNames.filter((curMarkerName) => curMarkerName !== markerName)
        }
    }

    private loadImageInWorker(filepath: string, useExtInMarkerName: boolean, imageNumber: number): void {
        const onComplete = (data: ImageDataWorkerResult | ImageDataWorkerError): void => {
            this.loadImageWorkerResultsCallback(data)
        }
        submitImageDataJob(
            { useExtInMarkerName: useExtInMarkerName, filepath: filepath, imageNumber: imageNumber },
            onComplete,
        )
    }

    private parseMarkerNamesOverride(markerNamesOverridePath: string | null): void {
        if (markerNamesOverridePath && fs.existsSync(markerNamesOverridePath)) {
            const input = fs.readFileSync(markerNamesOverridePath, 'utf8')
            const records: string[][] = parseCSV(input, { columns: false })
            this.markerNamesOverride = []
            for (const row of records) {
                this.markerNamesOverride.push(row[0])
            }
        }
    }

    // Loads a folder in the background using ImageDataWorkers
    public loadFolder(
        dirName: string,
        markerNamesOverridePath: string | null,
        onReady: (imageData: ImageData) => void,
    ): void {
        this.onReady = onReady

        const files = fs.readdirSync(dirName)

        const tiffs = files.filter((f) => f.endsWith('.tiff') || f.endsWith('.tif'))

        // Store the number of tiffs being loaded so we know when all the background workers have finished
        this.numMarkers = tiffs.length

        if (tiffs.length == 0) {
            // If no tiffs are present in the directory, just return an empty image data.
            this.onReady(this)
        } else {
            this.parseMarkerNamesOverride(markerNamesOverridePath)

            const baseNames = tiffs.map((v: string) => {
                return path.parse(v).name
            })

            // If there are any files with the same names and different extensions then we want to use extension for markerNames
            const useExtInMarkerName = baseNames.length !== new Set(baseNames).size

            tiffs.forEach((f) => {
                this.loadImageInWorker(path.join(dirName, f), useExtInMarkerName, 0)
            })
        }
    }

    public destroyGraphics(): void {
        this.markerNames.forEach((marker: string) => {
            this.removeMarker(marker)
        })
    }
}
