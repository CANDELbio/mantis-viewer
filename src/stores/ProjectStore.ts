import { observable, 
    action,
    autorun,
    computed,
    when} from "mobx"
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
    @observable lastActiveImageSetPath: string | null
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
            } else {
                plotStore.clearScatterPlotData()
            }
        }
    })

    imageSetPathOptions = computed(() => {
        return this.imageSetPaths.map((s) => {
            return({value: s, label: path.basename(s)})
        })
    })

    @action setPersistImageSetSettings = (value: boolean) => {
        this.persistImageSetSettings = value
    }

    @action setImageSetPaths = (dirName:string) => {
        let files = fs.readdirSync(dirName)
        for(let file of files){
            let filePath = path.join(dirName, file)
            if(fs.statSync(filePath).isDirectory()) this.imageSetPaths.push(filePath)
        }
        if(this.imageSetPaths.length > 0) this.setActiveImageSet(this.imageSetPaths[0])
    }

    @action initializeStores = (dirName:string) => {
        // Set up the image store
        let imageStore = new ImageStore()
        imageStore.setImageDataLoading(true)
        imageStore.selectDirectory(dirName)
        imageStore.clearImageData()
        // Load image data in the background and set on the image store once it's loaded.
        let imageData = new ImageData()
        imageData.loadFolder(dirName, (data) => {
            imageStore.setImageData(data)
        })
        // Save in imageSets
        this.imageSets[dirName] = {
            imageStore: imageStore,
            populationStore: new PopulationStore(),
            plotStore: new PlotStore()
        }
    }

    @action setActiveStores = (dirName:string) => {
        this.lastActiveImageSetPath = this.activeImageSetPath
        this.activeImageSetPath = dirName
        this.activeImageStore = this.imageSets[dirName].imageStore
        this.activePopulationStore = this.imageSets[dirName].populationStore
        this.activePlotStore = this.imageSets[dirName].plotStore
    }

    @action setActiveImageSet = (dirName:string) => {
        // If we haven't loaded this directory, initialize the stores and load it.
        if(!(dirName in this.imageSets)){
            this.initializeStores(dirName)
        }

        // If the dirName isn't in the image set paths (i.e. adding a single folder), then add it.
        if(this.imageSetPaths.indexOf(dirName) == -1) this.imageSetPaths.push(dirName)

        // Set this directory as the active one and set the stores as the active ones.
        this.setActiveStores(dirName)

        // Copy settings from old imageSet to new one once image data has loaded.
        // Copy when image data has loaded so that channel marker values and domain settings don't get overwritten.
        when(() => !this.activeImageStore.imageDataLoading, () => this.copyImageSetSettings(this.lastActiveImageSetPath, this.activeImageSetPath))

    }

    @action copyImageSetSettings = (sourceImageSetPath:string|null, destinationImageSetPath:string|null) => {
        if(sourceImageSetPath != null && destinationImageSetPath != null){
            let sourceImageStore = this.imageSets[sourceImageSetPath].imageStore
            let sourcePlotStore = this.imageSets[sourceImageSetPath].plotStore
            let destinationImageStore = this.imageSets[destinationImageSetPath].imageStore
            let destinationPlotStore = this.imageSets[destinationImageSetPath].plotStore
            // We want to copy whether or not the plot is being viewed in the main window as changing the image set won't close the plot window if open.
            this.copyWindowWidth(sourceImageStore, destinationImageStore)
            this.copyPlotInMainWindow(sourcePlotStore, destinationPlotStore)
            // If the user wants to persist image set settings
            if(this.persistImageSetSettings) {
                destinationImageStore.copyChannelMarkerValues(sourceImageStore.channelMarker)
                destinationImageStore.setChannelDomainFromPercentages(sourceImageStore.getChannelDomainPercentages())
                this.copySegmentationBasename(sourceImageStore, destinationImageStore)
                this.copySegmentationSettings(sourceImageStore, destinationImageStore)
                this.copyPlotStoreSettings(sourcePlotStore, destinationImageStore, destinationPlotStore)
            }
        }
    }

    @action copyWindowWidth = (sourceImageStore:ImageStore, destinationImageStore:ImageStore) => {
        if(sourceImageStore.windowWidth != null && sourceImageStore.windowHeight != null){
            destinationImageStore.setWindowDimensions(sourceImageStore.windowWidth, sourceImageStore.windowHeight)
        }
    }

    @action copyPlotInMainWindow = (sourcePlotStore:PlotStore, destinationPlotStore:PlotStore) => {
        destinationPlotStore.setPlotInMainWindow(sourcePlotStore.plotInMainWindow)
    }

    @action copyPlotStoreChannels = (sourcePlotStore:PlotStore, destinationImageStore:ImageStore, destinationPlotStore:PlotStore) => {
        let sourcePlotChannels = sourcePlotStore.selectedPlotChannels
        let destinationImageData = destinationImageStore.imageData
        if(destinationImageData != null){
            let selectedPlotChannels = []
            for(let channel of sourcePlotChannels){
                if(destinationImageData.channelNames.indexOf(channel) != -1){
                    selectedPlotChannels.push(channel)
                }
            }
            destinationPlotStore.setSelectedPlotChannels(selectedPlotChannels)
        }
    }

    @action copyPlotStoreSettings = (sourcePlotStore:PlotStore, destinationImageStore:ImageStore, destinationPlotStore:PlotStore) => {
        destinationPlotStore.setScatterPlotStatistic(sourcePlotStore.scatterPlotStatistic)
        destinationPlotStore.setScatterPlotTransform(sourcePlotStore.scatterPlotTransform)
        // Check if the source selected plot channels are in the destination image set. If they are, use them.
        this.copyPlotStoreChannels(sourcePlotStore, destinationImageStore, destinationPlotStore)
    }

    // Looks for a segmentation file with the same filename from source in dest and sets it if it exists.
    @action copySegmentationBasename = (sourceImageStore:ImageStore, destinationImageStore:ImageStore) => {
        let sourceSegmentationFile = sourceImageStore.selectedSegmentationFile
        if(sourceSegmentationFile != null){
            let destinationPath = destinationImageStore.selectedDirectory
            if (destinationPath != null){
                let segmentationBasename = path.basename(sourceSegmentationFile)
                let destinationSegmentationFile = path.join(destinationPath, segmentationBasename)
                // Only copy the segmentation basename if basename exists in the dest image set and it's not already set to that.
                if(fs.existsSync(destinationSegmentationFile) && destinationImageStore.selectedSegmentationFile != destinationSegmentationFile){
                    destinationImageStore.setSegmentationFile(destinationSegmentationFile)
                }
            }
        }
    }

    @action copySegmentationSettings = (sourceImageStore:ImageStore, destinationImageStore:ImageStore) => {
        destinationImageStore.setSegmentationFillAlpha(sourceImageStore.segmentationFillAlpha)
        destinationImageStore.setSegmentationOutlineAlpha(sourceImageStore.segmentationOutlineAlpha)
        destinationImageStore.setCentroidVisibility(sourceImageStore.segmentationCentroidsVisible)
    }

    @action setActiveImageSetFromSelect = () => {
        return action((x: SelectOption) => { if(x != null) this.setActiveImageSet(x.value) })
    }

    @action clearActiveSegmentationData = () => {
        let imageStore = this.activeImageStore
        let plotStore = this.activePlotStore
        if(imageStore && plotStore){
            imageStore.clearSegmentationData()
            plotStore.clearSelectedPlotChannels()
        }
    }

    @action clearActiveImageData = () => {
        let imageStore = this.activeImageStore
        let populationStore = this.activePopulationStore
        if(imageStore && populationStore) {
            imageStore.clearImageData()
            populationStore.clearSelectedPopulations()
            this.clearActiveImageData()
        }
    }

    // Exports user data (i.e populations and segmentation) for the all image sets
    // Exports to a file named filename in each image sets's directory.
    exportAllUserData = (filename:string) => {
        let basename = path.basename(filename)
        for(let curPath of this.imageSetPaths){
            let exportFilename = path.join(curPath, basename)
            this.exportActiveUserData(exportFilename, curPath)
        }
    }

    // Exports user data (i.e populations and segmentation) for the active image set
    exportActiveUserData = (filename:string, dirName=this.activeImageSetPath) => {
        let exportingContent = {populations: [] as SelectedPopulation[], segmentation: {}}
        if(dirName != null && dirName in this.imageSets){
            let imageStore = this.imageSets[dirName].imageStore
            let populationStore = this.imageSets[dirName].populationStore
            // Prepare segmentation data for export
            // Dump Float32Array to normal array as JSON.stringify/parse don't support typed arrays.
            if(imageStore && populationStore && populationStore.selectedPopulations.length > 0) {
                if(imageStore.segmentationData != null) {
                    exportingContent.segmentation = {
                        width: imageStore.segmentationData.width,
                        height: imageStore.segmentationData.height,
                        data: Array.from(imageStore.segmentationData.data)
                    }
                }
                // Prepare selected populations for export
                exportingContent.populations = populationStore.selectedPopulations

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
    }

    // Imports user data (i.e populations and segmentation) for the all image sets
    // Imports from a file named filename in each image sets's directory.
    @action importAllUserData = (filename:string) => {
        let basename = path.basename(filename)
        for(let curPath of this.imageSetPaths){
            let importFilename = path.join(curPath, basename)
            if(fs.existsSync(importFilename)) this.importActiveUserData(importFilename, curPath)
        }
    }

    // Imports segmentation data and selected populations from file
    // TODO: Some sanity checks to make sure imported data makes sense
    @action importActiveUserData = (filename:string, dirName=this.activeImageSetPath) => {
        let importingContent = JSON.parse(fs.readFileSync(filename, 'utf8'))
        if(dirName != null){
            // If the user has not viewed the image set we're importing for yet we need to initialize the stores for it first.
            if(!(dirName in this.imageSets)) this.initializeStores(dirName)
            let imageStore = this.imageSets[dirName].imageStore
            let populationStore = this.imageSets[dirName].populationStore

            // Import Segmentation Data
            let importingSegmentation = importingContent.segmentation
            if(importingSegmentation){
                let importedDataArray = Float32Array.from(importingSegmentation.data)
                let importedSegmentationData = new SegmentationData(importingSegmentation.width, importingSegmentation.height, importedDataArray)
                imageStore.setSegmentationData(importedSegmentationData)
            }
            // Import saved populations
            let importingPopulations = importingContent.populations
            if(importingPopulations) populationStore.setSelectedPopulations(importingPopulations)
        }
    }

}