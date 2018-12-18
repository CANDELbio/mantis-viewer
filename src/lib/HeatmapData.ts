import * as Plotly from 'plotly.js'

import { ImageData } from "./ImageData"
import { SegmentationData } from "./SegmentationData"
import { PlotStatistic, PlotTransform } from "../interfaces/UIDefinitions"
import { SelectedPopulation } from "../interfaces/ImageInterfaces"

export const DefaultSelectionName = "All Segments"
export const DefaultSelectionId = "DEFAULT_SELECTION_ID"
export const DefaultSelectionColor = 0x4286f4 // blue, color for "All Segments"

export class HeatmapData {
    data: Plotly.Data[]
    layout: Partial<Plotly.Layout>

    // Builds a map of selected population ids to all of the pixels contained in the segments in those populations.
    static buildSelectionToPixelMap(segmentationData: SegmentationData, selectedPopulations: SelectedPopulation[]|null){
        let pixelMap = {}
        pixelMap[DefaultSelectionId] = []
        let segmentLocations = segmentationData.segmentLocationMap
        for(let segmentId in segmentLocations){
            let segmentLocation = segmentLocations[segmentId]
            pixelMap[DefaultSelectionId].push(segmentLocation)
            for(let population of selectedPopulations){
                if(!(segmentId in pixelMap)) pixelMap[segmentId] = [] 
                if(segmentId in population.selectedSegments) pixelMap[segmentId].push(segmentLocation)
            }
        }
        return pixelMap
    }

    // Currently sorts them by name. Will want to remove sorting by name once we allow user to choose the render order.
    // Will want to DRY up from PlotData.
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

    // Gets the intensity for a set of pixels
    // Will want to DRY up from PlotData
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

    static calculateHeatmapData(imcData:ImageData,
        segmentationData: SegmentationData,
        plotStatistic: PlotStatistic,
        plotTransform: PlotTransform,
        selectedPopulations: SelectedPopulation[]|null)
    {
        let pixelMap = this.buildSelectionToPixelMap(segmentationData, selectedPopulations)
        let channels = imcData.channelNames
        let selectionIds = this.buildSelectionIdArray(selectedPopulations)
        let intensities = []

        for(let selectionId of selectionIds){
            let channelIntensities = []
            for(let channel of channels){
                let intensity = this.getPixelIntensity(plotStatistic, channel, pixelMap[selectionId], plotTransform, imcData)
                channelIntensities.push(intensity)
            }
            intensities.push(channelIntensities)
        }

        let heatmapData = Array<Plotly.Data>()

        // TO-DO: y should be selection names.
        heatmapData.push({
                z: intensities,
                x: channels,
                y: selectionIds,
                type: 'heatmap'
        })

        return heatmapData
    }

    constructor(imcData:ImageData,
        segmentationData: SegmentationData,
        plotStatistic: PlotStatistic,
        plotTransform: PlotTransform,
        selectedPopulations: SelectedPopulation[]|null
    ) {
        this.data = HeatmapData.calculateHeatmapData(imcData, segmentationData, plotStatistic, plotTransform, selectedPopulations)

        this.layout = {title: 'Heatmap of Channel Intensity', xaxis: {title: 'Channel'}, yaxis: {title: 'Population'}}
    }

}