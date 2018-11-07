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
            // We want to copy whether or not the plot is being viewed in the main window as changing the image set won't close the plot window if open.
            this.copyPlotInMainWindow(sourceImageSetPath, destinationImageSetPath)
            if(this.persistImageSetSettings) {
                this.copyChannelMarkerValues(sourceImageSetPath, destinationImageSetPath)
                this.copyChannelMarkerSettings(sourceImageSetPath, destinationImageSetPath)
                this.copySegmentationBasename(sourceImageSetPath, destinationImageSetPath)
                this.copySegmentationSettings(sourceImageSetPath, destinationImageSetPath)
                this.copyPlotStoreSettings(sourceImageSetPath, destinationImageSetPath)
            }
        }
    }

    @action copyPlotInMainWindow = (sourceImageSetPath:string, destinationImageSetPath:string) => {
        let sourcePlotStore = this.imageSets[sourceImageSetPath].plotStore
        let destinationPlotStore = this.imageSets[destinationImageSetPath].plotStore
        destinationPlotStore.setPlotInMainWindow(sourcePlotStore.plotInMainWindow)
    }

    @action copyPlotStoreSettings = (sourceImageSetPath:string, destinationImageSetPath:string) => {
        let sourcePlotStore = this.imageSets[sourceImageSetPath].plotStore
        let destinationPlotStore = this.imageSets[destinationImageSetPath].plotStore
        destinationPlotStore.setScatterPlotStatistic(sourcePlotStore.scatterPlotStatistic)
        destinationPlotStore.setScatterPlotTransform(sourcePlotStore.scatterPlotTransform)
        // Check if the source selected plot channels are in the destination image set. If they are, use them.
        let sourcePlotChannels = sourcePlotStore.selectedPlotChannels
        let destinationImageData = this.imageSets[destinationImageSetPath].imageStore.imageData
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

    // Looks for a segmentation file with the same filename from source in dest and sets it if it exists.
    @action copySegmentationBasename = (sourceImageSetPath:string, destinationImageSetPath:string) => {
        let sourceSegmentationFile = this.imageSets[sourceImageSetPath].imageStore.selectedSegmentationFile
        if(sourceSegmentationFile != null){
            let segmentationBasename = path.basename(sourceSegmentationFile)
            let destinationSegmentationFile = path.join(destinationImageSetPath, segmentationBasename)
            let destinationImageStore = this.imageSets[destinationImageSetPath].imageStore
            // Only copy the segmentation basename if basename exists in the dest image set and it's not already set to that.
            if(fs.statSync(destinationSegmentationFile).isFile() && destinationImageStore.selectedSegmentationFile != destinationSegmentationFile){
                destinationImageStore.setSegmentationFile(destinationSegmentationFile)
            }
        }
    }

    @action copySegmentationSettings = (sourceImageSetPath:string, destinationImageSetPath:string) => {
        let sourceImageStore = this.imageSets[sourceImageSetPath].imageStore
        let destinationImageStore = this.imageSets[destinationImageSetPath].imageStore
        destinationImageStore.setSegmentationFillAlpha(sourceImageStore.segmentationFillAlpha)
        destinationImageStore.setSegmentationOutlineAlpha(sourceImageStore.segmentationOutlineAlpha)
        destinationImageStore.setCentroidVisibility(sourceImageStore.segmentationCentroidsVisible)
    }

    @action copyChannelMarkerValues = (sourceImageSetPath:string, destinationImageSetPath:string) => {
        let sourceImageStore = this.imageSets[sourceImageSetPath].imageStore
        let destinationImageStore = this.imageSets[destinationImageSetPath].imageStore
        destinationImageStore.copyChannelMarkerValues(sourceImageStore.channelMarker)
    }

    @action copyChannelMarkerSettings = (sourceImageSetPath:string, destinationImageSetPath:string) => {
        let sourceImageStore = this.imageSets[sourceImageSetPath].imageStore
        let destinationImageStore = this.imageSets[destinationImageSetPath].imageStore
        destinationImageStore.setChannelDomainFromPercentages(sourceImageStore.getChannelDomainPercentages())
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