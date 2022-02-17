import * as path from 'path'
import * as fs from 'fs'

import { observable, action, autorun, set, get, computed, runInAction } from 'mobx'
import { computedFn } from 'mobx-utils'

import { SegmentFeatureGenerator } from '../lib/SegmentFeatureGenerator'
import { Db } from '../lib/Db'
import { MinMax } from '../interfaces/ImageInterfaces'
import { ProjectStore } from './ProjectStore'
import { ImageSetStore } from './ImageSetStore'
import { parseSegmentDataCSV } from '../lib/IO'
import { AreaStatistic, PlotStatistic, PlotStatistics } from '../definitions/UIDefinitions'

import {
    ImageSetFeatureRequest,
    SegmentFeatureDbResult,
    submitSegmentFeatureDbRequest,
} from '../workers/SegmentFeatureDbWorker'

export class SegmentFeatureStore {
    public constructor(projectStore: ProjectStore) {
        this.projectStore = projectStore
        this.initialize()
    }

    private projectStore: ProjectStore
    @observable private db: Db | null

    // A map of image set name to whether or not the features for that image set are loading
    @observable private loadingStatuses: Record<string, boolean>
    // Map of {imageSetName: availableFeatures}
    @observable private availableFeatures: Record<string, string[]>
    // Map of {imageSetName: {feature: {segmentId: segmentValue}}}
    @observable private values: Record<string, Record<string, Record<number, number>>>
    // Map of {imageSetName: {feature: MinMax}}
    @observable private minMaxes: Record<string, Record<string, MinMax>>

    @action private initialize = (): void => {
        this.loadingStatuses = {}
        this.availableFeatures = {}
        this.values = {}
        this.minMaxes = {}
    }

    @computed public get basePath(): string | null {
        return this.projectStore.settingStore.basePath
    }

    private refreshDb = autorun(() => {
        const basePath = this.basePath
        if (basePath) this.setActiveDb(basePath)
    })

    @action setActiveDb = (dbPath: string): void => {
        this.db = new Db(dbPath)
    }

    private autoRefreshAvailableFeatures = autorun(() => {
        const activeImageSetStore = this.projectStore.activeImageSetStore
        const activeImageDataLoading = activeImageSetStore.imageStore.imageDataLoading
        const activeImageSetName = activeImageSetStore.name
        if (activeImageSetName && !activeImageDataLoading) this.refreshAvailableFeatures(activeImageSetName)
    })

    private selectedPlotFeatures(): string[] {
        return this.projectStore.settingStore.selectedPlotFeatures.slice()
    }

    // When the user changes the features selected for the plot we want to automatically refresh
    // the feature statistics we have loaded from the database.
    // TODO: This triggers multiple times when switching image sets. Not terrible, but would be good to look into.
    private autoRefreshFeatureStatistics = autorun(() => {
        const features = this.selectedPlotFeatures()
        const activeImageSetStore = this.projectStore.activeImageSetStore
        const selectedFeatureForNewPopulation = activeImageSetStore.populationStore.selectedFeatureForNewPopulation
        if (selectedFeatureForNewPopulation) features.push(selectedFeatureForNewPopulation)
        const notLoadingMultiple = this.projectStore.notificationStore.numToCalculate == 0
        // Only want to auto calculate if we're not loading multiple.
        if (notLoadingMultiple) {
            const activeImageSetName = activeImageSetStore.name
            // Want to refresh the features available first in case this gets kicked off before refreshing available features
            // And the user is stuck with being told no features are available.
            if (this.featuresAvailable(activeImageSetName).length == 0)
                this.refreshAvailableFeatures(activeImageSetName)
            this.setFeatureStatisticsForSelectedImageSets(features)
        }
    })

    featuresLoading = computedFn(function getFeaturesLoading(this: SegmentFeatureStore, imageSetName: string): boolean {
        const featuresLoading = get(this.loadingStatuses, imageSetName)
        if (featuresLoading) {
            return featuresLoading
        } else {
            return false
        }
    })

    @computed get activeFeaturesLoading(): boolean {
        const activeImageSetName = this.projectStore.activeImageSetStore.name
        if (activeImageSetName) {
            return this.featuresLoading(activeImageSetName)
        } else {
            return false
        }
    }

