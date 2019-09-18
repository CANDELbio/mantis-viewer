import { observable, action, computed } from 'mobx'
import * as path from 'path'

import { ImageData } from '../lib/ImageData'
import { ImageChannels, ChannelName } from '../definitions/UIDefinitions'
import { ImageSetStore } from './ImageSetStore'

export class ImageStore {
    public constructor(imageSetStore: ImageSetStore) {
        this.imageSetStore = imageSetStore
        this.initialize()
    }

    private imageSetStore: ImageSetStore

    @observable.ref public imageData: ImageData | null
    @observable public imageDataLoading: boolean

    @observable public imageExportFilename: string | null

    @observable public selectedDirectory: string | null

    @observable public currentSelection: {
        x: [number, number]
        y: [number, number]
    } | null

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
        let settingStore = this.imageSetStore.projectStore.settingStore
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

    @action public removeMarker = (markerName: string) => {
        if (this.imageData != null && markerName in this.imageData.data) {
            let settingStore = this.imageSetStore.projectStore.settingStore
            // Unset the marker if it is being used
            for (let s of ImageChannels) {
                let curChannel = s as ChannelName
                if (settingStore.channelMarker[curChannel] == markerName) settingStore.unsetChannelMarker(curChannel)
            }
            // Delete it from image data
            this.imageData.removeMarker(markerName)
        }
    }

    @action public removeSegmentationFileFromImageData = () => {
        let selectedSegmentationFile = this.imageSetStore.segmentationStore.selectedSegmentationFile
        if (selectedSegmentationFile) {
            let basename = path.parse(selectedSegmentationFile).name
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
