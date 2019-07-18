import { observable, action } from 'mobx'
import { PlotData } from '../interfaces/DataInterfaces'

import {
    PlotStatistic,
    PlotStatisticOptions,
    PlotTransform,
    PlotTransformOptions,
    PlotType,
    PlotTypeOptions,
    PlotNormalization,
    PlotNormalizationOptions,
} from '../definitions/UIDefinitions'

export class PlotStore {
    public constructor() {
        this.initialize()
    }

    @observable.ref public plotData: PlotData | null
    // Array of segment IDs that have been hovered on the graph.
    @observable public segmentsHoveredOnPlot: number[]

    @observable public plotStatistic: PlotStatistic
    @observable public plotTransform: PlotTransform
    @observable public plotType: PlotType
    @observable public plotNormalization: PlotNormalization

    @observable.ref public selectedPlotMarkers: string[]

    @action public initialize = () => {
        this.plotStatistic = PlotStatisticOptions[0].value as PlotStatistic
        this.plotTransform = PlotTransformOptions[0].value as PlotTransform
        this.plotType = PlotTypeOptions[0].value as PlotType
        this.plotNormalization = PlotNormalizationOptions[0].value as PlotNormalization
        this.selectedPlotMarkers = []
        this.segmentsHoveredOnPlot = []
    }

    @action public setPlotData = (data: PlotData) => {
        this.plotData = data
    }

    @action public clearPlotData = () => {
        this.plotData = null
    }

    @action public setSegmentsHoveredOnPlot = (hoveredSegments: number[]) => {
        this.segmentsHoveredOnPlot = hoveredSegments
    }

    @action public setSelectedPlotMarkers = (x: string[]) => {
        this.selectedPlotMarkers = x
    }

    @action public clearSelectedPlotMarkers = () => {
        this.selectedPlotMarkers = []
    }

    @action public setPlotStatistic = (x: PlotStatistic) => {
        this.plotStatistic = x
    }

    @action public setPlotTransform = (x: PlotTransform) => {
        this.plotTransform = x
    }

    @action public setPlotNormalization = (x: PlotNormalization) => {
        this.plotNormalization = x
    }

    @action public setPlotType = (x: PlotType) => {
        this.plotType = x
        this.clearSelectedPlotMarkers()
    }
}