    featuresAvailable = computedFn(function getFeaturesAvailable(
        this: SegmentFeatureStore,
        imageSetName: string,
    ): string[] {
        const featuresAvailable = get(this.availableFeatures, imageSetName)
        if (featuresAvailable) {
            return featuresAvailable
        } else {
            return []
        }
    })

    @computed get activeAvailableFeatures(): string[] {
        const activeImageSetName = this.projectStore.activeImageSetStore.name
        if (activeImageSetName) {
            return this.featuresAvailable(activeImageSetName)
        } else {
            return []
        }
    }

    // Computed function that gets the segment features selected on the plot for any segments that are being moused over on the image.
    // Used to display a segment summary of the plotted features for moused over segments
    @computed get activeHighlightedSegmentFeatures(): Record<number, Record<string, number>> {
        const segmentFeatures: Record<number, Record<string, number>> = {}
        const projectStore = this.projectStore
        const imageSetStore = projectStore.activeImageSetStore
        const activeImageSetName = imageSetStore.name
        const segmentationStore = imageSetStore.segmentationStore
        const segmentationData = segmentationStore.segmentationData
        const highlightedSegments = segmentationStore.activeHighlightedSegments
        if (segmentationData && highlightedSegments.length > 0) {
            const activeValues: Record<string, Record<number, number>> = get(this.values, activeImageSetName)
            const featuresToFetch = this.selectedPlotFeatures()
            if (activeValues && highlightedSegments) {
                for (const segment of highlightedSegments) {
                    segmentFeatures[segment] = {}
                    for (const feature of featuresToFetch) {
                        const activeFeatureValues = activeValues[feature]
                        if (activeFeatureValues) segmentFeatures[segment][feature] = activeFeatureValues[segment]
                    }
                }
            }
        }
        return segmentFeatures
    }

    featureValues = computedFn(function getFeatureValues(
        this: SegmentFeatureStore,
        imageSetNames: string[],
    ): Record<string, Record<string, Record<number, number>>> {
        const values: Record<string, Record<string, Record<number, number>>> = {}
        for (const imageSet of imageSetNames) {
            const curValues = get(this.values, imageSet)
            if (curValues) values[imageSet] = curValues
        }
        return values
    })

    featureMinMaxes = computedFn(function getFeatureMinMaxes(
        this: SegmentFeatureStore,
        imageSetNames: string[],
    ): Record<string, Record<string, MinMax>> {
        const minMaxes: Record<string, Record<string, MinMax>> = {}
        for (const imageSet of imageSetNames) {
            const curMinMaxes = get(this.minMaxes, imageSet)
            if (curMinMaxes) minMaxes[imageSet] = curMinMaxes
        }
        return minMaxes
    })

    activeFeatureMinMaxes(feature: string | null): MinMax | null {
        const activeImageSetName = this.projectStore.activeImageSetStore.name
        if (activeImageSetName && feature) {
            let minMaxes = get(this.minMaxes, activeImageSetName)
            if (!minMaxes) {
                minMaxes = this.db?.minMaxValues([activeImageSetName], feature)
            }
            return minMaxes[feature]
        } else {
            return null
        }
    }

    @action public calculateSegmentFeatures = (
        imageSetStore: ImageSetStore,
        checkOverwrite: boolean,
        overwriteFeatures: boolean,
        featuresToCalculate: string[],
        // todo - add args (features to calc) here
        // markerStats: PlotStatistic[]
    ): boolean => {
        const imageSetName = imageSetStore.name
        const imageStore = imageSetStore.imageStore
        const segmentationStore = imageSetStore.segmentationStore
        const imageData = imageStore.imageData
        const projectStore = this.projectStore
        const notificationStore = projectStore.notificationStore
        const basePath = this.projectStore.settingStore.basePath
        const segmentationData = segmentationStore.segmentationData
        const markerStats: PlotStatistic[] = featuresToCalculate as PlotStatistic[]

        if (imageData && basePath && imageSetName && segmentationData) {
            this.setSegmentFeatureLoadingStatus(imageSetName, true)
            const generator = new SegmentFeatureGenerator(
                // todo pass features list here
                basePath,
                imageSetName,
                imageData,
                segmentationData,
                markerStats,
                submitSegmentFeatureDbRequest,
                this.onSegmentFeaturesGenerated,
            )
            const featuresPresent = generator.featuresPresent()
            if (!featuresPresent) {
                generator.generate()
            } else if (featuresPresent && checkOverwrite && !overwriteFeatures) {
                // If statistics are already present and we should check to overwrite, kick to the user to ask
                notificationStore.setCheckOverwriteGeneratingSegmentFeatures(true)
                return false
            } else if (featuresPresent && overwriteFeatures) {
                // Otherwise generate the statistics!
                generator.generate()
            } else {
                this.setSegmentFeatureLoadingStatus(imageSetName, false)
            }
        } else if (imageSetName) {
            this.setSegmentFeatureLoadingStatus(imageSetName, false)
        }
        return true
    }

