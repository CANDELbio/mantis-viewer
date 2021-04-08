import { SelectedPopulation } from '../../stores/PopulationStore'

import { ActiveImageSetTraceName, OtherImageSetsTraceName } from '../../definitions/PlotDataDefinitions'
import { PlotTransform } from '../../definitions/UIDefinitions'

// Builds an array of trace IDs and names for render order
// The first item in the array gets rendered first (and on the bottom) of the plot.
export function buildTraceIdArray(
    activeImageSet: string,
    collapseAllImageSets: boolean,
    imageSetNames: string[],
    selectedPopulations: SelectedPopulation[] | null,
): string[] {
    let traceIds: string[] = []
    // First start with other images
    traceIds = traceIds.concat(imageSetNames.filter((name: string) => name != activeImageSet))
    if (collapseAllImageSets) traceIds.push(OtherImageSetsTraceName)
    // Then the active images
    traceIds.push(activeImageSet)
    // Then selected populations in their render order
    if (selectedPopulations != null) {
        const sortedRegions = selectedPopulations.sort((a: SelectedPopulation, b: SelectedPopulation) => {
            return a.renderOrder > b.renderOrder ? 1 : -1
        })
        sortedRegions.map((value: SelectedPopulation) => {
            traceIds.push(value.id)
        })
    }
    return traceIds
}

// Builds a map of populationId to the population it belongs to.
export function buildSelectedPopulationMap(
    selectedPopulation: SelectedPopulation[] | null,
): { [key: string]: SelectedPopulation } {
    const map: { [key: string]: SelectedPopulation } = {}
    if (selectedPopulation != null) {
        for (const region of selectedPopulation) {
            map[region.id] = region
        }
    }
    return map
}

export function applyTransform(
    value: number,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
): number {
    let result = value

    if (plotTransform != 'none' && transformCoefficient) result = result * transformCoefficient

    // If the user has selected a transform, apply it.
    if (plotTransform == 'arcsinh') {
        result = Math.asinh(result)
    } else if (plotTransform == 'log') {
        result = Math.log10(result)
    }

    return result
}

export function getTraceName(
    traceId: string,
    populationMap: { [key: string]: SelectedPopulation },
    activeImageSet: string,
    collapseImageSets: boolean,
): string {
    if (traceId in populationMap) {
        return populationMap[traceId].name
    } else if (traceId == activeImageSet) {
        return ActiveImageSetTraceName
    } else if (collapseImageSets) {
        return OtherImageSetsTraceName
    } else {
        return traceId
    }
}
