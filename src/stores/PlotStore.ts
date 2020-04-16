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
            const imageStore = this.imageSetStore.imageStore
            const segmentationStore = this.imageSetStore.segmentationStore
            const populationStore = this.imageSetStore.populationStore
            const settingStore = this.imageSetStore.projectStore.settingStore

            if (imageStore.imageData) {
                const imageData = imageStore.imageData
                // Since the selected plot markers are global, we need to check if they are actually in the image set before generating data.
                const selectedPlotMarkersInImageSet = settingStore.selectedPlotMarkers.every((m: string) => {
                    return imageData.markerNames.includes(m)
                })
                if (imageStore && populationStore && selectedPlotMarkersInImageSet) {
                    const loadHistogram =
                        settingStore.selectedPlotMarkers.length > 0 && settingStore.plotType == 'histogram'
                    const loadScatter =
                        settingStore.selectedPlotMarkers.length == 2 && settingStore.plotType == 'scatter'
                    const loadContour =
                        settingStore.selectedPlotMarkers.length == 2 && settingStore.plotType == 'contour'
                    const loadHeatmap = settingStore.plotType == 'heatmap'
                    if (loadHistogram || loadScatter || loadHeatmap || loadContour) {
                        if (
                            segmentationStore.segmentationData != null &&
                            !segmentationStore.segmentationData.errorMessage &&
                            segmentationStore.segmentationStatistics != null
                        ) {
                            const plotData = generatePlotData(
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

    @action public initialize = (): void => {
        this.segmentsHoveredOnPlot = []
    }

    @action public setPlotData = (data: PlotData): void => {
        this.plotData = data
    }

    @action public clearPlotData = (): void => {
        this.plotData = null
    }

    @action public setSegmentsHoveredOnPlot = (hoveredSegments: number[]): void => {
        this.segmentsHoveredOnPlot = hoveredSegments
    }
}
