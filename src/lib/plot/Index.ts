import { buildHeatmapData } from './HeatMap'
import { buildScatterData, buildHistogramData } from './HistogramAndScatter'
import { PlotTransform, PlotType, PlotNormalization, PlotStatistic } from '../../definitions/UIDefinitions'
import { PlotData } from '../../interfaces/DataInterfaces'
import { MinMax } from '../../interfaces/ImageInterfaces'
import { SelectedPopulation } from '../../stores/PopulationStore'
import { SegmentationData } from '../SegmentationData'

// dotSize is optional and only used for Scatter.
export function generatePlotData(
    activeImageSetName: string,
    collapseAllImageSets: boolean,
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
    colorMap: Record<string, number>,
    histogramNumBins: number,
    xLogScale: boolean,
    yLogScale: boolean,
    dotSize: number,
): PlotData | null {
    let plotData: PlotData | null = null
    const filteredPopulations = selectedPopulations
        ? selectedPopulations.filter((p: SelectedPopulation): boolean => {
              return p.visible && p.selectedSegments.length > 0
          })
        : null
    if (plotType == 'histogram' && selectedFeatures.length > 0) {
        plotData = buildHistogramData(
            activeImageSetName,
            collapseAllImageSets,
            selectedFeatures.slice(0, 1),
            featureValues,
            featureMinMaxes,
            plotTransform,
            transformCoefficient,
            filteredPopulations,
            colorMap,
            histogramNumBins,
        )
    } else if ((plotType == 'scatter' || plotType == 'contour') && selectedFeatures.length > 1) {
        plotData = buildScatterData(
            plotType,
            activeImageSetName,
            collapseAllImageSets,
            selectedFeatures.slice(0, 2),
            featureValues,
            featureMinMaxes,
            plotTransform,
            transformCoefficient,
            filteredPopulations,
            colorMap,
            dotSize,
            xLogScale,
            yLogScale,
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
