import { SegmentationData } from './SegmentationData'
import { ImageData } from './ImageData'
import { Db } from './Db'
import { PlotStatistics } from '../definitions/UIDefinitions'
import { SegmentFeatureCalculatorInput, SegmentFeatureCalculatorResult } from '../workers/SegmentFeatureCalculator'
import { submitJob } from '../workers/SegmentFeatureCalculatorPool'
import { SegmentFeatureDbRequest, OnSegmentFeatureDbRequestComplete } from '../workers/SegmentFeatureDbWorker'

export class SegmentFeatureGenerator {
    private db: Db
    private imageSetName: string
    // Whether or not we should recalculate the features if they've already been calculated
    private recalculateFeatures: boolean
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
        recalculateFeatures: boolean,
        storeFeatures: (input: SegmentFeatureDbRequest, onComplete: OnSegmentFeatureDbRequestComplete) => void,
        onReady: (imageSetName: string) => void,
    ) {
        this.db = new Db(basePath)
        this.imageSetName = imageSetName
        this.recalculateFeatures = recalculateFeatures
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

    private featureName(input: SegmentFeatureCalculatorInput | SegmentFeatureCalculatorResult): string {
        if (input.statistic == 'area') {
            return 'Segment Area'
        } else {
            return input.marker + ' ' + input.statistic.charAt(0).toUpperCase() + input.statistic.slice(1)
        }
    }

    public featuresPresent(): boolean {
        return this.db.featuresPresent(this.imageSetName)
    }

    private submitSegmentFeatureJob(
        input: SegmentFeatureCalculatorInput,
        featuresInDb: string[],
        onComplete: (data: SegmentFeatureCalculatorResult) => void,
    ): void {
        const feature = this.featureName(input)
        if (this.recalculateFeatures || !featuresInDb.includes(feature)) {
            // If we always want to recalculate features or the current feature isn't in the database
            submitJob(input, onComplete)
        } else {
            this.markJobComplete()
        }
    }

    public generate(imageData: ImageData, segmentationData: SegmentationData): void {
        const onComplete = (data: SegmentFeatureCalculatorResult): void => {
            const request = {
                basePath: this.db.basePath,
                imageSetName: this.imageSetName,
                feature: this.featureName(data),
                insertData: data.statisticMap,
            }
            this.storeFeatures(request, () => {
                this.markJobComplete()
            })
        }

        const featuresInDb = this.db.listFeatures(this.imageSetName)

        const markers = Object.keys(imageData.data)
        // Keeping track of the number of features to calculate so we know when we're done
        // For each marker we will be calculating all PlotStatistics
        this.numFeatures = markers.length * PlotStatistics.length
        // We will also be calculating the segment area, so add an additional one
        this.numFeatures += 1

        // Submit a request to calculate the segment areas
        this.submitSegmentFeatureJob(
            {
                basePath: this.db.basePath,
                imageSetName: this.imageSetName,
                segmentIndexMap: segmentationData.segmentIndexMap,
                statistic: 'area',
            },
            featuresInDb,
            onComplete,
        )

        // Submit requests to calculate segment means and medians for all markers
        for (const marker of markers) {
            const tiffData = imageData.data[marker]

            for (const statistic of PlotStatistics) {
                const input = {
                    basePath: this.db.basePath,
                    imageSetName: this.imageSetName,
                    marker: marker,
                    tiffData: tiffData,
                    segmentIndexMap: segmentationData.segmentIndexMap,
                    statistic: statistic,
                }
                this.submitSegmentFeatureJob(input, featuresInDb, onComplete)
            }
        }
    }
}
