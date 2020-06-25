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

    @observable public position: { x: number; y: number } | null
    @observable public scale: { x: number; y: number } | null

    @observable public imageExportFilename: string | null

    @observable private selectedDirectory: string | null

    @observable public currentSelection: {
        x: [number, number]
        y: [number, number]
    } | null

    @computed public get channelDomain(): Record<ChannelName, [number, number]> {
        const results: Record<ChannelName, [number, number]> = {
            rChannel: [0, 100],
            gChannel: [0, 100],
            bChannel: [0, 100],
            cChannel: [0, 100],
            mChannel: [0, 100],
            yChannel: [0, 100],
            kChannel: [0, 100],
        }
        const settingStore = this.imageSetStore.projectStore.settingStore
        for (const channel of ImageChannels) {
            const channelMarker = settingStore.channelMarker[channel]
            if (this.imageData && channelMarker) {
                const channelMinMax = this.imageData.minmax[channelMarker]
                if (channelMinMax) {
                    const channelMax = channelMinMax.max
                    const channelDomainPercentage = settingStore.channelDomainPercentage[channel]
                    results[channel][0] = channelMax * channelDomainPercentage[0]
                    results[channel][1] = channelMax * channelDomainPercentage[1]
                }
            }
        }
        return results
    }

    @action private initialize = (): void => {
        this.imageDataLoading = false
    }

    @action public setImageDataLoading = (status: boolean): void => {
        this.imageDataLoading = status
    }

    @action public setImageData = (data: ImageData): void => {
        this.imageData = data
        // Segmentation data might have finished loading while image data was loading.
        // If this happens the segmentation file won't get removed from image data.
        // So we want to check and remove segmentation once image data is set.
        this.removeSegmentationFileFromImageData()
        this.setImageDataLoading(false)
    }

    @action public clearImageData = (): void => {
        this.imageData = null
    }

    @action public selectDirectory = (dirName: string): void => {
        this.selectedDirectory = dirName
        this.refreshImageData()
    }

    @action public refreshImageData = (): void => {
        if (this.selectedDirectory != null && this.imageData == null) {
            this.setImageDataLoading(true)
            const imageData = new ImageData()
            // Load image data in the background and set on the image store once it's loaded.
            imageData.loadFolder(this.selectedDirectory, (data) => {
                this.setImageData(data)
            })
        }
    }

    @action public removeMarker = (markerName: string): void => {
        if (this.imageData != null && markerName in this.imageData.data) {
            const settingStore = this.imageSetStore.projectStore.settingStore
            // Unset the marker if it is being used
            for (const s of ImageChannels) {
                const curChannel = s as ChannelName
                if (settingStore.channelMarker[curChannel] == markerName) settingStore.unsetChannelMarker(curChannel)
            }
            // Delete it from image data
            this.imageData.removeMarker(markerName)
        }
    }

    @action public removeSegmentationFileFromImageData = (): void => {
        const selectedSegmentationFile = this.imageSetStore.segmentationStore.selectedSegmentationFile
        if (selectedSegmentationFile) {
            const basename = path.parse(selectedSegmentationFile).name
            this.removeMarker(basename)
        }
    }

    @action public setPositionAndScale = (
        position: { x: number; y: number },
        scale: { x: number; y: number },
    ): void => {
        this.position = position
        this.scale = scale
    }

    @action public setImageExportFilePath = (filePath: string): void => {
        this.imageExportFilename = filePath
    }

    @action public clearImageExportFilePath = (): void => {
        this.imageExportFilename = null
    }
}
