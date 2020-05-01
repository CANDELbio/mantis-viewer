import { buildHeatmapData } from './HeatMap'
import { buildScatterData, buildHistogramData } from './HistogramAndScatter'
import { SegmentationData } from '../SegmentationData'
import { SegmentationStatistics } from '../SegmentationStatistics'
import { PlotStatistic, PlotTransform, PlotType, PlotNormalization } from '../../definitions/UIDefinitions'
import { SelectedPopulation } from '../../interfaces/ImageInterfaces'
import { PlotData } from '../../interfaces/DataInterfaces'

// dotSize is optional and only used for Scatter.
export function generatePlotData(
    markers: string[],
    segmentationData: SegmentationData,
    segmentationStatistics: SegmentationStatistics,
    plotType: PlotType,
    plotStatistic: PlotStatistic,
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
    if (plotType == 'histogram' && markers.length > 0) {
        plotData = buildHistogramData(
            [markers[0]],
            segmentationData,
            segmentationStatistics,
            plotStatistic,
            plotTransform,
            transformCoefficient,
            filteredPopulations,
        )
    } else if ((plotType == 'scatter' || plotType == 'contour') && markers.length == 2) {
        plotData = buildScatterData(
            plotType,
            markers,
            segmentationData,
            segmentationStatistics,
            plotStatistic,
            plotTransform,
            transformCoefficient,
            filteredPopulations,
            dotSize,
        )
    } else if (plotType == 'heatmap') {
        plotData = buildHeatmapData(
            markers,
            segmentationData,
            segmentationStatistics,
            plotStatistic,
            plotTransform,
            transformCoefficient,
            plotNormalization,
            filteredPopulations,
        )
    }
    return plotData
}
