import { PlotStatistic } from "../interfaces/UIDefinitions"

//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

function meanPixelIntensity(tiffData: Float32Array | Uint16Array | Uint8Array, pixels:number[]):number {
    let sum = 0
    let count = 0
    for (let curPixel of pixels){
        sum += tiffData[curPixel]
        count += 1
    }
    return sum/count
}

function medianPixelIntensity(tiffData: Float32Array | Uint16Array | Uint8Array, pixels:number[]):number {
    let values = []
    for (let curPixel of pixels){
        values.push(tiffData[curPixel])
    }
    // Find the median! Sort the intensity values by intensity.
    values.sort()
    let length = values.length
    if(length % 2 == 0){
        // If even take the average of the two middle intensity values
        return (values[(length/2) - 1] + values[length/2])/2
    } else {
        // If odd return the middle intensity value
        return values[Math.ceil(length/2) - 1]
    }
}

function generateStatisticMap(channel: string,
    tiffData: Float32Array | Uint16Array | Uint8Array,
    segmentIndexMap: Record<number, number[]>,
    statistic: PlotStatistic)
{
    let statisticMap = {}
    for (let segmentId in segmentIndexMap){
        let mapKey = channel + '_' + segmentId
        if(statistic == 'mean'){
            statisticMap[mapKey] = meanPixelIntensity(tiffData, segmentIndexMap[segmentId])
        } else if (statistic == 'median') {
            statisticMap[mapKey] = medianPixelIntensity(tiffData, segmentIndexMap[segmentId])
        }
    }
    return statisticMap
}

ctx.addEventListener('message', (message) => {
    let data = message.data

    console.log(data)

    ctx.postMessage({statistic: data.statistic, map: generateStatisticMap(data.channel, data.tiffData, data.segmentIndexMap, data.statistic)})
}, false)

