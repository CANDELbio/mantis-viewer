import Worker = require('worker-loader?name=dist/[name].js!../workers/SegmentFeatureCalculator.worker')
import { PlotStatistic } from '../definitions/UIDefinitions'
import { MinMax } from '../interfaces/ImageInterfaces'

export interface SegmentFeatureCalculatorInput {
    jobId?: string
    basePath: string
    imageSetName: string
    marker: string
    tiffData: Float32Array | Uint16Array | Uint8Array
    segmentIndexMap: Record<number, number[]>
    statistic: PlotStatistic
}

export interface SegmentFeatureCalculatorResult extends SegmentFeatureResult {
    jobId: string
}

export interface SegmentFeatureResult {
    statistic: PlotStatistic
    statisticMap: Record<string, number>
    minMax: MinMax
    markerName: string
}

export type OnSegmentFeatureCalculatorComplete = (data: SegmentFeatureCalculatorResult) => void

export class SegmentFeatureCalculator {
    private worker: Worker

    public constructor(onComplete: OnSegmentFeatureCalculatorComplete) {
        this.worker = new Worker()
        this.worker.addEventListener(
            'message',
            function (e: { data: SegmentFeatureCalculatorResult }) {
                onComplete(e.data)
            },
            false,
        )
    }

    public terminate(): void {
        this.worker.terminate
    }

    public postMessage(message: SegmentFeatureCalculatorInput): void {
        this.worker.postMessage(message)
    }
}
