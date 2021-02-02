/* eslint @typescript-eslint/no-explicit-any: 0 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import { PlotData } from '../interfaces/DataInterfaces'
import { PlotControls } from '../components/PlotControls'
import { Plot } from '../components/Plot'
import { ExternalPlotHeightPadding, PlotStatistic, PlotTransform, PlotType } from '../definitions/UIDefinitions'

let featureNames: string[]
let selectedPlotFeatures: string[] | null
let selectedStatistic: PlotStatistic | null
let selectedTransform: PlotTransform | null
let selectedType: PlotType | null
let selectedNormalization: string | null
let plotData: PlotData | null
let windowWidth: number | null
let windowHeight: number | null
let dotSize: number
let transformCoefficient: number | null
let projectLoaded: boolean | null
let plotAllImageSets: boolean | null
let collapseAllImageSets: boolean | null
let downsample: boolean
let downsamplePercent: number
let numHistogramBins: number
let xLogScale: boolean
let yLogScale: boolean

// Callback functions for the scatterplot that send data back to the main thread to be relayed to the main window.
const setSelectedPlotFeatures = (features: string[]): void => {
    ipcRenderer.send('plotWindow-set-features', features)
}

const setSelectedStatistic = (statistic: any): void => {
    ipcRenderer.send('plotWindow-set-statistic', statistic)
}

const setPlotTranform = (transform: any): void => {
    ipcRenderer.send('plotWindow-set-transform', transform)
}

const setPlotType = (type: any): void => {
    ipcRenderer.send('plotWindow-set-type', type)
}

const setDotSize = (type: any): void => {
    ipcRenderer.send('plotWindow-set-dot-size', type)
}

const setPlotNormalization = (type: any): void => {
    ipcRenderer.send('plotWindow-set-normalization', type)
}

const setTransformCoefficient = (coefficient: number): void => {
    ipcRenderer.send('plotWindow-set-coefficient', coefficient)
}

const addSelectedPopulation = (segmentIds: number[]): void => {
    if (segmentIds.length != 0) ipcRenderer.send('plotWindow-add-selected-population', segmentIds)
}

const addPopulationFromRange = (min: number, max: number): void => {
    ipcRenderer.send('plotWindow-add-population-from-range', min, max)
}

const setHoveredSegments = (segmentIds: number[]): void => {
    if (segmentIds.length != 0) ipcRenderer.send('plotWindow-set-hovered-segments', segmentIds)
}

const setPlotAllImageSets = (value: boolean): void => {
    ipcRenderer.send('plotWindow-set-plot-all-image-sets', value)
}

const setCollapseAllImageSets = (value: boolean): void => {
    ipcRenderer.send('plotWindow-set-collapse-all-image-sets', value)
}

const setDownsample = (value: boolean): void => {
    ipcRenderer.send('plotWindow-set-plot-downsample', value)
}

const setDownsamplePercent = (value: number): void => {
    ipcRenderer.send('plotWindow-set-plot-downsample-percent', value)
}

const setNumHistogramBins = (value: number): void => {
    ipcRenderer.send('plotWindow-set-plot-num-histogram-bins', value)
}

const setXLogScale = (value: boolean): void => {
    ipcRenderer.send('plotWindow-set-x-log-scale', value)
}

const setYLogScale = (value: boolean): void => {
    ipcRenderer.send('plotWindow-set-y-log-scale', value)
}

function render(): void {
    if (
        featureNames &&
        selectedPlotFeatures &&
        selectedStatistic &&
        selectedTransform &&
        selectedType &&
        selectedNormalization &&
        numHistogramBins &&
        xLogScale != null &&
        yLogScale != null &&
        projectLoaded != null &&
        plotAllImageSets != null &&
        collapseAllImageSets != null
    ) {
        let plotHeight = null
        if (windowHeight != null) plotHeight = windowHeight - ExternalPlotHeightPadding
        ReactDOM.render(
            <div style={{ paddingTop: '10px', paddingLeft: '5px', paddingRight: '5px' }}>
                <div className="grey-card plot-controls">
                    <PlotControls
                        windowWidth={windowWidth}
                        features={featureNames}
                        selectedPlotFeatures={selectedPlotFeatures}
                        setSelectedPlotFeatures={setSelectedPlotFeatures}
                        selectedStatistic={selectedStatistic}
                        setSelectedStatistic={setSelectedStatistic}
                        selectedTransform={selectedTransform}
                        setSelectedTransform={setPlotTranform}
                        selectedType={selectedType}
                        setSelectedType={setPlotType}
                        selectedNormalization={selectedNormalization}
                        setSelectedNormalization={setPlotNormalization}
                        dotSize={dotSize}
                        setDotSize={setDotSize}
                        transformCoefficient={transformCoefficient}
                        setTransformCoefficient={setTransformCoefficient}
                        projectLoaded={projectLoaded}
                        plotAllImageSets={plotAllImageSets}
                        setPlotAllImageSets={setPlotAllImageSets}
                        collapseAllImageSets={collapseAllImageSets}
                        setCollapseAllImageSets={setCollapseAllImageSets}
                        downsample={downsample}
                        setDownsample={setDownsample}
                        downsamplePercent={downsamplePercent}
                        setDownsamplePercent={setDownsamplePercent}
                        numHistogramBins={numHistogramBins}
                        setNumHistogramBins={setNumHistogramBins}
                        xLogScale={xLogScale}
                        setXLogScale={setXLogScale}
                        yLogScale={yLogScale}
                        setYLogScale={setYLogScale}
                    />
                </div>
                <Plot
                    windowWidth={windowWidth}
                    selectedType={selectedType}
                    setSelectedSegments={addSelectedPopulation}
                    setHoveredSegments={setHoveredSegments}
                    setSelectedRange={addPopulationFromRange}
                    plotData={plotData}
                    maxPlotHeight={plotHeight}
                    downsample={downsample}
                />
            </div>,
            document.getElementById('plot'),
        )
    }
}

// Listener to receive data from the mainWindow relayed by the main thread to render ScatterPlot
ipcRenderer.on(
    'set-plot-data',
    (
        event: Electron.Event,
        features: string[],
        plotFeatures: string[],
        statistic: PlotStatistic,
        transform: PlotTransform,
        type: PlotType,
        normalization: string,
        size: number,
        coefficient: number,
        project: boolean,
        plotAll: boolean,
        collapseAll: boolean,
        plotDownsample: boolean,
        plotDownsamplePercent: number,
        histogramBins: number,
        plotXLogScale: boolean,
        plotYLogScale: boolean,
        data: any,
    ): void => {
        featureNames = features
        selectedPlotFeatures = plotFeatures
        selectedStatistic = statistic
        selectedTransform = transform
        selectedType = type
        selectedNormalization = normalization
        dotSize = size
        transformCoefficient = coefficient
        projectLoaded = project
        plotAllImageSets = plotAll
        collapseAllImageSets = collapseAll
        downsample = plotDownsample
        downsamplePercent = plotDownsamplePercent
        numHistogramBins = histogramBins
        xLogScale = plotXLogScale
        yLogScale = plotYLogScale
        plotData = data as PlotData
        render()
    },
)

// Only the main thread can get window resize events. Listener for these events to resize various elements.
ipcRenderer.on('window-size', (event: Electron.Event, width: number, height: number): void => {
    windowWidth = width
    windowHeight = height
    render()
})
