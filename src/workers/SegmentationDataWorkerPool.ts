import {
    SegmentationDataWorker,
    OnSegmentationDataWorkerComplete,
    SegmentationDataWorkerError,
    SegmentationDataWorkerInput,
    SegmentationDataWorkerResult,
} from './SegmentationDataWorker'

const segmentationDataWorkerPool: SegmentationDataWorker[] = []
const segmentationDataWorkerCallbacks: Record<string, OnSegmentationDataWorkerComplete> = {}
const maxSegmentationDataWorkers = 1

function onSegmentationDataComplete(data: SegmentationDataWorkerError | SegmentationDataWorkerResult): void {
    const jobInput = data.filepath
    segmentationDataWorkerCallbacks[jobInput](data)
    delete segmentationDataWorkerCallbacks[jobInput]
}

function getExistingSegmentationDataWorker(): SegmentationDataWorker {
    const worker = segmentationDataWorkerPool.shift()
    if (worker) {
        return worker
    } else {
        // We should never get here.
        // This function will only be called if there are maxImageDataWorkers in imageDataWorkerPool
        // Couldn't think of an elegant way to check for shift() returning undefined.
        throw 'No SegmentationDataWorkers in pool.'
    }
}

function getSegmentationDataWorker(): SegmentationDataWorker {
    const numWorkers = segmentationDataWorkerPool.length
    const worker =
        numWorkers < maxSegmentationDataWorkers
            ? new SegmentationDataWorker(onSegmentationDataComplete)
            : getExistingSegmentationDataWorker()
    segmentationDataWorkerPool.push(worker)
    return worker
}

export function submitSegmentationDataJob(
    input: SegmentationDataWorkerInput,
    onComplete: OnSegmentationDataWorkerComplete,
): void {
    segmentationDataWorkerCallbacks[input.filepath] = onComplete
    const worker = getSegmentationDataWorker()
    worker.postMessage(input)
}