    @action private onSegmentFeaturesGenerated = (imageSetName: string): void => {
        this.refreshAvailableFeatures(imageSetName)
        this.setStatisticsForSelectedFeatures()
        this.setSegmentFeatureLoadingStatus(imageSetName, false)
    }

    @action private setAvailableFeatures = (imageSetName: string, features: string[]): void => {
        set(this.availableFeatures, imageSetName, features)
    }

    public refreshAvailableFeatures = (imageSetName: string): void => {
        if (this.basePath) {
            submitSegmentFeatureDbRequest(
                { basePath: this.basePath, imageSetName: imageSetName },
                (result: SegmentFeatureDbResult): void => {
                    if ('features' in result) this.setAvailableFeatures(result.imageSetName, result.features)
                },
            )
        }
    }

    // Helper method that calls setFeatureStatisticsForSelectedImageSets with the selected features.
    private setStatisticsForSelectedFeatures = (): void => {
        const features = this.projectStore.settingStore.selectedPlotFeatures
        this.setFeatureStatisticsForSelectedImageSets(features)
    }

    // Helper method that calls setFeatureStatistics with the selected image sets.
    private setFeatureStatisticsForSelectedImageSets = (features: string[]): void => {
        let imageSets: string[] = []
        if (this.projectStore.settingStore.plotAllImageSets) {
            imageSets = this.projectStore.imageSetNames
        } else {
            const activeImageSetName = this.projectStore.activeImageSetStore.name
            if (activeImageSetName) imageSets.push(activeImageSetName)
        }
        this.setFeatureStatistics(imageSets, features)
    }

    @action private setFeatureStatistics = (imageSetNames: string[], features: string[]): void => {
        // TODO: Should we skip if exporting/currently loading for multiple image sets?

        const refreshedValues: Record<string, Record<string, Record<number, number>>> = {}
        const refreshedMinMaxes: Record<string, Record<string, MinMax>> = {}

        const requests: ImageSetFeatureRequest[] = []

        for (const feature of features) {
            // First go through image sets and features being requested and check what's missing
            // from our current values.
            for (const imageSetName of imageSetNames) {
                const currentValues = this.values[imageSetName]
                const currentMinMaxes = this.minMaxes[imageSetName]
                let missing = false

                if (currentValues && feature in currentValues && currentValues[feature]) {
                    if (!(imageSetName in refreshedValues)) refreshedValues[imageSetName] = {}
                    refreshedValues[imageSetName][feature] = currentValues[feature]
                } else {
                    missing = true
                }

                if (currentMinMaxes && feature in currentMinMaxes && currentMinMaxes[feature]) {
                    if (!(imageSetName in refreshedMinMaxes)) refreshedMinMaxes[imageSetName] = {}
                    refreshedMinMaxes[imageSetName][feature] = currentMinMaxes[feature]
                } else {
                    missing = true
                }

                if (missing) requests.push({ feature: feature, imageSetName: imageSetName })
            }
        }
        if (requests.length > 0) {
            this.projectStore.notificationStore.setSegmentFeaturesLoading(true)
            if (this.basePath) {
                submitSegmentFeatureDbRequest(
                    { basePath: this.basePath, requestedFeatures: requests },
                    (result: SegmentFeatureDbResult): void => {
                        if ('featureResults' in result) {
                            for (const featureResult of result.featureResults) {
                                const imageSetName = featureResult.imageSetName
                                const feature = featureResult.feature
                                if (!(imageSetName in refreshedValues)) refreshedValues[imageSetName] = {}
                                if (featureResult.values) refreshedValues[imageSetName][feature] = featureResult.values
                                if (!(imageSetName in refreshedMinMaxes)) refreshedMinMaxes[imageSetName] = {}
                                if (featureResult.minMax)
                                    refreshedMinMaxes[imageSetName][feature] = featureResult.minMax
                            }
                            runInAction(() => {
                                // Set the updated values and minMaxes on the store
                                set(this.values, refreshedValues)
                                set(this.minMaxes, refreshedMinMaxes)
                                this.projectStore.notificationStore.setSegmentFeaturesLoading(false)
                            })
                        }
                    },
                )
            }
        }
    }

