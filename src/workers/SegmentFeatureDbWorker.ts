import * as shortId from 'shortid'
import { MinMax } from '../interfaces/ImageInterfaces'

export type SegmentFeatureDbRequest = ImportRequest | ListFeaturesRequest | FeatureRequest | InsertRequest
export type SegmentFeatureDbResult = ImportResult | ListFeaturesResult | FeatureResult | RequestError | InsertResult

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

interface InsertRequest {
    jobId?: string
    basePath: string
    imageSetName: string
    feature: string
    insertData: Record<string, number>
}

interface InsertResult {
    jobId?: string
    success: boolean
}

interface ImportRequest {
    jobId?: string
    basePath: string
    validImageSets: string[]
    filePath: string
    imageSet?: string
}

interface ImportResult {
    jobId?: string
    importedFeatures: number
    totalFeatures: number
    invalidFeatureNames: string[]
    invalidImageSets: string[]
}

interface ListFeaturesRequest {
    jobId?: string
    basePath: string
    imageSetName: string
}

interface ListFeaturesResult {
    jobId?: string
    imageSetName: string
    features: string[]
}

interface FeatureRequest {
    jobId?: string
    basePath: string
    requestedFeatures: ImageSetFeatureRequest[]
}

interface FeatureResult {
    jobId?: string
    basePath: string
    featureResults: ImageSetFeatureResult[]
}

interface RequestError {
    jobId?: string
    error: string
}

export type OnSegmentFeatureDbRequestComplete = (data: SegmentFeatureDbResult) => void

let jobRunning = false
const segmentFeatureWorkerCallbacks: Record<string, OnSegmentFeatureDbRequestComplete> = {}

class SegmentFeatureDbWorker {
    private worker: Worker

    public constructor(onComplete: OnSegmentFeatureDbRequestComplete) {
        this.worker = new Worker(new URL('../workers/SegmentFeatureDbWorker.worker.ts', import.meta.url))

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
    const nextJob = queuedJobs.shift()
    if (nextJob && segmentFeatureDbWorker) {
        jobRunning = true
        const jobId = shortId.generate()
        const input = nextJob.input
        input.jobId = jobId
        segmentFeatureWorkerCallbacks[jobId] = nextJob.onComplete
        segmentFeatureDbWorker.postMessage(nextJob.input)
    }
}

function onSegmentationDataComplete(data: SegmentFeatureDbResult): void {
    jobRunning = false
    const jobId = data.jobId
    if (jobId) {
        const onComplete = segmentFeatureWorkerCallbacks[jobId]
        if (onComplete) onComplete(data)
        delete segmentFeatureWorkerCallbacks[jobId]
    }
    startNextJob()
}

export function submitSegmentFeatureDbRequest(
    input: SegmentFeatureDbRequest,
    onComplete: OnSegmentFeatureDbRequestComplete,
): void {
    queuedJobs.push({ input: input, onComplete: onComplete })
    if (!jobRunning) {
        if (segmentFeatureDbWorker == undefined)
            segmentFeatureDbWorker = new SegmentFeatureDbWorker(onSegmentationDataComplete)
        startNextJob()
    }
}
