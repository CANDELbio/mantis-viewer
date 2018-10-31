import { observable, 
    action,
    computed,
    autorun} from "mobx"
import * as fs from 'fs'

import { ImageStore } from "../stores/ImageStore"
import { PopulationStore } from "../stores/PopulationStore"
import { PlotStore } from "../stores/PlotStore"
import { ScatterPlotData } from "../lib/ScatterPlotData"
import { SelectedPopulation } from "../interfaces/ImageInterfaces"
import { SegmentationData } from "../lib/SegmentationData"
import { ImageData } from "../lib/ImageData"

interface Project {
    imageStore: ImageStore,
    populationStore: PopulationStore,
    plotStore: PlotStore
}

export class ProjectStore {

    constructor() {
        this.initialize()
    }
    
    @observable.ref projects: Record<string, Project> 
    @observable activeProject: string | null

    @observable.ref activeImageStore: ImageStore
    @observable.ref activePopulationStore: PopulationStore
    @observable.ref activePlotStore: PlotStore

    @action initialize = () => {
        this.projects = {}

        this.activeImageStore = new ImageStore()
        this.activePopulationStore = new PopulationStore()
        this.activePlotStore = new PlotStore()
    }

    setScatterPlotData = autorun(() => {
        let imageStore = this.activeImageStore
        let populationStore = this.activePopulationStore
        let plotStore = this.activePlotStore

        if(imageStore && populationStore && plotStore){
            if(plotStore.selectedPlotChannels.length == 2){
                let ch1 = plotStore.selectedPlotChannels[0]
                let ch2 = plotStore.selectedPlotChannels[1]
                if(imageStore.imageData != null && imageStore.segmentationData != null){
                    plotStore.setScatterPlotData(new ScatterPlotData(ch1,
                        ch2,
                        imageStore.imageData,
                        imageStore.segmentationData,
                        plotStore.scatterPlotStatistic,
                        plotStore.scatterPlotTransform,
                        populationStore.selectedPopulations
                    ))
                }
            }
        }
    })

    @action async setActiveDirectory(dirName:string) {
        if(this.activeProject != dirName){
            if(!(dirName in this.projects)){
                let imageStore = new ImageStore()
                imageStore.setImageDataLoading(true)
                imageStore.selectDirectory(dirName)
                imageStore.clearImageData()
                let imageData = new ImageData()
                imageData.loadFolder(dirName, (data) => imageStore.setImageData(data))
                this.projects[dirName] = {
                    imageStore: imageStore,
                    populationStore: new PopulationStore(),
                    plotStore: new PlotStore()
                }
            }

            this.activeProject = dirName
            this.activeImageStore = this.projects[dirName].imageStore
            this.activePopulationStore = this.projects[dirName].populationStore
            this.activePlotStore = this.projects[dirName].plotStore
        }
    }

    @action clearActiveSegmentationData() {
        let imageStore = this.activeImageStore
        let plotStore = this.activePlotStore
        if(imageStore && plotStore){
            imageStore.clearSegmentationData()
            plotStore.clearSelectedPlotChannels()
        }
    }

    @action clearActiveImageData() {
        let imageStore = this.activeImageStore
        let populationStore = this.activePopulationStore
        if(imageStore && populationStore) {
            imageStore.clearImageData()
            populationStore.clearSelectedPopulations()
            this.clearActiveImageData()
        }
    }

    @action exportActiveUserData = (filename:string) => {
        let exportingContent = {populations: [] as SelectedPopulation[], segmentation: {}}
        let imageStore = this.activeImageStore
        let populationStore = this.activePopulationStore
        // Prepare segmentation data for export
        // Dump Float32Array to normal array as JSON.stringify/parse don't support typed arrays.
        if(imageStore && populationStore) {
            if(imageStore.segmentationData != null) {
                exportingContent.segmentation = {
                    width: imageStore.segmentationData.width,
                    height: imageStore.segmentationData.height,
                    data: Array.from(imageStore.segmentationData.data)
                }
            }
            // Prepare selected populations for export
            if(populationStore.selectedPopulations != null) exportingContent.populations = populationStore.selectedPopulations

            let exportingString = JSON.stringify(exportingContent)

            // Write data to file
            fs.writeFile(filename, exportingString, 'utf8', function (err) {
                if (err) {
                    console.log("An error occured while writing regions of interest to file.")
                    return console.log(err)
                }
                console.log("Regions of interest file has been saved.")
            })
        }
    }

    // Imports segmentation data and selected populations from file
    // TODO: Some sanity checks to make sure imported data makes sense
    @action importActiveUserData = (filename:string) => {
        let importingContent = JSON.parse(fs.readFileSync(filename, 'utf8'))
        let imageStore = this.activeImageStore
        let populationStore = this.activePopulationStore

        if(imageStore && populationStore) {
            // Import Segmentation Data
            let importingSegmentation = importingContent.segmentation
            let importedDataArray = Float32Array.from(importingSegmentation.data)
            let importedSegmentationData = new SegmentationData(importingSegmentation.width, importingSegmentation.height, importedDataArray)
            imageStore.setSegmentationData(importedSegmentationData)

            // Import saved populations
            populationStore.setSelectedPopulations(importingContent.populations)
        }
    }

}