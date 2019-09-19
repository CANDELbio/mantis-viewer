import { observable, action, autorun } from 'mobx'
import { PlotData } from '../interfaces/DataInterfaces'
import { generatePlotData } from '../lib/plot/Index'
import { ImageSetStore } from './ImageSetStore'

export class PlotStore {
    public constructor(imageSetStore: ImageSetStore) {
        this.imageSetStore = imageSetStore
        this.initialize()
    }

    private imageSetStore: ImageSetStore
    @observable.ref public plotData: PlotData | null
    // Array of segment IDs that have been hovered on the graph.
    @observable public segmentsHoveredOnPlot: number[]

    // Regenerates plot data when image store, population store, or plot store data has changed
    private autoGeneratePlotData = autorun(() => {
        if (this.imageSetStore == this.imageSetStore.projectStore.activeImageSetStore) {
            let imageStore = this.imageSetStore.imageStore
            let segmentationStore = this.imageSetStore.segmentationStore
            let populationStore = this.imageSetStore.populationStore
            let settingStore = this.imageSetStore.projectStore.settingStore

            if (imageStore.imageData) {
                let imageData = imageStore.imageData
                // Since the selected plot markers are global, we need to check if they are actually in the image set before generating data.
                let selectedPlotMarkersInImageSet = settingStore.selectedPlotMarkers.every((m: string) => {
                    return imageData.markerNames.includes(m)
                })
                if (imageStore && populationStore && selectedPlotMarkersInImageSet) {
                    let loadHistogram =
                        settingStore.selectedPlotMarkers.length > 0 && settingStore.plotType == 'histogram'
                    let loadScatter = settingStore.selectedPlotMarkers.length == 2 && settingStore.plotType == 'scatter'
                    let loadContour = settingStore.selectedPlotMarkers.length == 2 && settingStore.plotType == 'contour'
                    let loadHeatmap = settingStore.plotType == 'heatmap'
                    if (loadHistogram || loadScatter || loadHeatmap || loadContour) {
                        if (
                            segmentationStore.segmentationData != null &&
                            segmentationStore.segmentationStatistics != null
                        ) {
                            let plotData = generatePlotData(
                                settingStore.selectedPlotMarkers,
                                segmentationStore.segmentationData,
                                segmentationStore.segmentationStatistics,
                                settingStore.plotType,
                                settingStore.plotStatistic,
                                settingStore.plotTransform,
                                settingStore.transformCoefficient,
                                settingStore.plotNormalization,
                                populationStore.selectedPopulations,
                                settingStore.plotDotSize,
                            )
                            if (plotData != null) this.setPlotData(plotData)
                        }
                    } else {
                        this.clearPlotData()
                    }
                } else {
                    this.clearPlotData()
                }
            }
        }
    })

    @action public initialize = () => {
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
}
