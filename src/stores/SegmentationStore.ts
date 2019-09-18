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
        let imageStore = this.imageSetStore.imageStore
        let settingStore = this.imageSetStore.projectStore.settingStore
        let segmentationBasename = settingStore.segmentationBasename
        if (segmentationBasename) {
            let destinationPath = imageStore.selectedDirectory
            if (destinationPath) {
                let segmentationFile = path.join(destinationPath, segmentationBasename)
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
    private calculateSegmentationStatistics = autorun(() => {
        let imageData = this.imageSetStore.imageStore.imageData
        if (imageData && this.segmentationData) {
            this.setSegmentationStatisticLoadingStatus(true)
            let statistics = new SegmentationStatistics(this.setSegmentationStatistics)
            statistics.generateStatistics(imageData, this.segmentationData)
        } else {
            this.setSegmentationStatisticLoadingStatus(false)
            this.setSegmentationStatistics(null)
        }
    })

    @action private initialize = () => {
        this.segmentationDataLoading = false
        this.segmentationStatisticsLoading = false
    }

    @action public setSegmentationStatistics = (statistics: SegmentationStatistics | null) => {
        this.segmentationStatistics = statistics
        this.setSegmentationStatisticLoadingStatus(false)
    }

    @action public clearSegmentationStatistics = () => {
        this.segmentationStatistics = null
    }

    @action private setSegmentationStatisticLoadingStatus = (status: boolean) => {
        this.segmentationStatisticsLoading = status
    }

    @action private setSegmentationDataLoadingStatus = (status: boolean) => {
        this.segmentationDataLoading = status
    }

    @action private setSegmentationData = (data: SegmentationData) => {
        this.segmentationData = data
        this.setSegmentationDataLoadingStatus(false)
    }

    // Deletes the segmentation data and resets the selected segmentation file and alpha
    @action public clearSegmentationData = () => {
        this.selectedSegmentationFile = null
        this.deleteSegmentationData()
    }

    // Just deletes the associated segmentation data.
    // Used in clearSegmentationData
    // And when cleaning up memory in the projectStore.
    @action public deleteSegmentationData = () => {
        this.segmentationData = null
    }

    @action public refreshSegmentationData = () => {
        if (this.selectedSegmentationFile != null && this.segmentationData == null) {
            this.setSegmentationDataLoadingStatus(true)
            let segmentationData = new SegmentationData()
            segmentationData.loadFile(this.selectedSegmentationFile, this.setSegmentationData)
        }
    }

    @action public setSegmentationFile = (fName: string) => {
        this.selectedSegmentationFile = fName
        this.refreshSegmentationData()
        this.imageSetStore.imageStore.removeSegmentationFileFromImageData()
    }
}
