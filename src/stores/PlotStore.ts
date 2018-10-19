import { observable, 
    action } from "mobx"
import { ScatterPlotData, DefaultSelectionName } from "../lib/ScatterPlotData"
import * as _ from "underscore"

import { PlotStatistic,
    PlotStatisticOptions,
    PlotTransform,
    PlotTransformOptions,
    SelectOption } from "../interfaces/UIDefinitions"


export class PlotStore {

    constructor() {
        this.initialize()
    }

    @observable.ref scatterPlotData: ScatterPlotData | null
    // Array of segment IDs that have been hovered on the graph.
    @observable segmentsHoveredOnPlot: number[]

    // Array of segment IDs that have been selected on the graph.
    @observable segmentsSelectedOnPlot: number[]

    @observable scatterPlotStatistic: PlotStatistic
    @observable scatterPlotTransform: PlotTransform

    @observable.ref selectedPlotChannels: string[]

    @action initialize = () => {
        this.scatterPlotStatistic = PlotStatisticOptions[0].value as PlotStatistic
        this.scatterPlotTransform = PlotTransformOptions[0].value as PlotTransform
        this.selectedPlotChannels = []
        this.segmentsHoveredOnPlot = []
        this.segmentsSelectedOnPlot = []
    }

    // Data comes from a Plotly event.
    // Points are the selected points.
    // No custom fields, so we are getting the segment id from the title text for the point.
    // Title text with segment id generated in ScatterPlotData.
    parsePlotlyEventData = (data: {points:any, event:any}) => {
        let selectedSegments:number[] = []
        if(data != null) {
            console.log("Parsing plotly event...")
            console.log(data)
            if(data.points != null && data.points.length > 0){
                for (let point of data.points){
                    let pointRegionName = point.data.name
                    // Check if the region name for the point is the default selection name
                    // Sometimes plotly returns incorrect selected points if there are multiple selections
                    // and the point being hovered/highlighted isn't in some of those selections.
                    if(pointRegionName == DefaultSelectionName) {
                        let pointText = point.text
                        let splitText:string[] = pointText.split(" ")
                        let segmentId = Number(splitText[splitText.length - 1])
                        selectedSegments.push(segmentId)
                    }
                }
            }
        }
        console.log("Found segments " + selectedSegments)
        return selectedSegments
    }

    @action setScatterPlotData = (data: ScatterPlotData) => {
        this.scatterPlotData = data
    }

    @action setSegmentsSelectedOnPlot = (data: {points:any, event:any}) => {
        this.segmentsSelectedOnPlot = this.parsePlotlyEventData(data)
    }


    @action setSegmentsHoveredOnPlot = (data: {points: any, event:any}) => {
        this.segmentsHoveredOnPlot = this.parsePlotlyEventData(data)
    }

    @action clearSegmentsHoveredOnPlot = () => {
        this.segmentsHoveredOnPlot = []
    }

    @action setSelectedPlotChannels = (x: SelectOption[]) => {
        this.selectedPlotChannels = _.pluck(x, "value")
    }

    @action clearSelectedPlotChannels = () => {
        this.selectedPlotChannels = []
    }

    @action setScatterPlotStatistic = (x: SelectOption) => {
        if (x != null){
            this.scatterPlotStatistic = x.value as PlotStatistic
        }
    }

    @action setScatterPlotTransform = (x: SelectOption) => {
        if (x != null){
            this.scatterPlotTransform = x.value as PlotTransform
        }
    }   

}