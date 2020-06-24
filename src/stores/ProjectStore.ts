import { observable, action, when } from 'mobx'
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
    parseActivePopulationsJSON,
    writeToJSON,
    writeToCSV,
} from '../lib/IO'
import { GraphSelectionPrefix } from '../definitions/UIDefinitions'

import {
    SegmentFeatureImporterResult,
    importSegmentFeatureCSV,
    SegmentFeatureImporterError,
} from '../workers/SegmentFeatureImporter'
import { SegmentFeatureStore } from './SegmentFeatureStore'
import { DataImportStore } from './DataImportStore'

export class ProjectStore {
    public appVersion: string

    @observable public projectPath: string | null
    @observable public imageSetPaths: string[]
    @observable public imageSets: Record<string, ImageSetStore>
    @observable public nullImageSet: ImageSetStore
    @observable public lastActiveImageSetPath: string | null
    @observable public activeImageSetPath: string | null

    @observable.ref public activeImageSetStore: ImageSetStore

    @observable.ref public segmentFeatureStore: SegmentFeatureStore
    @observable.ref public settingStore: SettingStore
    @observable.ref public preferencesStore: PreferencesStore
    @observable.ref public notificationStore: NotificationStore
    @observable.ref public dataImportStore: DataImportStore

    // The width and height of the main window.
    @observable public windowWidth: number | null
    @observable public windowHeight: number | null
    // Whether or not the scatter plot is in the main window
    @observable public plotInMainWindow: boolean

    // Gets set to true when segmentation features have already been calculated
    // So that we can ask the user if they want to recalculate
    @observable public checkCalculateSegmentFeatures: boolean

    // Gets set to true when segmentation features have already been calculated
    // So that we can ask the user if they want to recalculate
    @observable public checkRecalculateSegmentFeatures: boolean

    // An array to keep track of the imageSets that have been recently used/
    // Used to clear old image sets to clean up memory.
    @observable public imageSetHistory: string[]

    // The path that we're importing segment features from
    @observable public importingSegmentFeaturesPath: string | null
    // If we're importing segment features for a project or active image set
    @observable public importingSegmentFeaturesForProject: boolean | null

    public constructor(appVersion: string) {
        this.appVersion = appVersion
        this.initialize()
    }

