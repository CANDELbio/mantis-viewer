import Worker = require('worker-loader?name=dist/[name].js!../workers/SegmentationStatisticsWorker.worker')
import { PlotStatistic } from '../definitions/UIDefinitions'

export interface SegmentationStatisticsWorkerInput {
    jobId?: string
    basePath: string
    imageSetName: string
    marker: string
    tiffData: Float32Array | Uint16Array | Uint8Array
    segmentIndexMap: Record<number, number[]>
    statistic: PlotStatistic
}

export interface SegmentationStatisticsWorkerResult {
    jobId: string
    statistic: PlotStatistic
    markerName: string
}

export type OnSegmentationStatisticsWorkerComplete = (data: SegmentationStatisticsWorkerResult) => void

export class SegmentationStatisticsWorker {
    private worker: Worker

    public constructor(onComplete: OnSegmentationStatisticsWorkerComplete) {
        this.worker = new Worker()
        this.worker.addEventListener(
            'message',
            function (e: { data: SegmentationStatisticsWorkerResult }) {
                onComplete(e.data)
            },
            false,
        )
    }

    public terminate(): void {
        this.worker.terminate
    }

    public postMessage(message: SegmentationStatisticsWorkerInput): void {
        this.worker.postMessage(message)
    }
}
