/* eslint @typescript-eslint/no-explicit-any: 0 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import { PlotData } from '../lib/PlotData'
import { Plot } from '../components/Plot'

let channelSelectOptions: { value: string; label: string }[]
let selectedPlotChannels: string[] | null
let selectedStatistic: string | null
let selectedTransform: string | null
let selectedType: string | null
let selectedNormalization: string | null
let plotData: PlotData | null

// Callback functions for the scatterplot that send data back to the main thread to be relayed to the main window.
let setSelectedPlotChannels = (channels: string[]): void => {
    ipcRenderer.send('plotWindow-set-channels', channels)
}

let setSelectedStatistic = (statistic: any): void => {
    ipcRenderer.send('plotWindow-set-statistic', statistic)
}

let setPlotTranform = (transform: any): void => {
    ipcRenderer.send('plotWindow-set-transform', transform)
}

let setPlotType = (type: any): void => {
    ipcRenderer.send('plotWindow-set-type', type)
}

let setPlotNormalization = (type: any): void => {
    ipcRenderer.send('plotWindow-set-normalization', type)
}

let addSelectedPopulation = (segmentIds: number[]): void => {
    if (segmentIds.length != 0) ipcRenderer.send('plotWindow-add-selected-population', segmentIds)
}

let addPopulationFromRange = (min: number, max: number): void => {
    ipcRenderer.send('plotWindow-add-population-from-range', min, max)
}

let setHoveredSegments = (segmentIds: number[]): void => {
    if (segmentIds.length != 0) ipcRenderer.send('plotWindow-set-hovered-segments', segmentIds)
}

function render(): void {
    if (
        channelSelectOptions &&
        selectedPlotChannels &&
        selectedStatistic &&
        selectedTransform &&
        selectedType &&
        selectedNormalization
    ) {
        console.log('Render successs!')
        ReactDOM.render(
            <div>
                <Plot
                    windowWidth={null}
                    channelSelectOptions={channelSelectOptions}
                    selectedPlotChannels={selectedPlotChannels}
                    setSelectedPlotChannels={setSelectedPlotChannels}
                    selectedStatistic={selectedStatistic}
                    setSelectedStatistic={setSelectedStatistic}
                    selectedTransform={selectedTransform}
                    setSelectedTransform={setPlotTranform}
                    selectedType={selectedType}
                    setSelectedType={setPlotType}
                    selectedNormalization={selectedNormalization}
                    setSelectedNormalization={setPlotNormalization}
                    setSelectedSegments={addSelectedPopulation}
                    setHoveredSegments={setHoveredSegments}
                    setSelectedRange={addPopulationFromRange}
                    plotData={plotData}
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
        selectOptions: { value: string; label: string }[],
        plotChannels: string[],
        statistic: string,
        transform: string,
        type: string,
        normalization: string,
        data: any,
    ) => {
        channelSelectOptions = selectOptions
        selectedPlotChannels = plotChannels
        selectedStatistic = statistic
        selectedTransform = transform
        selectedType = type
        selectedNormalization = normalization
        plotData = data as PlotData
        render()
    },
)
