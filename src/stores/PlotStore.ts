import { observable, 
    action } from "mobx"
import { ScatterPlotData } from "../lib/ScatterPlotData"

import { PlotStatistic,
    PlotStatisticOptions,
    PlotTransform,
    PlotTransformOptions } from "../interfaces/UIDefinitions"


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

    @observable plotInMainWindow: boolean

    @action initialize = () => {
        this.scatterPlotStatistic = PlotStatisticOptions[0].value as PlotStatistic
        this.scatterPlotTransform = PlotTransformOptions[0].value as PlotTransform
        this.selectedPlotChannels = []
        this.segmentsHoveredOnPlot = []
        this.plotInMainWindow = true
    }

    @action setScatterPlotData = (data: ScatterPlotData) => {
        this.scatterPlotData = data
    }

    @action setPlotInMainWindow = (inWindow: boolean) => {
        this.plotInMainWindow = inWindow
    }

    @action setSegmentsHoveredOnPlot = (hoveredSegments: number[]) => {
        this.segmentsHoveredOnPlot = hoveredSegments
    }

    @action setSelectedPlotChannels = (x: string[]) => {
        this.selectedPlotChannels = x
    }

    @action clearSelectedPlotChannels = () => {
        this.selectedPlotChannels = []
    }

    @action setScatterPlotStatistic = (x: PlotStatistic) => {
        this.scatterPlotStatistic = x

    }

    @action setScatterPlotTransform = (x: PlotTransform) => {
        this.scatterPlotTransform = x
    }   

}