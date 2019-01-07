import * as Plotly from 'plotly.js'

import { SegmentationData } from "./SegmentationData"
import { SegmentationStatistics } from "./SegmentationStatistics"
import { PlotStatistic, PlotTransform, PlotType, PlotNormalization } from "../interfaces/UIDefinitions"
import { SelectedPopulation } from "../interfaces/ImageInterfaces"
import { hexToRGB } from "./GraphicsHelper"
import { calculateMean } from "../lib/StatsHelper"

export const DefaultSelectionName = "All Segments"
export const DefaultSelectionId = "DEFAULT_SELECTION_ID"
export const DefaultSelectionColor = 0x4286f4 // blue, color for "All Segments"

export class PlotData {
    channels: string[]
    data: Plotly.Data[]
    layout: Partial<Plotly.Layout>

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

    static getSegmentIntensity(plotStatistic: string, channel:string, segmentIds:number[], plotTransform: string, segmentationStatistics: SegmentationStatistics){
        let result:number

        // Get the mean or median depending on what the user selected.
        if(plotStatistic == "mean") {
            result = segmentationStatistics.meanIntensity(channel, segmentIds)
        } else {
            result = segmentationStatistics.medianIntensity(channel, segmentIds)
        }

        // If the user has selected a transform, apply it.
        if(plotTransform == "arcsinh"){
            result = Math.asinh(result)
        } else if(plotTransform == "log"){
            result = Math.log10(result)
        }

        return result
    }

