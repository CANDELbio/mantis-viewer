import { SegmentationData } from "./SegmentationData"
import { ImageData } from "./ImageData"
import { SegmentationStatisticWorkerResult, MinMax } from "../interfaces/ImageInterfaces"
import { calculateMean, calculateMedian} from "../lib/StatsHelper"

import StatisticWorker = require("worker-loader?name=dist/[name].js!../workers/SegmentationStatisticsWorker")

export class SegmentationStatistics {
    channels: string[]
    // Map of channel/marker names plus segment id (channel_segmentid) the median intensity for that channel and segment
    private meanMap: Record<string, number>
    // Map of channel/marker names plus segment id (channel_segmentid) the median intensity for that channel and segment
    private medianMap: Record<string,number>

    meanMinMaxMap: Record<string, MinMax>
    medianMinMaxMap: Record<string, MinMax>
    
    // Keep track of the number of channels to calculate statistics for and the number complete
    private numWorkers: number
    private numWorkersComplete: number
    // Array of the workers
    private workers: StatisticWorker[]
    // Callback function to call with the built ImageData once it has been loaded.
    private onReady: (statistics: SegmentationStatistics) => void

    private statisticsLoadComplete() {
        // If the number of channels loaded is equal to the total number of channels we are done!
        if(this.numWorkersComplete == this.numWorkers){
            this.onReady(this)
        }
    } 

    private async loadStatisticData(data: SegmentationStatisticWorkerResult){
        if(data.statistic == 'mean') {
            for(let key in data.map){
                this.meanMap[key] = data.map[key]
            }
            this.meanMinMaxMap[data.chName] = data.minmax
        } else if(data.statistic == 'median') {
            for(let key in data.map){
                this.medianMap[key] = data.map[key]
            }
            this.medianMinMaxMap[data.chName] = data.minmax
        }
        this.numWorkersComplete += 1
        this.statisticsLoadComplete()
    }

    private loadInWorker(message: any, onReady: (statistics: SegmentationStatistics) => void) {
        this.onReady = onReady

        let loadStatisticData = (data: SegmentationStatisticWorkerResult) => this.loadStatisticData(data)

        let worker = new StatisticWorker()
        worker.addEventListener('message', function(e: {data: SegmentationStatisticWorkerResult}) {
            loadStatisticData(e.data)
        }, false)

        worker.postMessage(message)

        this.workers.push(worker)
    }

    generateStatistics(imageData: ImageData, segmentationData: SegmentationData, onReady: (statistics: SegmentationStatistics) => void) {
        for(let channel in imageData.data){
            this.channels.push(channel)
            this.numWorkers += 2
            let tiffData = imageData.data[channel]
            this.loadInWorker({channel: channel, tiffData: tiffData, segmentIndexMap: segmentationData.segmentIndexMap, statistic: 'mean'}, onReady)
            this.loadInWorker({channel: channel, tiffData: tiffData, segmentIndexMap: segmentationData.segmentIndexMap, statistic: 'median'}, onReady)
        }
    }
    
    intensity(channel: string, segmentIds: number[], mean: boolean){
        let intensities = []
        for(let segmentId of segmentIds){
            let mapKey = channel + "_" + segmentId
            let curIntensity = mean ? this.meanMap[mapKey] : this.medianMap[mapKey]
            intensities.push(curIntensity)
        }
        return mean? calculateMean(intensities) : calculateMedian(intensities)
    }

    meanIntensity(channel: string, segmentIds: number[]){
        return this.intensity(channel, segmentIds, true)
    }

    medianIntensity(channel: string, segmentIds: number[]){
        return this.intensity(channel, segmentIds, false)
    }

    splitMapKey(key: string){
        let splat = key.split('_')
        let segmentId = splat.pop()
        let channel = splat.join('_')
        return {channel: channel, segmentId: segmentId}
    }

    segmentsInIntensityRange(selectedChannel: string, min: number, max: number, mean: boolean){
        let segments = []
        let intensityMap = mean? this.meanMap : this.medianMap
        for (let key in intensityMap) {
            let {channel, segmentId} = this.splitMapKey(key)
            if(channel == selectedChannel && segmentId){
                let curIntensity = intensityMap[key]
                if (min <= curIntensity && curIntensity <= max){
                    segments.push(Number(segmentId))
                }
            }
        }
        return segments
    }

    constructor() {
        this.numWorkers = 0
        this.numWorkersComplete = 0
        this.workers = []
        this.channels = []
        this.meanMap = {}
        this.medianMap = {}
        this.meanMinMaxMap = {}
        this.medianMinMaxMap = {}
    }

}
