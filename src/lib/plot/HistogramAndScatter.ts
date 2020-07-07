import * as Plotly from 'plotly.js'

import { PlotTransform, PlotType, DefaultDotSize } from '../../definitions/UIDefinitions'
import { SelectedPopulation } from '../../stores/PopulationStore'
import { MinMax } from '../../interfaces/ImageInterfaces'
import { hexToRGB } from '../ColorHelper'
import { PlotData } from '../../interfaces/DataInterfaces'
import { buildSelectionIdArray, buildSelectedPopulationMap, applyTransform, getSelectionName } from './Helper'

import {
    ActiveImageSetSelectionId,
    ActiveImageSetSelectionColor,
    OtherImageSetsSelectionId,
    OtherImageSetsSelectionColor,
    NumHistogramBins,
} from '../../definitions/PlotDataDefinitions'

// Builds a map of segment id to an array of the populations of interest ids it belongs to.
function buildSegmentToPopulationMap(selectedRegion: SelectedPopulation[] | null): { [key: number]: string[] } {
    const map: { [key: number]: string[] } = {}
    if (selectedRegion != null) {
        // Iterate through the regions of interest
        for (const region of selectedRegion) {
            const regionSelectedSegments = region.selectedSegments
            if (regionSelectedSegments != null) {
                // Iterate over the segmentIds selected in the region
                for (const segmentId of regionSelectedSegments) {
                    if (!(segmentId in map)) map[segmentId] = []
                    map[segmentId].push(region.id)
                }
            }
        }
    }
    return map
}

function hexToPlotlyRGB(hex: number): string {
    const rgb = hexToRGB(hex)
    return 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')'
}

function getSelectionColor(selectionId: string, selectedRegionMap: { [key: string]: SelectedPopulation }): string {
    let color: number
    switch (selectionId) {
        case ActiveImageSetSelectionId:
            color = ActiveImageSetSelectionColor
            break
        case OtherImageSetsSelectionId:
            color = OtherImageSetsSelectionColor
            break
        default:
            color = selectedRegionMap[selectionId].color
    }
    return hexToPlotlyRGB(color)
}

function newPlotDatum(numValues: number): { values: number[][]; text: string[] } {
    const values = []
    for (let i = 0; i < numValues; i++) {
        values.push([])
    }
    return { values: values, text: [] }
}

function calculateRawPlotData(
    activeImageSet: string,
    features: string[],
    featureValues: Record<string, Record<string, Record<number, number>>>,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    selectedPopulations: SelectedPopulation[] | null,
): {
    [key: string]: {
        values: number[][]
        text: string[]
    }
} {
    // A map of the data to be used in the plot.
    // Maps selection name (either all segments or the name of a selected region) to a set of data.
    const plotData: {
        [key: string]: {
            values: number[][]
            text: string[]
        }
    } = {}

    const populationMap = buildSegmentToPopulationMap(selectedPopulations)

    // Iterate through all of the segments/cells in the segmentation data
    for (const imageSetName in featureValues) {
        const onActiveImageSet = imageSetName == activeImageSet
        const curFeatureValues = featureValues[imageSetName]

        if (curFeatureValues) {
            let allFeaturesPresent = true
            for (const feature of features) {
                if (!(feature in curFeatureValues)) allFeaturesPresent = false
            }
            if (allFeaturesPresent) {
                // A little hackey. Get the segment IDs by looking at the value map for the first feature.
                const segmentIds = Object.keys(curFeatureValues[features[0]]).map((id: string) => parseInt(id))
                for (const segment of segmentIds) {
                    // Generate a list of all of the populations that this segment is in.
                    // Start with ActiveImageSetSelectionId if we're on the active image set and
                    // OtherImageSetsSelectionId if we're not
                    let selections = onActiveImageSet ? [ActiveImageSetSelectionId] : [OtherImageSetsSelectionId]

                    // Only check if the segment is in a population if we're on the active image set
                    if (onActiveImageSet && segment in populationMap) {
                        selections = selections.concat(populationMap[segment])
                    }

                    // Calculate the mean or median intensity of the pixels in the segment
                    const values = []
                    for (const feature of features) {
                        const curValue = curFeatureValues[feature][segment]
                        values.push(applyTransform(curValue, plotTransform, transformCoefficient))
                    }

                    // Add the intensities to the data map for each selection the segment is in.
                    // Being able to select points on the plot relies on the text being formatted
                    // as a space delimited string with the last element being the segment id
                    // Not ideal, but plotly (or maybe plotly-ts) doesn't support custom data.
                    for (const selectionId of selections) {
                        if (!(selectionId in plotData)) plotData[selectionId] = newPlotDatum(features.length)
                        let datumName = 'Segment ' + segment
                        if (!onActiveImageSet) datumName = imageSetName + ' ' + datumName
                        plotData[selectionId].text.push(datumName)
                        for (const i in values) {
                            const v = values[i]
                            plotData[selectionId].values[i].push(v)
                        }
                    }
                }
            }
        }
    }

    return plotData
}

