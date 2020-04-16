import { SegmentationData } from './SegmentationData'
import { ImageData } from './ImageData'
import { MinMax } from '../interfaces/ImageInterfaces'
import { SegmentationStatisticsWorkerResult } from '../workers/SegmentationStatisticsWorker'
import { submitSegmentationStatisticsJob } from '../workers/SegmentationStatisticsWorkerPool'
import { calculateMean, calculateMedian } from '../lib/StatsHelper'

export class SegmentationStatistics {
    public markers: string[]
    // Map of marker/marker names plus segment id (marker_segmentid) the median intensity for that marker and segment
    private meanMap: Record<string, number>
    // Map of marker/marker names plus segment id (_segmentid) the median intensity for that marker and segment
    private medianMap: Record<string, number>

    public meanMinMaxMap: Record<string, MinMax>
    public medianMinMaxMap: Record<string, MinMax>

    // Keep track of the number of markers to calculate statistics for and the number complete
    private numStatistics: number
    private numStatisticsComplete: number
    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (statistics: SegmentationStatistics) => void

    public constructor(onReady: (statistics: SegmentationStatistics) => void) {
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

    private async loadStatisticData(data: SegmentationStatisticsWorkerResult): Promise<void> {
        if (data.statistic == 'mean') {
            for (const key in data.map) {
                this.meanMap[key] = data.map[key]
            }
            this.meanMinMaxMap[data.markerName] = data.minmax
        } else if (data.statistic == 'median') {
            for (const key in data.map) {
                this.medianMap[key] = data.map[key]
            }
            this.medianMinMaxMap[data.markerName] = data.minmax
        }
        this.numStatisticsComplete += 1
        this.statisticsLoadComplete()
    }

    public generateStatistics(imageData: ImageData, segmentationData: SegmentationData): void {
        const onComplete = (data: SegmentationStatisticsWorkerResult): Promise<void> => this.loadStatisticData(data)

        for (const marker in imageData.data) {
            this.markers.push(marker)
            this.numStatistics += 2
            const tiffData = imageData.data[marker]

            submitSegmentationStatisticsJob(
                {
                    marker: marker,
                    tiffData: tiffData,
                    segmentIndexMap: segmentationData.segmentIndexMap,
                    statistic: 'mean',
                },
                onComplete,
            )

            submitSegmentationStatisticsJob(
                {
                    marker: marker,
                    tiffData: tiffData,
                    segmentIndexMap: segmentationData.segmentIndexMap,
                    statistic: 'median',
                },
                onComplete,
            )
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
