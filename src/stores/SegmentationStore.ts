import { observable, action, autorun } from 'mobx'
import * as path from 'path'
import * as fs from 'fs'

import { SegmentationData } from '../lib/SegmentationData'
import { SegmentFeatureGenerator } from '../lib/SegmentFeatureGenerator'
import { ImageSetStore } from './ImageSetStore'
import { Db } from '../lib/Db'
import { MinMax } from '../interfaces/ImageInterfaces'

export class SegmentationStore {
    public constructor(imageSetStore: ImageSetStore) {
        this.imageSetStore = imageSetStore
        this.initialize()
    }

    private imageSetStore: ImageSetStore
    private db: Db | null

    @observable.ref public segmentationData: SegmentationData | null
    @observable public segmentationDataLoading: boolean
    @observable public segmentFeaturesLoading: boolean

    @observable public selectedSegmentationFile: string | null

    @observable public availableFeatures: string[]
    @observable public featureValues: Record<string, Record<number, number>>
    @observable public featureMinMaxes: Record<string, MinMax>

    // Looks for a segmentation file with the same filename from source in dest and sets it if it exists.
    // TODO: Not sure if this should run for every segmentation store whenever the SettingStore segmentationBasename changes.
    private autoSetSegmentationFile = autorun(() => {
        const imageStore = this.imageSetStore.imageStore
        const imageData = imageStore.imageData
        const settingStore = this.imageSetStore.projectStore.settingStore
        const segmentationBasename = settingStore.segmentationBasename

        // Check if there is a file to load and if image data has loaded (so we know width and height for text segmentation)
        if (segmentationBasename && imageData) {
            const destinationPath = imageStore.selectedDirectory
            if (destinationPath) {
                const segmentationFile = path.join(destinationPath, segmentationBasename)
                // If the segmentation file exists and it's not equal to the current file, clear segmentation data and set to the new.
                if (fs.existsSync(segmentationFile) && this.selectedSegmentationFile != segmentationFile) {
                    this.clearSegmentationData()
                    this.setSegmentationFile(segmentationFile)
                }
            }
        }
    })

    // When the user changes the features selected for the plot we want to automatically refresh
    // the feature statistics we have loaded from the database.
    private autoRefreshFeatureStatistics = autorun(() => {
        const features = this.imageSetStore.projectStore.settingStore.selectedPlotFeatures
        this.refreshFeatureStatistics(features)
    })

    @action private initialize = (): void => {
        const basePath = this.imageSetStore.projectStore.settingStore.basePath
        if (basePath) this.db = new Db(basePath)
        this.segmentationDataLoading = false
        this.segmentFeaturesLoading = false
        this.availableFeatures = []
        this.featureValues = {}
        this.featureMinMaxes = {}
        this.refreshAvailableFeatures()
    }

    @action public calculateSegmentFeatures = (checkRecalculate: boolean, recalculateFeatures: boolean): void => {
        const imageStore = this.imageSetStore.imageStore
        const imageData = imageStore.imageData
        const imageSetName = imageStore.imageSetName()
        const projectStore = this.imageSetStore.projectStore
        const basePath = this.imageSetStore.projectStore.settingStore.basePath

        if (imageData && basePath && imageSetName && this.segmentationData) {
            const generator = new SegmentFeatureGenerator(
                basePath,
                imageSetName,
                recalculateFeatures,
                this.onSegmentFeaturesGenerated,
            )
            this.setSegmentFeatureLoadingStatus(true)
            if (generator.featuresPresent() && checkRecalculate) {
                // If statistics are already present and we should check to recalculate, kick to the user to ask
                projectStore.setCheckRecalculateSegmentFeatures(true)
            } else {
                // Otherwise generate the statistics!
                generator.generate(imageData, this.segmentationData)
            }
        } else {
            this.setSegmentFeatureLoadingStatus(false)
        }
    }

    @action public onSegmentFeaturesGenerated = (): void => {
        this.refreshAvailableFeatures()
        this.setSegmentFeatureLoadingStatus(false)
    }

