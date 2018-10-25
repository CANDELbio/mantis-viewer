import * as React from "react"
import * as ReactDOM from "react-dom"
import { ipcRenderer } from 'electron'
import { ScatterPlotData } from "../lib/ScatterPlotData"
import { ScatterPlot } from "../components/ScatterPlot";

let channelSelectOptions: { value: string, label: string}[] | null
let selectedPlotChannels: string[] | null
let selectedStatistic: string | null
let selectedTransform: string | null
let scatterPlotData: ScatterPlotData | null


// Callback functions for the scatterplot that send data back to the main thread to be relayed to the main window.
let setSelectedPlotChannels = (channels: string[]) => {
    ipcRenderer.send('plotWindow-set-channels', channels)
}

let setSelectedStatistic = (statistic: any) => {
    ipcRenderer.send('plotWindow-set-statistic', statistic)
}

let setScatterPlotTransform = (transform: any) => {
    ipcRenderer.send('plotWindow-set-transform', transform)
}

let addSelectedPopulation = (segmentIds: number[]) => {
    ipcRenderer.send('plotWindow-add-selected-population', segmentIds)
}

let setHoveredSegments = (segmentIds: number[]) => {
    ipcRenderer.send('plotWindow-set-hovered-segments', segmentIds)
}

function render() {
    if(channelSelectOptions && selectedPlotChannels && selectedStatistic && selectedTransform){
        console.log("Render successs!")
        ReactDOM.render(
            <div>
                <ScatterPlot 
                    windowWidth = {null}
                    channelSelectOptions = {channelSelectOptions}
                    selectedPlotChannels = {selectedPlotChannels}
                    setSelectedPlotChannels = {setSelectedPlotChannels}
                    selectedStatistic= {selectedStatistic}
                    setSelectedStatistic = {setSelectedStatistic}
                    selectedTransform = {selectedTransform}
                    setSelectedTransform = {setScatterPlotTransform}
                    setSelectedSegments = {addSelectedPopulation}
                    setHoveredSegments = {setHoveredSegments}
                    scatterPlotData = {scatterPlotData}
                />
            </div>,
            document.getElementById("plot")
        )
    }
}

// Listener to receive data from the mainWindow relayed by the main thread to render ScatterPlot
ipcRenderer.on('set-plot-data', (event:Electron.Event,
    selectOptions: { value: string, label: string}[],
    plotChannels: string[],
    statistic: string,
    transform: string,
    plotData: any) => {

    channelSelectOptions = selectOptions
    selectedPlotChannels = plotChannels
    selectedStatistic = statistic
    selectedTransform = transform
    scatterPlotData = plotData as ScatterPlotData
    render()
})