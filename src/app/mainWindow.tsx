import * as React from "react"
import * as ReactDOM from "react-dom"
import { MainApp } from "../components/MainApp"
import * as Mobx from 'mobx'
import { ImageStore } from "../stores/ImageStore"
import { ipcRenderer } from 'electron'
import { ScatterPlotData } from "../lib/ScatterPlotData"
import { ImageDataLoader } from "../lib/ImageDataLoader"

Mobx.configure({ enforceActions: 'always' })

const tiff = require("tiff")
const imageStore = new ImageStore()


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

    let loader = new ImageDataLoader()
    loader.loadFolder(dirName, (data) => imageStore.setImageData(data))
})

ipcRenderer.on("open-segmentation-file", (event:Electron.Event, filename:string) => {
    imageStore.selectSegmentationFile(filename)
})

ipcRenderer.on("import-selected-regions", (event:Electron.Event, filename:string) => {
    imageStore.importSelectedRegions(filename)
})

ipcRenderer.on("export-selected-regions", (event:Electron.Event, filename:string) => {
    imageStore.exportSelectedRegions(filename)
})

ipcRenderer.on("window-size", (event:Electron.Event, width:number, height: number) => {
    imageStore.setWindowDimensions(width, height)
})

ReactDOM.render(
    <div>
        <MainApp  store={imageStore} />
    </div>,
    document.getElementById("example")
);



