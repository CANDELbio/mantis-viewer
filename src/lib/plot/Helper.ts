import { SegmentationStatistics } from '../SegmentationStatistics'
import { SelectedPopulation } from '../../interfaces/ImageInterfaces'

import { DefaultSelectionName, DefaultSelectionId } from '../../definitions/PlotDefinitions'

export function buildSelectionIdArray(selectedPopulations: SelectedPopulation[] | null): string[] {
    let selectionIds = [DefaultSelectionId]
    if (selectedPopulations != null) {
        let sortedRegions = selectedPopulations.sort((a: SelectedPopulation, b: SelectedPopulation) => {
            return a.renderOrder > b.renderOrder ? 1 : -1
        })
        sortedRegions.map((value: SelectedPopulation) => {
            selectionIds.push(value.id)
        })
    }
    return selectionIds
}

// Builds a map of regionId to the region it belongs to.
export function buildSelectedRegionMap(
    selectedRegion: SelectedPopulation[] | null,
): { [key: string]: SelectedPopulation } {
    let map: { [key: string]: SelectedPopulation } = {}
    if (selectedRegion != null) {
        for (let region of selectedRegion) {
            map[region.id] = region
        }
    }
    return map
}

export function getSegmentIntensity(
    plotStatistic: string,
    marker: string,
    segmentIds: number[],
    plotTransform: string,
    segmentationStatistics: SegmentationStatistics,
): number {
    let result: number

    // Get the mean or median depending on what the user selected.
    if (plotStatistic == 'mean') {
        result = segmentationStatistics.meanIntensity(marker, segmentIds)
    } else {
        result = segmentationStatistics.medianIntensity(marker, segmentIds)
    }

    // If the user has selected a transform, apply it.
    if (plotTransform == 'arcsinh') {
        result = Math.asinh(result)
    } else if (plotTransform == 'log') {
        result = Math.log10(result)
    }

    return result
}

export function getSelectionName(
    selectionId: string,
    selectedRegionMap: { [key: string]: SelectedPopulation },
): string {
    if (selectionId == DefaultSelectionId) {
        return DefaultSelectionName
    } else {
        return selectedRegionMap[selectionId].name
    }
}
