import { observable, 
    action } from "mobx"
import { ScatterPlotData } from "../lib/ScatterPlotData"
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

    @observable scatterPlotStatistic: PlotStatistic
    @observable scatterPlotTransform: PlotTransform

    @observable.ref selectedPlotChannels: string[]

    @action initialize = () => {
        this.scatterPlotStatistic = PlotStatisticOptions[0].value as PlotStatistic
        this.scatterPlotTransform = PlotTransformOptions[0].value as PlotTransform
        this.selectedPlotChannels = []
        this.segmentsHoveredOnPlot = []
    }

    @action setScatterPlotData = (data: ScatterPlotData) => {
        this.scatterPlotData = data
    }

    @action setSegmentsHoveredOnPlot = (hoveredSegments: number[]) => {
        this.segmentsHoveredOnPlot = hoveredSegments
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