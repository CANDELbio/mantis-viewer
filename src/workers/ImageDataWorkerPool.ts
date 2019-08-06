// Not sure if there is a way to DRY up this and the other worker class definitions while keeping type safety of inputs
// (i.e. submitJob should only accept ImageDataWorkerInput for an ImageDataWorker)
import {
    ImageDataWorker,
    ImageDataWorkerInput,
    ImageDataWorkerResult,
    ImageDataWorkerError,
    OnImageDataWorkerComplete,
} from './ImageDataWorker'

let imageDataWorkerPool: ImageDataWorker[] = []
let imageDataWorkerCallbacks: Record<string, OnImageDataWorkerComplete> = {}
const maxImageDataWorkers = navigator.hardwareConcurrency

function onImageDataComplete(data: ImageDataWorkerError | ImageDataWorkerResult): void {
    let jobInput = data.filepath
    imageDataWorkerCallbacks[jobInput](data)
    delete imageDataWorkerCallbacks[jobInput]
}

function getExistingImageDataWorker(): ImageDataWorker {
    let worker = imageDataWorkerPool.shift()
    if (worker) {
        return worker
    } else {
        // We should never get here.
        // This function willl only be called if there are maxImageDataWorkers in imageDataWorkerPool
        // Couldn't think of an elegant way to check for shift() returning undefined.
        throw 'No ImageDataWorkers in pool.'
    }
}

function getImageDataWorker(): ImageDataWorker {
    let numWorkers = imageDataWorkerPool.length
    let worker =
        numWorkers < maxImageDataWorkers ? new ImageDataWorker(onImageDataComplete) : getExistingImageDataWorker()
    imageDataWorkerPool.push(worker)
    return worker
}

export function submitImageDataJob(input: ImageDataWorkerInput, onComplete: OnImageDataWorkerComplete): void {
    imageDataWorkerCallbacks[input.filepath] = onComplete
    let worker = getImageDataWorker()
    worker.postMessage(input)
}
