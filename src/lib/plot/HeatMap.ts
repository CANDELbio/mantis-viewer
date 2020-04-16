import { SegmentationData } from '../SegmentationData'
import { SegmentationStatistics } from '../SegmentationStatistics'
import { PlotStatistic, PlotTransform, PlotNormalization } from '../../definitions/UIDefinitions'
import { SelectedPopulation } from '../../interfaces/ImageInterfaces'
import { calculateMean } from '../../lib/StatsHelper'
import { PlotData } from '../../interfaces/DataInterfaces'
import { buildSelectionIdArray, buildSelectedRegionMap, getSegmentIntensity, getSelectionName } from './Helper'

import { DefaultSelectionId } from '../../definitions/PlotDataDefinitions'

function normalizeIntensitiesByMarker(intensities: number[][]): number[][] {
    const markerSums: number[] = new Array(intensities[0].length).fill(0)
    intensities.map((population: number[]) => {
        population.map((value: number, index: number) => {
            markerSums[index] += value
        })
    })
    const markerMeans = markerSums.map((sum: number) => {
        return sum / intensities.length
    })
    return intensities.map((population: number[]) => {
        return population.map((value: number, index: number) => {
            return value / markerMeans[index]
        })
    })
}

function normalizeIntensitiesByPopulation(intensities: number[][]): number[][] {
    return intensities.map((population: number[]) => {
        const populationMean = calculateMean(population)
        return population.map((value: number) => {
            return value / populationMean
        })
    })
}

function normalizeHeatmapIntensities(intensities: number[][], plotNormalization: PlotNormalization): number[][] {
    if (plotNormalization == 'marker') {
        return normalizeIntensitiesByMarker(intensities)
    } else if (plotNormalization == 'population') {
        return normalizeIntensitiesByPopulation(intensities)
    } else {
        return intensities
    }
}

function calculateHeatmapData(
    segmentationData: SegmentationData,
    segmentationStatistics: SegmentationStatistics,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    plotNormalization: PlotNormalization,
    selectedPopulations: SelectedPopulation[] | null,
): Partial<Plotly.PlotData>[] {
    const markers = segmentationStatistics.markers
    const selectionIds = buildSelectionIdArray(selectedPopulations)
    const intensities = []
    // Builds a map of selected region ids to their regions.
    // We use this to get the names and colors to use for graphing.
    const selectedRegionMap = buildSelectedRegionMap(selectedPopulations)

    for (const selectionId of selectionIds) {
        // If we have the default selection id use all segment ids, otherwise get segments for the current selection
        const selectedSegments =
            selectionId == DefaultSelectionId
                ? segmentationData.segmentIds
                : selectedRegionMap[selectionId].selectedSegments
        const markerIntensities = []
        for (const marker of markers) {
            const intensity = getSegmentIntensity(
                plotStatistic,
                marker,
                selectedSegments,
                plotTransform,
                transformCoefficient,
                segmentationStatistics,
            )
            markerIntensities.push(intensity)
        }
        intensities.push(markerIntensities)
    }

    const heatmapData = Array<Plotly.Data>()

    // TO-DO: y should be selection names.
    heatmapData.push({
        z: normalizeHeatmapIntensities(intensities, plotNormalization),
        x: markers,
        y: selectionIds.map((selectionId: string) => {
            return getSelectionName(selectionId, selectedRegionMap)
        }),
        type: 'heatmap',
    })

    return heatmapData
}

export function buildHeatmapData(
    markers: string[],
    segmentationData: SegmentationData,
    segmentationStatistics: SegmentationStatistics,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    plotNormalization: PlotNormalization,
    selectedPopulations: SelectedPopulation[] | null,
): PlotData {
    const data = calculateHeatmapData(
        segmentationData,
        segmentationStatistics,
        plotStatistic,
        plotTransform,
        transformCoefficient,
        plotNormalization,
        selectedPopulations,
    )
    const layout = {
        title: 'Heatmap of Marker Intensity',
        xaxis: { tickangle: 45, automargin: true },
        yaxis: { tickangle: 45, automargin: true },
    }
    return { markers: markers, data: data, layout: layout }
}
