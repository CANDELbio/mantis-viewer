import { IMCData } from "../lib/IMCData"
import { SegmentationData } from "../lib/SegmentationData";
import { PlotStatistic } from "../interfaces/UIDefinitions"
import { IMCImageROI } from "../components/IMCIMage"

interface Marker {
    size: number
}

interface ScatterPlotDatum {
    x: number[]
    y: number[]
    mode: string
    type: string
    text: string[]
    name: string
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

    // Builds a map of segment id/number to an array the regions of interest names it belongs to.
    static buildRegionOfInterestMap(regionsOfInterest: Array<IMCImageROI>|null) {
        let map:{[key:string] : Array<string>}  = {}
        if(regionsOfInterest != null){
            for(let region of regionsOfInterest){
                if(region.selectedCentroids != null){
                    for(let segment in region.selectedCentroids){
                        if(!(segment in map)) map[segment] = new Array<string>()
                        map[segment].push(region.name)
                    }
                }
            }
        }
        return map
    }

    static calculateScatterPlotData(ch1: string,
        ch2: string,
        imcData:IMCData,
        segmentationData: SegmentationData,
        plotStatistic: PlotStatistic,
        regionsOfInterest: Array<IMCImageROI>|null) {

        let defaultSelection = 'All Segments'

        // A map of the data to be used in the plot.
        // Maps selection name (either all segments or the name of an ROI) to a set of data.
        let plotData:{
            [key:string] : {
                x: Array<number>,
                y: Array<number>,
                text: Array<string>}
            } = {}

        let regionMap = this.buildRegionOfInterestMap(regionsOfInterest)

        // Iterate through all of the segments/cells in the segmentation data
        for(let segment in segmentationData.segmentIndexMap){
            let pixels = segmentationData.segmentIndexMap[segment]

            // Generate a list of all of the selections/ROIs that this segment is in.
            let selections = [defaultSelection]
            if(segment in regionMap){
                selections = selections.concat(regionMap[segment])
            }

            // Calculate the mean or median intensity of the pixels in the segment
            let x:number|null = null
            let y:number|null = null
            if(plotStatistic == "mean") {
                x = imcData.meanPixelIntensity(ch1, pixels)
                y = imcData.meanPixelIntensity(ch2, pixels)
            } else if (plotStatistic == "median") {
                x = imcData.medianPixelIntensity(ch1, pixels)
                y = imcData.medianPixelIntensity(ch2, pixels)
            }

            // Add the intensities to the data map for each selection the segment is in.
            for(let selection of selections){
                if(!(selection in plotData)) plotData[selection] = {x: [], y:[], text:[]}
                if(x != null) plotData[selection].x.push(x)
                if(y != null) plotData[selection].y.push(y)
                plotData[selection].text.push("Segment " + segment)
            }
        }

        let scatterPlotData = new Array<ScatterPlotDatum>()

        // Sort the keys so they appear in the same order in the graph key between refreshes.
        let sorted:string[] = []
        for(let key in plotData) {
            sorted.push(key)
        }
        sorted.sort()

        // Converting from the plotData map to an array of the format that can be passed to Plotly.
        for (let selection of sorted){
            let data = plotData[selection]
            scatterPlotData.push({
                x: data.x,
                y: data.y,
                mode: 'markers',
                type: 'scattergl',
                text: data.text,
                name: selection,
                marker: { size: 8 }
            })
        }

        return scatterPlotData
    }

    constructor(ch1: string,
        ch2: string,
        imcData:IMCData,
        segmentationData: SegmentationData,
        plotStatistic: PlotStatistic,
        regionsOfInterest: Array<IMCImageROI>|null) {

        this.ch1 = ch1
        this.ch2 = ch2
        this.data = ScatterPlotData.calculateScatterPlotData(ch1, ch2, imcData, segmentationData, plotStatistic, regionsOfInterest)
        this.layout = {title: ch1 + ' versus ' + ch2, xaxis: {title: ch1}, yaxis: {title: ch2}}
    }

}
