/* eslint @typescript-eslint/no-explicit-any: 0 */

import { PlotStatistic } from '../definitions/UIDefinitions'
import { SegmentFeatureCalculatorInput } from './SegmentFeatureCalculator'
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
    // Find the median! Sort the intensity values by intensity.
}

function generateStatisticMap(
    marker: string,
    tiffData: Float32Array | Uint16Array | Uint8Array,
    segmentIndexMap: Record<number, number[]>,
    statistic: PlotStatistic,
): { statisticMap: Record<string, number>; minMax: { min: number | null; max: number | null } } {
    let min: number | null = null
    let max: number | null = null
    const statisticMap: Record<number, number> = {}
    for (const segmentId in segmentIndexMap) {
        let curIntensity: number | null = null
        if (statistic == 'mean') {
            curIntensity = meanPixelIntensity(tiffData, segmentIndexMap[segmentId])
        } else if (statistic == 'median') {
            curIntensity = medianPixelIntensity(tiffData, segmentIndexMap[segmentId])
        }
        if (curIntensity != null) {
            statisticMap[segmentId] = curIntensity
            // Calculate the min and max for this marker
            if (min == null) min = curIntensity
            if (max == null) max = curIntensity
            if (curIntensity < min) min = curIntensity
            if (curIntensity > max) max = curIntensity
        }
    }
    return { statisticMap: statisticMap, minMax: { min: min, max: max } }
}

ctx.addEventListener(
    'message',
    (message) => {
        const data: SegmentFeatureCalculatorInput = message.data
        const { statisticMap, minMax } = generateStatisticMap(
            data.marker,
            data.tiffData,
            data.segmentIndexMap,
            data.statistic,
        )
        ctx.postMessage({
            jobId: data.jobId,
            statistic: data.statistic,
            statisticMap: statisticMap,
            minMax: minMax,
            markerName: data.marker,
        })
    },
    false,
)
