import * as Plotly from 'plotly.js'

import { SegmentationData } from '../SegmentationData'
import { SegmentationStatistics } from '../SegmentationStatistics'
import { PlotStatistic, PlotTransform, PlotType, DefaultDotSize } from '../../definitions/UIDefinitions'
import { SelectedPopulation } from '../../interfaces/ImageInterfaces'
import { hexToRGB } from '../ColorHelper'
import { PlotData } from '../../interfaces/DataInterfaces'
import { buildSelectionIdArray, buildSelectedRegionMap, getSegmentIntensity, getSelectionName } from './Helper'

import { DefaultSelectionId, DefaultSelectionColor, NumHistogramBins } from '../../definitions/PlotDataDefinitions'

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
                getSegmentIntensity(
                    plotStatistic,
                    marker,
                    [parseInt(segment)],
                    plotTransform,
                    transformCoefficient,
                    segmentationStatistics,
                ),
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
    transformCoefficient: number | null,
    selectedRegions: SelectedPopulation[] | null,
    dotSize?: number,
): Partial<Plotly.PlotData>[] {
    let rawPlotData = calculateRawPlotData(
        markers,
        segmentationData,
        segmentationStatistics,
        plotStatistic,
        plotTransform,
        transformCoefficient,
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
            trace.autobinx = false
            trace.xbins = {
                start: minMax.min,
                end: minMax.max,
                size: (minMax.max - minMax.min) / NumHistogramBins,
            }
        }

        plotData.push(trace)
    }

    if (plotType == 'contour') {
        let allData = rawPlotData[DefaultSelectionId]
        let contourTrace: Partial<Plotly.Data> = {
            x: allData.values[0],
            y: allData.values[1],
            name: 'density',
            ncontours: 30,
            colorscale: [[0.0, 'rgb(255, 255, 255)'], [1.0, 'rgb(255, 255, 255)']],
            reversescale: true,
            showscale: false,
            //@ts-ignore
            type: 'histogram2dcontour',
        }
        plotData.push(contourTrace)
    }

    return plotData
}

export function buildHistogramData(
    markers: string[],
    segmentationData: SegmentationData,
    segmentationStatistics: SegmentationStatistics,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    selectedPopulations: SelectedPopulation[] | null,
): PlotData {
    let data = calculatePlotData(
        markers,
        segmentationData,
        segmentationStatistics,
        'histogram',
        plotStatistic,
        plotTransform,
        transformCoefficient,
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
    plotType: PlotType,
    markers: string[],
    segmentationData: SegmentationData,
    segmentationStatistics: SegmentationStatistics,
    plotStatistic: PlotStatistic,
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    selectedPopulations: SelectedPopulation[] | null,
    dotSize?: number,
): PlotData {
    let data = calculatePlotData(
        markers,
        segmentationData,
        segmentationStatistics,
        plotType,
        plotStatistic,
        plotTransform,
        transformCoefficient,
        selectedPopulations,
        dotSize,
    )
    let xAxis: Partial<Plotly.LayoutAxis> = { title: markers[0], automargin: true }
    let yAxis: Partial<Plotly.LayoutAxis> = { title: markers[1], automargin: true, scaleanchor: 'x' }

    if (plotType == 'contour') {
        xAxis = { ...xAxis, showgrid: false, zeroline: false }
        yAxis = { ...yAxis, showgrid: false, zeroline: false }
    }

    let layout: Partial<Plotly.Layout> = {
        title: markers[0] + ' versus ' + markers[1],
        xaxis: xAxis,
        yaxis: yAxis,
    }

    return { markers: markers, data: data, layout: layout }
}
