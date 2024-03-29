import { observable, action, when, computed } from 'mobx'
import * as fs from 'fs'
import * as path from 'path'

import { ImageSetStore } from './ImageSetStore'
import { NotificationStore } from './NotificationStore'
import { PersistedValueStore } from './PersistedValueStore'
import { PreferencesStore } from './PreferencesStore'
import { ProjectImportStore } from './ProjectImportStore'
import { SegmentFeatureStore } from './SegmentFeatureStore'
import { PlotStatistic, PlotStatistics } from '../definitions/UIDefinitions'
import { Coordinate } from '../interfaces/ImageInterfaces'
import {
    saveImageExportLog,
    exportMarkerIntensities,
    exportToFCS,
    exportPopulationsToFCS,
    parseActivePopulationCSV,
    parseProjectPopulationCSV,
    parseGateCSV,
    writeToCSV,
} from '../lib/IO'

import { reverseTransform } from '../lib/plot/Helper'

export class ProjectStore {
    public appVersion: string

    @observable public projectPath: string | null
    @observable public imageSetPaths: string[]
    @observable public imageSets: Record<string, ImageSetStore>
    @observable public nullImageSet: ImageSetStore
    @observable public lastActiveImageSetPath: string | null
    @observable public activeImageSetPath: string | null

    @observable.ref public activeImageSetStore: ImageSetStore

    public segmentFeatureStore: SegmentFeatureStore
    public persistedValueStore: PersistedValueStore
    public preferencesStore: PreferencesStore
    public notificationStore: NotificationStore
    public projectImportStore: ProjectImportStore

    // The width and height of the main window.
    @observable public windowWidth: number | null
    @observable public windowHeight: number | null
    // Whether or not the scatter plot is in the main window
    @observable public plotInMainWindow: boolean

    // An array to keep track of the imageSets that have been recently used/
    // Used to clear old image sets to clean up memory.
    @observable public imageSetHistory: string[]

    // The path that we're importing segment features from
    @observable public importingSegmentFeaturesPath: string | null
    // If we're importing segment features for a project or active image set
    @observable public importingSegmentFeaturesForProject: boolean | null

    // The pixel being moused over by the user on the image.
    // Used to show segment stats and pixel stats.
    @observable public mousedOverPixel: Coordinate | null

    // Used when a user right clicks a segment and requests to edit the populations.
    // When set to a number opens a modal where the populations can be edited.
    // When set to null closes the editing modal.
    @observable public editingPopulationsSegmentId: number | null
    // Used to lock the context menu to a specific segment ID to prevent it from changing when the user moves the mouse.
    @observable private lockedContextMenuSegmentIds: number[] | null

    @observable public editingLegendFeatures: boolean

    // Used when a user requests to cancel a long running process
    // (e.g. importing, generating, and exporting segment features for multiple images)
    @observable public cancelTask: boolean

    // Used to keep track of which image sets we're calculating features for in case we have to break in the middle.
    private imageSetFeaturesToCalculate: string[]

    // Used to specify which features the user has requested to calculate
    @observable public selectedStatistics: PlotStatistic[]

    @computed public get imageSetNames(): string[] {
        return this.imageSetPaths.map((imageSetPath: string) => path.basename(imageSetPath))
    }

    // Gets the Segment IDs for the segment context menu.
    // We want to return the highlighted segments that get locked when the menu is opened
    // to prevent the segment ids in the menu from changing as the mouse is moved.
    // On first render we need to return the active highlighted segments instead as the
    // locked segment ids will be null until after the menu has been rendered.
    @computed public get contextMenuSegmentIds(): number[] {
        const lockedSegmentIds = this.lockedContextMenuSegmentIds
        if (lockedSegmentIds) return lockedSegmentIds
        return this.activeImageSetStore.segmentationStore.mousedOverSegments
    }

    public constructor() {
        this.initialize()
    }

