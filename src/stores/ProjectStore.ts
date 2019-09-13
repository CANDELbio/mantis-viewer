import { observable, action, autorun, when } from 'mobx'
import * as fs from 'fs'
import * as path from 'path'

import { ImageStore } from '../stores/ImageStore'
import { PopulationStore } from '../stores/PopulationStore'
import { PlotStore } from '../stores/PlotStore'
import { SettingStore } from '../stores/SettingStore'
import { ExportStore } from '../stores/ExportStore'
import { generatePlotData } from '../lib/plot/Index'
import { ChannelName, PlotStatistic, PlotTransform, PlotType, PlotNormalization } from '../definitions/UIDefinitions'
import { ConfigurationHelper } from '../lib/ConfigurationHelper'
import { GraphSelectionPrefix } from '../definitions/UIDefinitions'

interface ImageSet {
    imageStore: ImageStore
    populationStore: PopulationStore
    plotStore: PlotStore
}

export class ProjectStore {
    public appVersion: string

    @observable public projectPath: string | null
    @observable public imageSetPaths: string[]
    @observable public imageSets: Record<string, ImageSet>
    @observable public nullImageSet: ImageSet
    @observable public lastActiveImageSetPath: string | null
    @observable public activeImageSetPath: string | null

    @observable.ref public activeImageStore: ImageStore
    @observable.ref public activePopulationStore: PopulationStore
    @observable.ref public activePlotStore: PlotStore
    @observable.ref public settingStore: SettingStore
    @observable.ref public exportStore: ExportStore
    @observable.ref public configurationHelper: ConfigurationHelper

    // The width and height of the main window.
    @observable public windowWidth: number | null
    @observable public windowHeight: number | null
    // Whether or not the scatter plot is in the main window
    @observable public plotInMainWindow: boolean

    // Message to be shown if there is an error.
    // Setting this to a string will cause the string to be displayed in a dialog
    // The render thread will set this back to null once displayed.
    @observable public errorMessage: string | null

    // Message to be shown if the user is being prompted to delete the active image set.
    @observable public removeMessage: string | null

    // Gets set to true when the user requests to clear segmentation so that we can ask to confirm.
    @observable public clearSegmentationRequested: boolean

    // An array to keep track of the imageSets that have been recently used/
    // Used to clear old image sets to clean up memory.
    @observable public imageSetHistory: string[]

    public constructor(appVersion: string) {
        this.appVersion = appVersion
        this.initialize()
    }

    @action public initialize = () => {
        this.plotInMainWindow = true

        this.configurationHelper = new ConfigurationHelper()

        // First ones never get used, but here so that we don't have to use a bunch of null checks.
        // These will never be null once an image is loaded.
        // Maybe better way to accomplish this?
        this.activeImageStore = new ImageStore()
        this.activePopulationStore = new PopulationStore()
        this.activePlotStore = new PlotStore()
        this.nullImageSet = {
            imageStore: this.activeImageStore,
            plotStore: this.activePlotStore,
            populationStore: this.activePopulationStore,
        }

        this.clearSegmentationRequested = false
        this.settingStore = new SettingStore(this.activeImageStore, this.activePlotStore)
        this.exportStore = new ExportStore(this)
        this.imageSetHistory = []
        this.initializeImageSets()
    }

    @action public initializeImageSets = () => {
        this.imageSetPaths = []
        this.imageSets = {}

        this.projectPath = null
        this.activeImageSetPath = null
        this.lastActiveImageSetPath = null

        this.settingStore.initialize(this.nullImageSet.imageStore, this.nullImageSet.plotStore)
    }

