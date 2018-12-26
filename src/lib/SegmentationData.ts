import * as PIXI from "pixi.js"
import { imageBitmapToSprite } from "./GraphicsHelper"
import { PixelLocation } from "../interfaces/ImageInterfaces"
import { drawOutlines } from "../lib/GraphicsHelper"
import { SegmentationDataWorkerResult } from "../interfaces/ImageInterfaces"

import SegmentationWorker = require("worker-loader?name=dist/[name].js!../workers/SegmentationDataWorker")

export class SegmentationData {
    width: number
    height: number
    data: Float32Array | Uint16Array | Uint8Array
    // Mapping of a stringified pixel location (i.e. x_y) to a segmentId
    pixelMap: Record<string, number>
    // Mapping of a segmentId to pixel indices.
    segmentIndexMap: Record<number, number[]>
    // Mapping of a segmentId to pixel locations (x, y)
    segmentLocationMap: Record<number, PixelLocation[]>
    // Mapping of a segmentId to pixel locations (x, y) representing the convex hull
    segmentOutlineMap: Record<number, PixelLocation[]>
    // Mapping of segmentId to the pixel that represents the centroid
    centroidMap: Record<number, PixelLocation>
    // PIXI Sprite of random colored fills for the segments
    segmentFillSprite: PIXI.Sprite

    errorLoading: boolean

    private worker: SegmentationWorker
    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (segmentationData: SegmentationData) => void

    public segmentOutlineGraphics(color: number, width: number, segments?:number[]) {
        let outlines = []
        for(let segment in this.segmentOutlineMap){
            let segmentId = Number(segment)
            if(segments){
                if(segments.indexOf(segmentId) != -1) outlines.push(this.segmentOutlineMap[segmentId])
            } else {
                outlines.push(this.segmentOutlineMap[segmentId])
            }
        }
        return drawOutlines(outlines, color, width)
    }

    terminateWorker() {
        this.worker.terminate()
    }

    private async loadFileError(fError: {error: string}){
        let err = "Error loading segmentation data: " + fError.error
        console.log(err)
        this.errorLoading = true
        this.onReady(this)
    }

    private async loadFileData(fData: SegmentationDataWorkerResult){
        this.width = fData.width
        this.height = fData.height
        this.data = fData.data
        this.pixelMap = fData.pixelMap
        this.segmentIndexMap = fData.segmentIndexMap
        this.segmentLocationMap = fData.segmentLocationMap
        this.segmentOutlineMap = fData.segmentOutlineMap
        this.centroidMap = fData.centroidMap
        this.segmentFillSprite = imageBitmapToSprite(fData.fillBitmap)
        this.onReady(this)
    }

    private loadInWorker(message: any, onReady: (SegmentationData: SegmentationData) => void) {
        this.errorLoading = false
        this.onReady = onReady

        let loadFileData = (data: SegmentationDataWorkerResult) => this.loadFileData(data)
        let loadFileError = (data: {error: any}) => this.loadFileError(data)

        let worker = new SegmentationWorker()
        worker.addEventListener('message', function(e: {data: SegmentationDataWorkerResult}) {
            if('error' in e.data){
                loadFileError(e.data)
            } else {
                loadFileData(e.data)
            }
        }, false)

        if('tiffData' in message){
            worker.postMessage(message, [message.tiffData.buffer])
        } else {
            worker.postMessage(message)
        }

        this.worker = worker
    }

    loadFile(fName:string, onReady: (SegmentationData: SegmentationData) => void) {
        this.loadInWorker({filepath: fName}, onReady)
    }

    async loadTiffData(data: Float32Array | Uint16Array | Uint8Array, width: number, height: number, onReady: (SegmentationData: SegmentationData) => void) {
        this.loadInWorker({tiffData: data, width: width, height: height}, onReady)
    }

    constructor() {
    }

}
