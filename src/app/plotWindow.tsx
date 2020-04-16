/* eslint @typescript-eslint/no-explicit-any: 0 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import { PlotData } from '../interfaces/DataInterfaces'
import { PlotControls } from '../components/PlotControls'
import { Plot } from '../components/Plot'
import { ExternalPlotHeightPadding, PlotStatistic, PlotTransform, PlotType } from '../definitions/UIDefinitions'

let markerNames: string[]
let selectedPlotMarkers: string[] | null
let selectedStatistic: PlotStatistic | null
let selectedTransform: PlotTransform | null
let selectedType: PlotType | null
let selectedNormalization: string | null
let plotData: PlotData | null
let windowWidth: number | null
let windowHeight: number | null
let dotSize: number
let transformCoefficient: number | null

// Callback functions for the scatterplot that send data back to the main thread to be relayed to the main window.
const setSelectedPlotMarkers = (markers: string[]): void => {
    ipcRenderer.send('plotWindow-set-markers', markers)
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

function render(): void {
    if (
        markerNames &&
        selectedPlotMarkers &&
        selectedStatistic &&
        selectedTransform &&
        selectedType &&
        selectedNormalization
    ) {
        let plotHeight = null
        if (windowHeight != null) plotHeight = windowHeight - ExternalPlotHeightPadding
        ReactDOM.render(
            <div style={{ paddingTop: '10px', paddingLeft: '5px', paddingRight: '5px' }}>
                <div className="grey-card plot-controls">
                    <PlotControls
                        windowWidth={windowWidth}
                        markers={markerNames}
                        selectedPlotMarkers={selectedPlotMarkers}
                        setSelectedPlotMarkers={setSelectedPlotMarkers}
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
        markers: string[],
        plotMarkers: string[],
        statistic: PlotStatistic,
        transform: PlotTransform,
        type: PlotType,
        normalization: string,
        size: number,
        coefficient: number,
        data: any,
    ): void => {
        markerNames = markers
        selectedPlotMarkers = plotMarkers
        selectedStatistic = statistic
        selectedTransform = transform
        selectedType = type
        selectedNormalization = normalization
        dotSize = size
        transformCoefficient = coefficient
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