    // Regenerates plot data when image store, population store, or plot store data has changed
    private setPlotData = autorun(() => {
        let imageStore = this.activeImageStore
        let populationStore = this.activePopulationStore
        let plotStore = this.activePlotStore
        let settingStore = this.settingStore

        if (imageStore && populationStore && plotStore) {
            let loadHistogram = plotStore.selectedPlotMarkers.length == 1 && plotStore.plotType == 'histogram'
            let loadScatter = plotStore.selectedPlotMarkers.length == 2 && plotStore.plotType == 'scatter'
            let loadContour = plotStore.selectedPlotMarkers.length == 2 && plotStore.plotType == 'contour'
            let loadHeatmap = plotStore.plotType == 'heatmap'
            if (loadHistogram || loadScatter || loadHeatmap || loadContour) {
                if (imageStore.segmentationData != null && imageStore.segmentationStatistics != null) {
                    let plotData = generatePlotData(
                        plotStore.selectedPlotMarkers,
                        imageStore.segmentationData,
                        imageStore.segmentationStatistics,
                        plotStore.plotType,
                        plotStore.plotStatistic,
                        plotStore.plotTransform,
                        settingStore.transformCoefficient,
                        plotStore.plotNormalization,
                        populationStore.selectedPopulations,
                        settingStore.plotDotSize,
                    )
                    if (plotData != null) plotStore.setPlotData(plotData)
                }
            } else {
                plotStore.clearPlotData()
            }
        }
    })

    @action public openImageSet = (dirName: string) => {
        // Clear out old image sets
        this.initializeImageSets()
        this.settingStore.setBasePath(dirName)
        this.setActiveImageSet(dirName)
    }

    @action public openProject = (dirName: string) => {
        let files = fs.readdirSync(dirName)
        let paths = []
        for (let file of files) {
            let filePath = path.join(dirName, file)
            if (fs.statSync(filePath).isDirectory()) paths.push(filePath)
        }
        if (paths.length > 0) {
            // Clear out old image sets
            this.initializeImageSets()
            this.projectPath = dirName
            this.imageSetPaths = paths
            this.settingStore.setBasePath(dirName)
            this.setActiveImageSet(this.imageSetPaths[0])
        } else {
            this.errorMessage = 'Warning: No image set directories found in ' + path.basename(dirName) + '.'
        }
    }

    @action public deleteActiveImageSet = () => {
        if (this.activeImageSetPath != null) {
            // Clear the active image set
            this.imageSetPaths = this.imageSetPaths.filter(p => p != this.activeImageSetPath)
            delete this.imageSets[this.activeImageSetPath]
            this.activeImageSetPath = null
            if (this.lastActiveImageSetPath != null) {
                // If we have a last active image set, go back to this.
                this.setActiveImageSet(this.lastActiveImageSetPath)
            } else if (this.imageSetPaths.length != 0) {
                // If not and we have any other image sets, set to the first.
                this.setActiveImageSet(this.imageSetPaths[0])
            }
        }
    }

    @action private initializeStores = (dirName: string) => {
        // Save in imageSets
        this.imageSets[dirName] = {
            imageStore: new ImageStore(),
            populationStore: new PopulationStore(),
            plotStore: new PlotStore(),
        }
    }

    @action public loadImageStoreData = (dirName: string) => {
        // If we haven't loaded this directory, initialize the stores and load it.
        if (!(dirName in this.imageSets)) {
            this.initializeStores(dirName)
        }

        let imageStore = this.imageSets[dirName].imageStore
        if (imageStore.imageData == null) {
            // Select the directory for image data
            imageStore.selectDirectory(dirName)

            // Set defaults once image data has loaded
            when(
                () => !imageStore.imageDataLoading,
                () => this.settingStore.setDefaultImageSetSettings(imageStore, this.configurationHelper),
            )
        }
    }

    @action private setActiveStores = (dirName: string) => {
        this.lastActiveImageSetPath = this.activeImageSetPath
        this.activeImageSetPath = dirName
        this.activeImageStore = this.imageSets[dirName].imageStore
        this.activePopulationStore = this.imageSets[dirName].populationStore
        this.activePlotStore = this.imageSets[dirName].plotStore
    }

    // Adds dirName to the image set history.
    // Cleans up the oldest image set ImageStore if there are too many in memory.
    @action private cleanImageSetHistory = (dirName: string) => {
        // If dirName is already in the history, remove it and readd it to the front
        let historyIndex = this.imageSetHistory.indexOf(dirName)
        if (historyIndex > -1) this.imageSetHistory.splice(historyIndex, 1)
        this.imageSetHistory.push(dirName)
        if (this.imageSetHistory.length > this.configurationHelper.maxImageSetsInMemory) {
            let setToClean = this.imageSetHistory.shift()
            let imageSet = null
            if (setToClean) imageSet = this.imageSets[setToClean]
            if (imageSet) {
                imageSet.imageStore.clearImageData()
                imageSet.imageStore.clearSegmentationData()
            }
        }
    }

