import { SegmentationData } from './SegmentationData'
import { ImageData } from './ImageData'
import { MinMax } from '../interfaces/ImageInterfaces'
import { SegmentationStatisticWorkerResult } from '../interfaces/WorkerInterfaces'
import { calculateMean, calculateMedian } from '../lib/StatsHelper'

import StatisticWorker = require('worker-loader?name=dist/[name].js!../workers/SegmentationStatisticsWorker')

export class SegmentationStatistics {
    public markers: string[]
    // Map of marker/marker names plus segment id (marker_segmentid) the median intensity for that marker and segment
    private meanMap: Record<string, number>
    // Map of marker/marker names plus segment id (_segmentid) the median intensity for that marker and segment
    private medianMap: Record<string, number>

    public meanMinMaxMap: Record<string, MinMax>
    public medianMinMaxMap: Record<string, MinMax>

    // Keep track of the number of markers to calculate statistics for and the number complete
    private numWorkers: number
    private numWorkersComplete: number
    // Array of the workers
    private workers: StatisticWorker[]
    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (statistics: SegmentationStatistics) => void

    private statisticsLoadComplete(): void {
        // If the number of markers loaded is equal to the total number of markers we are done!
        if (this.numWorkersComplete == this.numWorkers) {
            this.onReady(this)
        }
    }

    private async loadStatisticData(data: SegmentationStatisticWorkerResult): Promise<void> {
        if (data.statistic == 'mean') {
            for (let key in data.map) {
                this.meanMap[key] = data.map[key]
            }
            this.meanMinMaxMap[data.markerName] = data.minmax
        } else if (data.statistic == 'median') {
            for (let key in data.map) {
                this.medianMap[key] = data.map[key]
            }
            this.medianMinMaxMap[data.markerName] = data.minmax
        }
        this.numWorkersComplete += 1
        this.statisticsLoadComplete()
    }

    private loadInWorker(message: any, onReady: (statistics: SegmentationStatistics) => void): void {
        this.onReady = onReady

        let loadStatisticData = (data: SegmentationStatisticWorkerResult): Promise<void> => this.loadStatisticData(data)

        let worker = new StatisticWorker()
        worker.addEventListener(
            'message',
            function(e: { data: SegmentationStatisticWorkerResult }) {
                loadStatisticData(e.data)
            },
            false,
        )

        worker.postMessage(message)

        this.workers.push(worker)
    }

    public generateStatistics(
        imageData: ImageData,
        segmentationData: SegmentationData,
        onReady: (statistics: SegmentationStatistics) => void,
    ): void {
        for (let marker in imageData.data) {
            this.markers.push(marker)
            this.numWorkers += 2
            let tiffData = imageData.data[marker]
            this.loadInWorker(
                {
                    marker: marker,
                    tiffData: tiffData,
                    segmentIndexMap: segmentationData.segmentIndexMap,
                    statistic: 'mean',
                },
                onReady,
            )
            this.loadInWorker(
                {
                    marker: marker,
                    tiffData: tiffData,
                    segmentIndexMap: segmentationData.segmentIndexMap,
                    statistic: 'median',
                },
                onReady,
            )
        }
    }

    private intensity(marker: string, segmentIds: number[], mean: boolean): number {
        let intensities = []
        for (let segmentId of segmentIds) {
            let mapKey = marker + '_' + segmentId
            let curIntensity = mean ? this.meanMap[mapKey] : this.medianMap[mapKey]
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
        let splat = key.split('_')
        let segmentId = splat.pop()
        let marker = splat.join('_')
        return { marker: marker, segmentId: segmentId }
    }

    public segmentsInIntensityRange(selectedMarker: string, min: number, max: number, mean: boolean): number[] {
        let segments = []
        let intensityMap = mean ? this.meanMap : this.medianMap
        for (let key in intensityMap) {
            let { marker: marker, segmentId } = this.splitMapKey(key)
            if (marker == selectedMarker && segmentId) {
                let curIntensity = intensityMap[key]
                if (min <= curIntensity && curIntensity <= max) {
                    segments.push(Number(segmentId))
                }
            }
        }
        return segments
    }

    public constructor() {
        this.numWorkers = 0
        this.numWorkersComplete = 0
        this.workers = []
        this.markers = []
        this.meanMap = {}
        this.medianMap = {}
        this.meanMinMaxMap = {}
        this.medianMinMaxMap = {}
    }
}