    @action public initialize = (): void => {
        // Initialize the preferences store (for storing user preferences)
        this.preferencesStore = new PreferencesStore(this)
        // Initialize the setting store (for storing image display settings to transfer when switching)
        this.persistedValueStore = new PersistedValueStore(this)
        this.notificationStore = new NotificationStore()
        this.projectImportStore = new ProjectImportStore(this)

        this.plotInMainWindow = true

        // First ones never get used, but here so that we don't have to use a bunch of null checks.
        // These will never be null once an image is loaded.
        // Maybe better way to accomplish this?
        this.nullImageSet = new ImageSetStore(this, '')
        this.activeImageSetStore = this.nullImageSet

        // Initialize the segment feature store (for storing segment/cell features and interacting with the DB)
        this.segmentFeatureStore = new SegmentFeatureStore(this)

        // Keep track of importing segment features
        this.importingSegmentFeaturesPath = null
        this.importingSegmentFeaturesForProject = null

        this.selectedStatistics = []

        this.cancelTask = false

        this.editingLegendFeatures = false

        this.imageSetHistory = []
        this.imageSetFeaturesToCalculate = []
        this.initializeImageSets()
    }

    @action public initializeImageSets = (): void => {
        this.imageSetPaths = []
        this.imageSets = {}

        this.projectPath = null
        this.activeImageSetPath = null
        this.lastActiveImageSetPath = null

        this.persistedValueStore.initialize()
    }

    public setAppVersion = (appVersion: string): void => {
        this.appVersion = appVersion
    }

    // Set the imageSetPaths and initialize all the stores with empty stores.
    @action public initializeImageSetStores = (imageSetPaths: string[]): void => {
        this.imageSetPaths = imageSetPaths
        for (const dirName of imageSetPaths) {
            this.imageSets[dirName] = new ImageSetStore(this, dirName)
        }
    }

    @action public openImageSet = (dirName: string): void => {
        // Clear out old image sets
        this.initializeImageSets()
        this.persistedValueStore.setBasePath(dirName)
        this.initializeImageSetStores([dirName])
        this.setActiveImageSet(dirName)
    }

    @action public openProject = (
        dirName: string,
        imageSubdirectory?: string | null,
        initialActiveImageSet?: string | null,
    ): void => {
        const files = fs.readdirSync(dirName)
        const paths = []
        for (const file of files) {
            const filePath = path.join(dirName, file)
            if (fs.statSync(filePath).isDirectory()) paths.push(filePath)
        }
        if (paths.length > 0) {
            // Clear out old image sets
            this.initializeImageSets()
            this.persistedValueStore.setBasePath(dirName)
            if (imageSubdirectory) this.persistedValueStore.setImageSubdirectory(imageSubdirectory)

            this.projectPath = dirName
            this.initializeImageSetStores(paths)
            const savedActiveImageSet = this.persistedValueStore.activeImageSet
            if (savedActiveImageSet && this.imageSetPaths.includes(savedActiveImageSet)) {
                this.setActiveImageSet(savedActiveImageSet)
            } else if (initialActiveImageSet) {
                this.setActiveImageSet(initialActiveImageSet)
            } else {
                this.setActiveImageSet(this.imageSetPaths[0])
            }
        } else {
            this.notificationStore.setErrorMessage('No image directories found in ' + path.basename(dirName) + '.')
        }
    }

