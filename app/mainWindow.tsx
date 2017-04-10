import * as React from "react"
import * as ReactDOM from "react-dom"
import { ImageViewer } from "./components/ImageViewer"
import * as Mobx from 'mobx';
import { ImageStore } from "./stores/ImageStore"


Mobx.useStrict(true)

const electron = require("electron")
const path = require('path')
const url = require('url')

const { BrowserWindow } = electron.remote
const imageStore = new ImageStore()


//Set up the separate plotting window
let plotWindow: Electron.BrowserWindow | null = new BrowserWindow({width: 1600, height: 1200})


plotWindow.loadURL(url.format({
    pathname: path.join("./", 'plotWindow.html'),
    protocol: 'file:',
    slashes: true
  }))

plotWindow.webContents.openDevTools()

plotWindow.on('closed', function () {
    plotWindow = null
})

Mobx.autorun(() => {
    let data = imageStore.plotData
    if(plotWindow != null)
        plotWindow.webContents.send("plotData", data)
})




electron.ipcRenderer.on("open-file", (event: Electron.IpcRendererEvent, fileName: string) => {
    console.log(fileName)
    imageStore.selectFile(fileName)
})


ReactDOM.render(
    <div>
        <ImageViewer  store={imageStore} />
    </div>,
    document.getElementById("example")
);



