// Not sure if there is a way to DRY up this and the other worker class definitions while keeping type safety of inputs
// (i.e. submitJob should only accept ImageDataWorkerInput for an ImageDataWorker)
import {
    ImageDataWorker,
    ImageDataWorkerInput,
    ImageDataWorkerResult,
    ImageDataWorkerError,
    OnImageDataWorkerComplete,
} from './ImageDataWorker'

const imageDataWorkerPool: ImageDataWorker[] = []
const imageDataWorkerCallbacks: Record<string, OnImageDataWorkerComplete> = {}
const maxImageDataWorkers = navigator.hardwareConcurrency

function onImageDataComplete(data: ImageDataWorkerError | ImageDataWorkerResult): void {
    const jobInput = data.input.filepath
    imageDataWorkerCallbacks[jobInput](data)
}

function getExistingImageDataWorker(): ImageDataWorker {
    const worker = imageDataWorkerPool.shift()
    if (worker) {
        return worker
    } else {
        // We should never get here.
        // This function will only be called if there are maxImageDataWorkers in imageDataWorkerPool
        // Couldn't think of an elegant way to check for shift() returning undefined.
        throw 'No ImageDataWorkers in pool.'
    }
}

function getImageDataWorker(): ImageDataWorker {
    const numWorkers = imageDataWorkerPool.length
    const worker =
        numWorkers < maxImageDataWorkers ? new ImageDataWorker(onImageDataComplete) : getExistingImageDataWorker()
    imageDataWorkerPool.push(worker)
    return worker
}

export function submitImageDataJob(input: ImageDataWorkerInput, onComplete: OnImageDataWorkerComplete): void {
    imageDataWorkerCallbacks[input.filepath] = onComplete
    const worker = getImageDataWorker()
    worker.postMessage(input)
}
