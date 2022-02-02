import * as PIXI from 'pixi.js'
import { Coordinate } from '../interfaces/ImageInterfaces'
import { drawOutlines } from './GraphicsUtils'
import { UnselectedCentroidColor, SegmentOutlineColor } from '../definitions/UIDefinitions'
import { drawCentroids } from './GraphicsUtils'
import {
    SegmentationDataWorkerResult,
    SegmentationDataWorkerInput,
    SegmentationDataWorkerError,
} from '../workers/SegmentationDataWorker'
import { submitSegmentationDataJob } from '../workers/SegmentationDataWorkerPool'
import { Line } from './pixi/Line'

export class SegmentationData {
    public width: number
    public height: number
    public segmentIds: number[]
    // Mapping of a stringified pixel location (i.e. x_y) to an array of segmentIds
    public pixelMap: Record<string, number[]>
    // Mapping of a segmentId to pixel indices.
    public segmentIndexMap: Record<number, number[]>
    // Mapping of a segmentId to pixel locations (x, y) representing the convex hull
    public segmentOutlineMap: Record<number, Coordinate[]>
    // Mapping of segmentId to the pixel that represents the centroid
    public centroidMap: Record<number, Coordinate>
    // PIXI Sprite of random colored fills for the segments
    public fillSprite: PIXI.Sprite
    public outlineGraphics: Line
    public centroidGraphics: PIXI.Graphics

    public errorMessage: string | null

    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (segmentationData: SegmentationData) => void

    public generateOutlines(line: Line, color: number, segments?: number[]): void {
        const outlines = []
        for (const segment in this.segmentOutlineMap) {
            const segmentId = Number(segment)
            if (segments) {
                if (segments.indexOf(segmentId) != -1) outlines.push(this.segmentOutlineMap[segmentId])
            } else {
                outlines.push(this.segmentOutlineMap[segmentId])
            }
        }
        drawOutlines(line, outlines, color)
    }

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

    private async loadFileData(fData: SegmentationDataWorkerResult): Promise<void> {
        this.width = fData.width
        this.height = fData.height
        this.pixelMap = fData.pixelMap
        this.segmentIndexMap = fData.segmentIndexMap
        this.segmentOutlineMap = fData.segmentOutlineMap
        this.centroidMap = fData.centroidMap
        this.segmentIds = Object.keys(this.centroidMap).map((value) => parseInt(value))
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.fillSprite = PIXI.Sprite.from(fData.fillBitmap)

        // Comment/uncomment following four lines to switch between graphics and line
        this.outlineGraphics = new Line()
        this.generateOutlines(this.outlineGraphics, SegmentOutlineColor)

        // Comment/uncomment following two lines to switch between graphics and line
        // this.outlineGraphics = new PIXI.Graphics()
        // this.generateOutlineGraphics(this.outlineGraphics, SegmentOutlineColor, SegmentOutlineWidth)
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

    public destroyGraphics(): void {
        const destroyOptions = { children: true, texture: true, baseTexture: true }
        this.fillSprite.destroy(destroyOptions)
        this.outlineGraphics.destroy(destroyOptions)
        this.centroidGraphics.destroy(destroyOptions)
    }
}
