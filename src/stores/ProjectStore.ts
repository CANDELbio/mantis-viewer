import { observable, 
    action,
    autorun,
    computed,
    when} from "mobx"
import * as fs from 'fs'
import * as path from "path"
import * as stringify from 'csv-stringify'

import { ImageStore } from "../stores/ImageStore"
import { PopulationStore } from "../stores/PopulationStore"
import { PlotStore } from "../stores/PlotStore"
import { PlotData } from "../lib/PlotData"
import { SelectedPopulation } from "../interfaces/ImageInterfaces"
import { SegmentationData } from "../lib/SegmentationData"
import { ImageData } from "../lib/ImageData"
import { SelectOption, ChannelName, PlotStatistic } from "../interfaces/UIDefinitions"
import * as ConfigurationHelper from "../lib/ConfigurationHelper"

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
    @observable nullImageSet: ImageSet
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

    // The width and height of the main window.
    @observable windowWidth: number | null
    @observable windowHeight: number | null
    // Whether or not the scatter plot is in the main window
    @observable plotInMainWindow: boolean

    // Message to be shown if there is an error.
    // Setting this to a string will cause the string to be displayed in a dialog
    // The render thread will set this back to null once displayed.
    @observable errorMessage: string | null

    // Message to be shown if the user is being prompted to delete the active image set.
    @observable removeMessage: string | null

    @action initialize = () => {
        this.initializeImageSets()

        this.copyImageSetSettingsEnabled = true

        this.plotInMainWindow = true

        // First ones never get used, but here so that we don't have to use a bunch of null checks.
        // These will never be null once an image is loaded.
        // Maybe better way to accomplish this?
        this.activeImageStore = new ImageStore()
        this.activePopulationStore = new PopulationStore()
        this.activePlotStore = new PlotStore()
        this.nullImageSet = {imageStore: this.activeImageStore, plotStore: this.activePlotStore, populationStore: this.activePopulationStore}
    }

    setPlotData = autorun(() => {
        let imageStore = this.activeImageStore
        let populationStore = this.activePopulationStore
        let plotStore = this.activePlotStore

        if(imageStore && populationStore && plotStore){
            let loadHistogram = plotStore.selectedPlotChannels.length == 1 && plotStore.plotType == 'histogram'
            let loadScatter = plotStore.selectedPlotChannels.length == 2 && plotStore.plotType == 'scatter'
            let loadHeatmap = plotStore.plotType == 'heatmap'
            if(loadHistogram || loadScatter || loadHeatmap){
                if(imageStore.segmentationData != null && imageStore.segmentationStatistics != null){
                    plotStore.setPlotData(new PlotData(plotStore.selectedPlotChannels,
                        imageStore.segmentationData,
                        imageStore.segmentationStatistics,
                        plotStore.plotType,
                        plotStore.plotStatistic,
                        plotStore.plotTransform,
                        populationStore.selectedPopulations
                    ))
                }
            } else {
                plotStore.clearPlotData()
            }
        }
    })

    imageSetPathOptions = computed(() => {
        return this.imageSetPaths.map((s) => {
            return({value: s, label: path.basename(s)})
        })
    })

    @action setCopyImageSetSettings = (value: boolean) => {
        this.copyImageSetSettingsEnabled = value
        // if setting to true, copy the values from active image store to the project store.
        if(value){
            for (let s of ["rChannel", "gChannel", "bChannel"]) {
                let channelName = s as ChannelName
                this.channelDomainPercentage[channelName] = this.activeImageStore.getChannelDomainPercentage(channelName)
                this.channelMarker[channelName] = this.activeImageStore.channelMarker[channelName]
            }
            this.selectedPlotChannels = this.activePlotStore.selectedPlotChannels
        }
    }

    @action initializeImageSets = () => {
        this.imageSetPaths = []
        this.imageSets = {}

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

        this.activeImageSetPath = null

        this.lastActiveImageSetPath = null
    }

    @action openImageSet = (dirName:string) => {
        // Clear out old image sets
        this.initializeImageSets()
        this.setActiveImageSet(dirName)
    }

    @action openProject = (dirName:string) => {
        let files = fs.readdirSync(dirName)
        let paths = []
        for(let file of files){
            let filePath = path.join(dirName, file)
            if(fs.statSync(filePath).isDirectory()) paths.push(filePath)
        }
        if(paths.length > 0) {
            // Clear out old image sets
            this.initializeImageSets()
            this.imageSetPaths = paths
            this.setActiveImageSet(this.imageSetPaths[0])
        } else {
            this.errorMessage = "Warning: No image set directories found in " + path.basename(dirName) + "."
        }
    }

    @action deleteActiveImageSet = () => {
        if(this.activeImageSetPath != null){
            // Clear the active image set
            if(this.activeImageStore.imageData) this.activeImageStore.imageData.terminateWorkers()
            this.imageSetPaths = this.imageSetPaths.filter(p => p != this.activeImageSetPath)
            delete this.imageSets[this.activeImageSetPath]
            this.activeImageSetPath = null
            if(this.lastActiveImageSetPath != null){
                // If we have a last active image set, go back to this.
                this.setActiveImageSet(this.lastActiveImageSetPath)
            } else if (this.imageSetPaths.length != 0){
                // If not and we have any other image sets, set to the first.
                this.setActiveImageSet(this.imageSetPaths[0])
            }
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

        // Set defaults once image data has loaded
        when(() => !this.activeImageStore.imageDataLoading, () => this.setDefaultImageSetSettings(imageStore))

    }

    @action setDefaultImageSetSettings = (imageStore:ImageStore) => {
        let markers = this.channelMarker
        // Set defaults if copyImageSettings is disabled or if the project markers are uninitialized
        if(!this.copyImageSetSettingsEnabled || (markers['rChannel'] == null && markers['gChannel'] == null && markers['bChannel'] == null)) {
            this.setChannelMarkerDefaults(imageStore)
            this.setChannelDomainDefaults(imageStore)
        }
    }

    // If the image store has image data, sets the defaults based on the configuration helper.
    @action setChannelMarkerDefaults = (imageStore:ImageStore) => {
        if(imageStore.imageData != null) {
            let defaultValues = ConfigurationHelper.getDefaultChannelMarkers(imageStore.imageData.channelNames)
            for (let s in defaultValues) {
                let channelName = s as ChannelName
                let markerName = defaultValues[channelName]
                if(markerName != null) this.setChannelMarker(channelName, markerName)
            }
        }
    }

    @action setChannelDomainDefaults = (imageStore:ImageStore) => {
        let defaultValues = ConfigurationHelper.getDefaultChannelDomains()
        for(let s in defaultValues){
            let channelName = s as ChannelName
            let defaultDomain = defaultValues[channelName]
            this.channelDomainPercentage[channelName] = defaultDomain
            imageStore.setChannelDomainFromPercentage(channelName, defaultDomain)
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

        // Use when because image data loading takes a while
        // We can't copy image set settings or set warnings until image data has loaded.
        when(() => !this.activeImageStore.imageDataLoading, () => this.finalizeActiveImageSet(this.lastActiveImageSetPath))
    }

    // Make any changes or checks that require image data to be loaded.
    @action finalizeActiveImageSet = (sourceImageSetPath:string|null) => {
        this.copyImageSetSettings(sourceImageSetPath)
        this.setImageSetWarnings()
    }


    // Sets warnings on the active image set
    // Currently just raises an error if no images are found.
    @action setImageSetWarnings = () => {
        if(this.activeImageSetPath != null) {
            let imageStore = this.activeImageStore
            if(imageStore.imageData != null){
                if(imageStore.imageData.channelNames.length == 0){
                    let msg = "Warning: No tiffs found in " + path.basename(this.activeImageSetPath) + "."
                    msg += " Do you wish to remove it from the list of image sets?"
                    this.removeMessage = msg
                }
            }
        }
    }

    // Copy settings from old imageSet to new one once image data has loaded.
    // Copy when image data has loaded so that channel marker values and domain settings don't get overwritten.
    @action copyImageSetSettings = (sourceImageSetPath:string|null) => {
        if(sourceImageSetPath != null){
            let sourceImageStore = this.imageSets[sourceImageSetPath].imageStore
            let sourcePlotStore = this.imageSets[sourceImageSetPath].plotStore
            let destinationImageStore = this.activeImageStore
            let destinationPlotStore = this.activePlotStore
            // We want to set the image store segmentation file if segmentation file basename is not null.
            this.setImageStoreSegmentationFile(destinationImageStore)
            // If the user wants to persist image set settings
            if(this.copyImageSetSettingsEnabled) {
                this.copyImageStoreChannelMarkers(destinationImageStore)
                this.setImageStoreChannelDomains(destinationImageStore)
                this.copySegmentationSettings(sourceImageStore, destinationImageStore)
                this.copyPlotStoreSettings(sourcePlotStore, destinationImageStore, destinationPlotStore)
            }
        }
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

    // Copies channel markers from the project store to the image store being passed in
    // If a channel marker isn't present in the image store that channel is unset.
    @action copyImageStoreChannelMarkers = (imageStore:ImageStore) => {
        if(imageStore.imageData != null){
            for(let s in this.channelMarker) {
                let channelName = s as ChannelName
                let channelValue = this.channelMarker[channelName]
                if(channelValue != null){
                    if(imageStore.imageData.channelNames.indexOf(channelValue) != -1){
                        // If the file selected is not null and the destination has a file with the same name set that
                        imageStore.setChannelMarker(channelName, channelValue)
                    } else {
                        // Otherwise unset that channel for the destination
                        imageStore.unsetChannelMarker(channelName)
                    }
                } else {
                    // Unset the channel for the destination if it's unset in the source
                    imageStore.unsetChannelMarker(channelName)
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

    @action copyPlotStoreSettings = (sourcePlotStore:PlotStore, destinationImageStore:ImageStore, destinationPlotStore:PlotStore) => {
        destinationPlotStore.setPlotType(sourcePlotStore.plotType)
        destinationPlotStore.setPlotStatistic(sourcePlotStore.plotStatistic)
        destinationPlotStore.setPlotTransform(sourcePlotStore.plotTransform)
        // Check if the source selected plot channels are in the destination image set. If they are, use them.
        this.setPlotStoreChannels(destinationImageStore, destinationPlotStore)
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

    @action copySegmentationSettings = (sourceImageStore:ImageStore, destinationImageStore:ImageStore) => {
        destinationImageStore.setSegmentationFillAlpha(sourceImageStore.segmentationFillAlpha)
        destinationImageStore.setSegmentationOutlineAlpha(sourceImageStore.segmentationOutlineAlpha)
        destinationImageStore.setCentroidVisibility(sourceImageStore.segmentationCentroidsVisible)
    }

    @action setActiveImageSetCallback = () => {
        return action((x: SelectOption) => {
            if(x != null) {
                this.setActiveImageSet(x.value)
            }
        })
    }

    @action clearActiveSegmentationData = () => {
        let imageStore = this.activeImageStore
        let plotStore = this.activePlotStore
        if(imageStore && plotStore){
            imageStore.clearSegmentationData()
            this.clearSelectedPlotChannels()
        }
    }

    @action setChannelMarker = (channelName: ChannelName, markerName: string) => {
        this.channelMarker[channelName] = markerName
        this.activeImageStore.setChannelMarker(channelName, markerName)
        // Set the channel domain to the default for that channel when we change it.
        let domainPercentage = ConfigurationHelper.getDefaultChannelDomains()[channelName]
        this.channelDomainPercentage[channelName] = domainPercentage
        this.activeImageStore.setChannelDomainFromPercentage(channelName, domainPercentage)

    }

    @action unsetChannelMarker = (channelName: ChannelName) => {
        this.channelMarker[channelName] = null
        this.activeImageStore.unsetChannelMarker(channelName)
        // When we modify channel markers the channel domain changes. We want to update our domain here to reflect that.
        this.channelDomainPercentage[channelName] = this.activeImageStore.getChannelDomainPercentage(channelName)
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
                        bytesPerElement: imageStore.segmentationData.data.BYTES_PER_ELEMENT,
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
                let importedDataBytes = importingSegmentation.bytesPerElement
                let importedDataTypeMapping:Record<number, any> = {4: Float32Array, 2: Uint16Array, 1: Uint8Array}
                if(importedDataBytes in importedDataTypeMapping){
                    let arrayType = importedDataTypeMapping[importedDataBytes]
                    let importedDataArray = arrayType.from(importingSegmentation.data)
                    let importedSegmentation = new SegmentationData()
                    importedSegmentation.loadTiffData(importedDataArray,
                        importingSegmentation.width,
                        importingSegmentation.height,
                        imageStore.setSegmentationData
                    )
                }
            }
            // Import saved populations
            let importingPopulations = importingContent.populations
            if(importingPopulations){
                // When segmentation data has been loaded or if we're not loading segmentation data
                when(() => !importingSegmentation || imageStore.segmentationData != null,
                     () => populationStore.setSelectedPopulations(importingPopulations)
                    )
            }
        }
    }

    exportChannelIntensisties = (filename:string, statistic: PlotStatistic) => {
        let imageStore = this.activeImageStore
        let imageData = imageStore.imageData
        let segmentationData = imageStore.segmentationData
        let segmentationStatistics = imageStore.segmentationStatistics
        if(imageData != null && segmentationData != null && segmentationStatistics != null){
            let channels = imageData.channelNames
            let data = [] as string[][]

            // Generate the header
            let columns = ['Segment ID']
            for(let channel of channels){
                columns.push(channel)
            }

            // Iterate through the segments and calculate the intensity for each channel
            let indexMap = segmentationData.segmentIndexMap
            for(let s in indexMap){
                let segmentId = parseInt(s)
                let segmentData = [s] as string[]
                for(let channel of channels){
                    if(statistic == 'mean'){
                        segmentData.push(segmentationStatistics.meanIntensity(channel, [segmentId]).toString())
                    } else{
                        segmentData.push(segmentationStatistics.medianIntensity(channel, [segmentId]).toString())
                    }
                }
                data.push(segmentData)
            }

            // Write to a CSV
            stringify(data, { header: true, columns: columns }, (err, output) => {
                if (err) console.log('Error saving intensities ' + err)
                fs.writeFile(filename, output, (err) => {
                  if (err) console.log('Error saving intensities ' + err)
                  console.log(statistic + ' intensities saved to ' + filename)
                })
            })
        }
    }

    @action clearErrorMessage = () => {
        this.errorMessage = null
    }

    @action clearRemoveMessage = () => {
        this.removeMessage = null
    }

    @action setWindowDimensions = (width: number, height: number) => {
        this.windowWidth = width
        this.windowHeight = height
    }

    @action setPlotInMainWindow = (inWindow: boolean) => {
        this.plotInMainWindow = inWindow
    }

}