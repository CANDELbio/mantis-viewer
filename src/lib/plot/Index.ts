import { buildHeatmapData } from './HeatMap'
import { buildScatterData, buildHistogramData } from './HistogramAndScatter'
import { SegmentationData } from '../SegmentationData'
import { SegmentationStatistics } from '../SegmentationStatistics'
import { PlotStatistic, PlotTransform, PlotType, PlotNormalization } from '../../definitions/UIDefinitions'
import { SelectedPopulation } from '../../interfaces/ImageInterfaces'
import { PlotData } from '../../interfaces/DataInterfaces'

export function generatePlotData(
    channels: string[],
    segmentationData: SegmentationData,
    segmentationStatistics: SegmentationStatistics,
    plotType: PlotType,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    plotNormalization: PlotNormalization,
    selectedPopulations: SelectedPopulation[] | null,
): PlotData | null {
    let plotData: PlotData | null = null
    if (plotType == 'histogram' && channels.length == 1) {
        plotData = buildHistogramData(
            channels,
            segmentationData,
            segmentationStatistics,
            plotStatistic,
            plotTransform,
            selectedPopulations,
        )
    } else if (plotType == 'scatter' && channels.length == 2) {
        plotData = buildScatterData(
            channels,
            segmentationData,
            segmentationStatistics,
            plotStatistic,
            plotTransform,
            selectedPopulations,
        )
    } else if (plotType == 'heatmap') {
        plotData = buildHeatmapData(
            channels,
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
