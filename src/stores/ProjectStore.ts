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
import { SelectOption, ChannelName } from "../interfaces/UIDefinitions"

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

    @observable.ref activeImageStore: ImageStore
    @observable.ref activePopulationStore: PopulationStore
    @observable.ref activePlotStore: PlotStore

    @observable copyImageSetSettingsEnabled: boolean

    // Storing channel marker and channel domain on the project store
    // So that we can copy across image sets even if a channel is missing in a set
    @observable channelMarker: Record<ChannelName, string | null>
    // channelDomain stored here as percentages.
    @observable channelDomainPercentage: Record<ChannelName, [number, number]>
    // segmentation file basename when a segmentation file is selected for the whole project
    @observable segmentationBasename: string | null
    // selected plot channels to be copied
    @observable.ref selectedPlotChannels: string[]

    @observable errorMessage: string | null

    @action initialize = () => {
        this.imageSetPaths = []
        this.imageSets = {}

        this.copyImageSetSettingsEnabled = true

        this.channelMarker = {
            rChannel: null,
            gChannel: null,
            bChannel: null
        }

        this.channelDomainPercentage = {
            rChannel: [0, 1],
            gChannel: [0, 1],
            bChannel: [0, 1]
        }

        this.selectedPlotChannels = []

        // First ones never get used, but here so that we don't have to use a bunch of null checks.
        // These will never be null once an image is loaded.
        // Maybe better way to accomplish this?
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
        this.copyImageSetSettingsEnabled = value
    }

    @action setImageSetPaths = (dirName:string) => {
        let files = fs.readdirSync(dirName)
        for(let file of files){
            let filePath = path.join(dirName, file)
            if(fs.statSync(filePath).isDirectory()) this.imageSetPaths.push(filePath)
        }
        if(this.imageSetPaths.length > 0) {
            this.setActiveImageSet(this.imageSetPaths[0])
        } else {
            this.errorMessage = "Warning: No image set directories found within chosen directory."
        }
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


        when(() => !this.activeImageStore.imageDataLoading, () => this.finalizeActiveImageSet(this.lastActiveImageSetPath, this.activeImageSetPath))

    }

    // Make any changes or checks that require image data to be loaded.
    @action finalizeActiveImageSet = (sourceImageSetPath:string|null, destinationImageSetPath:string|null) => {
        this.copyImageSetSettings(sourceImageSetPath, destinationImageSetPath)
        this.setImageSetWarnings(destinationImageSetPath)
    }

    @action setImageSetWarnings = (imageSetPath:string|null) => {
        if(imageSetPath != null){
            let imageStore = this.imageSets[imageSetPath].imageStore
            if(imageStore.imageData != null){
                if(imageStore.imageData.channelNames.length == 0) this.errorMessage = "Warning: No tiffs found within chosen image set."

            }

        }
    }

    // Copy settings from old imageSet to new one once image data has loaded.
    // Copy when image data has loaded so that channel marker values and domain settings don't get overwritten.
    @action copyImageSetSettings = (sourceImageSetPath:string|null, destinationImageSetPath:string|null) => {
        if(sourceImageSetPath != null && destinationImageSetPath != null){
            let sourceImageStore = this.imageSets[sourceImageSetPath].imageStore
            let sourcePlotStore = this.imageSets[sourceImageSetPath].plotStore
            let destinationImageStore = this.imageSets[destinationImageSetPath].imageStore
            let destinationPlotStore = this.imageSets[destinationImageSetPath].plotStore
            // We want to copy whether or not the plot is being viewed in the main window as changing the image set won't close the plot window if open.
            this.copyWindowWidth(sourceImageStore, destinationImageStore)
            this.copyPlotInMainWindow(sourcePlotStore, destinationPlotStore)
            // We want to set the image store segmentation file if segmentation file basename is not null.
            this.setImageStoreSegmentationFile(destinationImageStore)
            // If the user wants to persist image set settings
            if(this.copyImageSetSettingsEnabled) {
                this.setImageStoreChannelMarkers(destinationImageStore)
                this.setImageStoreChannelDomains(destinationImageStore)
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

    @action setImageStoreChannelMarkers = (destinationImageStore:ImageStore) => {
        if(destinationImageStore.imageData != null){
            for(let s in this.channelMarker) {
                let channelName = s as ChannelName
                let channelValue = this.channelMarker[channelName]
                if(channelValue != null){
                    if(destinationImageStore.imageData.channelNames.indexOf(channelValue) != -1){
                        // If the file selected is not null and the destination has a file with the same name set that
                        destinationImageStore.setChannelMarker(channelName, channelValue)
                    } else {
                        // Otherwise unset that channel for the destination
                        destinationImageStore.unsetChannelMarker(channelName)
                    }
                } else {
                    // Unset the channel for the destination if it's unset in the source
                    destinationImageStore.unsetChannelMarker(channelName)
                }
            }
        }
    }

    @action setImageStoreChannelDomains = (destinationImageStore:ImageStore) => {
        if(destinationImageStore.imageData != null){
            for(let s in this.channelDomainPercentage) {
                let channelName = s as ChannelName
                let channelPercentages = this.channelDomainPercentage[channelName]
                let destinationChannelMarker = destinationImageStore.channelMarker[channelName]
                // Copy the domain if it's not null and if the channelMarker in the destination is the same.
                if(destinationChannelMarker != null && destinationChannelMarker == this.channelMarker[channelName]){
                    destinationImageStore.setChannelDomainFromPercentage(channelName, channelPercentages)
                }
            }
        }
    }

    @action setPlotStoreChannels = (destinationImageStore:ImageStore, destinationPlotStore:PlotStore) => {
        let destinationImageData = destinationImageStore.imageData
        if(destinationImageData != null){
            let selectedPlotChannels = []
            for(let channel of this.selectedPlotChannels){
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
        this.setPlotStoreChannels(destinationImageStore, destinationPlotStore)
    }

    // Looks for a segmentation file with the same filename from source in dest and sets it if it exists.
    @action setImageStoreSegmentationFile = (destinationImageStore:ImageStore) => {
        if(this.segmentationBasename != null){
            let destinationPath = destinationImageStore.selectedDirectory
            if (destinationPath != null){
                let destinationSegmentationFile = path.join(destinationPath, this.segmentationBasename)
                // Only copy the segmentation basename if basename exists in the dest image set and it's not already set to that.
                if(fs.existsSync(destinationSegmentationFile) && destinationImageStore.selectedSegmentationFile == null){
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
            this.clearSelectedPlotChannels()
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

    @action setChannelMarker = (channelName: ChannelName, markerName: string) => {
        this.channelMarker[channelName] = markerName
        this.activeImageStore.setChannelMarker(channelName, markerName)
    }

    @action unsetChannelMarker = (channelName: ChannelName) => {
        this.channelMarker[channelName] = null
        this.activeImageStore.unsetChannelMarker(channelName)
    }

    @action setChannelMarkerCallback = (name: ChannelName) => {
        return action((x: SelectOption) => {
            // If the SelectOption has a value.
            if(x != null){
                this.setChannelMarker(name, x.value)
            // If SelectOption doesn't have a value the channel has been cleared and values should be reset.
            } else {
                this.unsetChannelMarker(name)
            }
        })
    }

    @action setChannelDomainCallback = (name: ChannelName) => {
        return action((value: [number, number]) => {
            this.activeImageStore.setChannelDomain(name, value)
            this.channelDomainPercentage[name] = this.activeImageStore.getChannelDomainPercentage(name)
        })
    }

    @action setSegmentationBasename = (fName: string) => {
        let basename = path.basename(fName)
        this.segmentationBasename = basename
        this.activeImageStore.setSegmentationFile(fName)
    }

    @action setSelectedPlotChannels = (x: string[]) => {
        this.selectedPlotChannels = x
        this.activePlotStore.setSelectedPlotChannels(x)
    }

    @action clearSelectedPlotChannels = () => {
        this.selectedPlotChannels = []
        this.activePlotStore.clearSelectedPlotChannels()
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

    @action clearErrorMessage = () => {
        this.errorMessage = null
    }

}