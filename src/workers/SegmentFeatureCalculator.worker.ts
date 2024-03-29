/* eslint @typescript-eslint/no-explicit-any: 0 */

import { SegmentFeatureCalculatorInput } from './SegmentFeatureCalculator'
import { PlotStatistic, AreaStatistic } from '../definitions/UIDefinitions'
import { calculateMean, calculateMedian, calculateNumZero, calculateSum } from '../lib/StatsUtils'
import { readTiffData } from '../lib/TiffUtils'

//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

function meanSegmentIntensity(tiffData: Float32Array | Uint16Array | Uint8Array, pixels: number[]): number {
    const values = []
    for (const curPixel of pixels) {
        values.push(tiffData[curPixel])
    }
    return calculateMean(values)
}

function medianSegmentIntensity(tiffData: Float32Array | Uint16Array | Uint8Array, pixels: number[]): number {
    const values = []
    for (const curPixel of pixels) {
        values.push(tiffData[curPixel])
    }
    return calculateMedian(values)
}

function sumSegmentIntensity(tiffData: Float32Array | Uint16Array | Uint8Array, pixels: number[]): number {
    const values = []
    for (const curPixel of pixels) {
        values.push(tiffData[curPixel])
    }
    return calculateSum(values)
}

function numZeroSegmentIntensity(tiffData: Float32Array | Uint16Array | Uint8Array, pixels: number[]): number {
    const values = []
    for (const curPixel of pixels) {
        values.push(tiffData[curPixel])
    }
    return calculateNumZero(values)
}

function generateFeatureMap(
    statistic: PlotStatistic | AreaStatistic,
    segmentIndexMap: Record<number, number[]>,
    tiffData?: Float32Array | Uint16Array | Uint8Array,
): Record<string, number> {
    const featureMap: Record<number, number> = {}
    for (const segmentId in segmentIndexMap) {
        let curFeature: number | null = null
        if (statistic == 'mean' && tiffData) {
            curFeature = meanSegmentIntensity(tiffData, segmentIndexMap[segmentId])
        } else if (statistic == 'median' && tiffData) {
            curFeature = medianSegmentIntensity(tiffData, segmentIndexMap[segmentId])
        } else if (statistic == 'sum' && tiffData) {
            curFeature = sumSegmentIntensity(tiffData, segmentIndexMap[segmentId])
        } else if (statistic == 'num0' && tiffData) {
            curFeature = numZeroSegmentIntensity(tiffData, segmentIndexMap[segmentId])
        } else if (statistic == 'area') {
            curFeature = segmentIndexMap[segmentId].length
        } else {
            throw new Error('Improper Segment Feature Request')
        }
        if (curFeature != null) {
            featureMap[segmentId] = curFeature
        }
    }
    return featureMap
}

ctx.addEventListener(
    'message',
    (message) => {
        const data: SegmentFeatureCalculatorInput = message.data
        if (data.statistic == 'area') {
            const statisticMap = generateFeatureMap(data.statistic, data.segmentIndexMap)
            ctx.postMessage({
                jobId: data.jobId,
                statistic: data.statistic,
                statisticMap: statisticMap,
            })
        } else {
            readTiffData(data.tiffFileInfo.path, data.tiffFileInfo.imageNumber).then((tiffData) => {
                const statisticMap = generateFeatureMap(data.statistic, data.segmentIndexMap, tiffData.data)
                ctx.postMessage({
                    jobId: data.jobId,
                    statistic: data.statistic,
                    statisticMap: statisticMap,
                    marker: data.marker,
                })
            })
        }
    },
    false,
)
