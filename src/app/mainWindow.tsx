import * as React from "react"
import * as ReactDOM from "react-dom"
import { MainApp } from "../components/MainApp"
import * as Mobx from 'mobx'
import { ipcRenderer } from 'electron'
import { ProjectStore } from "../stores/ProjectStore";

Mobx.configure({ enforceActions: 'always' })

const projectStore = new ProjectStore()

// Listeners for menu items from the main thread.
ipcRenderer.on("open-directory", async (event:Electron.Event, dirName:string) => {
    console.log(dirName)
    projectStore.setActiveImageSet(dirName)

    // Send a message to the main process to update the disabled menu items
    ipcRenderer.send('set-image-loaded', true)
})

ipcRenderer.on("open-project", async (event:Electron.Event, dirName:string) => {
    console.log(dirName)
    projectStore.setImageSetPaths(dirName)

    // Send a message to the main process to update the disabled menu items
    ipcRenderer.send('set-image-loaded', true)
})

ipcRenderer.on("open-segmentation-file", (event:Electron.Event, filename:string) => {
    projectStore.activeImageStore.setSegmentationFile(filename)
})

ipcRenderer.on("import-active-selected-populations", (event:Electron.Event, filename:string) => {
    projectStore.importActiveUserData(filename)
})

ipcRenderer.on("import-all-selected-populations", (event:Electron.Event, filename:string) => {
    projectStore.importAllUserData(filename)
})

ipcRenderer.on("export-active-selected-populations", (event:Electron.Event, filename:string) => {
    projectStore.exportActiveUserData(filename)
})

ipcRenderer.on("export-all-selected-populations", (event:Electron.Event, filename:string) => {
    projectStore.exportAllUserData(filename)
})

ipcRenderer.on("add-populations-csv", (event:Electron.Event, filename:string) => {
    projectStore.activePopulationStore.addPopulationsFromCSV(filename)
})

ipcRenderer.on("export-image", (event:Electron.Event, filename:string) => {
    projectStore.activeImageStore.setImageExportFilename(filename)
})

// Only the main thread can get window resize events. Listener for these events to resize various elements.
ipcRenderer.on("window-size", (event:Electron.Event, width:number, height: number) => {
    projectStore.activeImageStore.setWindowDimensions(width, height)
})

ipcRenderer.on("clean-up-webworkers", (event:Electron.Event) => {
    if(projectStore.activeImageStore.imageData != null){
        projectStore.activeImageStore.imageData.terminateWorkers()
    }
})

// Listener to turn on/off the plot in the main window if the plotWindow is open.
ipcRenderer.on('plot-in-main-window', (event:Electron.Event, inMain: boolean) => {
    projectStore.activePlotStore.setPlotInMainWindow(inMain)
})

// Methods to get data from the plotWindow relayed by the main thread
ipcRenderer.on('set-plot-channels', (event:Electron.Event, channels: string[]) => {
    projectStore.activePlotStore.setSelectedPlotChannels(channels)
})

ipcRenderer.on('set-plot-statistic', (event:Electron.Event, statistic: any) => {
    projectStore.activePlotStore.setScatterPlotStatistic(statistic)
})

ipcRenderer.on('set-plot-transform', (event:Electron.Event, transform: any) => {
    projectStore.activePlotStore.setScatterPlotTransform(transform)
})

ipcRenderer.on('add-plot-selected-population', (event:Electron.Event, segmentIds: number[]) => {
     projectStore.activePopulationStore.addSelectedPopulation(null, segmentIds)
})

ipcRenderer.on('set-plot-hovered-segments', (event:Electron.Event, segmentIds: number[]) => {
    projectStore.activePlotStore.setSegmentsHoveredOnPlot(segmentIds)
})

// Autorun that sends plot related data to the main thread to be relayed to the plotWindow
Mobx.autorun(() => {
    let imageStore = projectStore.activeImageStore
    let plotStore = projectStore.activePlotStore
    ipcRenderer.send('mainWindow-set-plot-data',
        imageStore.channelSelectOptions.get(),
        plotStore.selectedPlotChannels,
        plotStore.scatterPlotStatistic,
        plotStore.scatterPlotTransform,
        plotStore.scatterPlotData
    )
})

// Sends the active image set path to the main thread when changed.
// Used for setting default menu directories.
Mobx.autorun(() => {
    ipcRenderer.send('set-active-image-directory', projectStore.activeImageSetPath)
})

ReactDOM.render(
    <div>
        <MainApp projectStore={projectStore}/>
    </div>,
    document.getElementById("main")
)