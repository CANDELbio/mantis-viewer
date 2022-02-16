import { PlotStatistic, AreaStatistic } from '../definitions/UIDefinitions'

export type SegmentFeatureCalculatorInput = SegmentStatisticRequest | SegmentAreaRequest

interface SegmentStatisticRequest {
    jobId?: string
    basePath: string
    imageSetName: string
    marker: string
    tiffData: Float32Array | Uint16Array | Uint8Array
    segmentIndexMap: Record<number, number[]>
    statistic: PlotStatistic
}

interface SegmentAreaRequest {
    jobId?: string
    basePath: string
    imageSetName: string
    segmentIndexMap: Record<number, number[]>
    statistic: AreaStatistic
}

export type SegmentFeatureCalculatorResult = SegmentStatisticResult | SegmentAreaResult

interface SegmentStatisticResult {
    jobId?: string
    statistic: PlotStatistic
    statisticMap: Record<string, number>
    marker: string
}

interface SegmentAreaResult {
    jobId?: string
    statistic: AreaStatistic
    statisticMap: Record<string, number>
}

export type OnSegmentFeatureCalculatorComplete = (data: SegmentFeatureCalculatorResult) => void

export class SegmentFeatureCalculator {
    private worker: Worker

    public constructor(onComplete: OnSegmentFeatureCalculatorComplete) {
        this.worker = new Worker(new URL('../workers/SegmentFeatureCalculator.worker.ts', import.meta.url))

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
