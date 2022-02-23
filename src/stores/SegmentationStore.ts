import { observable, action, autorun, computed } from 'mobx'
import * as path from 'path'
import * as fs from 'fs'

import { SegmentationData } from '../lib/SegmentationData'
import { ImageSetStore } from './ImageSetStore'
import { generatePixelMapKey } from '../lib/SegmentationUtils'

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
        const autoLoadSegmentation = settingStore.autoLoadSegmentation

        // Check if there is a file to load and if image data has loaded (so we know width and height for text segmentation)
        if (segmentationBasename && autoLoadSegmentation && imageData && imageSetDirectory) {
            const imageSubdirectory = settingStore.imageSubdirectory
            const segmentationFile =
                imageSubdirectory && imageSubdirectory.length > 0
                    ? path.join(imageSetDirectory, imageSubdirectory, segmentationBasename)
                    : path.join(imageSetDirectory, segmentationBasename)
            // If the segmentation file exists and it's not equal to the current file, clear segmentation data and set to the new.
            if (fs.existsSync(segmentationFile) && this.selectedSegmentationFile != segmentationFile) {
                this.clearSegmentationData()
                this.setSegmentationFile(segmentationFile)
            }
        }
    })

    // Computed function that gets the segment features selected on the plot for any segments that are being moused over on the image.
    // Used to display a segment summary of the plotted features for moused over segments
    @computed get activeHighlightedSegments(): number[] {
        const imageSetStore = this.imageSetStore
        const projectStore = imageSetStore.projectStore
        const segmentationStore = imageSetStore.segmentationStore
        const highlightedPixel = projectStore.highlightedPixel
        const segmentationData = segmentationStore.segmentationData
        if (highlightedPixel && segmentationData) {
            const highlightedPixelMapKey = generatePixelMapKey(highlightedPixel.x, highlightedPixel.y)
            const highlightedSegments = segmentationData.pixelMap[highlightedPixelMapKey]
            if (highlightedSegments) return highlightedSegments
        }
        return []
    }

    @action private initialize = (): void => {
        this.segmentationDataLoading = false
    }

    @action private setSegmentationDataLoadingStatus = (status: boolean): void => {
        this.segmentationDataLoading = status
    }

    @action private setSegmentationData = (data: SegmentationData): void => {
        this.segmentationData = data
        // TODO: De-jankify the autoCalculate stuff when setting segmentation data.
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

    // TODO: De-jankify auto calculating segment features in setSegmentationData when automatically refreshing segmentation data.
    @action public refreshSegmentationData = (): void => {
        const imageData = this.imageSetStore.imageStore.imageData
        const preferencesStore = this.imageSetStore.projectStore.preferencesStore
        if (this.selectedSegmentationFile != null && this.segmentationData == null && imageData != null) {
            this.setSegmentationDataLoadingStatus(true)
            const segmentationData = new SegmentationData()
            segmentationData.loadFile(
                this.selectedSegmentationFile,
                imageData.width,
                imageData.height,
                preferencesStore.optimizeSegmentation,
                this.setSegmentationData,
            )
        }
    }

    @action public setSegmentationFile = (fName: string): void => {
        this.selectedSegmentationFile = fName
        this.refreshSegmentationData()
        this.imageSetStore.imageStore.removeSegmentationFileFromMarkers()
    }
}
