import { observable, 
    action } from "mobx"
import { PlotData } from "../lib/PlotData"

import { PlotStatistic,
    PlotStatisticOptions,
    PlotTransform,
    PlotTransformOptions,
    PlotType,
    PlotTypeOptions} from "../interfaces/UIDefinitions"


export class PlotStore {

    constructor() {
        this.initialize()
    }

    @observable.ref plotData: PlotData | null
    // Array of segment IDs that have been hovered on the graph.
    @observable segmentsHoveredOnPlot: number[]

    @observable plotStatistic: PlotStatistic
    @observable plotTransform: PlotTransform
    @observable plotType: PlotType

    @observable.ref selectedPlotChannels: string[]

    @action initialize = () => {
        this.plotStatistic = PlotStatisticOptions[0].value as PlotStatistic
        this.plotTransform = PlotTransformOptions[0].value as PlotTransform
        this.plotType = PlotTypeOptions[0].value as PlotType
        this.selectedPlotChannels = []
        this.segmentsHoveredOnPlot = []
    }

    @action setPlotData = (data: PlotData) => {
        this.plotData = data
    }

    @action clearPlotData = () => {
        this.plotData = null
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

    @action setPlotStatistic = (x: PlotStatistic) => {
        this.plotStatistic = x
    }

    @action setPlotTransform = (x: PlotTransform) => {
        this.plotTransform = x
    }

    @action setPlotType = (x: PlotType) => {
        this.plotType = x
        this.clearSelectedPlotChannels()
    }   

}