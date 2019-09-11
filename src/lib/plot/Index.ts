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
    plotNormalization: PlotNormalization,
    selectedPopulations: SelectedPopulation[] | null,
    dotSize?: number,
): PlotData | null {
    let plotData: PlotData | null = null
    if (plotType == 'histogram' && markers.length == 1) {
        plotData = buildHistogramData(
            markers,
            segmentationData,
            segmentationStatistics,
            plotStatistic,
            plotTransform,
            selectedPopulations,
        )
    } else if (plotType == 'scatter' && markers.length == 2) {
        plotData = buildScatterData(
            markers,
            segmentationData,
            segmentationStatistics,
            plotStatistic,
            plotTransform,
            selectedPopulations,
            dotSize,
        )
    } else if (plotType == 'heatmap') {
        plotData = buildHeatmapData(
            markers,
            segmentationData,
            segmentationStatistics,
            plotStatistic,
            plotTransform,
            plotNormalization,
            selectedPopulations,
        )
    }
    return plotData
}
