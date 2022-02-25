import * as PIXI from 'pixi.js'
import { Coordinate } from '../interfaces/ImageInterfaces'
import { UnselectedCentroidColor } from '../definitions/UIDefinitions'
import { drawCentroids } from './GraphicsUtils'
import {
    SegmentationDataWorkerResult,
    SegmentationDataWorkerInput,
    SegmentationDataWorkerError,
} from '../workers/SegmentationDataWorker'
import { submitSegmentationDataJob } from '../workers/SegmentationDataWorkerPool'

export class SegmentationData {
    public width: number
    public height: number
    public segmentIds: number[]
    // Mapping of segment IDs to their index in the segment ID array.
    // Used to update colors in the segment outline map
    public idIndexMap: Record<number, number>
    // Mapping of a stringified pixel location (i.e. x_y) to an array of segmentIds
    public pixelMap: Record<string, number[]>
    // Mapping of a segmentId to pixel indices.
    public pixelIndexMap: Record<number, number[]>
    // An array of segment coordinates to use for creating a PIXI Line object.
    public segmentCoordinates: Coordinate[][]
    // Mapping of segmentId to the pixel that represents the centroid
    public centroidMap: Record<number, Coordinate>
    // PIXI Sprite of random colored fills for the segments
    public fillBitmap: ImageBitmap
    public centroidGraphics: PIXI.Graphics

    // Used to surface any error messages that occur during importing segmentation data.
    public errorMessage: string | null

    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (segmentationData: SegmentationData) => void

    public segmentsInRegion(regionPixelIndexes: number[]): number[] {
        const segments: number[] = []
        const centroidMap = this.centroidMap
        const indexSet: Set<number> = new Set(regionPixelIndexes)
        for (const segmentIdStr in centroidMap) {
            const segmentId = parseInt(segmentIdStr)
            const centroidLocation = centroidMap[segmentIdStr]
            const centroidIndex = centroidLocation.y * this.width + centroidLocation.x
            if (indexSet.has(centroidIndex)) segments.push(segmentId)
        }
        return segments
    }

    private async loadFileError(fError: { error: string }): Promise<void> {
        const err = 'Error loading segmentation data: ' + fError.error
        console.log(err)
        this.errorMessage = err
        this.onReady(this)
    }

    private generateSegmentCoordinates = (
        segmentIds: number[],
        outlineMap: Record<number, Coordinate[]>,
    ): Coordinate[][] => {
        const coordinates = []
        for (const segmentId of segmentIds) {
            coordinates.push(outlineMap[segmentId])
        }
        return coordinates
    }

    private async loadFileData(fData: SegmentationDataWorkerResult): Promise<void> {
        this.width = fData.width
        this.height = fData.height
        this.pixelMap = fData.pixelMap
        this.pixelIndexMap = fData.segmentIndexMap
        this.centroidMap = fData.centroidMap
        this.segmentIds = Object.keys(this.pixelIndexMap).map((value) => parseInt(value))
        this.segmentCoordinates = this.generateSegmentCoordinates(this.segmentIds, fData.segmentOutlineMap)
        this.idIndexMap = {}
        this.segmentIds.forEach((segmentId: number, index: number) => {
            this.idIndexMap[segmentId] = index
        })
        this.fillBitmap = fData.fillBitmap

        this.centroidGraphics = drawCentroids(this.centroidMap, UnselectedCentroidColor)
        this.onReady(this)
    }

    private loadInWorker(
        message: SegmentationDataWorkerInput,
        onReady: (SegmentationData: SegmentationData) => void,
    ): void {
        this.errorMessage = null
        this.onReady = onReady

        const onComplete = (data: SegmentationDataWorkerResult | SegmentationDataWorkerError): void => {
            if ('error' in data) {
                this.loadFileError(data)
            } else this.loadFileData(data)
        }

        submitSegmentationDataJob(message, onComplete)
    }

    public loadFile(
        fName: string,
        width: number,
        height: number,
        optimize: boolean,
        onReady: (SegmentationData: SegmentationData) => void,
    ): void {
        this.loadInWorker({ filepath: fName, width: width, height: height, optimizeFile: optimize }, onReady)
    }

    public destroyGraphics(destroyOptions: PIXI.IDestroyOptions): void {
        this.centroidGraphics.destroy(destroyOptions)
    }
}
