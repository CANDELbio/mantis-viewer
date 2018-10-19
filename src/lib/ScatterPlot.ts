import { ImageData } from "./Image"
import { SegmentationData } from "./Segmentation"
import { PlotStatistic, PlotTransform } from "../interfaces/UIDefinitions"
import { SelectedPopulation } from "../interfaces/ImageInterfaces"
import { hexToRGB } from "./Graphics"
import * as Plotly from 'plotly.js'

export const DefaultSelectionName = "All Segments"
export const DefaultSelectionId = "DEFAULT_SELECTION_ID"
export const DefaultSelectionColor = 0x4286f4 // blue, color for "All Segments"

export class ScatterPlotData {
    ch1: string
    ch2: string
    data: Array<Plotly.Data>
    layout: Partial<Plotly.Layout> // ScatterPlotLayout // 

    // Builds a map of segment id/number to an array the regions of interest id it belongs to.
    static buildSegmentToSelectedRegionMap(selectedRegion: Array<SelectedPopulation>|null) {
        let map:{[key:number] : string[]}  = {}
        if(selectedRegion != null){
            // Iterate through the regions of interest
            for(let region of selectedRegion){
                let regionSelectedSegments = region.selectedSegments
                if(regionSelectedSegments != null){
                    // Iterate over the segmentIds selected in the region
                    for(let segmentId of regionSelectedSegments){
                        if(!(segmentId in map)) map[segmentId] = []
                        map[segmentId].push(region.id)
                    }
                }
            }
        }
        return map
    }

    // Builds a map of regionId to the region it belongs to.
    static buildSelectedRegionMap(selectedRegion: Array<SelectedPopulation>|null){
        let map:{[key:string] : SelectedPopulation} = {}
        if(selectedRegion != null){
            for(let region of selectedRegion){
                map[region.id] = region
            }
        }
        return map
    }

    static getPixelIntensity(plotStatistic: string, channel:string, pixels:number[], plotTransform: string, imcData: ImageData){
        let result:number

        // Get the mean or median depending on what the user selected.
        if(plotStatistic == "mean") {
            result = imcData.meanPixelIntensity(channel, pixels)
        } else {
            result = imcData.medianPixelIntensity(channel, pixels)
        }

        // If the user has selected a transform, apply it.
        if(plotTransform == "arcsinh"){
            result = Math.asinh(result)
        } else if(plotTransform == "log"){
            result = Math.log10(result)
        }

        return result
    }

    static getSelectionIdsSortedByName(selectedRegion: Array<SelectedPopulation>|null){
        let selectionIds = [DefaultSelectionId]
        if(selectedRegion != null){
            let sortedRegions = selectedRegion.sort((a: SelectedPopulation, b:SelectedPopulation) => {
                return a.name.localeCompare(b.name)
            })
            sortedRegions.map((value: SelectedPopulation) => {
                selectionIds.push(value.id)
            })
        }
        return selectionIds
    }

    static getSelectionName(selectionId: string, selectedRegionMap: {[key: string]: SelectedPopulation}){
        if(selectionId == DefaultSelectionId){
            return DefaultSelectionName
        } else{
            return selectedRegionMap[selectionId].name
        }
    }

    static getSelectionColor(selectionId: string, selectedRegionMap: {[key: string]: SelectedPopulation}){
        let color:number
        if(selectionId == DefaultSelectionId){
            color = DefaultSelectionColor
        } else{
            color = selectedRegionMap[selectionId].color
        }
        return this.hexToRGB(color)
    }

    static hexToRGB(hex:number){
        let rgb = hexToRGB(hex)
        return "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")"
    }

    static calculateScatterPlotData(ch1: string,
        ch2: string,
        imcData:ImageData,
        segmentationData: SegmentationData,
        plotStatistic: PlotStatistic,
        plotTransform: PlotTransform,
        selectedRegions: Array<SelectedPopulation>|null) {

        // A map of the data to be used in the plot.
        // Maps selection name (either all segments or the name of a selected region) to a set of data.
        let plotData:{
            [key:string] : {
                x: Array<number>,
                y: Array<number>,
                text: Array<string>}
            } = {}

        let regionMap = this.buildSegmentToSelectedRegionMap(selectedRegions)

        // Iterate through all of the segments/cells in the segmentation data
        for(let segment in segmentationData.segmentIndexMap){
            let pixels = segmentationData.segmentIndexMap[segment]

            // Generate a list of all of the selections/ROIs that this segment is in.
            let selections = [DefaultSelectionId]
            if(segment in regionMap){
                selections = selections.concat(regionMap[segment])
            }

            // Calculate the mean or median intensity of the pixels in the segment
            let x = this.getPixelIntensity(plotStatistic, ch1, pixels, plotTransform, imcData)
            let y = this.getPixelIntensity(plotStatistic, ch2, pixels, plotTransform, imcData)

            // Add the intensities to the data map for each selection the segment is in.
            // Being able to select points on the plot relies on the text being formatted
            // as a space delimited string with the last element being the segment id
            // Not ideal, but plotly (or maybe plotly-ts) doesn't support custom data.
            for(let selectionId of selections){
                if(!(selectionId in plotData)) plotData[selectionId] = {x: [], y:[], text:[]}
                if(x != null && y != null){
                    plotData[selectionId].x.push(x)
                    plotData[selectionId].y.push(y)
                    plotData[selectionId].text.push("Segment " + segment)
                }
                 
            }
        }

        let scatterPlotData = Array<Plotly.Data>()

        // Sorts the selection IDs so that the graph data appears in the same order/stacking every time.
        let sortedSelectionIds = this.getSelectionIdsSortedByName(selectedRegions)
        // Builds a map of selected region ids to their regions.
        // We use this to get the names and colors to use for graphing.
        let selectedRegionMap = this.buildSelectedRegionMap(selectedRegions)

        // Converting from the plotData map to an array of the format that can be passed to Plotly.
        for (let selectionId of sortedSelectionIds){
            let data = plotData[selectionId]

            scatterPlotData.push({
                x: data.x,
                y: data.y,
                mode: 'markers',
                type: 'scattergl',
                text: data.text,
                name: this.getSelectionName(selectionId, selectedRegionMap),
                marker: { size: 8, color: this.getSelectionColor(selectionId, selectedRegionMap)}
            })
        }

        return scatterPlotData
    }

    constructor(ch1: string,
        ch2: string,
        imcData:ImageData,
        segmentationData: SegmentationData,
        plotStatistic: PlotStatistic,
        plotTransform: PlotTransform,
        selectedRegions: SelectedPopulation[]|null
    ) {

        this.ch1 = ch1
        this.ch2 = ch2
        this.data = ScatterPlotData.calculateScatterPlotData(ch1, ch2, imcData, segmentationData, plotStatistic, plotTransform, selectedRegions)
        this.layout = {title: ch1 + ' versus ' + ch2, xaxis: {title: ch1}, yaxis: {title: ch2}}
    }

}
