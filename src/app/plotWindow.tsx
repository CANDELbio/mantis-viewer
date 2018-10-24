import * as React from "react"
import * as ReactDOM from "react-dom"
import * as Mobx from 'mobx'
import { ipcRenderer } from 'electron'
import { PlotApp } from "../components/PlotApp"
import { ImageData } from "../lib/ImageData"
import { ImageStore } from "../stores/ImageStore"
import { PopulationStore } from "../stores/PopulationStore"
import { PlotStore } from "../stores/PlotStore"
import { SelectedPopulation } from "../interfaces/ImageInterfaces"

Mobx.configure({ enforceActions: 'always' })

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

ipcRenderer.on("set-populations", (event:Electron.Event, populations:SelectedPopulation[]) => {
    populationStore.setSelectedPopulations(populations)
})

let addSelectedPopulation = (segmentIds: number[]) => {
    ipcRenderer.send('add-selected-population', segmentIds)
}

let setHoveredSegments = (segmentIds: number[]) => {
    ipcRenderer.send('set-hovered-segments', segmentIds)
}

ReactDOM.render(
    <div>
        <PlotApp  imageStore={imageStore} populationStore={populationStore} plotStore={plotStore} addSelectedPopulation={addSelectedPopulation} setHoveredSegments={setHoveredSegments}/>
    </div>,
    document.getElementById("plot")
)