    @action public deleteActiveImageSet = (): void => {
        if (this.activeImageSetPath != null) {
            // Clear the active image set
            this.imageSetPaths = this.imageSetPaths.filter((p: string): boolean => p != this.activeImageSetPath)
            this.clearImageSetData(this.activeImageSetPath)
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

    @action private setActiveStores = (dirName: string): void => {
        this.lastActiveImageSetPath = this.activeImageSetPath
        this.activeImageSetPath = dirName
        this.activeImageSetStore = this.imageSets[dirName]
    }

    // Clears out the image set data if it shouldn't be in memory (i.e. it is not in the image set history)
    private clearImageSetData = (imageSetDir: string): void => {
        const imageSetStore = this.imageSets[imageSetDir]
        if (imageSetStore) {
            const imageStore = imageSetStore.imageStore
            const segmentationStore = imageSetStore.segmentationStore
            const selectedDirectory = imageSetStore.directory
            if (selectedDirectory && !this.imageSetHistory.includes(selectedDirectory)) {
                imageStore.clearImageData()
                segmentationStore.clearSegmentationData()
            }
        }
    }

    // Adds dirName to the image set history.
    // Cleans up the oldest image set ImageStore if there are too many in memory.
    @action private cleanImageSetHistory = (dirName: string, forceClean = false): void => {
        // If dirName is already in the history, remove it and readd it to the front
        const historyIndex = this.imageSetHistory.indexOf(dirName)
        if (historyIndex > -1) this.imageSetHistory.splice(historyIndex, 1)
        this.imageSetHistory.push(dirName)
        if (forceClean || this.imageSetHistory.length > this.preferencesStore.maxImageSetsInMemory) {
            const setToClean = this.imageSetHistory.shift()
            if (setToClean) this.clearImageSetData(setToClean)
        }
    }

    // Used when WebGL context is lost.
    @action public onWebGLContextLoss = (): void => {
        this.notificationStore.requestReloadMainWindow()
        // Clears all image sets out of memory and reloads the active image set.
        // this.notificationStore.setErrorMessage('Mantis encountered an error and needs to reload your image sets.')
        // this.imageSetHistory.forEach((dirName: string): void => this.cleanImageSetHistory(dirName, true))
        // if (this.activeImageSetPath) this.setActiveImageSet(this.activeImageSetPath)
    }

    @action public setActiveImageSet = (dirName: string): void => {
        this.imageSets[dirName].loadImageStoreData()
        this.cleanImageSetHistory(dirName)

        // If the dirName isn't in the image set paths (i.e. adding a single folder), then add it.
        if (this.imageSetPaths.indexOf(dirName) == -1) this.imageSetPaths.push(dirName)

        // Set this directory as the active one and set the stores as the active ones.
        this.setActiveStores(dirName)

        this.persistedValueStore.setActiveImageSet(dirName)

        // Use when because image data loading takes a while
        // We can't copy image set settings or set warnings until image data has loaded.
        when(
            (): boolean => !this.activeImageSetStore.imageStore.imageDataLoading,
            (): void => this.setImageSetWarnings(),
        )
    }

    // Sets warnings on the active image set
    // Currently just raises an error if no images are found.
    public setImageSetWarnings = (): void => {
        if (this.activeImageSetPath != null) {
            const imageStore = this.activeImageSetStore.imageStore
            if (imageStore.imageData != null) {
                if (imageStore.imageData.markerNames.length == 0) {
                    let msg = 'Warning: No tiffs found in ' + path.basename(this.activeImageSetPath) + '.'
                    msg += ' Do you wish to remove it from the list of images?'
                    this.notificationStore.setRemoveMessage(msg)
                }
            }
        }
    }

    // Jumps to the previous image set in the list of image sets
    @action public setPreviousImageSet = (): void => {
        const activeImageSetPath = this.activeImageSetPath
        const imageSetPaths = this.imageSetPaths
        if (activeImageSetPath && imageSetPaths.length > 1) {
            const activeImageSetIndex = imageSetPaths.indexOf(activeImageSetPath)
            const previousImageSetIndex = activeImageSetIndex == 0 ? imageSetPaths.length - 1 : activeImageSetIndex - 1
            this.setActiveImageSet(imageSetPaths[previousImageSetIndex])
        }
    }

    // Jumps to the next image set in the list of image sets.
    @action public setNextImageSet = (): void => {
        const activeImageSetPath = this.activeImageSetPath
        const imageSetPaths = this.imageSetPaths
        if (activeImageSetPath && imageSetPaths.length > 1) {
            const activeImageSetIndex = imageSetPaths.indexOf(activeImageSetPath)
            const previousImageSetIndex = activeImageSetIndex == imageSetPaths.length - 1 ? 0 : activeImageSetIndex + 1
            this.setActiveImageSet(imageSetPaths[previousImageSetIndex])
        }
    }

    // Clears segmentation when it's been set for the project via the setting store.
    // Gets called when the user sets a new segmentation file from the menu and segmentation
    // has already been set or when the user clicks the 'Clear Segmentation' button and approves.
    @action public clearSegmentation = (): void => {
        this.persistedValueStore.setSegmentationBasename(null)
        this.persistedValueStore.clearSelectedPlotFeatures()
        for (const imageSet of this.imageSetPaths) {
            const curSet = this.imageSets[imageSet]
            if (curSet) {
                curSet.segmentationStore.clearSegmentationData()
                curSet.populationStore.clearSegmentationDependentData()
            }
        }
        this.segmentFeatureStore.deleteAllSegmentFeatures()
    }

    public clearActivePopulations = (): void => {
        this.activeImageSetStore.populationStore.clearAllPopulations()
    }

    public clearAllPopulations = (): void => {
        for (const imageSetPath of this.imageSetPaths) {
            const imageSetStore = this.imageSets[imageSetPath]
            if (imageSetStore) imageSetStore.populationStore.clearAllPopulations()
        }
    }

    private activeImageSetTiffPath = (): string | null => {
        const activeImagePath = this.activeImageSetPath
        const imageSubdirectory = this.persistedValueStore.imageSubdirectory
        if (activeImagePath && imageSubdirectory && imageSubdirectory.length > 0) {
            return path.join(activeImagePath, imageSubdirectory)
        }
        return activeImagePath
    }

    @action public setSegmentationBasename = (filePath: string, checkCalculateFeatures: boolean): void => {
        const persistedValueStore = this.persistedValueStore
        const dirname = path.dirname(filePath)
        const basename = path.basename(filePath)
        // Clear segmentation if it's already been set
        // Set the new segmentation file
        if (dirname == this.activeImageSetTiffPath()) {
            if (persistedValueStore.segmentationBasename != null) this.clearSegmentation()
            this.persistedValueStore.setSegmentationBasename(basename)
        } else {
            // TODO: Not sure this is best behavior. If the segmentation file is not in the image set directory then we just set the segmentation file on the image store.
            // Could result in weird behavior when switching between image sets.
            const activeSegmentationStore = this.activeImageSetStore.segmentationStore
            if (activeSegmentationStore.selectedSegmentationFile != null) {
                activeSegmentationStore.clearSegmentationData()
                this.activeImageSetStore.populationStore.clearSegmentationDependentData()
                this.segmentFeatureStore.deleteActiveSegmentFeatures()
            }
            this.activeImageSetStore.segmentationStore.setSegmentationFile(filePath)
        }
        // If Mantis isn't auto calculating features, ask the user
        const autoCalculateSegmentFeatures = this.persistedValueStore.autoCalculateSegmentFeatures
        if (checkCalculateFeatures && !autoCalculateSegmentFeatures)
            this.notificationStore.setCheckCalculateSegmentFeatures(true)
    }

    @action public importRegionTiff = (filePath: string): void => {
        const dirname = path.dirname(filePath)
        const basename = path.basename(filePath)
        if (dirname == this.activeImageSetTiffPath()) {
            this.persistedValueStore.setRegionsBasename(basename)
        } else {
            this.activeImageSetStore.populationStore.importRegionsFromTiff(filePath)
        }
    }

    public addPopulationFromPlotRange = (min: number, max: number): void => {
        const persistedValueStore = this.persistedValueStore
        const plotTransform = persistedValueStore.plotTransform
        const transformCoefficient = persistedValueStore.plotTransformCoefficient
        const reverseMin = reverseTransform(min, plotTransform, transformCoefficient)
        const reverseMax = reverseTransform(max, plotTransform, transformCoefficient)
        this.addPopulationFromRange(reverseMin, reverseMax)
    }

    @action public addPopulationFromRange = (min: number, max: number, feature?: string): void => {
        const activeImageData = this.activeImageSetStore.imageStore.imageData
        const activeImageSetName = this.activeImageSetStore.name
        if (activeImageData && activeImageSetName) {
            const persistedValueStore = this.persistedValueStore
            const populationStore = this.activeImageSetStore.populationStore
            const selectedFeature = feature ? feature : persistedValueStore.selectedPlotFeatures[0]
            const segmentIds = this.segmentFeatureStore.segmentsInRange(activeImageSetName, selectedFeature, min, max)
            const populationName =
                selectedFeature + ' ' + min?.toFixed(1).toString() + ' - ' + max?.toFixed(1).toString()
            populationStore.createPopulationFromSegments(segmentIds, populationName)
        }
    }
    @action public setWindowDimensions = (width: number, height: number): void => {
        this.windowWidth = width
        this.windowHeight = height
    }

    @action public setPlotInMainWindow = (inWindow: boolean): void => {
        this.plotInMainWindow = inWindow
    }

    @action setMousedOverPixel = (location: Coordinate | null): void => {
        this.mousedOverPixel = location
    }

    @action setEditingPopulationsSegmentId = (segmentId: number | null): void => {
        this.editingPopulationsSegmentId = segmentId
    }

    @action clearEditingPopulationSegmentId = (): void => {
        this.editingPopulationsSegmentId = null
    }

    @action setEditingLegendFeatures = (editing: boolean): void => {
        this.editingLegendFeatures = editing
    }

    @action lockContextMenuSegmentIds = (): void => {
        this.lockedContextMenuSegmentIds = this.activeImageSetStore.segmentationStore.mousedOverSegments
    }

    @action unlockContextMenuSegmentIds = (): void => {
        this.lockedContextMenuSegmentIds = null
    }

    @action setCancelTask = (value: boolean): void => {
        this.cancelTask = value
    }

    @action checkIfCancelled = (): boolean => {
        if (this.cancelTask) {
            this.cancelTask = false
            return true
        }
        return false
    }

    public exportImage = (filePath: string): void => {
        saveImageExportLog(
            filePath,
            this.persistedValueStore.channelMarker,
            this.persistedValueStore.channelVisibility,
            this.persistedValueStore.channelDomainValue,
        )
        this.activeImageSetStore.imageStore.setImageExportFilePath(filePath)
    }

    // Export project level summary stats to fcs if fcs is true or csv if fcs is false.
    // CSVs always contain population information. FCS files do not have anywhere to store this.
    // If populations is true, exports one FCS file per population. Has no effect if fcs is false.
    private exportProjectFeatures = (
        dirName: string,
        fcs: boolean,
        populations: boolean,
        calculateFeatures: boolean,
    ): void => {
        // Setting num to export so we can have a loading bar.
        this.notificationStore.setNumToCalculate(this.imageSetPaths.length)
        this.setSelectedStatistics(PlotStatistics as string[])
        this.exportImageSetFeatures(this.imageSetPaths, dirName, fcs, populations, calculateFeatures)
    }

    // Loads the data for one image set, waits until it's loaded, and exports the summary stats sequentially.
    // We call this recursively from within the when blocks to prevent multiple image sets being loaded into memory at once.
    private exportImageSetFeatures = (
        remainingImageSetPaths: string[],
        dirName: string,
        fcs: boolean,
        populations: boolean,
        calculateFeatures: boolean,
    ): void => {
        if (!this.checkIfCancelled()) {
            const curDir = remainingImageSetPaths[0]
            const imageSetStore = this.imageSets[curDir]
            imageSetStore.loadImageStoreData()
            const imageStore = imageSetStore.imageStore
            const segmentationStore = imageSetStore.segmentationStore
            when(
                (): boolean => !imageStore.imageDataLoading,
                (): void => {
                    // If we don't have segmentation, then skip this one.
                    // TODO: Should we notify the user that some were skipped due to missing segmentation?
                    if (segmentationStore.selectedSegmentationFile) {
                        when(
                            (): boolean => !segmentationStore.segmentationDataLoading,
                            (): void => {
                                if (calculateFeatures) {
                                    // We only ask the user if we should calculate for images missing features, so we set overwrite to false and don't prompt.
                                    this.segmentFeatureStore.calculateSegmentFeatures(
                                        imageSetStore,
                                        false,
                                        false,
                                        this.selectedStatistics,
                                    )
                                }
                                const imageSetName = imageSetStore.name
                                if (imageSetName) {
                                    when(
                                        (): boolean => !this.segmentFeatureStore.featuresLoading(imageSetName),
                                        (): void => {
                                            if (populations && fcs) {
                                                exportPopulationsToFCS(dirName, imageSetStore, imageSetName)
                                            } else {
                                                const extension = fcs ? '.fcs' : '.csv'
                                                const filename = imageSetName + extension
                                                const filePath = path.join(dirName, filename)
                                                if (fcs) {
                                                    exportToFCS(filePath, imageSetStore)
                                                } else {
                                                    exportMarkerIntensities(filePath, imageSetStore)
                                                }
                                            }
                                            // Mark this set of files as loaded for loading bar.
                                            this.notificationStore.incrementNumCalculated()
                                            this.clearImageSetData(curDir)
                                            // If there are more imageSets to process, recurse and process the next one.
                                            if (remainingImageSetPaths.length > 1) {
                                                this.exportImageSetFeatures(
                                                    remainingImageSetPaths.slice(1),
                                                    dirName,
                                                    fcs,
                                                    populations,
                                                    calculateFeatures,
                                                )
                                            }
                                        },
                                    )
                                }
                            },
                        )
                    } else {
                        // Mark as success if we're not going to export it
                        this.notificationStore.incrementNumCalculated()
                        this.clearImageSetData(curDir)
                        // If there are more imageSets to process, recurse and process the next one.
                        if (remainingImageSetPaths.length > 1) {
                            this.exportImageSetFeatures(
                                remainingImageSetPaths.slice(1),
                                dirName,
                                fcs,
                                populations,
                                calculateFeatures,
                            )
                        }
                    }
                },
            )
        } else {
            // If we're cancelling, set the number to calculate to 0.
            this.notificationStore.setNumToCalculate(0)
        }
    }

    public exportActiveImageSetMarkerIntensities = (filePath: string): void => {
        exportMarkerIntensities(filePath, this.activeImageSetStore)
    }

    public exportProjectFeaturesToCSV = (dirName: string, calculateFeatures: boolean): void => {
        this.exportProjectFeatures(dirName, false, false, calculateFeatures)
    }

    public exportActiveImageSetToFCS = (filePath: string): void => {
        exportToFCS(filePath, this.activeImageSetStore)
    }

    public exportActiveImageSetPopulationsToFCS = (filePath: string): void => {
        exportPopulationsToFCS(filePath, this.activeImageSetStore)
    }

    public exportProjectFeaturesToFCS = (dirName: string, populations: boolean, calculateFeatures: boolean): void => {
        this.exportProjectFeatures(dirName, true, populations, calculateFeatures)
    }

    public importActivePopulationsFromCSV = (filePath: string): void => {
        const populations = parseActivePopulationCSV(filePath)
        for (const populationName in populations) {
            this.activeImageSetStore.populationStore.createPopulationFromSegments(
                populations[populationName].segments,
                populationName,
                populations[populationName].color,
            )
        }
    }

    public importProjectPopulationsFromCSV = (filePath: string): void => {
        const populations = parseProjectPopulationCSV(filePath)
        // Mapping of population name to colors to be used for populations with that name.
        const populationColorMap: Record<string, number> = {}
        for (const imageSetName in populations) {
            const imageSetPopulations = populations[imageSetName]
            if (this.projectPath) {
                const imageSetPath = path.join(this.projectPath, imageSetName)
                const imageSet = this.imageSets[imageSetPath]
                if (imageSet) {
                    const populationStore = imageSet.populationStore
                    for (const populationName in imageSetPopulations) {
                        const currentPopulation = imageSetPopulations[populationName]
                        const populationColor = currentPopulation.color
                            ? currentPopulation.color
                            : populationColorMap[populationName]
                        const newPopulation = populationStore.createPopulationFromSegments(
                            currentPopulation.segments,
                            populationName,
                            populationColor,
                        )
                        // Store the color of the created population in the color map if we haven't already
                        if (!(populationName in populationColorMap))
                            populationColorMap[populationName] = newPopulation.color
                    }
                }
            }
        }
    }

    public exportActivePopulationsToTIFF = (filePath: string): void => {
        const activePopulationStore = this.activeImageSetStore.populationStore
        activePopulationStore.exportToTiff(filePath)
    }

    public exportActivePopulationsToCSV = (filePath: string): void => {
        const activePopulationArray = this.activeImageSetStore.populationStore.getSelectedPopulationsAsArray()
        writeToCSV(activePopulationArray, filePath, null)
    }

    // Exports the populations for every image in the project to one CSV
    // There's an edge case/bug in here where if a user imports regions
    // from TIFFs for the whole project, only the regions for images
    // that have been loaded will have segments associated with them
    // that can be exported. This is because an automatically set region
    // TIFF file only gets loaded when the image is first loaded, and segmentation
    // data must be loaded to select segments for that region. To fix this
    // we would need to load segmentation and then load the regions from the TIFFs
    // for each image. Could probably optimize by only doing this if an auto-import
    // region TIFF is selected.
    public exportProjectPopulationsToCSV = (filePath: string): void => {
        const projectPopulationArray: string[][] = []
        for (const imageSetPath of this.imageSetPaths) {
            const imageSetName = path.basename(imageSetPath)
            const imageSet = this.imageSets[imageSetPath]
            if (imageSet) {
                const populationStore = imageSet.populationStore
                const populationArray = populationStore.getSelectedPopulationsAsArray()
                for (const population of populationArray) {
                    population.unshift(imageSetName)
                    projectPopulationArray.push(population)
                }
            }
        }
        writeToCSV(projectPopulationArray, filePath, null)
    }

    public importGatesFromCSV = (filePath: string): void => {
        const gates = parseGateCSV(filePath)
        // Mapping of population name to colors to be used for gates with that name.
        const gateColorMap: Record<string, number> = {}
        // Iterate through all of the gates
        for (const gateName in gates) {
            const gateFeatures = gates[gateName]
            // Iterate through all of the image sets in the project.
            // Need to create each gate as a population for each image set.
            for (const imageSetPath of this.imageSetPaths) {
                const imageSet = this.imageSets[imageSetPath]
                const imageSetName = path.basename(imageSetPath)
                let gateSegmentIds: number[] | undefined = undefined
                // Iterate through all the features in the current gate.
                for (const feature in gateFeatures) {
                    const featureRange = gateFeatures[feature]
                    // Find the segments in the range for the feature and min/max values for the gate
                    const featureSegmentIds = this.segmentFeatureStore.segmentsInRange(
                        imageSetName,
                        feature,
                        featureRange.min,
                        featureRange.max,
                    )
                    // Create/update the set of segment ids for this gate and features.
                    if (gateSegmentIds == undefined) {
                        gateSegmentIds = featureSegmentIds
                    } else {
                        gateSegmentIds = gateSegmentIds.filter(function (x) {
                            // checking second array contains the element "x"
                            if (featureSegmentIds.indexOf(x) != -1) {
                                return true
                            } else {
                                return false
                            }
                        })
                    }
                }
                // If the gate segment id set was created, create a population from it.
                if (gateSegmentIds) {
                    const populationStore = imageSet.populationStore
                    const populationColor = gateColorMap[gateName]
                    const newPopulation = populationStore.createPopulationFromSegments(
                        gateSegmentIds,
                        gateName,
                        populationColor,
                    )
                    // Store the color of the created population in the color map if we haven't already
                    if (!(gateName in gateColorMap)) gateColorMap[gateName] = newPopulation.color
                }
            }
        }
    }

    @action clearImportingSegmentFeaturesValues = (): void => {
        this.importingSegmentFeaturesPath = null
        this.importingSegmentFeaturesForProject = null
    }

    @action setImportingSegmentFeaturesValues = (filePath: string, forProject: boolean, notify?: boolean): void => {
        // Set the importing features values
        this.importingSegmentFeaturesPath = filePath
        this.importingSegmentFeaturesForProject = forProject
        this.segmentFeatureStore.importSegmentFeatures(filePath, forProject, true, false)
        if (notify) {
            when(
                () => this.importingSegmentFeaturesPath == null,
                () => this.notificationStore.setInfoMessage('Segment feature import complete.'),
            )
        }
    }

    public continueImportingSegmentFeatures = (overwriteFeatures: boolean): void => {
        const filePath = this.importingSegmentFeaturesPath
        const forProject = this.importingSegmentFeaturesForProject
        if (filePath && forProject != null) {
            this.segmentFeatureStore.importSegmentFeatures(filePath, forProject, false, overwriteFeatures)
        }
    }

    public continueCalculatingSegmentFeatures = (overwrite: boolean): void => {
        // When calling calculate from this method, the user has already intervened so we don't need to check
        // We do need to pass along whether or not we're recalculating or using previously calculated data though.
        if (this.imageSetFeaturesToCalculate.length > 0) {
            this.calculateImageSetFeatures(this.imageSetFeaturesToCalculate, false, overwrite)
        } else {
            this.segmentFeatureStore.calculateSegmentFeatures(
                this.activeImageSetStore,
                false,
                overwrite,
                this.selectedStatistics,
            )
        }
    }

    public calculateActiveSegmentFeatures = (): void => {
        this.notificationStore.setChooseSegFeaturesModal('one')
    }

    public setPlotAllImageSets = (value: boolean): void => {
        if (
            value &&
            this.persistedValueStore.autoCalculateSegmentFeatures &&
            this.persistedValueStore.plotCheckGenerateAllFeatures
        ) {
            this.notificationStore.setCheckCalculateAllFeaturesForPlot(value)
            this.persistedValueStore.setPlotCheckGenerateAllFeatures(false)
        }
        this.persistedValueStore.setPlotAllImageSets(value)
    }

    // Called when segment feature calculation is requested
    // Should open a modal for the user to choose which features
    public calculateAllSegmentFeatures = (): void => {
        this.notificationStore.setChooseSegFeaturesModal('all')
    }

    @action public cancelSegFeatureCalculation = (): void => {
        this.notificationStore.setChooseSegFeaturesModal(null)
    }

    @action public setSelectedStatistics = (features: string[]): void => {
        this.selectedStatistics = features as PlotStatistic[]
    }

    // Kick off the calculation based on the chosen features
    public runFeatureCalculations = (): void => {
        const setOrActive = this.notificationStore.chooseSegmentFeatures
        this.notificationStore.setChooseSegFeaturesModal(null)

        when(
            (): boolean => !this.notificationStore.chooseSegmentFeatures,
            (): void => {
                if (setOrActive == 'all') {
                    this.notificationStore.setNumToCalculate(this.imageSetPaths.length)
                    this.calculateImageSetFeatures(this.imageSetPaths, true, false)
                } else {
                    const curImgPath: string[] = []
                    if (this.activeImageSetPath) {
                        curImgPath.push(this.activeImageSetPath)
                    }
                    this.notificationStore.setNumToCalculate(curImgPath.length)
                    this.calculateImageSetFeatures(curImgPath, true, false)
                }
            },
        )
    }

    // TODO: Some duplication here with exportImageSetFeatures. Should DRY it up.
    private calculateImageSetFeatures = (
        remainingImageSetPaths: string[],
        checkOverwrite: boolean,
        overwriteFeatures: boolean,
    ): void => {
        if (!this.checkIfCancelled()) {
            // Keep track of which one we're on.
            this.imageSetFeaturesToCalculate = remainingImageSetPaths
            // If there are image sets left to process, continue
            if (remainingImageSetPaths.length > 0) {
                this.notificationStore.setProjectSegmentFeaturesCalculating(true)
                const curDir = remainingImageSetPaths[0]
                this.imageSets[curDir].loadImageStoreData()
                const imageSetStore = this.imageSets[curDir]
                const imageStore = imageSetStore.imageStore
                const segmentationStore = imageSetStore.segmentationStore
                when(
                    (): boolean => !imageStore.imageDataLoading,
                    (): void => {
                        // If we don't have segmentation, then skip this one.
                        if (segmentationStore.selectedSegmentationFile) {
                            when(
                                (): boolean => !segmentationStore.segmentationDataLoading,
                                (): void => {
                                    const featuresCalculating = this.segmentFeatureStore.calculateSegmentFeatures(
                                        imageSetStore,
                                        checkOverwrite,
                                        overwriteFeatures,
                                        this.selectedStatistics,
                                    )
                                    const imageSetName = imageSetStore.name
                                    if (imageSetName && featuresCalculating) {
                                        when(
                                            (): boolean => !this.segmentFeatureStore.featuresLoading(imageSetName),
                                            (): void => {
                                                // Mark this set of files as loaded for loading bar.
                                                this.notificationStore.incrementNumCalculated()
                                                this.clearImageSetData(curDir)
                                                // Recurse and process the next one.
                                                this.calculateImageSetFeatures(
                                                    remainingImageSetPaths.slice(1),
                                                    checkOverwrite,
                                                    overwriteFeatures,
                                                )
                                            },
                                        )
                                    }
                                },
                            )
                        } else {
                            // Mark as success if we're not going to export it
                            this.notificationStore.incrementNumCalculated()
                            this.clearImageSetData(curDir)
                            // Recurse and process the next one.
                            this.calculateImageSetFeatures(
                                remainingImageSetPaths.slice(1),
                                checkOverwrite,
                                overwriteFeatures,
                            )
                        }
                    },
                )
            } else {
                // If we're done importing, then mark segment features calculating false
                this.notificationStore.setProjectSegmentFeaturesCalculating(false)
            }
        } else {
            // Cancelling segment features from calculating.
            this.notificationStore.setProjectSegmentFeaturesCalculating(false)
            this.notificationStore.setNumToCalculate(0)
            this.imageSetFeaturesToCalculate = []
        }
    }
}
