import { Db } from './Db'
import { ImageData } from './ImageData'
import { SegmentationData } from './SegmentationData'
import { AreaStatistic, PlotStatistic } from '../definitions/UIDefinitions'
import { SegmentFeatureCalculatorInput, SegmentFeatureCalculatorResult } from '../workers/SegmentFeatureCalculator'
import { submitJob } from '../workers/SegmentFeatureCalculatorPool'
import { SegmentFeatureDbRequest, OnSegmentFeatureDbRequestComplete } from '../workers/SegmentFeatureDbWorker'

export class SegmentFeatureGenerator {
    private db: Db
    private imageSetName: string
    private imageData: ImageData
    private segmentationData: SegmentationData
    private chosenMarkerFeatures: PlotStatistic[]

    // Keep track of the number of markers to calculate features for and the number complete
    private numFeatures: number
    private numFeaturesComplete: number
    // Callback function to store features in a SegmentFeatureDbWorker
    // Feels a little janky to have SegmentFeatureCalculator workers calculating data, shuffling to main thread, then writing to db in another worker.
    // But it lets us calculate the features in parallel and then insert in a worker thread without risking corrupting the db.
    private storeFeatures: (input: SegmentFeatureDbRequest, onComplete: OnSegmentFeatureDbRequestComplete) => void
    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (imageSetName: string) => void

    public constructor(
        basePath: string,
        imageSetName: string,
        imageData: ImageData,
        segmentationData: SegmentationData,
        chosenMarkerFeatures: PlotStatistic[],
        storeFeatures: (input: SegmentFeatureDbRequest, onComplete: OnSegmentFeatureDbRequestComplete) => void,
        onReady: (imageSetName: string) => void,
    ) {
        this.db = new Db(basePath)
        this.imageSetName = imageSetName
        this.imageData = imageData
        this.segmentationData = segmentationData
        this.chosenMarkerFeatures = chosenMarkerFeatures
        this.numFeatures = 0
        this.numFeaturesComplete = 0
        this.storeFeatures = storeFeatures
        this.onReady = onReady
    }

    private checkIfComplete(): void {
        // If the number of markers loaded is equal to the total number of markers we are done!
        if (this.numFeaturesComplete == this.numFeatures) {
            this.onReady(this.imageSetName)
        }
    }

    private markJobComplete(): void {
        this.numFeaturesComplete += 1
        this.checkIfComplete()
    }

    private featureName(statistic: AreaStatistic | PlotStatistic, marker?: string): string {
        if (statistic == 'area') {
            return 'Segment Area'
        } else {
            return marker + ' ' + statistic.charAt(0).toUpperCase() + statistic.slice(1)
        }
    }

    private featureNames(): string[] {
        const featureNames = []
        featureNames.push(this.featureName('area'))

        const markers = this.imageData.markerNames
        for (const marker of markers) {
            for (const statistic of this.chosenMarkerFeatures) {
                featureNames.push(this.featureName(statistic, marker))
            }
        }
        return featureNames
    }

    public featuresPresent(): boolean {
        const existingFeatures = this.db.listFeatures(this.imageSetName)
        const newFeatures = this.featureNames()
        for (const existingFeature of existingFeatures) {
            if (newFeatures.includes(existingFeature)) return true
        }
        return false
    }

    public generate(): void {
        const imageData = this.imageData
        const segmentationData = this.segmentationData

        const onComplete = (data: SegmentFeatureCalculatorResult): void => {
            const featureName =
                data.statistic == 'area'
                    ? this.featureName(data.statistic)
                    : this.featureName(data.statistic, data.marker)
            const request = {
                basePath: this.db.basePath,
                imageSetName: this.imageSetName,
                feature: featureName,
                insertData: data.statisticMap,
            }
            this.storeFeatures(request, () => {
                this.markJobComplete()
            })
        }

        const markers = imageData.markerNames
        // Keeping track of the number of features to calculate so we know when we're done
        // For each marker we will be calculating the stats chosen by the user
        this.numFeatures = markers.length * this.chosenMarkerFeatures.length
        // We will also be calculating the segment area, so add an additional one
        this.numFeatures += 1

        // Submit a request to calculate the segment areas
        const input: SegmentFeatureCalculatorInput = {
            basePath: this.db.basePath,
            imageSetName: this.imageSetName,
            segmentIndexMap: segmentationData.pixelIndexMap,
            statistic: 'area',
        }
        submitJob(input, onComplete)

        // Submit requests to calculate segment means and medians for all markers
        for (const marker of markers) {
            const tiffFileInfo = imageData.fileInfo[marker]

            for (const statistic of this.chosenMarkerFeatures) {
                const input = {
                    basePath: this.db.basePath,
                    imageSetName: this.imageSetName,
                    marker: marker,
                    tiffFileInfo: tiffFileInfo,
                    segmentIndexMap: segmentationData.pixelIndexMap,
                    statistic: statistic,
                }
                submitJob(input, onComplete)
            }
        }
    }
}
