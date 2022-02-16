import { Coordinate } from '../interfaces/ImageInterfaces'

export interface SegmentationDataWorkerInput {
    filepath: string
    width: number
    height: number
    optimizeFile: boolean
}

export interface SegmentationDataWorkerResult {
    filepath: string
    width: number
    height: number
    // Mapping of a stringified pixel location (i.e. x_y) to a segmentId
    pixelMap: Record<string, number[]>
    // Mapping of a segmentId to pixel indices.
    segmentIndexMap: Record<number, number[]>
    // Mapping of a segmentId to pixel locations (x, y) representing the convex hull
    segmentOutlineMap: Record<number, Coordinate[]>
    // Mapping of segmentId to the pixel that represents the centroid
    centroidMap: Record<number, Coordinate>
    // Bitmap of segment fill
    fillBitmap: ImageBitmap
}

export interface SegmentationDataWorkerError {
    filepath: string
    error: string
}

export type OnSegmentationDataWorkerComplete = (
    data: SegmentationDataWorkerResult | SegmentationDataWorkerError,
) => void

export class SegmentationDataWorker {
    private worker: Worker

    public constructor(onComplete: OnSegmentationDataWorkerComplete) {
        this.worker = new Worker(new URL('../workers/SegmentationDataWorker.worker.ts', import.meta.url))
        this.worker.addEventListener(
            'message',
            function (e: { data: SegmentationDataWorkerResult | SegmentationDataWorkerError }) {
                onComplete(e.data)
            },
            false,
        )
    }

    public terminate(): void {
        this.worker.terminate
    }

    public postMessage(message: SegmentationDataWorkerInput): void {
        this.worker.postMessage(message)
    }
}
