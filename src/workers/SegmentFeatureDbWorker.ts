import Worker = require('worker-loader?name=dist/[name].js!../workers/SegmentFeatureDb.worker')

export type SegmentFeatureDbRequest = ImportRequest | ListFeaturesRequest | FeatureRequest
export type SegmentFeatureDbResult = ImportResult | ListFeaturesResult | FeatureResult | RequestError

interface ImportRequest {
    basePath: string
    filePath: string
    clearDuplicates: boolean
    validImageSets: string[]
    imageSetName?: string
}

interface ImportResult {
    importedFeatures: number
    totalFeatures: number
    invalidFeatureNames: string[]
    invalidImageSets: string[]
}

interface ListFeaturesRequest {
    basePath: string
    imageSetName: string
}

interface ListFeaturesResult {
    imageSetName: string
    features: string[]
}

interface FeatureRequest {
    basePath: string
    imageSetNames: string[]
    features: string[]
}

interface FeatureResult {
    basePath: string
    imageSetNames: string[]
    features: string[]
}

interface RequestError {
    error: string
}

export type OnSegmentFeatureDbRequestComplete = (data: SegmentFeatureDbResult) => void

class SegmentFeatureDbWorker {
    private worker: Worker

    public constructor(onComplete: OnSegmentFeatureDbRequestComplete) {
        this.worker = new Worker()

        this.worker.addEventListener(
            'message',
            function (e: { data: SegmentFeatureDbResult }) {
                onComplete(e.data)
            },
            false,
        )
    }

    public terminate(): void {
        this.worker.terminate
    }

    public postMessage(message: SegmentFeatureDbRequest): void {
        this.worker.postMessage(message)
    }
}

const queuedJobs = [] as { input: SegmentFeatureDbRequest; onComplete: OnSegmentFeatureDbRequestComplete }[]

let segmentFeatureDbWorker: SegmentFeatureDbWorker | undefined

function startNextJob(): void {
    const nextJob = queuedJobs[0]
    if (nextJob && segmentFeatureDbWorker) segmentFeatureDbWorker.postMessage(nextJob.input)
}

function onSegmentationDataComplete(data: SegmentFeatureDbResult): void {
    const completedJob = queuedJobs.pop()
    if (completedJob) {
        completedJob.onComplete(data)
    }
}

export function submitSegmentFeatureDbRequest(
    input: SegmentFeatureDbRequest,
    onComplete: OnSegmentFeatureDbRequestComplete,
): void {
    queuedJobs.push({ input: input, onComplete: onComplete })
    if (queuedJobs.length == 1) {
        if (segmentFeatureDbWorker == undefined)
            segmentFeatureDbWorker = new SegmentFeatureDbWorker(onSegmentationDataComplete)
        startNextJob()
    }
}
