import Worker = require('worker-loader?name=dist/[name].js!../workers/SegmentFeatureWorker.worker')

export interface SegmentFeatureWorkerInput {
    basePath: string
    filePath: string
    clearDuplicates: boolean
    imageSet?: string
}

export interface SegmentFeatureWorkerResult {
    error?: string
}

export type OnSegmentFeatureWorkerComplete = (data: SegmentFeatureWorkerResult) => void

class SegmentationDataWorker {
    private worker: Worker

    public constructor(onComplete: OnSegmentFeatureWorkerComplete) {
        this.worker = new Worker()

        const completeAndTerminate = (data: SegmentFeatureWorkerResult): void => {
            onComplete(data)
            this.worker.terminate()
        }

        this.worker.addEventListener(
            'message',
            function (e: { data: SegmentFeatureWorkerResult }) {
                completeAndTerminate(e.data)
            },
            false,
        )
    }

    public postMessage(message: SegmentFeatureWorkerInput): void {
        this.worker.postMessage(message)
    }
}

export function importSegmentFeatureCSV(
    input: SegmentFeatureWorkerInput,
    onComplete: OnSegmentFeatureWorkerComplete,
): void {
    const worker = new SegmentationDataWorker(onComplete)
    worker.postMessage(input)
}