    @action public initialize = (): void => {
        // Initialize the preferences store (for storing user preferences)
        this.preferencesStore = new PreferencesStore()
        // Initialize the setting store (for storing image display settings to transfer when switching)
        this.settingStore = new SettingStore(this)
        this.notificationStore = new NotificationStore()
        this.dataImportStore = new DataImportStore(this)

        this.plotInMainWindow = true

        // First ones never get used, but here so that we don't have to use a bunch of null checks.
        // These will never be null once an image is loaded.
        // Maybe better way to accomplish this?
        this.nullImageSet = new ImageSetStore(this)
        this.activeImageSetStore = this.nullImageSet

        // Initialize the segment feature store (for storing segment/cell features and interacting with the DB)
        this.segmentFeatureStore = new SegmentFeatureStore(this)

        // Keep track of importing segment features
        this.importingSegmentFeaturesPath = null
        this.importingSegmentFeaturesForProject = null

        this.imageSetHistory = []
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
            this.imageSets[dirName] = new ImageSetStore(this)
        }
    }

    @action public openImageSet = (dirName: string): void => {
        // Clear out old image sets
        this.initializeImageSets()
        this.settingStore.setBasePath(dirName)
        this.initializeImageSetStores([dirName])
        this.setActiveImageSet(dirName)
    }

    @action public openProject = (dirName: string): void => {
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
            this.projectPath = dirName
            this.initializeImageSetStores(paths)
            this.setActiveImageSet(this.imageSetPaths[0])
        } else {
            this.notificationStore.setErrorMessage(
                'Warning: No image set directories found in ' + path.basename(dirName) + '.',
            )
        }
    }

    @action public deleteActiveImageSet = (): void => {
        if (this.activeImageSetPath != null) {
            // Clear the active image set
            this.imageSetPaths = this.imageSetPaths.filter((p: string): boolean => p != this.activeImageSetPath)
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

    @action public loadImageStoreData = (dirName: string): void => {
        const imageStore = this.imageSets[dirName].imageStore
        if (imageStore.imageData == null) {
            // Select the directory for image data
            imageStore.selectDirectory(dirName)

            // Set defaults once image data has loaded
            when(
                (): boolean => !imageStore.imageDataLoading,
                (): void => this.settingStore.setDefaultImageSetSettings(imageStore),
            )
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
            const selectedDirectory = imageStore.selectedDirectory
            if (selectedDirectory && !this.imageSetHistory.includes(selectedDirectory)) {
                imageStore.clearImageData()
                segmentationStore.clearSegmentationData()
            }
        }
    }

    // Adds dirName to the image set history.
    // Cleans up the oldest image set ImageStore if there are too many in memory.
    @action private cleanImageSetHistory = (dirName: string): void => {
        // If dirName is already in the history, remove it and readd it to the front
        const historyIndex = this.imageSetHistory.indexOf(dirName)
        if (historyIndex > -1) this.imageSetHistory.splice(historyIndex, 1)
        this.imageSetHistory.push(dirName)
        if (this.imageSetHistory.length > this.preferencesStore.maxImageSetsInMemory) {
            const setToClean = this.imageSetHistory.shift()
            if (setToClean) this.clearImageSetData(setToClean)
        }
    }

    @action public setActiveImageSet = (dirName: string): void => {
        this.loadImageStoreData(dirName)
        this.cleanImageSetHistory(dirName)

        // If the dirName isn't in the image set paths (i.e. adding a single folder), then add it.
        if (this.imageSetPaths.indexOf(dirName) == -1) this.imageSetPaths.push(dirName)

        // Set this directory as the active one and set the stores as the active ones.
        this.setActiveStores(dirName)

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
                    msg += ' Do you wish to remove it from the list of image sets?'
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

    public allImageSetNames = (): string[] => {
        return this.imageSetPaths.map((imageSetPath: string) => path.basename(imageSetPath))
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
    }

    @action public setSegmentationBasename = (filePath: string): void => {
        const dirname = path.dirname(filePath)
        const basename = path.basename(filePath)
        if (dirname == this.activeImageSetPath) {
            this.settingStore.setSegmentationBasename(basename)
        } else {
            // TODO: Not sure this is best behavior. If the segmentation file is not in the image set directory then we just set the segmentation file on the image store.
            // Could result in weird behavior when switching between image sets.
            this.activeImageSetStore.segmentationStore.setSegmentationFile(filePath)
        }
    }

    @action public addPopulationFromRange = (min: number, max: number): void => {
        const settingStore = this.settingStore
        const populationStore = this.activeImageSetStore.populationStore
        const feature = settingStore.selectedPlotFeatures[0]
        const activeImageSetName = this.activeImageSetStore.imageSetName()
        if (activeImageSetName) {
            const segmentIds = this.segmentFeatureStore.segmentsInRange(activeImageSetName, feature, min, max)
            if (segmentIds.length > 0) populationStore.addSelectedPopulation(null, segmentIds, GraphSelectionPrefix)
        }
    }
    @action public setWindowDimensions = (width: number, height: number): void => {
        this.windowWidth = width
        this.windowHeight = height
    }

    @action public setPlotInMainWindow = (inWindow: boolean): void => {
        this.plotInMainWindow = inWindow
    }

    // Export project level summary stats to fcs if fcs is true or csv if fcs is false.
    // CSVs always contain population information. FCS files do not have anywhere to store this.
    // If populations is true, exports one FCS file per population. Has no effect if fcs is false.
    private exportProjectFeatures = (
        dirName: string,
        fcs: boolean,
        populations: boolean,
        calculateFeatures: boolean,
        recalculateExistingFeatures: boolean,
    ): void => {
        // Setting num to export so we can have a loading bar.
        this.notificationStore.setNumToCalculate(this.imageSetPaths.length)
        this.exportImageSetFeatures(
            this.imageSetPaths,
            dirName,
            fcs,
            populations,
            calculateFeatures,
            recalculateExistingFeatures,
        )
    }

    // Loads the data for one image set, waits until it's loaded, and exports the summary stats sequentially.
    // We call this recursively from within the when blocks to prevent multiple image sets being loaded into memory at once.
    private exportImageSetFeatures = (
        remainingImageSetPaths: string[],
        dirName: string,
        fcs: boolean,
        populations: boolean,
        calculateFeatures: boolean,
        recalculateExistingFeatures: boolean,
    ): void => {
        const curDir = remainingImageSetPaths[0]
        this.loadImageStoreData(curDir)
        const imageSetStore = this.imageSets[curDir]
        const imageStore = imageSetStore.imageStore
        const segmentationStore = imageSetStore.segmentationStore
        when(
            (): boolean => !imageStore.imageDataLoading,
            (): void => {
                // If we don't have segmentation, then skip this one.
                if (segmentationStore.selectedSegmentationFile) {
                    // TODO: Check with Lacey what the desired behavior should be here
                    // Maybe warn/ask the user if we should ca
                    when(
                        (): boolean => !segmentationStore.segmentationDataLoading,
                        (): void => {
                            if (calculateFeatures) {
                                this.segmentFeatureStore.calculateSegmentFeatures(
                                    imageSetStore,
                                    false,
                                    recalculateExistingFeatures,
                                )
                            }
                            const imageSetName = imageSetStore.imageSetName()
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
                                                recalculateExistingFeatures,
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
                            recalculateExistingFeatures,
                        )
                    }
                }
            },
        )
    }

    public exportActiveImageSetMarkerIntensities = (filePath: string): void => {
        exportMarkerIntensities(filePath, this.activeImageSetStore)
    }

    public exportProjectFeaturesToCSV = (
        dirName: string,
        calculateFeatures: boolean,
        recalculateExistingFeatures: boolean,
    ): void => {
        this.exportProjectFeatures(dirName, false, false, calculateFeatures, recalculateExistingFeatures)
    }

    public exportActiveImageSetToFcs = (filePath: string): void => {
        exportToFCS(filePath, this.activeImageSetStore)
    }

    public exportActiveImageSetPopulationsToFcs = (filePath: string): void => {
        exportPopulationsToFCS(filePath, this.activeImageSetStore)
    }

    public exportProjectFeaturesToFCS = (
        dirName: string,
        populations: boolean,
        calculateFeatures: boolean,
        recalculateExistingFeatures: boolean,
    ): void => {
        this.exportProjectFeatures(dirName, true, populations, calculateFeatures, recalculateExistingFeatures)
    }

    public exportActivePopulationsToJSON = (filePath: string): void => {
        const activePopulationStore = this.activeImageSetStore.populationStore
        writeToJSON(activePopulationStore.selectedPopulations, filePath)
    }

    public importActivePopulationsFromJSON = (filePath: string): void => {
        const activePopulationStore = this.activeImageSetStore.populationStore
        const populations = parseActivePopulationsJSON(filePath)
        populations.map((population): void => {
            activePopulationStore.addSelectedPopulation(
                population.selectedRegion,
                population.selectedSegments,
                null,
                population.name,
                population.color,
            )
        })
    }

    public importActivePopulationsFromCSV = (filePath: string): void => {
        const populations = parseActivePopulationCSV(filePath)
        for (const populationName in populations) {
            when(
                (): boolean => this.notificationStore.numToCalculate > 0,
                (): void => {
                    this.activeImageSetStore.populationStore.addSelectedPopulation(
                        null,
                        populations[populationName],
                        null,
                        populationName,
                        null,
                    )
                    this.notificationStore.incrementNumCalculated()
                },
            )
        }
        this.notificationStore.setNumToCalculate(Object.keys(populations).length)
    }

    public importProjectPopulationsFromCSV = (filePath: string): void => {
        const populations = parseProjectPopulationCSV(filePath)
        for (const imageSetName in populations) {
            const imageSetPopulations = populations[imageSetName]
            if (this.projectPath) {
                const imageSetPath = path.join(this.projectPath, imageSetName)
                const imageSet = this.imageSets[imageSetPath]
                if (imageSet) {
                    const populationStore = imageSet.populationStore
                    for (const populationName in imageSetPopulations) {
                        populationStore.addSelectedPopulation(
                            null,
                            imageSetPopulations[populationName],
                            null,
                            populationName,
                            null,
                        )
                    }
                }
            }
        }
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

    @action setImportingSegmentFeaturesValues = (filePath: string | null, forProject: boolean | null): void => {
        // Set the importing features values
        this.importingSegmentFeaturesPath = filePath
        this.importingSegmentFeaturesForProject = forProject
        const rememberClearDuplicates = this.preferencesStore.rememberClearDuplicateSegmentFeatures
        if (rememberClearDuplicates && filePath && forProject != null) {
            // If the user wants us to remember their choice to clear duplicates, kick off importing segment features
            this.importSegmentFeatures(this.preferencesStore.clearDuplicateSegmentFeatures)
        } else if (filePath != null && forProject != null) {
            // Otherwise, ask the user if we should clear duplicates before importing
            this.notificationStore.setCheckImportingSegmentFeaturesClearDuplicates(true)
        }
    }

    public importSegmentFeatures = (clearDuplicates: boolean, remember?: boolean): void => {
        const basePath = this.settingStore.basePath
        const filePath = this.importingSegmentFeaturesPath
        const activeImageSetName = this.activeImageSetStore.imageSetName()
        const forProject = this.importingSegmentFeaturesForProject

        if (remember != null) {
            // If this is being called from a context where we want to remember or forget the choice
            // Then save the values to the preferences store
            this.preferencesStore.setRememberClearDuplicateSegmentFeatures(remember)
            this.preferencesStore.setClearDuplicateSegmentFeatures(clearDuplicates)
        }

        // If we're importing for the project, set to undefined.
        // Otherwise get the name of the active image set
        const validImageSets = this.imageSetPaths.map((p) => path.basename(p))
        // importingImageSetName should be undefined if we're plotting from the project
        // If it's not undefined, this will override all of the image set names from the CSV.
        const importingImageSetName = !forProject && activeImageSetName ? activeImageSetName : undefined
        const onImportComplete = (result: SegmentFeatureImporterResult | SegmentFeatureImporterError): void => {
            if ('error' in result) {
                this.notificationStore.setErrorMessage(result.error)
            } else {
                let message =
                    'Successfully imported ' +
                    result.importedFeatures +
                    ' out of ' +
                    result.totalFeatures +
                    ' features.'
                if (result.invalidFeatureNames.length > 0) {
                    message +=
                        '\nCould not import some of the following features: ' + result.invalidFeatureNames.join(', ')
                }
                if (result.invalidImageSets.length > 0) {
                    message += '\nCould not find the following image sets: ' + result.invalidImageSets.join(', ')
                }
                this.notificationStore.setInfoMessage(message)
            }
            this.setImportingSegmentFeaturesValues(null, null)
            // Refresh the available features once import is done so the user can use them for plotting
            if (activeImageSetName) this.segmentFeatureStore.refreshAvailableFeatures(activeImageSetName)
        }
        if (basePath && filePath) {
            // Launch a worker to import segment features from the CSV.
            importSegmentFeatureCSV(
                {
                    basePath: basePath,
                    filePath: filePath,
                    validImageSets: validImageSets,
                    imageSetName: importingImageSetName,
                    clearDuplicates: clearDuplicates,
                },
                onImportComplete,
            )
        } else {
            // We shouldn't get here ever, but if we do tell the user and clear the values to close the modal.
            this.notificationStore.setErrorMessage(
                'Could not import segment features. Unable to find database path or file path.',
            )
            this.setImportingSegmentFeaturesValues(null, null)
        }
    }

    @action public setCheckCalculateSegmentFeatures = (check: boolean): void => {
        this.checkCalculateSegmentFeatures = check
    }

    public continueCalculatingSegmentFeatures = (calculate: boolean, remember: boolean): void => {
        this.preferencesStore.setRememberCalculateSegmentFeatures(remember)
        this.preferencesStore.setCalculateSegmentFeatures(calculate)
        if (calculate) {
            this.segmentFeatureStore.calculateSegmentFeaturesWithPreferences(this.activeImageSetStore)
        }
    }

    @action public setCheckRecalculateSegmentFeatures = (check: boolean): void => {
        this.checkRecalculateSegmentFeatures = check
    }

    public recalculateSegmentFeatures = (recalculate: boolean, remember: boolean): void => {
        this.preferencesStore.setRememberRecalculateSegmentFeatures(remember)
        this.preferencesStore.setRecalculateSegmentFeatures(recalculate)
        // When calling calculate from this method, the user has already intervened so we don't need to check
        // We do need to pass along whether or not we're recalculating or using previously calculated data though.
        this.segmentFeatureStore.calculateSegmentFeatures(this.activeImageSetStore, false, recalculate)
    }

    public calculateSegmentFeaturesFromMenu = (): void => {
        this.segmentFeatureStore.calculateSegmentFeatures(this.activeImageSetStore, false, true)
        const activeImageSetName = this.activeImageSetStore.imageSetName()
        if (activeImageSetName) {
            when(
                () => !this.segmentFeatureStore.featuresLoading(activeImageSetName),
                () => this.notificationStore.setInfoMessage('Segment intensities have been successfully calculated.'),
            )
        }
    }

    public setPlotAllImageSets = (value: boolean): void => {
        if (value && this.preferencesStore.calculateSegmentFeatures && this.settingStore.plotCheckGenerateAllFeatures) {
            this.notificationStore.setCheckCalculateAllFeaturesForPlot(value)
            this.settingStore.setPlotCheckGenerateAllFeatures(false)
        }
        this.settingStore.setPlotAllImageSets(value)
    }

    public calculateAllSegmentFeatures = (): void => {
        this.notificationStore.setNumToCalculate(this.imageSetPaths.length)
        this.calculateImageSetFeatures(this.imageSetPaths)
    }

    // TODO: Some duplication here with exportImageSetFeatures. Should DRY it up.
    private calculateImageSetFeatures = (remainingImageSetPaths: string[]): void => {
        const curDir = remainingImageSetPaths[0]
        this.loadImageStoreData(curDir)
        const imageSetStore = this.imageSets[curDir]
        const imageStore = imageSetStore.imageStore
        const segmentationStore = imageSetStore.segmentationStore
        const recalculateExistingFeatures = this.preferencesStore.recalculateSegmentFeatures
        when(
            (): boolean => !imageStore.imageDataLoading,
            (): void => {
                // If we don't have segmentation, then skip this one.
                if (segmentationStore.selectedSegmentationFile) {
                    when(
                        (): boolean => !segmentationStore.segmentationDataLoading,
                        (): void => {
                            this.segmentFeatureStore.calculateSegmentFeatures(
                                imageSetStore,
                                false,
                                recalculateExistingFeatures,
                            )
                            const imageSetName = imageSetStore.imageSetName()
                            if (imageSetName) {
                                when(
                                    (): boolean => !this.segmentFeatureStore.featuresLoading(imageSetName),
                                    (): void => {
                                        // Mark this set of files as loaded for loading bar.
                                        this.notificationStore.incrementNumCalculated()
                                        this.clearImageSetData(curDir)
                                        // If there are more imageSets to process, recurse and process the next one.
                                        if (remainingImageSetPaths.length > 1) {
                                            this.calculateImageSetFeatures(remainingImageSetPaths.slice(1))
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
                        this.calculateImageSetFeatures(remainingImageSetPaths.slice(1))
                    }
                }
            },
        )
    }
}
