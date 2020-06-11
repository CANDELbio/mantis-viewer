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
    @observable private availableFeatures: Record<string, string[]>
    @observable private values: Record<string, Record<string, Record<number, number>>>
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
        const activeImageSetName = this.projectStore.activeImageSetStore.imageSetName()
        if (activeImageSetName) this.refreshAvailableFeatures(activeImageSetName)
    })

    // When the user changes the features selected for the plot we want to automatically refresh
    // the feature statistics we have loaded from the database.
    private autoRefreshFeatureStatistics = autorun(() => {
        const features = this.projectStore.settingStore.selectedPlotFeatures
        const activeImageSetName = this.projectStore.activeImageSetStore.imageSetName()
        if (activeImageSetName) this.setFeatureStatistics(activeImageSetName, features)
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
        const activeImageSetName = this.projectStore.activeImageSetStore.imageSetName()
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
        const activeImageSetName = this.projectStore.activeImageSetStore.imageSetName()
        if (activeImageSetName) {
            return this.featuresAvailable(activeImageSetName)
        } else {
            return []
        }
    }

    featureValues = computedFn(function getFeatureValues(
        this: SegmentFeatureStore,
        imageSetName: string,
    ): Record<string, Record<number, number>> {
        const featureValues = get(this.values, imageSetName)
        if (featureValues) {
            return featureValues
        } else {
            return {}
        }
    })

    featureMinMaxes = computedFn(function getFeatureMinMaxes(
        this: SegmentFeatureStore,
        imageSetName: string,
    ): Record<string, MinMax> {
        const featureMinMaxes = get(this.minMaxes, imageSetName)
        if (featureMinMaxes) {
            return featureMinMaxes
        } else {
            return {}
        }
    })

    @action public calculateSegmentFeatures = (
        imageSetStore: ImageSetStore,
        checkRecalculate: boolean,
        recalculateFeatures: boolean,
    ): void => {
        const imageSetName = imageSetStore.imageSetName()
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
        this.refreshFeatureStatistics(imageSetName)
        this.setSegmentFeatureLoadingStatus(imageSetName, false)
    }

    @action public refreshAvailableFeatures = (imageSetName: string): void => {
        if (this.db) set(this.availableFeatures, imageSetName, this.db.listFeatures(imageSetName))
    }

    private refreshFeatureStatistics = (imageSetName: string): void => {
        const features = this.projectStore.settingStore.selectedPlotFeatures
        this.setFeatureStatistics(imageSetName, features)
    }

    @action private setFeatureStatistics = (imageSetName: string, features: string[]): void => {
        const refreshedValues: Record<string, Record<number, number>> = {}
        const refreshedMinMaxes: Record<string, MinMax> = {}

        const currentValues = this.values[imageSetName]
        const currentMinMaxes = this.minMaxes[imageSetName]

        for (const feature of features) {
            if (currentValues && feature in currentValues) {
                refreshedValues[feature] = currentValues[feature]
            } else {
                if (this.db) {
                    refreshedValues[feature] = this.db.selectValues(imageSetName, feature)
                }
            }
            if (currentMinMaxes && feature in currentMinMaxes) {
                refreshedMinMaxes[feature] = currentMinMaxes[feature]
            } else {
                if (this.db) {
                    refreshedMinMaxes[feature] = this.db.minMaxValues(imageSetName, feature)
                }
            }
        }
        set(this.values, imageSetName, refreshedValues)
        set(this.minMaxes, imageSetName, refreshedMinMaxes)
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
        const notExporting = projectStore.notificationStore.numToExport == 0
        // Only want to auto calculate if we're not exporting.
        if (notExporting) {
            const preferencesStore = projectStore.preferencesStore
            const checkCalculate = !preferencesStore.rememberCalculateSegmentFeatures
            const calculate = preferencesStore.calculateSegmentFeatures
            if (checkCalculate) {
                projectStore.setCheckCalculateSegmentFeatures(true)
            } else if (calculate) {
                this.calculateSegmentFeaturesWithPreferences(imageSetStore)
            }
        }
    }

    public getValues = (imageSetName: string, features: string[]): Record<string, Record<number, number>> => {
        const values: Record<string, Record<number, number>> = {}
        for (const feature of features) {
            if (this.db && imageSetName) {
                values[feature] = this.db.selectValues(imageSetName, feature)
            }
        }
        return values
    }

    public segmentsInRange(imageSetName: string, feature: string, min: number, max: number): number[] {
        const segments = []
        let values: Record<number, number> = {}
        if (this.db) {
            values = this.db.selectValues(imageSetName, feature)
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