    // Currently sorts them by name. Will want to remove sorting by name once we allow user to choose the render order.
    static buildSelectionIdArray(selectedPopulations: SelectedPopulation[]|null){
        let selectionIds = [DefaultSelectionId]
        if(selectedPopulations != null){
            let sortedRegions = selectedPopulations.sort((a: SelectedPopulation, b:SelectedPopulation) => {
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

    static newPlotDatum(numValues: number){
        let values = []
        for(let i = 0; i<numValues; i++){
            values.push([])
        }
        return {values: values, text:[]}
    }

    static calculateRawPlotData(channels: string[],
        segmentationData: SegmentationData,
        segmentationStatistics: SegmentationStatistics,
        plotStatistic: PlotStatistic,
        plotTransform: PlotTransform,
        selectedPopulations: Array<SelectedPopulation>|null){
        // A map of the data to be used in the plot.
        // Maps selection name (either all segments or the name of a selected region) to a set of data.
        let plotData:{
            [key:string] : {
                values: number[][],
                text: string[]}
            } = {}

        let regionMap = this.buildSegmentToSelectedRegionMap(selectedPopulations)

        // Iterate through all of the segments/cells in the segmentation data
        for(let segment in segmentationData.centroidMap){
            // Generate a list of all of the selections/ROIs that this segment is in.
            let selections = [DefaultSelectionId]
            if(segment in regionMap){
                selections = selections.concat(regionMap[segment])
            }

            // Calculate the mean or median intensity of the pixels in the segment
            let curValues = []
            for(let ch of channels){
                curValues.push(this.getSegmentIntensity(plotStatistic, ch, [parseInt(segment)], plotTransform, segmentationStatistics))
            }

            // Add the intensities to the data map for each selection the segment is in.
            // Being able to select points on the plot relies on the text being formatted
            // as a space delimited string with the last element being the segment id
            // Not ideal, but plotly (or maybe plotly-ts) doesn't support custom data.
            for(let selectionId of selections){
                if(!(selectionId in plotData)) plotData[selectionId] = this.newPlotDatum(channels.length)
                plotData[selectionId].text.push("Segment " + segment)
                for(let i in curValues){
                    let v = curValues[i]
                    plotData[selectionId].values[i].push(v)
                }
            }
        }

        return plotData
    }

    static calculatePlotData(channels: string[],
        segmentationData: SegmentationData,
        segmentationStatistics: SegmentationStatistics,
        plotType: PlotType,
        plotStatistic: PlotStatistic,
        plotTransform: PlotTransform,
        selectedRegions: Array<SelectedPopulation>|null)
    {

        let rawPlotData = this.calculateRawPlotData(channels, segmentationData, segmentationStatistics, plotStatistic, plotTransform, selectedRegions)

        let plotData = Array<Plotly.Data>()

        // Sorts the selection IDs so that the graph data appears in the same order/stacking every time.
        let sortedSelectionIds = this.buildSelectionIdArray(selectedRegions)
        // Builds a map of selected region ids to their regions.
        // We use this to get the names and colors to use for graphing.
        let selectedRegionMap = this.buildSelectedRegionMap(selectedRegions)

        // Converting from the plotData map to an array of the format that can be passed to Plotly.
        for (let selectionId of sortedSelectionIds){
            let selectionData = rawPlotData[selectionId]
            let numSelectionValues = selectionData.values.length

            plotData.push({
                x: selectionData.values[0],
                y: numSelectionValues > 1 ? selectionData.values[1] : undefined,
                z: numSelectionValues > 2 ? selectionData.values[2] : undefined,
                mode: 'markers',
                type: plotType == 'scatter' ? 'scattergl' : 'histogram',
                text: plotType == 'scatter' ? selectionData.text : undefined,
                name: this.getSelectionName(selectionId, selectedRegionMap),
                marker: { size: 8, color: this.getSelectionColor(selectionId, selectedRegionMap)}
            })
        }

        return plotData
    }

    static normalizeIntensitiesByMarker(intensities: number[][]){
        let markerSums:number[] = new Array(intensities[0].length).fill(0);
        intensities.map((population: number[]) => {
            population.map((value: number, index: number) => {
                markerSums[index] += value
            })
        })
        let markerMeans = markerSums.map((sum:number)=> {
            return sum/intensities.length
        })
        return intensities.map((population: number[]) => {
            return population.map((value:number, index: number) =>{
                return value/markerMeans[index]
            })
        })
    }

    static normalizeIntensitiesByPopulation(intensities: number[][]){
        return intensities.map((population: number[]) => {
            let populationMean = calculateMean(population)
            return population.map((value: number) => {
                return value/populationMean
            })
        })
    }

    static normalizeHeatmapIntensities(intensities: number[][], plotNormalization: PlotNormalization){
        if(plotNormalization == 'marker'){
            return this.normalizeIntensitiesByMarker(intensities)
        } else if(plotNormalization == 'population'){
            return this.normalizeIntensitiesByPopulation(intensities)
        } else{
            return intensities
        }
    }

    static calculateHeatmapData(segmentationData: SegmentationData,
        segmentationStatistics: SegmentationStatistics,
        plotStatistic: PlotStatistic,
        plotTransform: PlotTransform,
        plotNormalization: PlotNormalization,
        selectedPopulations: SelectedPopulation[]|null)
    {
        let channels = segmentationStatistics.channels
        let selectionIds = this.buildSelectionIdArray(selectedPopulations)
        let intensities = []
        // Builds a map of selected region ids to their regions.
        // We use this to get the names and colors to use for graphing.
        let selectedRegionMap = this.buildSelectedRegionMap(selectedPopulations)

        for(let selectionId of selectionIds){
            // If we have the default selection id use all segment ids, otherwise get segments for the current selection
            let selectedSegments = (selectionId == DefaultSelectionId) ? segmentationData.segmentIds : selectedRegionMap[selectionId].selectedSegments
            let channelIntensities = []
            for(let channel of channels){
                let intensity = this.getSegmentIntensity(plotStatistic, channel, selectedSegments, plotTransform, segmentationStatistics)
                channelIntensities.push(intensity)
            }
            intensities.push(channelIntensities)
        }

        let heatmapData = Array<Plotly.Data>()

        // TO-DO: y should be selection names.
        heatmapData.push({
                z: this.normalizeHeatmapIntensities(intensities, plotNormalization),
                x: channels,
                y: selectionIds.map((selectionId:string) => { return this.getSelectionName(selectionId, selectedRegionMap) }),
                type: 'heatmap'
        })

        return heatmapData
    }

    constructor(channels: string[],
        segmentationData: SegmentationData,
        segmentationStatistics: SegmentationStatistics,
        plotType: PlotType,
        plotStatistic: PlotStatistic,
        plotTransform: PlotTransform,
        plotNormalization: PlotNormalization,
        selectedPopulations: SelectedPopulation[]|null)
    {
        this.channels = channels

        if(plotType == 'histogram' && channels.length == 1) {
            this.data = PlotData.calculatePlotData(channels, segmentationData, segmentationStatistics, plotType, plotStatistic, plotTransform, selectedPopulations)
            this.layout = {title: channels[0], xaxis: {title: channels[0]}, barmode: "overlay"};
        } else if (plotType == 'scatter' && channels.length == 2){
            this.data = PlotData.calculatePlotData(channels, segmentationData, segmentationStatistics, plotType, plotStatistic, plotTransform, selectedPopulations)
            this.layout = {title: channels[0] + ' versus ' + channels[1], xaxis: {title: channels[0]}, yaxis: {title: channels[1]}}
        } else if (plotType == 'heatmap'){
            this.data = PlotData.calculateHeatmapData(segmentationData, segmentationStatistics, plotStatistic, plotTransform, plotNormalization, selectedPopulations)
            this.layout = {title: 'Heatmap of Channel Intensity', xaxis: {tickangle: 45}}
        }
    }

}