    @action public setActiveImageSet = (dirName: string) => {
        this.loadImageStoreData(dirName)
        this.cleanImageSetHistory(dirName)

        // If the dirName isn't in the image set paths (i.e. adding a single folder), then add it.
        if (this.imageSetPaths.indexOf(dirName) == -1) this.imageSetPaths.push(dirName)

        // Set this directory as the active one and set the stores as the active ones.
        this.setActiveStores(dirName)

        // Start loading segmentation data if we know about it for this imageStore
        let imageStore = this.imageSets[dirName].imageStore
        this.settingStore.setImageStoreSegmentationFile(imageStore)

        // Use when because image data loading takes a while
        // We can't copy image set settings or set warnings until image data has loaded.
        when(() => !this.activeImageStore.imageDataLoading, () => this.finalizeActiveImageSet())
    }

    // Make any changes or checks that require image data to be loaded.
    @action public finalizeActiveImageSet = () => {
        this.copyImageSetSettings()
        this.setImageSetWarnings()
    }

    // Sets warnings on the active image set
    // Currently just raises an error if no images are found.
    @action public setImageSetWarnings = () => {
        if (this.activeImageSetPath != null) {
            let imageStore = this.activeImageStore
            if (imageStore.imageData != null) {
                if (imageStore.imageData.markerNames.length == 0) {
                    let msg = 'Warning: No tiffs found in ' + path.basename(this.activeImageSetPath) + '.'
                    msg += ' Do you wish to remove it from the list of image sets?'
                    this.removeMessage = msg
                }
            }
        }
    }

    // TODO: Would it be better to just not store these settings on the ImageStore and PlotStore at all?
    // Copy settings from old imageSet to new one once image data has loaded.
    // Copy when image data has loaded so that channel marker values and domain settings don't get overwritten.
    @action public copyImageSetSettings = () => {
        let destinationImageStore = this.activeImageStore
        let destinationPlotStore = this.activePlotStore

        this.settingStore.copyImageStoreChannelMarkers(destinationImageStore)
        this.settingStore.setImageStoreChannelDomains(destinationImageStore)
        this.settingStore.copyImageStoreChannelVisibility(destinationImageStore)
        this.settingStore.copySegmentationSettings(destinationImageStore)
        this.settingStore.copyPlotStoreSettings(destinationImageStore, destinationPlotStore)
    }

    // Jumps to the previous image set in the list of image sets
    @action public setPreviousImageSet = () => {
        let activeImageSetPath = this.activeImageSetPath
        let imageSetPaths = this.imageSetPaths
        if (activeImageSetPath && imageSetPaths.length > 1) {
            let activeImageSetIndex = imageSetPaths.indexOf(activeImageSetPath)
            let previousImageSetIndex = activeImageSetIndex == 0 ? imageSetPaths.length - 1 : activeImageSetIndex - 1
            this.setActiveImageSet(imageSetPaths[previousImageSetIndex])
        }
    }

    // Jumps to the next image set in the list of image sets.
    @action public setNextImageSet = () => {
        let activeImageSetPath = this.activeImageSetPath
        let imageSetPaths = this.imageSetPaths
        if (activeImageSetPath && imageSetPaths.length > 1) {
            let activeImageSetIndex = imageSetPaths.indexOf(activeImageSetPath)
            let previousImageSetIndex = activeImageSetIndex == imageSetPaths.length - 1 ? 0 : activeImageSetIndex + 1
            this.setActiveImageSet(imageSetPaths[previousImageSetIndex])
        }
    }

    @action public setClearSegmentationRequested = (value: boolean) => {
        this.clearSegmentationRequested = value
    }

    // Gets called when the user clicks the 'Clear Segmentation' button and approves.
    @action public clearSegmentation = () => {
        this.settingStore.setSegmentationBasename(null)
        this.clearSelectedPlotMarkers()
        for (let imageSet of this.imageSetPaths) {
            let curSet = this.imageSets[imageSet]
            if (curSet) {
                curSet.imageStore.clearSegmentationData()
                curSet.populationStore.deletePopulationsNotSelectedOnImage()
            }
        }
    }