    @action private setSegmentFeatureLoadingStatus = (imageSetName: string, status: boolean): void => {
        set(this.loadingStatuses, imageSetName, status)
    }

    public autoCalculateSegmentFeatures = (imageSetStore: ImageSetStore): void => {
        const projectStore = this.projectStore
        const notificationStore = projectStore.notificationStore
        const notLoadingMultiple = notificationStore.numToCalculate == 0

        // Only want to auto calculate if we're not loading multiple for FCS/CSV export.
        if (notLoadingMultiple) {
            const calculate = projectStore.settingStore.autoCalculateSegmentFeatures
            const imageSetName = imageSetStore.name
            const featuresGenerated = this.db?.featuresGeneratedForImageSet(imageSetName)
            if (calculate && !featuresGenerated) {
                this.calculateSegmentFeatures(imageSetStore, true, false, PlotStatistics)
            } else {
                // If we're not checking to calculate or calculating stuff
                // then we need to refresh the selected features from the db
                // otherwise the initial load of features won't happen
                this.setStatisticsForSelectedFeatures()
            }
        }
    }

    // Gets the names of the features in the database for a given image set.
    // Bypasses the cache of available features that are currently in use
    // Should only be used if the data will not be reused soon, like exporting data from the DB
    public getFeatureNames = (imageSetName: string): string[] => {
        let features: string[] = []
        if (this.db && imageSetName) features = this.db.listFeatures(imageSetName)
        return features
    }

    // Gets the values of the features in the database for a given image set.
    // Bypasses the cache of available features that are currently in use
    // Should only be used if the data will not be reused soon, like exporting data from the DB
    public getValues = (imageSetName: string, features: string[]): Record<string, Record<number, number>> => {
        const values: Record<string, Record<number, number>> = {}
        for (const feature of features) {
            if (this.db && imageSetName) {
                const imageSetValues = this.db.selectValues([imageSetName], feature)
                values[feature] = imageSetValues[imageSetName]
            }
        }
        return values
    }

    // TODO: Clean this up. Use cached values in this.values if present before grabbing from DB.
    public segmentsInRange(imageSetName: string, feature: string, min: number, max: number): number[] {
        const segments = []
        let values: Record<number, number> = {}
        if (this.db) {
            const imageSetValues = this.db.selectValues([imageSetName], feature)
            values = imageSetValues[imageSetName]
        }
        for (const segmentIdStr in values) {
            const segmentId = parseInt(segmentIdStr)
            const curValue = values[segmentId]
            if (min <= curValue && curValue <= max) {
                segments.push(segmentId)
            }
        }
        return segments
    }

    // Checks if the filepath is contained within an image subdirectory.
    // If it is, returns the path of the feature file relative to the image subdirectory.
    // Otherwise don't return anything
    private featureFileImageSubdirectory = (
        basePath: string,
        filePath: string,
        validImageSets: string[],
    ): string | void => {
        // Get the file path relative to the imageSetPath (with the imageSetPath removed from the beginning)
        const relativeFilePath = filePath.replace(basePath, '')
        const splitRelativeFilePath = relativeFilePath.split(path.sep).filter(Boolean)
        // If the split relative file path contains at least 2 entries, then the segment file might be in an image subdirectory.
        if (splitRelativeFilePath.length >= 2) {
            const possibleImageSubdirectory = splitRelativeFilePath[0]
            const relativeFilePathWithoutImageSubdirectory = path.join(...splitRelativeFilePath.slice(1))
            if (validImageSets.includes(possibleImageSubdirectory)) return relativeFilePathWithoutImageSubdirectory
        }
    }

