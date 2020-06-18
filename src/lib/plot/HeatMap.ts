import { SegmentationData } from '../SegmentationData'
import { PlotStatistic, PlotTransform, PlotNormalization } from '../../definitions/UIDefinitions'
import { SelectedPopulation } from '../../interfaces/ImageInterfaces'
import { calculateMean, calculateMedian } from '../../lib/StatsHelper'
import { PlotData } from '../../interfaces/DataInterfaces'
import { buildSelectionIdArray, buildSelectedPopulationMap, applyTransform, getSelectionName } from './Helper'

import { ActiveImageSetSelectionId } from '../../definitions/PlotDataDefinitions'

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

function getPopulationIntensity(
    segmentIds: number[],
    featureValues: Record<number, number>,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
): number {
    let result: number

    // In case some values are missing from the passed in feature values we filter them out
    const populationValues = segmentIds.map((v: number) => featureValues[v]).filter((v: number) => v != undefined)

    if (plotStatistic == 'mean') {
        result = calculateMean(populationValues)
    } else {
        result = calculateMedian(populationValues)
    }

    // If the result ends up undefined set it to 0 so we don't break the graph
    if (result == undefined) result = 0

    return applyTransform(result, plotTransform, transformCoefficient)
}

function calculateHeatmapData(
    features: string[],
    featureValues: Record<string, Record<number, number>>,
    segmentationData: SegmentationData,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    plotNormalization: PlotNormalization,
    selectedPopulations: SelectedPopulation[] | null,
): Partial<Plotly.PlotData>[] {
    const selectionIds = buildSelectionIdArray(false, selectedPopulations)
    const intensities = []
    // Builds a map of selected region ids to their regions.
    // We use this to get the names and colors to use for graphing.
    const selectedRegionMap = buildSelectedPopulationMap(selectedPopulations)

    for (const selectionId of selectionIds) {
        // If we have the default selection id use all segment ids, otherwise get segments for the current selection
        const selectedSegments =
            selectionId == ActiveImageSetSelectionId
                ? segmentationData.segmentIds
                : selectedRegionMap[selectionId].selectedSegments
        const featureIntensities = []
        for (const feature of features) {
            const curValues = featureValues[feature]
            const intensity = getPopulationIntensity(
                selectedSegments,
                curValues,
                plotStatistic,
                plotTransform,
                transformCoefficient,
            )
            featureIntensities.push(intensity)
        }
        intensities.push(featureIntensities)
    }

    const heatmapData = Array<Plotly.Data>()

    // TO-DO: y should be selection names.
    heatmapData.push({
        z: normalizeHeatmapIntensities(intensities, plotNormalization),
        x: features,
        y: selectionIds.map((selectionId: string) => {
            return getSelectionName(selectionId, selectedRegionMap)
        }),
        type: 'heatmap',
    })

    return heatmapData
}

export function buildHeatmapData(
    activeImageSet: string,
    features: string[],
    featureValues: Record<string, Record<string, Record<number, number>>>,
    segmentationData: SegmentationData,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    plotNormalization: PlotNormalization,
    selectedPopulations: SelectedPopulation[] | null,
): PlotData | null {
    const activeFeatureValues = featureValues[activeImageSet]
    if (activeFeatureValues) {
        const data = calculateHeatmapData(
            features,
            activeFeatureValues,
            segmentationData,
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
        return { features: features, data: data, layout: layout }
    } else {
        return null
    }
}
