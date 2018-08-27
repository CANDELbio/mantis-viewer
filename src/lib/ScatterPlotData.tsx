import { IMCData } from "../lib/IMCData"
import { SegmentationData } from "../lib/SegmentationData";
import { PlotStatistic } from "../interfaces/UIDefinitions"

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
    xaxis: ScatterPlotAxis
    yaxis: ScatterPlotAxis
}

interface ScatterPlotAxis {
    title: string
}

export class ScatterPlotData {

    ch1: string
    ch2: string
    data: Array<ScatterPlotDatum>
    layout: ScatterPlotLayout

    static calculateScatterPlotData(ch1: string, ch2: string, imcData:IMCData, segmentationData: SegmentationData, plotStatistic: PlotStatistic){
        let scatterPlotData = new Array<ScatterPlotDatum>()
        let x = []
        let y = []
        let text = []
        for(let key in segmentationData.segmentIndexMap){
            let pixels = segmentationData.segmentIndexMap[key]
            if(plotStatistic == "mean"){
                x.push(imcData.meanPixelIntensity(ch1, pixels))
                y.push(imcData.meanPixelIntensity(ch2, pixels))
            } else if (plotStatistic == "median") {
                x.push(imcData.medianPixelIntensity(ch1, pixels))
                y.push(imcData.medianPixelIntensity(ch2, pixels))
            }

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

    constructor(ch1: string, ch2: string, imcData:IMCData, segmentationData: SegmentationData, plotStatistic: PlotStatistic) {
        this.ch1 = ch1
        this.ch2 = ch2
        this.data = ScatterPlotData.calculateScatterPlotData(ch1, ch2, imcData, segmentationData, plotStatistic)
        this.layout = {title: ch1 + ' versus ' + ch2, xaxis: {title: ch1}, yaxis: {title: ch2}}
    }

}
