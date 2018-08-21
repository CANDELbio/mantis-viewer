import * as React from "react"
import * as ReactDOM from "react-dom"
import { ImageViewer } from "./components/ImageViewer"
import * as Mobx from 'mobx'
import { ImageStore } from "./stores/ImageStore"
const tiff = require("tiff")
import * as fs from "fs"
import { ScatterPlotData } from "./lib/ScatterPlotData"

Mobx.useStrict(true)

const electron = require("electron")
const path = require('path')
const url = require('url')

const { BrowserWindow } = electron.remote
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

electron.ipcRenderer.on("open-directory", (event:Electron.Event, dirName:string) => {
    console.log(dirName)

    imageStore.selectDirectory(dirName)
})

electron.ipcRenderer.on("open-segmentation-file", (event:Electron.Event, fileName:string) => {
    imageStore.selectSegmentationFile(fileName)
})

electron.ipcRenderer.on("window-size", (event:Electron.Event, width:number, height: number) => {
    imageStore.setWindowDimensions(width, height)
})

electron.ipcRenderer.on("open-file", (event:Electron.Event, fileName:string) => {
    console.log(fileName)
    let input = fs.readFileSync(fileName)
    let image = tiff.decode(input)
    console.log(image)
    imageStore.selectFile(fileName)
})

ReactDOM.render(
    <div>
        <ImageViewer  store={imageStore} />
    </div>,
    document.getElementById("example")
);



