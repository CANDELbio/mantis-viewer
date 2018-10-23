import * as React from "react"
import * as ReactDOM from "react-dom"
import { ipcRenderer } from 'electron'
import { PlotApp } from "../components/PlotApp"
import { ImageData } from "../lib/ImageData"
import { ImageStore } from "../stores/ImageStore"
import { PopulationStore } from "../stores/PopulationStore"
import { PlotStore } from "../stores/PlotStore"

const populationStore = new PopulationStore()
const plotStore = new PlotStore()
const imageStore = new ImageStore(populationStore, plotStore)


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

ipcRenderer.on("window-size", (event:Electron.Event, width:number, height: number) => {
    imageStore.setWindowDimensions(width, height)
})

ReactDOM.render(
    <div>
        <PlotApp  imageStore={imageStore} populationStore={populationStore} plotStore={plotStore}/>
    </div>,
    document.getElementById("plot")
)


