export interface RegionDataImporterInput {
    filePath: string
    width: number
    height: number
}

export interface RegionDataImporterResult {
    filePath: string
    regionIndexMap: Record<number, number[]>
}

export interface RegionDataImporterError {
    error: string
}

export type OnRegionDataImporterComplete = (data: RegionDataImporterResult | RegionDataImporterError) => void

class RegionDataImporter {
    private worker: Worker

    public constructor(onComplete: OnRegionDataImporterComplete) {
        this.worker = new Worker(new URL('../workers/RegionDataImporter.worker.ts', import.meta.url))

        const completeAndTerminate = (data: RegionDataImporterResult): void => {
            onComplete(data)
            this.worker.terminate()
        }

        this.worker.addEventListener(
            'message',
            function (e: { data: RegionDataImporterResult }) {
                completeAndTerminate(e.data)
            },
            false,
        )
    }

    public postMessage(message: RegionDataImporterInput): void {
        this.worker.postMessage(message)
    }
}

export function importRegionTiff(input: RegionDataImporterInput, onComplete: OnRegionDataImporterComplete): void {
    const worker = new RegionDataImporter(onComplete)
    worker.postMessage(input)
}
