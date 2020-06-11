import Worker = require('worker-loader?name=dist/[name].js!../workers/SegmentFeatureImporter.worker')

export interface SegmentFeatureImporterInput {
    basePath: string
    filePath: string
    clearDuplicates: boolean
    validImageSets: string[]
    imageSetName?: string
}

export interface SegmentFeatureImporterResult {
    importedFeatures: number
    totalFeatures: number
    invalidFeatureNames: string[]
    invalidImageSets: string[]
}

export interface SegmentFeatureImporterError {
    error: string
}

export type OnSegmentFeatureImporterComplete = (
    data: SegmentFeatureImporterResult | SegmentFeatureImporterError,
) => void

class SegmentFeatureImporter {
    private worker: Worker

    public constructor(onComplete: OnSegmentFeatureImporterComplete) {
        this.worker = new Worker()

        const completeAndTerminate = (data: SegmentFeatureImporterResult): void => {
            onComplete(data)
            this.worker.terminate()
        }

        this.worker.addEventListener(
            'message',
            function (e: { data: SegmentFeatureImporterResult }) {
                completeAndTerminate(e.data)
            },
            false,
        )
    }

    public postMessage(message: SegmentFeatureImporterInput): void {
        this.worker.postMessage(message)
    }
}

export function importSegmentFeatureCSV(
    input: SegmentFeatureImporterInput,
    onComplete: OnSegmentFeatureImporterComplete,
): void {
    const worker = new SegmentFeatureImporter(onComplete)
    worker.postMessage(input)
}
