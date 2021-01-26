import { observable, action, autorun } from 'mobx'
import * as path from 'path'
import * as fs from 'fs'

import { SegmentationData } from '../lib/SegmentationData'
import { ImageSetStore } from './ImageSetStore'

export class SegmentationStore {
    public constructor(imageSetStore: ImageSetStore) {
        this.imageSetStore = imageSetStore
        this.initialize()
    }

    private imageSetStore: ImageSetStore

    @observable public selectedSegmentationFile: string | null
    @observable public segmentationDataLoading: boolean
    @observable.ref public segmentationData: SegmentationData | null

    // Looks for a segmentation file with the same filename from source in dest and sets it if it exists.
    // TODO: Not sure if this should run for every segmentation store whenever the SettingStore segmentationBasename changes.
    // Might want to only have this run of this is the active image set.
    private autoSetSegmentationFile = autorun(() => {
        const imageStore = this.imageSetStore.imageStore
        const imageSetDirectory = this.imageSetStore.directory
        const imageData = imageStore.imageData
        const settingStore = this.imageSetStore.projectStore.settingStore
        const segmentationBasename = settingStore.segmentationBasename

        // Check if there is a file to load and if image data has loaded (so we know width and height for text segmentation)
        if (segmentationBasename && imageData && imageSetDirectory) {
            const segmentationFile = path.join(imageSetDirectory, segmentationBasename)
            // If the segmentation file exists and it's not equal to the current file, clear segmentation data and set to the new.
            if (fs.existsSync(segmentationFile) && this.selectedSegmentationFile != segmentationFile) {
                this.clearSegmentationData()
                this.setSegmentationFile(segmentationFile)
            }
        }
    })

    @action private initialize = (): void => {
        this.segmentationDataLoading = false
    }

    @action private setSegmentationDataLoadingStatus = (status: boolean): void => {
        this.segmentationDataLoading = status
    }

    @action private setSegmentationData = (data: SegmentationData): void => {
        this.segmentationData = data
        // Kick off calculating segment features after segmentation data has loaded
        this.imageSetStore.projectStore.segmentFeatureStore.autoCalculateSegmentFeatures(this.imageSetStore)
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
        this.segmentationData?.destroyGraphics()
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
