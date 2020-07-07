import { buildHeatmapData } from './HeatMap'
import { buildScatterData, buildHistogramData } from './HistogramAndScatter'
import { SegmentationData } from '../SegmentationData'
import { PlotTransform, PlotType, PlotNormalization, PlotStatistic } from '../../definitions/UIDefinitions'
import { SelectedPopulation } from '../../stores/PopulationStore'
import { MinMax } from '../../interfaces/ImageInterfaces'
import { PlotData } from '../../interfaces/DataInterfaces'

// dotSize is optional and only used for Scatter.
export function generatePlotData(
    activeImageSetName: string,
    selectedFeatures: string[],
    featureValues: Record<string, Record<string, Record<number, number>>>,
    featureMinMaxes: Record<string, Record<string, MinMax>>,
    segmentationData: SegmentationData,
    plotStatistic: PlotStatistic,
    plotType: PlotType,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    plotNormalization: PlotNormalization,
    selectedPopulations: SelectedPopulation[] | null,
    dotSize?: number,
): PlotData | null {
    let plotData: PlotData | null = null
    const filteredPopulations = selectedPopulations
        ? selectedPopulations.filter((p: SelectedPopulation): boolean => {
              return p.selectedSegments.length > 0
          })
        : null
    if (plotType == 'histogram' && selectedFeatures.length > 0) {
        plotData = buildHistogramData(
            activeImageSetName,
            selectedFeatures.slice(0, 1),
            featureValues,
            featureMinMaxes,
            plotTransform,
            transformCoefficient,
            filteredPopulations,
        )
    } else if ((plotType == 'scatter' || plotType == 'contour') && selectedFeatures.length > 1) {
        plotData = buildScatterData(
            plotType,
            activeImageSetName,
            selectedFeatures.slice(0, 2),
            featureValues,
            featureMinMaxes,
            plotTransform,
            transformCoefficient,
            filteredPopulations,
            dotSize,
        )
    } else if (plotType == 'heatmap') {
        plotData = buildHeatmapData(
            activeImageSetName,
            selectedFeatures,
            featureValues,
            segmentationData,
            plotStatistic,
            plotTransform,
            transformCoefficient,
            plotNormalization,
            filteredPopulations,
        )
    }
    return plotData
}
