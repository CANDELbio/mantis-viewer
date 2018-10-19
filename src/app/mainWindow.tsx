import * as React from "react"
import * as ReactDOM from "react-dom"
import { MainApp } from "../components/MainApp"
import * as Mobx from 'mobx'
import { ImageStore } from "../stores/ImageStore"
import { ipcRenderer } from 'electron'
import { ScatterPlotData } from "../lib/ScatterPlot"
import { ImageData } from "../lib/Image"
import { PopulationStore } from "../stores/PopulationStore";

Mobx.configure({ enforceActions: 'always' })

const tiff = require("tiff")
const populationStore = new PopulationStore()
const imageStore = new ImageStore(populationStore)


//Set up the separate plotting window
// let plotWindow: Electron.BrowserWindow | null = new BrowserWindow({width: 1600, height: 1200})
//
//
// plotWindow.loadURL(url.format({
//     pathname: path.join(__dirname, 'plotWindow.html'),
//     protocol: 'file:',
//     slashes: true
//   }))
//
// plotWindow.webContents.openDevTools()
//
// plotWindow.on('closed', function () {
//     plotWindow = null
// })
//
// Mobx.autorun(() => {
//     let imcData = imageStore.imageData
//     let segmentationData = imageStore.segmentationData
//     let ch1 = imageStore.channelMarker.rChannel
//     let ch2 = imageStore.channelMarker.gChannel
//     if(plotWindow != null && imcData != null && segmentationData != null && ch1 != null && ch2 != null){
//         console.log("Generating plotData...")
//         let scatterPlotData = new ScatterPlotData(ch1, ch2, imcData, segmentationData)
//         console.log("Sending plotData...")
//         plotWindow.webContents.send("plotData", scatterPlotData)
//     }
// })

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

ipcRenderer.on("window-size", (event:Electron.Event, width:number, height: number) => {
    imageStore.setWindowDimensions(width, height)
})

ReactDOM.render(
    <div>
        <MainApp  imageStore={imageStore} populationStore={populationStore}/>
    </div>,
    document.getElementById("example")
)