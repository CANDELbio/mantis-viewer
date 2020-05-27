import { observable, action, autorun } from 'mobx'
import * as path from 'path'
import * as fs from 'fs'

import { SegmentationData } from '../lib/SegmentationData'
import { SegmentationStatistics } from '../lib/SegmentationStatistics'
import { ImageSetStore } from './ImageSetStore'

export class SegmentationStore {
    public constructor(imageSetStore: ImageSetStore) {
        this.imageSetStore = imageSetStore
        this.initialize()
    }

    private imageSetStore: ImageSetStore

    @observable.ref public segmentationData: SegmentationData | null
    @observable public segmentationDataLoading: boolean
    @observable.ref public segmentationStatistics: SegmentationStatistics | null
    @observable public segmentationStatisticsLoading: boolean

    @observable public selectedSegmentationFile: string | null

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

    // TODO: Maybe should manually call when setting and unsetting segmentation data
    // Could imagine condition where segmentation data done loading and statistics loading status still false
    private autorunCalculateSegmentationStatistics = autorun(() => {
        const imageStore = this.imageSetStore.imageStore
        const imageData = imageStore.imageData
        const imageSetName = imageStore.imageSetName()
        const basePath = this.imageSetStore.projectStore.settingStore.basePath
        if (imageData && basePath && imageSetName && this.segmentationData) {
            this.calculateSegmentationStatistics()
        }
    })

    @action public calculateSegmentationStatistics = (
        checkRecalculateArg?: boolean,
        recalculateStatisticsArg?: boolean,
    ): void => {
        const imageStore = this.imageSetStore.imageStore
        const imageData = imageStore.imageData
        const imageSetName = imageStore.imageSetName()
        const projectStore = this.imageSetStore.projectStore
        const basePath = this.imageSetStore.projectStore.settingStore.basePath
        const preferencesStore = this.imageSetStore.projectStore.preferencesStore
        // If checkRecalculateArg is passed in use the value from that, otherwise go from user preferences
        // This is so we can skip checking when the user explicitly approves of calculating statistics
        const checkRecalculate =
            checkRecalculateArg == undefined
                ? !preferencesStore.rememberRecalculateSegmentationStatistics
                : checkRecalculateArg
        const recalculateStatistics =
            recalculateStatisticsArg == undefined
                ? preferencesStore.recalculateSegmentationStatistics
                : recalculateStatisticsArg
        if (imageData && basePath && imageSetName && this.segmentationData) {
            const statistics = new SegmentationStatistics(
                basePath,
                imageSetName,
                recalculateStatistics,
                this.setSegmentationStatistics,
            )
            this.setSegmentationStatisticLoadingStatus(true)
            if (statistics.statisticsPresent() && checkRecalculate) {
                // If statistics are already present and we should check to recalculate, kick to the user to ask
                projectStore.setCheckRecalculateSegmentationStatistics(true)
            } else {
                // Otherwise generate the statistics!
                statistics.generateStatistics(imageData, this.segmentationData)
            }
        } else {
            this.setSegmentationStatisticLoadingStatus(false)
            this.setSegmentationStatistics(null)
        }
    }

    @action private initialize = (): void => {
        this.segmentationDataLoading = false
        this.segmentationStatisticsLoading = false
    }

    @action public setSegmentationStatistics = (statistics: SegmentationStatistics | null): void => {
        this.segmentationStatistics = statistics
        this.setSegmentationStatisticLoadingStatus(false)
    }

    @action public clearSegmentationStatistics = (): void => {
        this.segmentationStatistics = null
    }

    @action private setSegmentationStatisticLoadingStatus = (status: boolean): void => {
        this.segmentationStatisticsLoading = status
    }

    @action private setSegmentationDataLoadingStatus = (status: boolean): void => {
        this.segmentationDataLoading = status
    }

    @action private setSegmentationData = (data: SegmentationData): void => {
        this.segmentationData = data
        this.setSegmentationDataLoadingStatus(false)
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
}
