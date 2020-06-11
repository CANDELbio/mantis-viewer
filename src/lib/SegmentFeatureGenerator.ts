import { SegmentationData } from './SegmentationData'
import { ImageData } from './ImageData'
import { SegmentFeatureResult } from '../workers/SegmentFeatureCalculator'
import { submitJob } from '../workers/SegmentFeatureCalculatorPool'
import { Db } from './Db'
import { PlotStatistic } from '../definitions/UIDefinitions'

export class SegmentFeatureGenerator {
    private db: Db
    private imageSetName: string
    // Whether or not we should recalculate the features if they've already been calculated
    private recalculateFeatures: boolean
    // Keep track of the number of markers to calculate features for and the number complete
    private numFeatures: number
    private numFeaturesComplete: number
    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (imageSetName: string) => void

    public constructor(
        basePath: string,
        imageSetName: string,
        recalculateFeatures: boolean,
        onReady: (imageSetName: string) => void,
    ) {
        this.db = new Db(basePath)
        this.imageSetName = imageSetName
        this.recalculateFeatures = recalculateFeatures
        this.numFeatures = 0
        this.numFeaturesComplete = 0
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

    private featureName(markerName: string, statistic: PlotStatistic): string {
        return markerName + ' ' + statistic.charAt(0).toUpperCase() + statistic.slice(1)
    }

    // Don't move this to a worker thread.
    // Parallel opening or writing to a SQLite database leads to corruption
    // (I tried it...)
    private storeStatisticData(data: SegmentFeatureResult): void {
        const dataMap = data.statisticMap
        const feature = this.featureName(data.markerName, data.statistic)
        this.db.deleteFeatures(this.imageSetName, feature)
        this.db.insertFeatures(this.imageSetName, feature, dataMap)
    }

    public featuresPresent(): boolean {
        return this.db.featuresPresent(this.imageSetName)
    }

    public generate(imageData: ImageData, segmentationData: SegmentationData): void {
        const onComplete = (data: SegmentFeatureResult): void => {
            this.storeStatisticData(data)
            this.markJobComplete()
        }

        for (const marker in imageData.data) {
            this.numFeatures += 2
            const tiffData = imageData.data[marker]

            for (const s of ['mean', 'median']) {
                const statistic = s as PlotStatistic
                const feature = this.featureName(marker, statistic)
                let curStatistics = {}
                if (!this.recalculateFeatures) {
                    // If we don't want to recalculate statistics, try to grab them from the DB
                    curStatistics = this.db.selectValues(this.imageSetName, feature)
                }
                if (Object.keys(curStatistics).length == 0) {
                    // If no statistics were found then submit a job to calculate them
                    submitJob(
                        {
                            basePath: this.db.basePath,
                            imageSetName: this.imageSetName,
                            marker: marker,
                            tiffData: tiffData,
                            segmentIndexMap: segmentationData.segmentIndexMap,
                            statistic: statistic,
                        },
                        onComplete,
                    )
                } else {
                    this.markJobComplete()
                }
            }
        }
    }
}
