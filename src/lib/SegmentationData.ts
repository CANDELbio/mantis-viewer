import * as PIXI from 'pixi.js'
import { imageBitmapToSprite } from './GraphicsHelper'
import { PixelLocation } from '../interfaces/ImageInterfaces'
import { drawOutlines } from '../lib/GraphicsHelper'
import { SegmentationDataWorkerResult } from '../interfaces/WorkerInterfaces'

import SegmentationWorker = require('worker-loader?name=dist/[name].js!../workers/SegmentationDataWorker')

export class SegmentationData {
    public width: number
    public height: number
    public data: Float32Array | Uint16Array | Uint8Array
    public segmentIds: number[]
    // Mapping of a stringified pixel location (i.e. x_y) to a segmentId
    public pixelMap: Record<string, number>
    // Mapping of a segmentId to pixel indices.
    public segmentIndexMap: Record<number, number[]>
    // Mapping of a segmentId to pixel locations (x, y)
    public segmentLocationMap: Record<number, PixelLocation[]>
    // Mapping of a segmentId to pixel locations (x, y) representing the convex hull
    public segmentOutlineMap: Record<number, PixelLocation[]>
    // Mapping of segmentId to the pixel that represents the centroid
    public centroidMap: Record<number, PixelLocation>
    // PIXI Sprite of random colored fills for the segments
    public segmentFillSprite: PIXI.Sprite

    public errorLoading: boolean

    private worker: SegmentationWorker
    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (segmentationData: SegmentationData) => void

    public segmentOutlineGraphics(color: number, width: number, segments?: number[]): PIXI.Graphics {
        let outlines = []
        for (let segment in this.segmentOutlineMap) {
            let segmentId = Number(segment)
            if (segments) {
                if (segments.indexOf(segmentId) != -1) outlines.push(this.segmentOutlineMap[segmentId])
            } else {
                outlines.push(this.segmentOutlineMap[segmentId])
            }
        }
        return drawOutlines(outlines, color, width)
    }

    public terminateWorker(): void {
        this.worker.terminate()
    }

    private async loadFileError(fError: { error: string }): Promise<void> {
        let err = 'Error loading segmentation data: ' + fError.error
        console.log(err)
        this.errorLoading = true
        this.onReady(this)
    }

    private async loadFileData(fData: SegmentationDataWorkerResult): Promise<void> {
        this.width = fData.width
        this.height = fData.height
        this.data = fData.data
        this.pixelMap = fData.pixelMap
        this.segmentIndexMap = fData.segmentIndexMap
        this.segmentLocationMap = fData.segmentLocationMap
        this.segmentOutlineMap = fData.segmentOutlineMap
        this.centroidMap = fData.centroidMap
        this.segmentIds = Object.keys(this.centroidMap).map((value: string) => {
            return parseInt(value)
        })
        this.segmentFillSprite = imageBitmapToSprite(fData.fillBitmap)
        this.onReady(this)
    }

    private loadInWorker(message: any, onReady: (SegmentationData: SegmentationData) => void): void {
        this.errorLoading = false
        this.onReady = onReady

        let loadFileData = (data: SegmentationDataWorkerResult): Promise<void> => this.loadFileData(data)
        let loadFileError = (data: { error: any }): Promise<void> => this.loadFileError(data)

        let worker = new SegmentationWorker()
        worker.addEventListener(
            'message',
            function(e: { data: SegmentationDataWorkerResult }) {
                if ('error' in e.data) {
                    loadFileError(e.data)
                } else {
                    loadFileData(e.data)
                }
            },
            false,
        )

        if ('tiffData' in message) {
            worker.postMessage(message, [message.tiffData.buffer])
        } else {
            worker.postMessage(message)
        }

        this.worker = worker
    }

    public loadFile(fName: string, onReady: (SegmentationData: SegmentationData) => void): void {
        this.loadInWorker({ filepath: fName }, onReady)
    }

    public async loadTiffData(
        data: Float32Array | Uint16Array | Uint8Array,
        width: number,
        height: number,
        onReady: (SegmentationData: SegmentationData) => void,
    ): Promise<void> {
        this.loadInWorker({ tiffData: data, width: width, height: height }, onReady)
    }

    public constructor() {}
}