    private getSegmentFeaturePaths = (
        basePath: string,
        filePath: string,
        validImageSets: string[],
        imageSetName: string | undefined,
    ): {
        filePath: string
        imageSet?: string
    }[] => {
        if (imageSetName) {
            // If the imageSetName is known for this file, we want to import the file for that imageSet
            return [{ filePath: filePath, imageSet: imageSetName }]
        } else {
            // Check if the feature filePath is in an image subdirectory
            // If it is we assume that each image subdirectory has it's own feature file and will try to import for each of those
            const featureFileImageSubPath = this.featureFileImageSubdirectory(basePath, filePath, validImageSets)
            if (featureFileImageSubPath) {
                return validImageSets.map((imageSet: string) => {
                    return { filePath: path.join(basePath, imageSet, featureFileImageSubPath), imageSet: imageSet }
                })
            } else {
                // If it's not in an image subdirectory then we just import as a single file for the project
                return [{ filePath: filePath }]
            }
        }
    }

    // TODO: Might want to move this to a web worker if this blocks the UI
    private checkImportingSegmentFeaturesExist = (
        importingFiles: {
            filePath: string
            imageSet?: string | undefined
        }[],
    ): boolean => {
        for (const importingFile of importingFiles) {
            const filePath = importingFile.filePath
            if (fs.existsSync(filePath) && this.db) {
                const parsed = parseSegmentDataCSV(filePath, importingFile.imageSet).data
                const imageSets = Object.keys(parsed)
                for (const imageSet of imageSets) {
                    const existingFeatures = this.db.listFeatures(imageSet)
                    const newFeatures = Object.keys(parsed[imageSet])
                    for (const existingFeature of existingFeatures) {
                        if (newFeatures.includes(existingFeature)) return true
                    }
                }
            }
        }
        return false
    }

    // TODO: Should raise error if multipleFiles is true and filePath is not within an image directory.
    public importSegmentFeatures = (
        filePath: string,
        forProject: boolean,
        checkOverwrite: boolean,
        overwriteFeatures: boolean,
    ): void => {
        const projectStore = this.projectStore
        const notificationStore = projectStore.notificationStore
        const basePath = this.basePath
        const activeImageSetName = projectStore.activeImageSetStore.name

        // If we're importing for the project, set to undefined.
        // Otherwise get the name of the active image set
        const validImageSets = projectStore.imageSetPaths.map((p) => path.basename(p))
        // importingImageSetName should be undefined if we're plotting from the project
        // If it's not undefined, this will override all of the image set names from the CSV.
        const importingImageSetName = !forProject && activeImageSetName ? activeImageSetName : undefined
        if (basePath) {
            // Get the files to import formatted for the web worker
            const filesToImport = this.getSegmentFeaturePaths(basePath, filePath, validImageSets, importingImageSetName)
            const numToImport = filesToImport.length
            notificationStore.setNumToImport(numToImport)
            const someImportingSegmentFeaturesExist = this.checkImportingSegmentFeaturesExist(filesToImport)
            if (checkOverwrite && someImportingSegmentFeaturesExist) {
                // If we should check if we might overwrite anything, and some features that would be imported already exist
                // kick back to the user to check what they want
                this.projectStore.notificationStore.setCheckOverwriteImportingSegmentFeatures(true)
            } else if (!someImportingSegmentFeaturesExist || (someImportingSegmentFeaturesExist && overwriteFeatures)) {
                // If no importing features already exist in the db or if they do and the user approved overwriting, import stuff!
                this.importNextSegmentFeature(
                    basePath,
                    validImageSets,
                    filesToImport,
                    importingImageSetName,
                    new Set(),
                    new Set(),
                    [],
                    0,
                )
            } else {
                // If we're not overwriting, then set num to calculate for this to 0.
                notificationStore.setNumToCalculate(0)
                projectStore.clearImportingSegmentFeaturesValues()
            }
        } else {
            // We shouldn't get here ever, but if we do tell the user and clear the values to close the modal.
            notificationStore.setErrorMessage(
                'Could not import segment features. Unable to find database path or file path.',
            )
            // Clear the values for the segment features file on the project store once we're done importing.
            projectStore.clearImportingSegmentFeaturesValues()
        }
    }

