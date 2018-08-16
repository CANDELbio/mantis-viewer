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
        let x = []
        let y = []
        let text = []
        for(let key in segmentationData.segmentIndexMap){
            let pixels = segmentationData.segmentIndexMap[key]
            let ch1MeanIntensity = imcData.meanPixelIntensity(ch1, pixels)
            let ch2MeanIntensity = imcData.meanPixelIntensity(ch2, pixels)
            x.push(ch1MeanIntensity)
            y.push(ch2MeanIntensity)
            text.push("Segment " + key)
        }
        scatterPlotData.push({
            x: x,
            y: y,
            mode: 'markers',
            type: 'scattergl',
            text: text,
            marker: { size: 8 }
          })
        return scatterPlotData
    }

    constructor(ch1: string, ch2: string, imcData:IMCData, segmentationData: SegmentationData) {
        this.ch1 = ch1
        this.ch2 = ch2
        this.data = ScatterPlotData.calculateScatterPlotData(ch1, ch2, imcData, segmentationData)
        this.layout = {title: ch1 + ' versus ' + ch2 }
    }

}
