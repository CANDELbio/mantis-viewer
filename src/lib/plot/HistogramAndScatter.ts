import * as Plotly from 'plotly.js'

import { SegmentationData } from '../SegmentationData'
import { SegmentationStatistics } from '../SegmentationStatistics'
import { PlotStatistic, PlotTransform, PlotType, DefaultDotSize } from '../../definitions/UIDefinitions'
import { SelectedPopulation } from '../../interfaces/ImageInterfaces'
import { hexToRGB } from '../ColorHelper'
import { PlotData } from '../../interfaces/DataInterfaces'
import { buildSelectionIdArray, buildSelectedRegionMap, getSegmentIntensity, getSelectionName } from './Helper'

import { DefaultSelectionId, DefaultSelectionColor, NumHistogramBins } from '../../definitions/PlotDefinitions'

// Builds a map of segment id/number to an array the regions of interest id it belongs to.
function buildSegmentToSelectedRegionMap(selectedRegion: SelectedPopulation[] | null): { [key: number]: string[] } {
    let map: { [key: number]: string[] } = {}
    if (selectedRegion != null) {
        // Iterate through the regions of interest
        for (let region of selectedRegion) {
            let regionSelectedSegments = region.selectedSegments
            if (regionSelectedSegments != null) {
                // Iterate over the segmentIds selected in the region
                for (let segmentId of regionSelectedSegments) {
                    if (!(segmentId in map)) map[segmentId] = []
                    map[segmentId].push(region.id)
                }
            }
        }
    }
    return map
}

function hexToPlotlyRGB(hex: number): string {
    let rgb = hexToRGB(hex)
    return 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')'
}

function getSelectionColor(selectionId: string, selectedRegionMap: { [key: string]: SelectedPopulation }): string {
    let color: number
    if (selectionId == DefaultSelectionId) {
        color = DefaultSelectionColor
    } else {
        color = selectedRegionMap[selectionId].color
    }
    return hexToPlotlyRGB(color)
}

function newPlotDatum(numValues: number): { values: number[][]; text: string[] } {
    let values = []
    for (let i = 0; i < numValues; i++) {
        values.push([])
    }
    return { values: values, text: [] }
}

function calculateRawPlotData(
    markers: string[],
    segmentationData: SegmentationData,
    segmentationStatistics: SegmentationStatistics,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    selectedPopulations: SelectedPopulation[] | null,
): {
    [key: string]: {
        values: number[][]
        text: string[]
    }
} {
    // A map of the data to be used in the plot.
    // Maps selection name (either all segments or the name of a selected region) to a set of data.
    let plotData: {
        [key: string]: {
            values: number[][]
            text: string[]
        }
    } = {}

    let regionMap = buildSegmentToSelectedRegionMap(selectedPopulations)

    // Iterate through all of the segments/cells in the segmentation data
    for (let segment in segmentationData.centroidMap) {
        // Generate a list of all of the selections/ROIs that this segment is in.
        let selections = [DefaultSelectionId]
        if (segment in regionMap) {
            selections = selections.concat(regionMap[segment])
        }

        // Calculate the mean or median intensity of the pixels in the segment
        let curValues = []
        for (let marker of markers) {
            curValues.push(
                getSegmentIntensity(plotStatistic, marker, [parseInt(segment)], plotTransform, segmentationStatistics),
            )
        }

        // Add the intensities to the data map for each selection the segment is in.
        // Being able to select points on the plot relies on the text being formatted
        // as a space delimited string with the last element being the segment id
        // Not ideal, but plotly (or maybe plotly-ts) doesn't support custom data.
        for (let selectionId of selections) {
            if (!(selectionId in plotData)) plotData[selectionId] = newPlotDatum(markers.length)
            plotData[selectionId].text.push('Segment ' + segment)
            for (let i in curValues) {
                let v = curValues[i]
                plotData[selectionId].values[i].push(v)
            }
        }
    }

    return plotData
}

export function calculatePlotData(
    markers: string[],
    segmentationData: SegmentationData,
    segmentationStatistics: SegmentationStatistics,
    plotType: PlotType,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    selectedRegions: SelectedPopulation[] | null,
    dotSize?: number,
): Partial<Plotly.PlotData>[] {
    let rawPlotData = calculateRawPlotData(
        markers,
        segmentationData,
        segmentationStatistics,
        plotStatistic,
        plotTransform,
        selectedRegions,
    )

    let plotData = Array<Plotly.Data>()

    let marker = markers[0]
    let minMax =
        plotStatistic == 'mean'
            ? segmentationStatistics.meanMinMaxMap[marker]
            : segmentationStatistics.medianMinMaxMap[marker]

    // Sorts the selection IDs so that the graph data appears in the same order/stacking every time.
    let sortedSelectionIds = buildSelectionIdArray(selectedRegions)
    // Builds a map of selected region ids to their regions.
    // We use this to get the names and colors to use for graphing.
    let selectedRegionMap = buildSelectedRegionMap(selectedRegions)

    // Converting from the plotData map to an array of the format that can be passed to Plotly.
    for (let selectionId of sortedSelectionIds) {
        let selectionData = rawPlotData[selectionId]
        let numSelectionValues = selectionData.values.length

        let trace: Partial<Plotly.Data> = {
            x: selectionData.values[0],
            y: numSelectionValues > 1 ? selectionData.values[1] : undefined,
            z: numSelectionValues > 2 ? selectionData.values[2] : undefined,
            mode: 'markers',
            type: plotType == 'scatter' ? 'scattergl' : 'histogram',
            text: plotType == 'scatter' ? selectionData.text : undefined,
            name: getSelectionName(selectionId, selectedRegionMap),
            marker: {
                size: dotSize ? dotSize : DefaultDotSize,
                color: getSelectionColor(selectionId, selectedRegionMap),
            },
        }

        if (plotType == 'histogram') {
            trace.autobinx = false
            trace.xbins = {
                start: minMax.min,
                end: minMax.max,
                size: (minMax.max - minMax.min) / NumHistogramBins,
            }
        }

        plotData.push(trace)
    }

    return plotData
}

export function buildHistogramData(
    markers: string[],
    segmentationData: SegmentationData,
    segmentationStatistics: SegmentationStatistics,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    selectedPopulations: SelectedPopulation[] | null,
): PlotData {
    let data = calculatePlotData(
        markers,
        segmentationData,
        segmentationStatistics,
        'histogram',
        plotStatistic,
        plotTransform,
        selectedPopulations,
    )
    let layout: Partial<Plotly.Layout> = {
        title: markers[0],
        xaxis: { title: markers[0], automargin: true },
        barmode: 'overlay',
    }
    return { markers: markers, data: data, layout: layout }
}

export function buildScatterData(
    markers: string[],
    segmentationData: SegmentationData,
    segmentationStatistics: SegmentationStatistics,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    selectedPopulations: SelectedPopulation[] | null,
    dotSize?: number,
): PlotData {
    let data = calculatePlotData(
        markers,
        segmentationData,
        segmentationStatistics,
        'scatter',
        plotStatistic,
        plotTransform,
        selectedPopulations,
        dotSize,
    )
    let layout: Partial<Plotly.Layout> = {
        title: markers[0] + ' versus ' + markers[1],
        xaxis: { title: markers[0], automargin: true, constrain: 'domain' },
        yaxis: { title: markers[1], automargin: true, scaleanchor: 'x' },
    }

    return { markers: markers, data: data, layout: layout }
}