    @action private setSegmentFeatureLoadingStatus = (status: boolean): void => {
        this.segmentFeaturesLoading = status
    }

    @action private setSegmentationDataLoadingStatus = (status: boolean): void => {
        this.segmentationDataLoading = status
    }

    @action private setSegmentationData = (data: SegmentationData): void => {
        this.segmentationData = data
        // Kick off calculating segment features after segmentation data has loaded
        this.autoCalculateSegmentFeatures()
        this.setSegmentationDataLoadingStatus(false)
    }

    private autoCalculateSegmentFeatures = (): void => {
        const projectStore = this.imageSetStore.projectStore
        const notExporting = projectStore.numToExport == 0
        // Only want to auto calculate if we're not exporting. Otherwise we want to
        if (notExporting) {
            const preferencesStore = this.imageSetStore.projectStore.preferencesStore
            const checkRecalculate = !preferencesStore.rememberRecalculateSegmentFeatures
            const recalculate = preferencesStore.recalculateSegmentFeatures
            this.calculateSegmentFeatures(checkRecalculate, recalculate)
        }
    }

    // Deletes the segmentation data and resets the selected segmentation file and alpha
    @action public clearSegmentationData = (): void => {
        this.selectedSegmentationFile = null
        this.deleteSegmentationData()
    }

    // Just deletes the associated segmentation data.
    // Used in clearSegmentationData
    // And when cleaning up memory in the projectStore.
    @action public deleteSegmentationData = (): void => {
        this.segmentationData = null
    }

    @action public refreshSegmentationData = (): void => {
        const imageData = this.imageSetStore.imageStore.imageData
        if (this.selectedSegmentationFile != null && this.segmentationData == null && imageData != null) {
            this.setSegmentationDataLoadingStatus(true)
            const segmentationData = new SegmentationData()
            segmentationData.loadFile(
                this.selectedSegmentationFile,
                imageData.width,
                imageData.height,
                this.setSegmentationData,
            )
        }
    }

    @action public setSegmentationFile = (fName: string): void => {
        this.selectedSegmentationFile = fName
        this.refreshSegmentationData()
        this.imageSetStore.imageStore.removeSegmentationFileFromImageData()
    }

    @action public refreshAvailableFeatures = (): void => {
        const imageSetName = this.imageSetStore.imageStore.imageSetName()
        if (this.db && imageSetName) this.availableFeatures = this.db.listFeatures(imageSetName)
    }

    @action public refreshFeatureStatistics = (features: string[]): void => {
        const refreshedValues: Record<string, Record<number, number>> = {}
        const refreshedMinMaxes: Record<string, MinMax> = {}

        const currentValues = this.featureValues
        const currentMinMaxes = this.featureMinMaxes

        const imageSetName = this.imageSetStore.imageStore.imageSetName()
        for (const feature of features) {
            if (feature in currentValues) {
                refreshedValues[feature] = currentValues[feature]
            } else {
                if (this.db && imageSetName) {
                    refreshedValues[feature] = this.db.selectValues(imageSetName, feature)
                }
            }
            if (feature in currentMinMaxes) {
                refreshedMinMaxes[feature] = currentMinMaxes[feature]
            } else {
                if (this.db && imageSetName) {
                    refreshedMinMaxes[feature] = this.db.minMaxValues(imageSetName, feature)
                }
            }
        }
        this.featureValues = refreshedValues
        this.featureMinMaxes = refreshedMinMaxes
    }

    public getValues = (features: string[]): Record<string, Record<number, number>> => {
        const values: Record<string, Record<number, number>> = {}
        const imageSetName = this.imageSetStore.imageStore.imageSetName()
        for (const feature of features) {
            if (this.db && imageSetName) {
                values[feature] = this.db.selectValues(imageSetName, feature)
            }
        }
        return values
    }

    public segmentsInRange(feature: string, min: number, max: number): number[] {
        const segments = []
        let values: Record<number, number> = {}
        const imageSetName = this.imageSetStore.imageStore.imageSetName()
        if (this.db && imageSetName) {
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
