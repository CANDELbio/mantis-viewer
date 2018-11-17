import * as React from "react"
import * as ReactDOM from "react-dom"
import { MainApp } from "../components/MainApp"
import * as Mobx from 'mobx'
import { ipcRenderer } from 'electron'
import { ProjectStore } from "../stores/ProjectStore"

Mobx.configure({ enforceActions: 'always' })

const projectStore = new ProjectStore()

// Listeners for menu items from the main thread.
ipcRenderer.on("open-image-set", async (event:Electron.Event, dirName:string) => {
    projectStore.openImageSet(dirName)
})

ipcRenderer.on("open-project", async (event:Electron.Event, dirName:string) => {
    projectStore.openProject(dirName)
})

ipcRenderer.on("open-active-segmentation-file", (event:Electron.Event, filename:string) => {
    projectStore.activeImageStore.setSegmentationFile(filename)
})

ipcRenderer.on("open-project-segmentation-file", (event:Electron.Event, filename:string) => {
    projectStore.setSegmentationBasename(filename)
})

ipcRenderer.on("import-active-selected-populations", (event:Electron.Event, filename:string) => {
    projectStore.importActiveUserData(filename)
})

ipcRenderer.on("import-project-selected-populations", (event:Electron.Event, filename:string) => {
    projectStore.importAllUserData(filename)
})

ipcRenderer.on("export-active-selected-populations", (event:Electron.Event, filename:string) => {
    projectStore.exportActiveUserData(filename)
})

ipcRenderer.on("export-project-selected-populations", (event:Electron.Event, filename:string) => {
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
    projectStore.setWindowDimensions(width, height)
})

ipcRenderer.on("clean-up-webworkers", (event:Electron.Event) => {
    if(projectStore.activeImageStore.imageData != null){
        projectStore.activeImageStore.imageData.terminateWorkers()
    }
})

ipcRenderer.on("delete-active-image-set", (event:Electron.Event) => {
    projectStore.deleteActiveImageSet()
})


// Listener to turn on/off the plot in the main window if the plotWindow is open.
ipcRenderer.on('plot-in-main-window', (event:Electron.Event, inMain: boolean) => {
    projectStore.setPlotInMainWindow(inMain)
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

Mobx.autorun(() => {
    if(projectStore.errorMessage != null){
        ipcRenderer.send('mainWindow-show-error-dialog', projectStore.errorMessage)
        projectStore.clearErrorMessage()
    }
})

Mobx.autorun(() => {
    if(projectStore.removeMessage != null){
        ipcRenderer.send('mainWindow-show-remove-dialog', projectStore.removeMessage)
        projectStore.clearRemoveMessage()
    }
})

// Update the main thread on whether or not an image store with image data loaded is selected.
Mobx.autorun(() => {
    ipcRenderer.send('set-image-loaded', projectStore.imageSetPaths.length > 0)
})

Mobx.autorun(() => {
    ipcRenderer.send('set-project-loaded', projectStore.imageSetPaths.length > 1)
})

Mobx.autorun(() => {
    ipcRenderer.send('set-segmentation-loaded', projectStore.activeImageStore.segmentationData != null)
})

Mobx.autorun(() => {
    ipcRenderer.send('set-populations-selected', projectStore.activePopulationStore.selectedPopulations.length > 0)
})

ReactDOM.render(
    <div>
        <MainApp projectStore={projectStore}/>
    </div>,
    document.getElementById("main")
)