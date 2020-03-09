// Not sure if there is a way to DRY up this and the other worker class definitions while keeping type safety of inputs
// (i.e. an ImageDataWorker should only accept OnImageDataWorkerComplete as an input for the constructor.)
import Worker = require('worker-loader?name=dist/[name].js!../workers/ImageDataWorker.worker')
import { MinMax } from '../interfaces/ImageInterfaces'

export interface ImageDataWorkerInput {
    useExtInMarkerName: boolean
    filepath: string
    imageNumber?: number
}

export interface ImageDataWorkerResult {
    input: ImageDataWorkerInput
    markerName: string
    width: number
    height: number
    data: Float32Array | Uint16Array | Uint8Array
    bitmap: ImageBitmap
    minmax: MinMax
    scaled: boolean
    numImages: number
}

export interface ImageDataWorkerError {
    input: ImageDataWorkerInput
    error: string
    markerName: string
}

export type OnImageDataWorkerComplete = (data: ImageDataWorkerResult | ImageDataWorkerError) => void

export class ImageDataWorker {
    private worker: Worker

    public constructor(onComplete: OnImageDataWorkerComplete) {
        this.worker = new Worker()
        this.worker.addEventListener(
            'message',
            function(e: { data: ImageDataWorkerResult | ImageDataWorkerError }) {
                onComplete(e.data)
            },
            false,
        )
    }

    public terminate(): void {
        this.worker.terminate
    }

    public postMessage(message: ImageDataWorkerInput): void {
        this.worker.postMessage(message)
    }
}
