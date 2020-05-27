import { SegmentationData } from './SegmentationData'
import { ImageData } from './ImageData'
import { MinMax } from '../interfaces/ImageInterfaces'
import { SegmentationStatisticsResult } from '../workers/SegmentationStatisticsWorker'
import { submitSegmentationStatisticsJob } from '../workers/SegmentationStatisticsWorkerPool'
import { calculateMean, calculateMedian } from '../lib/StatsHelper'
import { Db } from './Db'
import { PlotStatistic } from '../definitions/UIDefinitions'

export class SegmentationStatistics {
    public markers: string[]
    // Map of marker/marker names plus segment id (marker_segmentid) the median intensity for that marker and segment
    private meanMap: Record<string, number>
    // Map of marker/marker names plus segment id (marker_segmentid) the median intensity for that marker and segment
    private medianMap: Record<string, number>

    public meanMinMaxMap: Record<string, MinMax>
    public medianMinMaxMap: Record<string, MinMax>

    private db: Db
    private imageSetName: string
    // Whether or not we should recalculate the statistics if they've already been calculated
    private recalculateStatistics: boolean
    // Keep track of the number of markers to calculate statistics for and the number complete
    private numStatistics: number
    private numStatisticsComplete: number
    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (statistics: SegmentationStatistics) => void

    public constructor(
        basePath: string,
        imageSetName: string,
        recalculateStatistics: boolean,
        onReady: (statistics: SegmentationStatistics) => void,
    ) {
        this.db = new Db(basePath)
        this.imageSetName = imageSetName
        this.recalculateStatistics = recalculateStatistics
        this.numStatistics = 0
        this.numStatisticsComplete = 0
        this.markers = []
        this.meanMap = {}
        this.medianMap = {}
        this.meanMinMaxMap = {}
        this.medianMinMaxMap = {}
        this.onReady = onReady
    }

    private statisticsLoadComplete(): void {
        // If the number of markers loaded is equal to the total number of markers we are done!
        if (this.numStatisticsComplete == this.numStatistics) {
            this.onReady(this)
        }
    }

    private async loadStatisticData(data: SegmentationStatisticsResult): Promise<void> {
        const dataMap = data.statisticMap
        const minMax = data.minMax

        if (data.statistic == 'mean') {
            for (const segmentId of Object.keys(dataMap)) {
                const key = data.markerName + '_' + segmentId
                this.meanMap[key] = dataMap[parseInt(segmentId)]
            }
            this.meanMinMaxMap[data.markerName] = minMax
        } else if (data.statistic == 'median') {
            for (const segmentId of Object.keys(dataMap)) {
                const key = data.markerName + '_' + segmentId
                this.medianMap[key] = dataMap[parseInt(segmentId)]
            }
            this.medianMinMaxMap[data.markerName] = minMax
        }
        this.numStatisticsComplete += 1
        this.statisticsLoadComplete()
    }

    private storeStatisticData(data: SegmentationStatisticsResult): void {
        const dataMap = data.statisticMap
        this.db.deleteFeatures(this.imageSetName, data.markerName, data.statistic)
        this.db.insertFeatures(this.imageSetName, data.markerName, data.statistic, dataMap)
    }

    public statisticsPresent(): boolean {
        return (
            this.db.featuresPresent(this.imageSetName, 'mean') || this.db.featuresPresent(this.imageSetName, 'median')
        )
    }

    public generateStatistics(imageData: ImageData, segmentationData: SegmentationData): void {
        const onComplete = (data: SegmentationStatisticsResult): Promise<void> => {
            this.storeStatisticData(data)
            return this.loadStatisticData(data)
        }

        for (const marker in imageData.data) {
            this.markers.push(marker)
            this.numStatistics += 2
            const tiffData = imageData.data[marker]

            for (const s of ['mean', 'median']) {
                const statistic = s as PlotStatistic
                let curStatistics = {}
                if (!this.recalculateStatistics) {
                    // If we don't want to recalculate statistics, try to grab them from the DB
                    curStatistics = this.db.selectFeatures(this.imageSetName, marker, statistic)
                }
                if (Object.keys(curStatistics).length > 0) {
                    // Check if we were able to fetch any statistics from the DB.
                    // If we were, load that data.
                    const minMax = this.db.minMaxValues(this.imageSetName, marker, statistic)
                    this.loadStatisticData({
                        statistic: statistic,
                        markerName: marker,
                        statisticMap: curStatistics,
                        minMax: minMax,
                    })
                } else {
                    // Otherwise we submit a job to calculate the data for us.
                    submitSegmentationStatisticsJob(
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
                }
            }
        }
    }

    private intensity(marker: string, segmentIds: number[], mean: boolean): number {
        const intensities = []
        for (const segmentId of segmentIds) {
            const mapKey = marker + '_' + segmentId
            const curIntensity = mean ? this.meanMap[mapKey] : this.medianMap[mapKey]
            intensities.push(curIntensity)
        }
        return mean ? calculateMean(intensities) : calculateMedian(intensities)
    }

    public meanIntensity(marker: string, segmentIds: number[]): number {
        return this.intensity(marker, segmentIds, true)
    }

    public medianIntensity(marker: string, segmentIds: number[]): number {
        return this.intensity(marker, segmentIds, false)
    }

    private splitMapKey(key: string): { marker: string; segmentId: string | undefined } {
        const splat = key.split('_')
        const segmentId = splat.pop()
        const marker = splat.join('_')
        return { marker: marker, segmentId: segmentId }
    }

    public segmentsInIntensityRange(selectedMarker: string, min: number, max: number, mean: boolean): number[] {
        const segments = []
        const intensityMap = mean ? this.meanMap : this.medianMap
        for (const key in intensityMap) {
            const { marker: marker, segmentId } = this.splitMapKey(key)
            if (marker == selectedMarker && segmentId) {
                const curIntensity = intensityMap[key]
                if (min <= curIntensity && curIntensity <= max) {
                    segments.push(Number(segmentId))
                }
            }
        }
        return segments
    }
}
