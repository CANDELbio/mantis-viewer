import { observable, 
    action,
    autorun,
    computed} from "mobx"
import * as fs from 'fs'
import * as path from "path"

import { ImageStore } from "../stores/ImageStore"
import { PopulationStore } from "../stores/PopulationStore"
import { PlotStore } from "../stores/PlotStore"
import { ScatterPlotData } from "../lib/ScatterPlotData"
import { SelectedPopulation } from "../interfaces/ImageInterfaces"
import { SegmentationData } from "../lib/SegmentationData"
import { ImageData } from "../lib/ImageData"
import { SelectOption } from "../interfaces/UIDefinitions";



interface ImageSet {
    imageStore: ImageStore,
    populationStore: PopulationStore,
    plotStore: PlotStore
}

export class ProjectStore {

    constructor() {
        this.initialize()
    }
    
    @observable imageSetPaths: string[]
    @observable imageSets: Record<string, ImageSet>
    @observable activeImageSetPath: string | null

    @observable persistImageSetSettings: boolean

    @observable.ref activeImageStore: ImageStore
    @observable.ref activePopulationStore: PopulationStore
    @observable.ref activePlotStore: PlotStore

    @action initialize = () => {
        this.imageSetPaths = []
        this.imageSets = {}

        this.persistImageSetSettings = true

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

    imageSetPathOptions = computed(() => {
        return this.imageSetPaths.map((s) => {
            return({value: s, label: path.basename(s)})
        })
    })

    @action setImageSetPaths(dirName:string) {
        let files = fs.readdirSync(dirName)
        for(let file of files){
            let filePath = path.join(dirName, file)
            if(fs.statSync(filePath).isDirectory()) this.imageSetPaths.push(filePath)
        }
        if(this.imageSetPaths.length > 0) this.setActiveImageSet(this.imageSetPaths[0])
    }

    @action setActiveImageSet(dirName:string) {
        // If we haven't loaded this directory, initialize the stores and load it.
        if(!(dirName in this.imageSets)){
            let imageStore = new ImageStore()
            imageStore.setImageDataLoading(true)
            imageStore.selectDirectory(dirName)
            imageStore.clearImageData()
            let imageData = new ImageData()
            imageData.loadFolder(dirName, (data) => imageStore.setImageData(data))
            this.imageSets[dirName] = {
                imageStore: imageStore,
                populationStore: new PopulationStore(),
                plotStore: new PlotStore()
            }
        }

        // If the dirName isn't in the image set paths (i.e. adding a single folder), then add it.
        if(this.imageSetPaths.indexOf(dirName) == -1) this.imageSetPaths.push(dirName)

        // Copy settings from old imageSet to new one.
        if(this.activeImageSetPath != null && this.persistImageSetSettings){
            this.copySegmentationBasename(this.activeImageSetPath, dirName)
        }

        // Set this directory as the active one.
        this.activeImageSetPath = dirName
        this.activeImageStore = this.imageSets[dirName].imageStore
        this.activePopulationStore = this.imageSets[dirName].populationStore
        this.activePlotStore = this.imageSets[dirName].plotStore

    }

    @action copySegmentationBasename(sourceImageSetPath:string, destinationImageSetPath:string){
        let sourceSegmentationFile = this.imageSets[sourceImageSetPath].imageStore.selectedSegmentationFile
        if(sourceSegmentationFile != null){
            let segmentationBasename = path.basename(sourceSegmentationFile)
            let destinationSegmentationFile = path.join(destinationImageSetPath, segmentationBasename)
            if(fs.statSync(destinationSegmentationFile).isFile()){
                this.imageSets[destinationImageSetPath].imageStore.setSegmentationFile(destinationSegmentationFile)
            }
        }
    }

    @action setActiveImageSetFromSelect = () => {
        return action((x: SelectOption) => { if(x != null) this.setActiveImageSet(x.value) })
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