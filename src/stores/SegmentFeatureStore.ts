import { observable, action, autorun, set, get, computed } from 'mobx'
import { computedFn } from 'mobx-utils'

import { SegmentFeatureGenerator } from '../lib/SegmentFeatureGenerator'
import { Db } from '../lib/Db'
import { MinMax } from '../interfaces/ImageInterfaces'
import { ProjectStore } from './ProjectStore'
import { ImageSetStore } from './ImageSetStore'

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

    private refreshDb = autorun(() => {
        const basePath = this.projectStore.settingStore.basePath
        if (basePath) this.setActiveDb(basePath)
    })

    @action setActiveDb = (dbPath: string): void => {
        this.db = new Db(dbPath)
    }

    private autoRefreshAvailableFeatures = autorun(() => {
        const activeImageSetName = this.projectStore.activeImageSetStore.name
        if (activeImageSetName) this.refreshAvailableFeatures(activeImageSetName)
    })

    // When the user changes the features selected for the plot we want to automatically refresh
    // the feature statistics we have loaded from the database.
    private autoRefreshFeatureStatistics = autorun(() => {
        const features = this.projectStore.settingStore.selectedPlotFeatures
        const notLoadingMultiple = this.projectStore.notificationStore.numToCalculate == 0
        // Only want to auto calculate if we're not loading multiple.
        if (notLoadingMultiple) {
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

    @action public calculateSegmentFeatures = (
        imageSetStore: ImageSetStore,
        checkRecalculate: boolean,
        recalculateFeatures: boolean,
    ): void => {
        const imageSetName = imageSetStore.name
        const imageStore = imageSetStore.imageStore
        const segmentationStore = imageSetStore.segmentationStore
        const imageData = imageStore.imageData
        const projectStore = this.projectStore
        const basePath = this.projectStore.settingStore.basePath
        const segmentationData = segmentationStore.segmentationData

        if (imageData && basePath && imageSetName && segmentationData) {
            const generator = new SegmentFeatureGenerator(
                basePath,
                imageSetName,
                recalculateFeatures,
                this.onSegmentFeaturesGenerated,
            )
            this.setSegmentFeatureLoadingStatus(imageSetName, true)
            if (generator.featuresPresent() && checkRecalculate) {
                // If statistics are already present and we should check to recalculate, kick to the user to ask
                projectStore.setCheckRecalculateSegmentFeatures(true)
            } else {
                // Otherwise generate the statistics!
                generator.generate(imageData, segmentationData)
            }
        } else if (imageSetName) {
            this.setSegmentFeatureLoadingStatus(imageSetName, false)
        }
    }

    @action private onSegmentFeaturesGenerated = (imageSetName: string): void => {
        this.refreshAvailableFeatures(imageSetName)
        this.setStatisticsForSelectedFeatures()
        this.setSegmentFeatureLoadingStatus(imageSetName, false)
    }

    @action public refreshAvailableFeatures = (imageSetName: string): void => {
        if (this.db) set(this.availableFeatures, imageSetName, this.db.listFeatures(imageSetName))
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
            imageSets = this.projectStore.allImageSetNames()
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

        for (const feature of features) {
            const imageSetsMissingFeature = []
            const imageSetsMissingMinMax = []

            // First go through image sets and features being requested and check what's missing
            // from our current values.
            for (const imageSetName of imageSetNames) {
                const currentValues = this.values[imageSetName]
                const currentMinMaxes = this.minMaxes[imageSetName]

                if (currentValues && feature in currentValues) {
                    if (!(imageSetName in refreshedValues)) refreshedValues[imageSetName] = {}
                    refreshedValues[imageSetName][feature] = currentValues[feature]
                } else {
                    imageSetsMissingFeature.push(imageSetName)
                }

                if (currentMinMaxes && feature in currentMinMaxes) {
                    if (!(imageSetName in refreshedMinMaxes)) refreshedMinMaxes[imageSetName] = {}
                    refreshedMinMaxes[imageSetName][feature] = currentMinMaxes[feature]
                } else {
                    imageSetsMissingMinMax.push(imageSetName)
                }
            }

            // Next request what's missing in single queries
            if (this.db) {
                if (imageSetsMissingFeature.length > 0) {
                    const values = this.db.selectValues(imageSetsMissingFeature, feature)
                    for (const imageSetName of imageSetsMissingFeature) {
                        if (imageSetName in values) {
                            if (!(imageSetName in refreshedValues)) refreshedValues[imageSetName] = {}
                            refreshedValues[imageSetName][feature] = values[imageSetName]
                        }
                    }
                }
                if (imageSetsMissingMinMax.length > 0) {
                    const minMaxes = this.db.minMaxValues(imageSetsMissingMinMax, feature)
                    for (const imageSetName of imageSetsMissingMinMax) {
                        if (imageSetName in minMaxes) {
                            if (!(imageSetName in refreshedMinMaxes)) refreshedMinMaxes[imageSetName] = {}
                            refreshedMinMaxes[imageSetName][feature] = minMaxes[imageSetName]
                        }
                    }
                }
            }
            // And then set the updated values and minMaxes on the store
            set(this.values, refreshedValues)
            set(this.minMaxes, refreshedMinMaxes)
        }
    }

    @action private setSegmentFeatureLoadingStatus = (imageSetName: string, status: boolean): void => {
        set(this.loadingStatuses, imageSetName, status)
    }

    // Calculates segment features using the stored preferences about recalculating if features are present
    public calculateSegmentFeaturesWithPreferences = (imageSetStore: ImageSetStore): void => {
        const preferencesStore = this.projectStore.preferencesStore
        const checkRecalculate = !preferencesStore.rememberRecalculateSegmentFeatures
        const recalculate = preferencesStore.recalculateSegmentFeatures
        this.calculateSegmentFeatures(imageSetStore, checkRecalculate, recalculate)
    }

    public autoCalculateSegmentFeatures = (imageSetStore: ImageSetStore): void => {
        const projectStore = this.projectStore
        const notLoadingMultiple = projectStore.notificationStore.numToCalculate == 0
        // Only want to auto calculate if we're not loading multiple.
        if (notLoadingMultiple) {
            const preferencesStore = projectStore.preferencesStore
            const checkCalculate = !preferencesStore.rememberCalculateSegmentFeatures
            const calculate = preferencesStore.calculateSegmentFeatures
            if (checkCalculate) {
                projectStore.setCheckCalculateSegmentFeatures(true)
            } else if (calculate) {
                this.calculateSegmentFeaturesWithPreferences(imageSetStore)
            } else {
                // If we're not checking to calculate or calculating stuff
                // then we need to refresh the selected features from the db
                // otherwise the initial load of features won't happen
                this.setStatisticsForSelectedFeatures()
            }
        }
    }

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

    public segmentsInRange(imageSetName: string, feature: string, min: number, max: number): number[] {
        const segments = []
        let values: Record<number, number> = {}
        if (this.db) {
            const imageSetValues = this.db.selectValues([imageSetName], feature)
            values = imageSetValues[imageSetName]
        }
        for (const segmentId in values) {
            const curValue = values[parseInt(segmentId)]
            if (min <= curValue && curValue <= max) {
                segments.push(Number(segmentId))
            }
        }
        return segments
    }
}
