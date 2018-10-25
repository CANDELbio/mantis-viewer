import * as React from "react"
import * as ReactDOM from "react-dom"
import { MainApp } from "../components/MainApp"
import * as Mobx from 'mobx'
import { ipcRenderer } from 'electron'
import { ImageData } from "../lib/ImageData"
import { ImageStore } from "../stores/ImageStore"
import { PopulationStore } from "../stores/PopulationStore"
import { PlotStore } from "../stores/PlotStore"

Mobx.configure({ enforceActions: 'always' })

const populationStore = new PopulationStore()
const plotStore = new PlotStore()
const imageStore = new ImageStore(populationStore, plotStore)

// Listeners for menu items from the main thread.
ipcRenderer.on("open-directory", async (event:Electron.Event, dirName:string) => {
    console.log(dirName)
    imageStore.setImageDataLoading(true)
    imageStore.selectDirectory(dirName)

    imageStore.clearImageData()
    let imageData = new ImageData()
    imageData.loadFolder(dirName, (data) => imageStore.setImageData(data))

    // Send a message to the main process to update the disabled menu items
    ipcRenderer.send('update-menu', true)
})

ipcRenderer.on("open-segmentation-file", (event:Electron.Event, filename:string) => {
    imageStore.selectSegmentationFile(filename)
})

ipcRenderer.on("import-selected-populations", (event:Electron.Event, filename:string) => {
    populationStore.importSelectedPopulations(filename)
})

ipcRenderer.on("export-selected-populations", (event:Electron.Event, filename:string) => {
    populationStore.exportSelectedPopulations(filename)
})

ipcRenderer.on("add-populations-csv", (event:Electron.Event, filename:string) => {
    populationStore.addPopulationsFromCSV(filename)
})

// Only the main thread can get window resize events. Listener for these events to resize various elements.
ipcRenderer.on("window-size", (event:Electron.Event, width:number, height: number) => {
    imageStore.setWindowDimensions(width, height)
})

// Methods to get data from the plotWindow relayed by the main thread
ipcRenderer.on('set-plot-channels', (event:Electron.Event, channels: string[]) => {
    plotStore.setSelectedPlotChannels(channels)
})

ipcRenderer.on('set-plot-statistic', (event:Electron.Event, statistic: any) => {
    plotStore.setScatterPlotStatistic(statistic)
})

ipcRenderer.on('set-plot-transform', (event:Electron.Event, transform: any) => {
    plotStore.setScatterPlotTransform(transform)
})

ipcRenderer.on('add-plot-selected-population', (event:Electron.Event, segmentIds: number[]) => {
    populationStore.addSelectedPopulation(null, segmentIds)
})

ipcRenderer.on('set-plot-hovered-segments', (event:Electron.Event, segmentIds: number[]) => {
    plotStore.setSegmentsHoveredOnPlot(segmentIds)
})

// Autorun that sends plot related data to the main thread to be relayed to the plotWindow
Mobx.autorun(() =>{
    ipcRenderer.send('mainWindow-set-plot-data',
        imageStore.channelSelectOptions.get(),
        plotStore.selectedPlotChannels,
        plotStore.scatterPlotStatistic,
        plotStore.scatterPlotTransform,
        plotStore.scatterPlotData
    )
})

ReactDOM.render(
    <div>
        <MainApp  imageStore={imageStore} populationStore={populationStore} plotStore={plotStore}/>
    </div>,
    document.getElementById("main")
)