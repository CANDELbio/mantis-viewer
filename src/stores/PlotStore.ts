import { observable, action, autorun } from 'mobx'
import * as _ from 'underscore'
import { ImageSetStore } from './ImageSetStore'
import { PlotData } from '../interfaces/DataInterfaces'
import { generatePlotData } from '../lib/plot/Index'

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
                const persistedValueStore = this.imageSetStore.projectStore.persistedValueStore
                const selectedPlotFeatures = persistedValueStore.selectedPlotFeatures

                const imageSetsToPlot = persistedValueStore.plotAllImageSets
                    ? projectStore.imageSetNames
                    : [imageSetName]

                let featureValues = segmentFeatureStore.featureValues(imageSetsToPlot)
                if (persistedValueStore.plotDownsample && persistedValueStore.plotDownsamplePercent > 0)
                    featureValues = this.downsampleFeatureValues(
                        persistedValueStore.plotDownsamplePercent,
                        featureValues,
                    )
                const featureMinMaxes = segmentFeatureStore.featureMinMaxes(imageSetsToPlot)

                let clearPlotData = true

                if (featureValues && featureMinMaxes) {
                    // Since the selected plot markers are global, we need to check if they are actually in the image set before generating data.
                    const selectedPlotFeaturesInImageSet = selectedPlotFeatures.every((m: string) => {
                        return segmentFeatureStore.featuresAvailable(imageSetName).includes(m)
                    })

                    if (imageStore && populationStore && selectedPlotFeaturesInImageSet) {
                        const loadHistogram =
                            persistedValueStore.selectedPlotFeatures.length > 0 &&
                            persistedValueStore.plotType == 'histogram'
                        const loadScatter =
                            persistedValueStore.selectedPlotFeatures.length > 1 &&
                            persistedValueStore.plotType == 'scatter'
                        const loadContour =
                            persistedValueStore.selectedPlotFeatures.length > 1 &&
                            persistedValueStore.plotType == 'contour'
                        const loadHeatmap =
                            persistedValueStore.selectedPlotFeatures.length > 0 &&
                            persistedValueStore.plotType == 'heatmap'
                        if (loadHistogram || loadScatter || loadHeatmap || loadContour) {
                            if (
                                segmentationStore.segmentationData != null &&
                                !segmentationStore.segmentationData.errorMessage
                            ) {
                                const plotData = generatePlotData(
                                    imageSetName,
                                    persistedValueStore.plotCollapseAllImageSets,
                                    persistedValueStore.selectedPlotFeatures.slice(),
                                    featureValues,
                                    featureMinMaxes,
                                    segmentationStore.segmentationData,
                                    persistedValueStore.plotStatistic,
                                    persistedValueStore.plotType,
                                    persistedValueStore.plotTransform,
                                    persistedValueStore.plotTransformCoefficient,
                                    persistedValueStore.plotNormalization,
                                    populationStore.selectedPopulations,
                                    persistedValueStore.plotImageSetColors,
                                    persistedValueStore.plotNumHistogramBins,
                                    persistedValueStore.plotXLogScale,
                                    persistedValueStore.plotYLogScale,
                                    persistedValueStore.plotDotSize,
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

    private downsampleFeatureValues = (
        downsamplePercent: number,
        values: Record<string, Record<string, Record<number, number>>>,
    ): Record<string, Record<string, Record<number, number>>> => {
        const downsampledValues: Record<string, Record<string, Record<number, number>>> = {}
        for (const curImageSet of Object.keys(values)) {
            downsampledValues[curImageSet] = {}
            const curImageSetValues = values[curImageSet]
            for (const curMarker of Object.keys(curImageSetValues)) {
                downsampledValues[curImageSet][curMarker] = {}
                const curMarkerValues = curImageSetValues[curMarker]
                const curSegmentIds = Object.keys(curMarkerValues)
                const numSegmentsToSample = Math.round(curSegmentIds.length * downsamplePercent)
                const downsampledSegmentIds = _.sample(curSegmentIds, numSegmentsToSample)
                downsampledSegmentIds.forEach((segmentIdStr: string) => {
                    const segmentId = parseInt(segmentIdStr)
                    downsampledValues[curImageSet][curMarker][segmentId] = curMarkerValues[segmentId]
                })
            }
        }
        return downsampledValues
    }

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
