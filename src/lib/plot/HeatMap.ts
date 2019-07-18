import { SegmentationData } from '../SegmentationData'
import { SegmentationStatistics } from '../SegmentationStatistics'
import { PlotStatistic, PlotTransform, PlotNormalization } from '../../definitions/UIDefinitions'
import { SelectedPopulation } from '../../interfaces/ImageInterfaces'
import { calculateMean } from '../../lib/StatsHelper'
import { PlotData } from '../../interfaces/DataInterfaces'
import { buildSelectionIdArray, buildSelectedRegionMap, getSegmentIntensity, getSelectionName } from './Helper'

import { DefaultSelectionId } from '../../definitions/PlotDefinitions'

function normalizeIntensitiesByMarker(intensities: number[][]): number[][] {
    let markerSums: number[] = new Array(intensities[0].length).fill(0)
    intensities.map((population: number[]) => {
        population.map((value: number, index: number) => {
            markerSums[index] += value
        })
    })
    let markerMeans = markerSums.map((sum: number) => {
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
        let populationMean = calculateMean(population)
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
    plotNormalization: PlotNormalization,
    selectedPopulations: SelectedPopulation[] | null,
): Partial<Plotly.PlotData>[] {
    let markers = segmentationStatistics.markers
    let selectionIds = buildSelectionIdArray(selectedPopulations)
    let intensities = []
    // Builds a map of selected region ids to their regions.
    // We use this to get the names and colors to use for graphing.
    let selectedRegionMap = buildSelectedRegionMap(selectedPopulations)

    for (let selectionId of selectionIds) {
        // If we have the default selection id use all segment ids, otherwise get segments for the current selection
        let selectedSegments =
            selectionId == DefaultSelectionId
                ? segmentationData.segmentIds
                : selectedRegionMap[selectionId].selectedSegments
        let markerIntensities = []
        for (let marker of markers) {
            let intensity = getSegmentIntensity(
                plotStatistic,
                marker,
                selectedSegments,
                plotTransform,
                segmentationStatistics,
            )
            markerIntensities.push(intensity)
        }
        intensities.push(markerIntensities)
    }

    let heatmapData = Array<Plotly.Data>()

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
    plotNormalization: PlotNormalization,
    selectedPopulations: SelectedPopulation[] | null,
): PlotData {
    let data = calculateHeatmapData(
        segmentationData,
        segmentationStatistics,
        plotStatistic,
        plotTransform,
        plotNormalization,
        selectedPopulations,
    )
    let layout = { title: 'Heatmap of Marker Intensity', xaxis: { tickangle: 45 } }
    return { markers: markers, data: data, layout: layout }
}
