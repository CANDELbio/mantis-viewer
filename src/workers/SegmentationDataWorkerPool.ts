import {
    SegmentationDataWorker,
    OnSegmentationDataWorkerComplete,
    SegmentationDataWorkerError,
    SegmentationDataWorkerInput,
    SegmentationDataWorkerResult,
} from './SegmentationDataWorker'

let segmentationDataWorkerPool: SegmentationDataWorker[] = []
let segmentationDataWorkerCallbacks: Record<string, OnSegmentationDataWorkerComplete> = {}
const maxSegmentationDataWorkers = 1

function onSegmentationDataComplete(data: SegmentationDataWorkerError | SegmentationDataWorkerResult): void {
    let jobInput = data.filepath
    segmentationDataWorkerCallbacks[jobInput](data)
    delete segmentationDataWorkerCallbacks[jobInput]
}

function getExistingSegmentationDataWorker(): SegmentationDataWorker {
    let worker = segmentationDataWorkerPool.shift()
    if (worker) {
        return worker
    } else {
        // We should never get here.
        // This function willl only be called if there are maxImageDataWorkers in imageDataWorkerPool
        // Couldn't think of an elegant way to check for shift() returning undefined.
        throw 'No ImageDataWorkers in pool.'
    }
}

function getSegmentationDataWorker(): SegmentationDataWorker {
    let numWorkers = segmentationDataWorkerPool.length
    let worker =
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
    let worker = getSegmentationDataWorker()
    worker.postMessage(input)
}
