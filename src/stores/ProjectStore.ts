import { observable, action, when, computed } from 'mobx'
import * as fs from 'fs'
import * as path from 'path'

import { SettingStore } from './SettingStore'
import { PreferencesStore } from './PreferencesStore'
import { NotificationStore } from './NotificationStore'
import { ImageSetStore } from './ImageSetStore'
import {
    exportMarkerIntensities,
    exportToFCS,
    exportPopulationsToFCS,
    parseActivePopulationCSV,
    parseProjectPopulationCSV,
    parseGateCSV,
    writeToCSV,
} from '../lib/IO'

import { SegmentFeatureStore } from './SegmentFeatureStore'
import { ProjectImportStore } from './ProjectImportStore'
import { Coordinate } from '../interfaces/ImageInterfaces'
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
    public settingStore: SettingStore
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

    // The pixel being higlighted/moused over by the user on the image.
    // Used to show segment stats and pixel stats.
    @observable public highlightedPixel: Coordinate | null

    // Used when a user requests to cancel a long running process
    // (e.g. importing, generating, and exporting segment features for multiple images)
    @observable public cancelTask: boolean
    // Used to keep track of which image sets we're calculating features for in case we have to break in the middle.
    private imageSetFeaturesToCalculate: string[]

    @computed public get imageSetNames(): string[] {
        return this.imageSetPaths.map((imageSetPath: string) => path.basename(imageSetPath))
    }

    public constructor(appVersion: string) {
        this.appVersion = appVersion
        this.initialize()
    }

    @action public initialize = (): void => {
        // Initialize the preferences store (for storing user preferences)
        this.preferencesStore = new PreferencesStore(this)
        // Initialize the setting store (for storing image display settings to transfer when switching)
        this.settingStore = new SettingStore(this)
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

        this.cancelTask = false

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

        this.settingStore.initialize()
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
        this.settingStore.setBasePath(dirName)
        this.initializeImageSetStores([dirName])
        this.setActiveImageSet(dirName)
    }

    @action public openProject = (dirName: string, imageSubdirectory?: string | null): void => {
        const files = fs.readdirSync(dirName)
        const paths = []
        for (const file of files) {
            const filePath = path.join(dirName, file)
            if (fs.statSync(filePath).isDirectory()) paths.push(filePath)
        }
        if (paths.length > 0) {
            // Clear out old image sets
            this.initializeImageSets()
            this.settingStore.setBasePath(dirName)
            if (imageSubdirectory) this.settingStore.setImageSubdirectory(imageSubdirectory)

            this.projectPath = dirName
            this.initializeImageSetStores(paths)
            const savedActiveImageSet = this.settingStore.activeImageSet
            if (savedActiveImageSet && this.imageSetPaths.includes(savedActiveImageSet)) {
                this.setActiveImageSet(savedActiveImageSet)
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

        this.settingStore.setActiveImageSet(dirName)
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

    // Gets called when the user clicks the 'Clear Segmentation' button and approves.
    @action public clearSegmentation = (): void => {
        this.settingStore.setSegmentationBasename(null)
        this.settingStore.clearSelectedPlotFeatures()
        for (const imageSet of this.imageSetPaths) {
            const curSet = this.imageSets[imageSet]
            if (curSet) {
                curSet.segmentationStore.clearSegmentationData()
                curSet.populationStore.deletePopulationsNotSelectedOnImage()
            }
        }
        this.segmentFeatureStore.deleteAllSegmentFeatures()
    }

    @action public setSegmentationBasename = (filePath: string, checkCalculateFeatures: boolean): void => {
        const settingStore = this.settingStore
        const dirname = path.dirname(filePath)
        const basename = path.basename(filePath)
        // Clear segmentation if it's already been set
        if (settingStore.segmentationBasename != null) this.clearSegmentation()
        // Set the new segmentation file
        if (dirname == this.activeImageSetPath) {
            this.settingStore.setSegmentationBasename(basename)
        } else {
            // TODO: Not sure this is best behavior. If the segmentation file is not in the image set directory then we just set the segmentation file on the image store.
            // Could result in weird behavior when switching between image sets.
            this.activeImageSetStore.segmentationStore.setSegmentationFile(filePath)
        }
        // If Mantis isn't auto calculating features, ask the user
        const autoCalculateSegmentFeatures = this.settingStore.autoCalculateSegmentFeatures
        if (checkCalculateFeatures && !autoCalculateSegmentFeatures)
            this.notificationStore.setCheckCalculateSegmentFeatures(true)
    }

    @action public importRegionTiff = (filePath: string): void => {
        const dirname = path.dirname(filePath)
        const basename = path.basename(filePath)
        if (dirname == this.activeImageSetPath) {
            this.settingStore.setRegionsBasename(basename)
        } else {
            this.activeImageSetStore.populationStore.importRegionsFromTiff(filePath)
        }
    }

    public addPopulationFromPlotRange = (min: number, max: number): void => {
        const settingStore = this.settingStore
        const plotTranform = settingStore.plotTransform
        const transformCoefficient = settingStore.transformCoefficient
        const reverseMin = reverseTransform(min, plotTranform, transformCoefficient)
        const reverseMax = reverseTransform(max, plotTranform, transformCoefficient)
        this.addPopulationFromRange(reverseMin, reverseMax)
    }

    @action public addPopulationFromRange = (min: number, max: number, feature?: string): void => {
        const activeImageData = this.activeImageSetStore.imageStore.imageData
        const activeImageSetName = this.activeImageSetStore.name
        if (activeImageData && activeImageSetName) {
            const settingStore = this.settingStore
            const populationStore = this.activeImageSetStore.populationStore
            const selectedFeature = feature ? feature : settingStore.selectedPlotFeatures[0]
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

    @action setHighlightedPixel = (location: Coordinate | null): void => {
        this.highlightedPixel = location
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
                                    this.segmentFeatureStore.calculateSegmentFeatures(imageSetStore, false, false)
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
            when(
                (): boolean => this.notificationStore.numToCalculate > 0,
                (): void => {
                    this.activeImageSetStore.populationStore.createPopulationFromSegments(
                        populations[populationName],
                        populationName,
                    )
                    this.notificationStore.incrementNumCalculated()
                },
            )
        }
        this.notificationStore.setNumToCalculate(Object.keys(populations).length)
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
                        const populationColor = populationColorMap[populationName]
                        const newPopulation = populationStore.createPopulationFromSegments(
                            imageSetPopulations[populationName],
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
            this.segmentFeatureStore.calculateSegmentFeatures(this.activeImageSetStore, false, overwrite)
        }
    }

    public calculateActiveSegmentFeatures = (): void => {
        this.segmentFeatureStore.calculateSegmentFeatures(this.activeImageSetStore, false, false)
    }

    public calculateSegmentFeaturesFromMenu = (): void => {
        this.segmentFeatureStore.calculateSegmentFeatures(this.activeImageSetStore, true, false)
        const activeImageSetName = this.activeImageSetStore.name
        if (activeImageSetName) {
            when(
                () => !this.segmentFeatureStore.featuresLoading(activeImageSetName),
                () => this.notificationStore.setInfoMessage('Segment feature calculations complete.'),
            )
        }
    }

    public setPlotAllImageSets = (value: boolean): void => {
        if (value && this.settingStore.autoCalculateSegmentFeatures && this.settingStore.plotCheckGenerateAllFeatures) {
            this.notificationStore.setCheckCalculateAllFeaturesForPlot(value)
            this.settingStore.setPlotCheckGenerateAllFeatures(false)
        }
        this.settingStore.setPlotAllImageSets(value)
    }

    public calculateAllSegmentFeatures = (): void => {
        this.notificationStore.setNumToCalculate(this.imageSetPaths.length)
        this.calculateImageSetFeatures(this.imageSetPaths, true, false)
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