    private importNextSegmentFeature = (
        basePath: string,
        validImageSets: string[],
        filesToImport: {
            filePath: string
            imageSet?: string | undefined
        }[],
        importingImageSetName: string | undefined,
        invalidFeatureNames: Set<string>,
        invalidImageSets: Set<string>,
        importErrors: string[],
        maxImportedFeatures: number,
    ): void => {
        const projectStore = this.projectStore
        const notificationStore = projectStore.notificationStore
        const activeImageSetName = projectStore.activeImageSetStore.name
        if (!this.projectStore.checkIfCancelled()) {
            if (filesToImport.length == 0) {
                if (
                    maxImportedFeatures > 0 &&
                    (invalidFeatureNames.size > 0 || invalidImageSets.size > 0 || importErrors.length > 0)
                ) {
                    let message = 'Successfully imported some segment features.'
                    if (invalidFeatureNames.size > 0) {
                        message +=
                            '\nCould not import some of the following features: ' +
                            Array.from(invalidFeatureNames).join(', ')
                    }
                    if (invalidImageSets.size > 0) {
                        message += '\nCould not find the following images: ' + Array.from(invalidImageSets).join(', ')
                    }
                    if (importErrors.length > 0) {
                        message += '\nEncountered the following errors: ' + importErrors.join('\n')
                    }
                    notificationStore.setErrorMessage(message)
                } else if (maxImportedFeatures == 0) {
                    let message = 'Unable to import segment features.'
                    if (importErrors.length > 0) {
                        message += '\nEncountered the following errors: ' + importErrors.join('\n')
                    }
                    notificationStore.setErrorMessage(message)
                }
                // Clear the values for the segment features file on the project store once we're done importing.
                projectStore.clearImportingSegmentFeaturesValues()
                // Refresh the available features once import is done so the user can use them for plotting
                if (activeImageSetName) this.refreshAvailableFeatures(activeImageSetName)
            } else {
                let newMaxImportedFeatures = maxImportedFeatures
                // Callback for worker once import is done.
                const onImportComplete = (result: SegmentFeatureDbResult): void => {
                    // Keep track of the results of the imports
                    if ('error' in result) {
                        importErrors.push(result.error)
                    } else if ('importedFeatures' in result) {
                        result.invalidFeatureNames.forEach((feature) => invalidFeatureNames.add(feature))
                        result.invalidImageSets.forEach((feature) => invalidImageSets.add(feature))
                        newMaxImportedFeatures = Math.max(maxImportedFeatures, result.importedFeatures)
                    }
                    // Decrement the number left to import and update the notification store
                    notificationStore.incrementNumImported()
                    this.importNextSegmentFeature(
                        basePath,
                        validImageSets,
                        filesToImport.slice(1),
                        importingImageSetName,
                        invalidFeatureNames,
                        invalidImageSets,
                        importErrors,
                        newMaxImportedFeatures,
                    )
                }
                // Kick off in import request for the next file.
                const file = filesToImport[0]
                submitSegmentFeatureDbRequest(
                    {
                        basePath: basePath,
                        validImageSets: validImageSets,
                        imageSetName: importingImageSetName,
                        filePath: file.filePath,
                        imageSet: file.imageSet,
                    },
                    onImportComplete,
                )
            }
        } else {
            // Clear all of the importing segment feature values.
            notificationStore.setNumToImport(0)
            // Clear the values for the segment features file on the project store once we're done importing.
            projectStore.clearImportingSegmentFeaturesValues()
            // Refresh the available features once import is done so the user can use them for plotting
            if (activeImageSetName) this.refreshAvailableFeatures(activeImageSetName)
        }
    }

    public allImageSetsHaveFeatures = (): boolean => {
        if (!this.db) return false
        const imageSets = this.projectStore.imageSetNames
        const imageSetsInDb = this.db.listImageSets()
        for (const imageSet of imageSets) {
            if (!imageSetsInDb.includes(imageSet)) return false
        }
        return true
    }

    // Used when clearing segmentation data to delete old features.
    public deleteAllSegmentFeatures = (): void => {
        if (this.db) {
            this.db.deleteAllSegmentFeatures()
            this.initialize()
        }
    }

    public deleteActiveSegmentFeatures = (): void => {
        const activeImageSetName = this.projectStore.activeImageSetStore.name
        if (this.db) {
            this.db.deleteAllFeaturesForImageSet(activeImageSetName)
            this.initialize()
        }
    }
}
