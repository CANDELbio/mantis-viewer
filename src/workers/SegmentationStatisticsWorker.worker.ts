/* eslint @typescript-eslint/no-explicit-any: 0 */

import { PlotStatistic } from '../definitions/UIDefinitions'
import { SegmentationStatisticsWorkerInput } from './SegmentationStatisticsWorker'
import { calculateMean, calculateMedian } from '../lib/StatsHelper'

//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

function meanPixelIntensity(tiffData: Float32Array | Uint16Array | Uint8Array, pixels: number[]): number {
    const values = []
    for (const curPixel of pixels) {
        values.push(tiffData[curPixel])
    }
    return calculateMean(values)
}

function medianPixelIntensity(tiffData: Float32Array | Uint16Array | Uint8Array, pixels: number[]): number {
    const values = []
    for (const curPixel of pixels) {
        values.push(tiffData[curPixel])
    }
    return calculateMedian(values)
}

function generateStatisticMap(
    tiffData: Float32Array | Uint16Array | Uint8Array,
    segmentIndexMap: Record<number, number[]>,
    statistic: PlotStatistic,
): Record<number, number> {
    const statisticMap: Record<string, number> = {}
    for (const segmentId in segmentIndexMap) {
        let curIntensity: number | null = null
        if (statistic == 'mean') {
            curIntensity = meanPixelIntensity(tiffData, segmentIndexMap[segmentId])
        } else if (statistic == 'median') {
            curIntensity = medianPixelIntensity(tiffData, segmentIndexMap[segmentId])
        }
        if (curIntensity != null) {
            statisticMap[segmentId] = curIntensity
        }
    }
    return statisticMap
}

ctx.addEventListener(
    'message',
    (message) => {
        const data: SegmentationStatisticsWorkerInput = message.data
        const map = generateStatisticMap(data.tiffData, data.segmentIndexMap, data.statistic)

        ctx.postMessage({
            jobId: data.jobId,
            statistic: data.statistic,
            markerName: data.marker,
            statisticMap: map,
        })
    },
    false,
)
