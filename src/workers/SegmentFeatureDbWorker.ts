import Worker = require('worker-loader?name=dist/[name].js!../workers/SegmentFeatureDbWorker.worker')
import { MinMax } from '../interfaces/ImageInterfaces'

export type SegmentFeatureDbRequest = ImportRequest | ListFeaturesRequest | FeatureRequest
export type SegmentFeatureDbResult = ImportResult | ListFeaturesResult | FeatureResult | RequestError

export interface ImageSetFeatureRequest {
    feature: string
    imageSetName: string
}

export interface ImageSetFeatureResult {
    feature: string
    imageSetName: string
    values: Record<number, number>
    minMax: MinMax
}
;[]

interface ImportRequest {
    basePath: string
    clearDuplicates: boolean
    validImageSets: string[]
    files: {
        filePath: string
        imageSet?: string
    }[]
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
    requestedFeatures: ImageSetFeatureRequest[]
}

interface FeatureResult {
    basePath: string
    featureResults: ImageSetFeatureResult[]
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
    const completedJob = queuedJobs.shift()
    if (completedJob) {
        completedJob.onComplete(data)
    }
    startNextJob()
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