    @action public setChannelVisibilityCallback = (name: ChannelName) => {
        return action((value: boolean) => {
            this.activeImageStore.setChannelVisibility(name, value)
            this.settingStore.setChannelVisibility(name, value)
        })
    }

    @action public setChannelMarkerCallback = (name: ChannelName) => {
        return action((x: string | null) => {
            // If the SelectOption has a value.
            if (x) {
                this.settingStore.setChannelMarker(this.activeImageStore, this.configurationHelper, name, x)
                // If SelectOption doesn't have a value the channel has been cleared and values should be reset.
            } else {
                this.settingStore.unsetChannelMarker(this.activeImageStore, name)
            }
        })
    }

    @action public setChannelDomainCallback = (name: ChannelName) => {
        return action((value: [number, number]) => {
            this.activeImageStore.setChannelDomain(name, value)
            this.settingStore.setChannelDomainPercentage(name, this.activeImageStore.getChannelDomainPercentage(name))
        })
    }

    @action public setSegmentationBasename = (fName: string) => {
        let basename = path.basename(fName)
        this.settingStore.setSegmentationBasename(basename)
        this.activeImageStore.setSegmentationFile(fName)
    }

    @action public setSelectedPlotMarkers = (x: string[]) => {
        this.settingStore.setSelectedPlotMarkers(x)
        this.activePlotStore.setSelectedPlotMarkers(x)
    }

    @action public clearSelectedPlotMarkers = () => {
        this.settingStore.clearSelectedPlotMarkers()
        this.activePlotStore.clearSelectedPlotMarkers()
    }

    @action public addPopulationFromRange = (min: number, max: number) => {
        let plotStore = this.activePlotStore
        let populationStore = this.activePopulationStore
        let segmentationStatistics = this.activeImageStore.segmentationStatistics
        if (segmentationStatistics != null) {
            let marker = plotStore.selectedPlotMarkers[0]
            let selectedStatistic = plotStore.plotStatistic
            let segmentIds = segmentationStatistics.segmentsInIntensityRange(
                marker,
                min,
                max,
                selectedStatistic == 'mean',
            )
            if (segmentIds.length > 0) populationStore.addSelectedPopulation(null, segmentIds, GraphSelectionPrefix)
        }
    }

    @action public clearErrorMessage = () => {
        this.errorMessage = null
    }

    @action public clearRemoveMessage = () => {
        this.removeMessage = null
    }

    @action public setWindowDimensions = (width: number, height: number) => {
        this.windowWidth = width
        this.windowHeight = height
    }

    @action public setPlotInMainWindow = (inWindow: boolean) => {
        this.plotInMainWindow = inWindow
    }

    // Could possible achieve the following effects by using mobx observe functions
    // and destroying/recreating them when the active image set changes.
    // Might be cleaner, but This seemed easier for now though.

    @action public setPlotStatistic = (statistic: PlotStatistic) => {
        this.settingStore.setPlotStatistic(statistic)
        this.activePlotStore.setPlotStatistic(statistic)
    }

    @action public setPlotTransform = (transform: PlotTransform) => {
        this.settingStore.setPlotTransform(transform)
        this.activePlotStore.setPlotTransform(transform)
    }

    @action public setPlotType = (type: PlotType) => {
        this.settingStore.setPlotType(type)
        this.activePlotStore.setPlotType(type)
    }

    @action public setPlotNormalization = (normalization: PlotNormalization) => {
        this.settingStore.setPlotNormalization(normalization)
        this.activePlotStore.setPlotNormalization(normalization)
    }

    @action public setSegmentationFillAlpha = (alpha: number) => {
        this.settingStore.setSegmentationFillAlpha(alpha)
        this.activeImageStore.setSegmentationFillAlpha(alpha)
    }

    @action public setSegmentationOutlineAlpha = (alpha: number) => {
        this.settingStore.setSegmentationOutlineAlpha(alpha)
        this.activeImageStore.setSegmentationOutlineAlpha(alpha)
    }

    @action public setSegmentationCentroidsVisible = (visible: boolean) => {
        this.settingStore.setSegmentationCentroidsVisible(visible)
        this.activeImageStore.setCentroidVisibility(visible)
    }
}
