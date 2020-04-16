import * as shortId from 'shortid'

import {
    SegmentationStatisticsWorker,
    SegmentationStatisticsWorkerInput,
    SegmentationStatisticsWorkerResult,
    OnSegmentationStatisticsWorkerComplete,
} from './SegmentationStatisticsWorker'

const segmentationStatisticoWorkerPool: SegmentationStatisticsWorker[] = []
const segmentationStatisticWorkerCallbacks: Record<string, OnSegmentationStatisticsWorkerComplete> = {}
const maxSegmentationDataWorkers = navigator.hardwareConcurrency

function onSegmentationStatisticsWorkerComplete(data: SegmentationStatisticsWorkerResult): void {
    const jobId = data.jobId
    segmentationStatisticWorkerCallbacks[jobId](data)
    delete segmentationStatisticWorkerCallbacks[jobId]
}

function getExistingSegmentationStatisticsWorker(): SegmentationStatisticsWorker {
    const worker = segmentationStatisticoWorkerPool.shift()
    if (worker) {
        return worker
    } else {
        // We should never get here.
        throw 'No SegmentationStatisticsWorkers in pool.'
    }
}

function getSegmentationStatisticsWorker(): SegmentationStatisticsWorker {
    const numWorkers = segmentationStatisticoWorkerPool.length
    const worker =
        numWorkers < maxSegmentationDataWorkers
            ? new SegmentationStatisticsWorker(onSegmentationStatisticsWorkerComplete)
            : getExistingSegmentationStatisticsWorker()
    segmentationStatisticoWorkerPool.push(worker)
    return worker
}

export function submitSegmentationStatisticsJob(
    input: SegmentationStatisticsWorkerInput,
    onComplete: OnSegmentationStatisticsWorkerComplete,
): void {
    const jobId = shortId.generate()
    input.jobId = jobId
    segmentationStatisticWorkerCallbacks[jobId] = onComplete
    const worker = getSegmentationStatisticsWorker()
    worker.postMessage(input)
}
