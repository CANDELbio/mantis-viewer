import * as shortId from 'shortid'

import {
    SegmentationStatisticsWorker,
    SegmentationStatisticsWorkerInput,
    SegmentationStatisticsWorkerResult,
    OnSegmentationStatisticsWorkerComplete,
} from './SegmentationStatisticsWorker'

let segmentationStatisticoWorkerPool: SegmentationStatisticsWorker[] = []
let segmentationStatisticWorkerCallbacks: Record<string, OnSegmentationStatisticsWorkerComplete> = {}
const maxSegmentationDataWorkers = navigator.hardwareConcurrency

function onSegmentationStatisticsWorkerComplete(data: SegmentationStatisticsWorkerResult): void {
    let jobId = data.jobId
    segmentationStatisticWorkerCallbacks[jobId](data)
    delete segmentationStatisticWorkerCallbacks[jobId]
}

function getExistingSegmentationStatisticsWorker(): SegmentationStatisticsWorker {
    let worker = segmentationStatisticoWorkerPool.shift()
    if (worker) {
        return worker
    } else {
        // We should never get here.
        throw 'No SegmentationStatisticsWorkers in pool.'
    }
}

function getSegmentationStatisticsWorker(): SegmentationStatisticsWorker {
    let numWorkers = segmentationStatisticoWorkerPool.length
    let worker =
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
    let jobId = shortId.generate()
    input.jobId = jobId
    segmentationStatisticWorkerCallbacks[jobId] = onComplete
    let worker = getSegmentationStatisticsWorker()
    worker.postMessage(input)
}
