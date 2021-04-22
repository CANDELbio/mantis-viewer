import * as shortId from 'shortid'

import {
    SegmentFeatureCalculator,
    SegmentFeatureCalculatorInput,
    SegmentFeatureCalculatorResult,
    OnSegmentFeatureCalculatorComplete,
} from './SegmentFeatureCalculator'

const segmentFeatureCalculatorPool: SegmentFeatureCalculator[] = []
const segmentFeatureCalculatorCallbacks: Record<string, OnSegmentFeatureCalculatorComplete> = {}
const maxWorkers = navigator.hardwareConcurrency

function onSegmentFeatureCalculatorComplete(data: SegmentFeatureCalculatorResult): void {
    const jobId = data.jobId
    if (jobId) {
        segmentFeatureCalculatorCallbacks[jobId](data)
        delete segmentFeatureCalculatorCallbacks[jobId]
    }
}

function getExistingSegmentFeatureCalculator(): SegmentFeatureCalculator {
    const worker = segmentFeatureCalculatorPool.shift()
    if (worker) {
        return worker
    } else {
        // We should never get here.
        throw 'No SegmentFeatureCalculators in pool.'
    }
}

function getSegmentFeatureCalculator(): SegmentFeatureCalculator {
    const numWorkers = segmentFeatureCalculatorPool.length
    const worker =
        numWorkers < maxWorkers
            ? new SegmentFeatureCalculator(onSegmentFeatureCalculatorComplete)
            : getExistingSegmentFeatureCalculator()
    segmentFeatureCalculatorPool.push(worker)
    return worker
}

export function submitJob(input: SegmentFeatureCalculatorInput, onComplete: OnSegmentFeatureCalculatorComplete): void {
    const jobId = shortId.generate()
    input.jobId = jobId
    segmentFeatureCalculatorCallbacks[jobId] = onComplete
    const worker = getSegmentFeatureCalculator()
    worker.postMessage(input)
}
