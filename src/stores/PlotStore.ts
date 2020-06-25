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
        const projectStore = this.imageSetStore.projectStore
        if (this.imageSetStore == projectStore.activeImageSetStore) {
            const imageSetName = this.imageSetStore.name
            if (imageSetName) {
                const imageStore = this.imageSetStore.imageStore
                const segmentationStore = this.imageSetStore.segmentationStore
                const segmentFeatureStore = projectStore.segmentFeatureStore
                const populationStore = this.imageSetStore.populationStore
                const settingStore = this.imageSetStore.projectStore.settingStore
                const selectedPlotFeatures = settingStore.selectedPlotFeatures

                const imageSetsToPlot = settingStore.plotAllImageSets ? projectStore.allImageSetNames() : [imageSetName]

                const featureValues = segmentFeatureStore.featureValues(imageSetsToPlot)
                const featureMinMaxes = segmentFeatureStore.featureMinMaxes(imageSetsToPlot)

                let clearPlotData = true

                if (featureValues && featureMinMaxes) {
                    // Since the selected plot markers are global, we need to check if they are actually in the image set before generating data.
                    const selectedPlotFeaturesInImageSet = selectedPlotFeatures.every((m: string) => {
                        return segmentFeatureStore.featuresAvailable(imageSetName).includes(m)
                    })

                    if (imageStore && populationStore && selectedPlotFeaturesInImageSet) {
                        const loadHistogram =
                            settingStore.selectedPlotFeatures.length > 0 && settingStore.plotType == 'histogram'
                        const loadScatter =
                            settingStore.selectedPlotFeatures.length > 1 && settingStore.plotType == 'scatter'
                        const loadContour =
                            settingStore.selectedPlotFeatures.length > 1 && settingStore.plotType == 'contour'
                        const loadHeatmap =
                            settingStore.selectedPlotFeatures.length > 0 && settingStore.plotType == 'heatmap'
                        if (loadHistogram || loadScatter || loadHeatmap || loadContour) {
                            if (
                                segmentationStore.segmentationData != null &&
                                !segmentationStore.segmentationData.errorMessage
                            ) {
                                const plotData = generatePlotData(
                                    imageSetName,
                                    settingStore.selectedPlotFeatures,
                                    featureValues,
                                    featureMinMaxes,
                                    segmentationStore.segmentationData,
                                    settingStore.plotStatistic,
                                    settingStore.plotType,
                                    settingStore.plotTransform,
                                    settingStore.transformCoefficient,
                                    settingStore.plotNormalization,
                                    populationStore.selectedPopulations,
                                    settingStore.plotDotSize,
                                )
                                if (plotData != null) this.setPlotData(plotData)
                                clearPlotData = false
                            }
                        }
                    }
                }

                if (clearPlotData) this.clearPlotData()
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