function configureTraceForHistogram(
    features: string[],
    featureMinMaxes: Record<string, Record<string, MinMax>>,
    trace: Partial<Plotly.Data>,
): Partial<Plotly.Data> {
    const feature = features[0]
    const mins: number[] = []
    const maxes: number[] = []
    for (const imageSet in featureMinMaxes) {
        const minMax = featureMinMaxes[imageSet][feature]
        if (minMax) {
            mins.push(minMax.min)
            maxes.push(minMax.max)
        }
    }
    const min = Math.min(...mins)
    const max = Math.max(...maxes)

    trace.autobinx = false
    trace.xbins = {
        start: min,
        end: max,
        size: (max - min) / NumHistogramBins,
    }
    return trace
}

export function calculatePlotData(
    activeImageSet: string,
    features: string[],
    featureValues: Record<string, Record<string, Record<number, number>>>,
    featureMinMaxes: Record<string, Record<string, MinMax>>,
    plotType: PlotType,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    selectedPopulations: SelectedPopulation[] | null,
    dotSize?: number,
): Partial<Plotly.PlotData>[] {
    const rawPlotData = calculateRawPlotData(
        activeImageSet,
        features,
        featureValues,
        plotTransform,
        transformCoefficient,
        selectedPopulations,
    )

    const plotData = Array<Plotly.Data>()

    // Sorts the selection IDs so that the graph data appears in the same order/stacking every time.
    const plotAllImageSets = Object.keys(featureValues).length > 1
    const sortedSelectionIds = buildSelectionIdArray(plotAllImageSets, selectedPopulations)

    // Builds a map of selected region ids to their regions.
    // We use this to get the names and colors to use for graphing.
    const selectedRegionMap = buildSelectedPopulationMap(selectedPopulations)

    // Converting from the plotData map to an array of the format that can be passed to Plotly.
    for (const selectionId of sortedSelectionIds) {
        const selectionData = rawPlotData[selectionId]
        if (selectionData) {
            const numSelectionValues = selectionData.values.length

            let plotlyType: Plotly.PlotData['type'] = 'histogram'
            if (plotType == 'scatter') plotlyType = 'scattergl'
            if (plotType == 'contour') plotlyType = 'scatter'

            let trace: Partial<Plotly.Data> = {
                x: selectionData.values[0],
                y: numSelectionValues > 1 ? selectionData.values[1] : undefined,
                mode: 'markers',
                type: plotlyType,
                text: plotType == 'scatter' || plotType == 'contour' ? selectionData.text : undefined,
                name: getSelectionName(selectionId, selectedRegionMap),
                marker: {
                    size: dotSize ? dotSize : DefaultDotSize,
                    color: getSelectionColor(selectionId, selectedRegionMap),
                },
            }

            if (plotType == 'histogram') {
                trace = configureTraceForHistogram(features, featureMinMaxes, trace)
            }

            plotData.push(trace)
        }
    }

    if (plotType == 'contour') {
        const allData = rawPlotData[ActiveImageSetSelectionId]
        const contourTrace: Partial<Plotly.Data> = {
            x: allData.values[0],
            y: allData.values[1],
            name: 'density',
            ncontours: 30,
            colorscale: [
                [0.0, 'rgb(255, 255, 255)'],
                [1.0, 'rgb(255, 255, 255)'],
            ],
            reversescale: true,
            showscale: false,
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            //@ts-ignore
            type: 'histogram2dcontour',
        }
        plotData.push(contourTrace)
    }

    return plotData
}

export function buildHistogramData(
    activeImageSet: string,
    features: string[],
    featureValues: Record<string, Record<string, Record<number, number>>>,
    featureMinMaxes: Record<string, Record<string, MinMax>>,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    selectedPopulations: SelectedPopulation[] | null,
): PlotData {
    const data = calculatePlotData(
        activeImageSet,
        features,
        featureValues,
        featureMinMaxes,
        'histogram',
        plotTransform,
        transformCoefficient,
        selectedPopulations,
    )
    const layout: Partial<Plotly.Layout> = {
        title: features[0],
        xaxis: { title: features[0], automargin: true },
        barmode: 'overlay',
    }
    return { features: features, data: data, layout: layout }
}

export function buildScatterData(
    plotType: PlotType,
    activeImageSet: string,
    features: string[],
    featureValues: Record<string, Record<string, Record<number, number>>>,
    featureMinMaxes: Record<string, Record<string, MinMax>>,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    selectedPopulations: SelectedPopulation[] | null,
    dotSize?: number,
): PlotData {
    const data = calculatePlotData(
        activeImageSet,
        features,
        featureValues,
        featureMinMaxes,
        plotType,
        plotTransform,
        transformCoefficient,
        selectedPopulations,
        dotSize,
    )
    let xAxis: Partial<Plotly.LayoutAxis> = { title: features[0], automargin: true }
    let yAxis: Partial<Plotly.LayoutAxis> = { title: features[1], automargin: true, scaleanchor: 'x' }

    if (plotType == 'contour') {
        xAxis = { ...xAxis, showgrid: false, zeroline: false }
        yAxis = { ...yAxis, showgrid: false, zeroline: false }
    }

    const layout: Partial<Plotly.Layout> = {
        title: features[0] + ' versus ' + features[1],
        xaxis: xAxis,
        yaxis: yAxis,
    }

    return { features: features, data: data, layout: layout }
}
