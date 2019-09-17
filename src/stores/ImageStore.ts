import { observable, action, autorun, computed } from 'mobx'
import * as path from 'path'
import * as fs from 'fs'

import { ImageData } from '../lib/ImageData'
import { SegmentationData } from '../lib/SegmentationData'
import { SegmentationStatistics } from '../lib/SegmentationStatistics'
import { ImageChannels, ChannelName } from '../definitions/UIDefinitions'
import { ProjectStore } from './ProjectStore'

export class ImageStore {
    public constructor(projectStore: ProjectStore) {
        this.projectStore = projectStore
        this.initialize()
    }

    private projectStore: ProjectStore

    @observable.ref public imageData: ImageData | null
    @observable public imageDataLoading: boolean

    @observable public imageExportFilename: string | null

    @observable.ref public segmentationData: SegmentationData | null
    @observable public segmentationDataLoading: boolean
    @observable.ref public segmentationStatistics: SegmentationStatistics | null
    @observable public segmentationStatisticsLoading: boolean

    @observable public selectedDirectory: string | null
    @observable public selectedSegmentationFile: string | null

    @observable public currentSelection: {
        x: [number, number]
        y: [number, number]
    } | null

    // Looks for a segmentation file with the same filename from source in dest and sets it if it exists.
    private autoSetSegmentationFile = autorun(() => {
        let settingStore = this.projectStore.settingStore
        let segmentationBasename = settingStore.segmentationBasename
        if (segmentationBasename) {
            let destinationPath = this.selectedDirectory
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
        if (this.imageData && this.segmentationData) {
            this.setSegmentationStatisticLoadingStatus(true)
            let statistics = new SegmentationStatistics(this.setSegmentationStatistics)
            statistics.generateStatistics(this.imageData, this.segmentationData)
        } else {
            this.setSegmentationStatisticLoadingStatus(false)
            this.setSegmentationStatistics(null)
        }
    })

    @computed public get channelDomain(): Record<ChannelName, [number, number]> {
        let results: Record<ChannelName, [number, number]> = {
            rChannel: [0, 100],
            gChannel: [0, 100],
            bChannel: [0, 100],
            cChannel: [0, 100],
            mChannel: [0, 100],
            yChannel: [0, 100],
            kChannel: [0, 100],
        }
        let settingStore = this.projectStore.settingStore
        for (let channel of ImageChannels) {
            let channelMarker = settingStore.channelMarker[channel]
            if (this.imageData && channelMarker) {
                let channelMinMax = this.imageData.minmax[channelMarker]
                if (channelMinMax) {
                    let channelMax = channelMinMax.max
                    let channelDomainPercentage = settingStore.channelDomainPercentage[channel]
                    results[channel][0] = channelMax * channelDomainPercentage[0]
                    results[channel][1] = channelMax * channelDomainPercentage[1]
                }
            }
        }
        return results
    }

    @action private initialize = () => {
        this.imageDataLoading = false
        this.segmentationDataLoading = false
        this.segmentationStatisticsLoading = false
    }

    @action public setImageDataLoading = (status: boolean) => {
        this.imageDataLoading = status
    }

    @action public setImageData = (data: ImageData) => {
        this.imageData = data
        // Segmentation data might have finished loading while image data was loading.
        // If this happens the segmentation file won't get removed from image data.
        // So we want to check and remove segmentation once image data is set.
        this.removeSegmentationFileFromImageData()
        this.setImageDataLoading(false)
    }

    @action public clearImageData = () => {
        this.imageData = null
    }

    @action public selectDirectory = (dirName: string) => {
        this.selectedDirectory = dirName
        this.refreshImageData()
    }

    @action public refreshImageData = () => {
        if (this.selectedDirectory != null && this.imageData == null) {
            this.setImageDataLoading(true)
            let imageData = new ImageData()
            // Load image data in the background and set on the image store once it's loaded.
            imageData.loadFolder(this.selectedDirectory, data => {
                this.setImageData(data)
            })
        }
    }

    @action public setSegmentationStatistics = (statistics: SegmentationStatistics | null) => {
        this.segmentationStatistics = statistics
        this.setSegmentationStatisticLoadingStatus(false)
    }

    @action public clearSegmentationStatistics = () => {
        this.segmentationStatistics = null
    }

    @action public removeMarker = (markerName: string) => {
        if (this.imageData != null && markerName in this.imageData.data) {
            let settingStore = this.projectStore.settingStore
            // Unset the marker if it is being used
            for (let s of ImageChannels) {
                let curChannel = s as ChannelName
                if (settingStore.channelMarker[curChannel] == markerName) settingStore.unsetChannelMarker(curChannel)
            }
            // Delete it from image data
            this.imageData.removeMarker(markerName)
        }
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
        this.removeSegmentationFileFromImageData()
    }

    @action public removeSegmentationFileFromImageData = () => {
        if (this.selectedSegmentationFile != null) {
            let basename = path.parse(this.selectedSegmentationFile).name
            this.removeMarker(basename)
        }
    }

    @action public setImageExportFilename = (fName: string) => {
        this.imageExportFilename = fName
    }

    @action public clearImageExportFilename = () => {
        this.imageExportFilename = null
    }
}
