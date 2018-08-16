import { IMCData } from "../lib/IMCData"
import { SegmentationData } from "../lib/SegmentationData";

interface Marker {
    size: number
}

interface ScatterPlotDatum {
    x: number[]
    y: number[]
    mode: string
    type: string
    name: string
    text: string[]
    marker: Marker
}

interface ScatterPlotLayout {
    title: string
}

export class ScatterPlotData {

    ch1: string
    ch2: string
    data: Array<ScatterPlotDatum>
    layout: ScatterPlotLayout

    static calculateScatterPlotData(ch1: string, ch2: string, imcData:IMCData, segmentationData: SegmentationData){
        let scatterPlotData = new Array<ScatterPlotDatum>()
        for(let key in segmentationData.segmentIndexMap){
            let pixels = segmentationData.segmentIndexMap[key]
            let ch1MeanIntensity = imcData.meanPixelIntensity(ch1, pixels)
            let ch2MeanIntensity = imcData.meanPixelIntensity(ch2, pixels)
            scatterPlotData.push({
                x: [ch1MeanIntensity],
                y: [ch2MeanIntensity],
                mode: 'markers',
                type: 'scattergl',
                name: 'Segment ' + key.toString(),
                text: [key.toString()],
                marker: { size: 12 }
              })
        }
        return scatterPlotData
    }

    constructor(ch1: string, ch2: string, imcData:IMCData, segmentationData: SegmentationData) {
        this.ch1 = ch1
        this.ch2 = ch2
        this.data = ScatterPlotData.calculateScatterPlotData(ch1, ch2, imcData, segmentationData)
        this.layout = {title: ch1 + ' versus ' + ch2 }
    }

}
