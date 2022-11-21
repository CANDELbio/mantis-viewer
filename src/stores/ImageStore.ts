import { observable, action, computed } from 'mobx'
import * as path from 'path'

import { ImageSetStore } from './ImageSetStore'
import { ImageChannels, ChannelName } from '../definitions/UIDefinitions'
import { ImageData } from '../lib/ImageData'

export class ImageStore {
    public constructor(imageSetStore: ImageSetStore) {
        this.imageSetStore = imageSetStore
        this.initialize()
    }

    private imageSetStore: ImageSetStore

    @observable.ref public imageData: ImageData | null
    @observable public imageDataLoading: boolean

    @observable public imageExportFilename: string | null

    @observable private selectedDirectory: string | null

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
        const preferencesStore = this.imageSetStore.projectStore.preferencesStore
        for (const channel of ImageChannels) {
            const channelMarker = settingStore.channelMarker[channel]
            if (this.imageData && channelMarker) {
                const channelMinMax = this.imageData.minmax[channelMarker]
                if (channelMinMax) {
                    const channelMin = channelMinMax.min
                    const channelMax = channelMinMax.max
                    const channelDomainValue = settingStore.channelDomainValue[channel]
                    if (preferencesStore.scaleChannelDomainValues) {
                        // If the user's preference is to scale channel domain values, the domain value is a percentage
                        // that we multiply by the max to get the actual channel domain for the current marker.
                        results[channel][0] = channelMax * channelDomainValue[0]
                        results[channel][1] = channelMax * channelDomainValue[1]
                    } else {
                        // If the user's preference is not to channel domain values, the domain value is an actual value
                        // that we use unless it's past the min/max.
                        results[channel][0] = Math.max(channelMin, channelDomainValue[0])
                        results[channel][1] = Math.min(channelMax, channelDomainValue[1])
                    }
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
        this.removeSegmentationFileFromMarkers()
        this.setImageDataLoading(false)
    }

    @action public clearImageData = (): void => {
        this.imageData?.destroyGraphics()
        this.imageData = null
    }

    @action public selectDirectory = (dirName: string): void => {
        this.selectedDirectory = dirName
        this.refreshImageData()
    }

    private getMarkerNamesOverridePath = (): string | null => {
        let markerNamesOverridePath = null
        const markerNamesOverride = this.imageSetStore.projectStore.settingStore.markerNamesOverride
        const projectPath = this.imageSetStore.projectStore.projectPath
        if (this.selectedDirectory && projectPath) {
            if (markerNamesOverride?.project) {
                markerNamesOverridePath = path.join(projectPath, markerNamesOverride.basename)
            }
            if (typeof markerNamesOverride?.project === 'boolean' && !markerNamesOverride.project) {
                markerNamesOverridePath = path.join(this.selectedDirectory, markerNamesOverride.basename)
            }
        }
        return markerNamesOverridePath
    }

    @action public refreshImageData = (): void => {
        if (this.selectedDirectory != null && this.imageData == null) {
            const markerNamesOverridePath = this.getMarkerNamesOverridePath()
            this.setImageDataLoading(true)
            const imageData = new ImageData()
            // Load image data in the background and set on the image store once it's loaded.
            imageData.loadFolder(this.selectedDirectory, markerNamesOverridePath, (data) => {
                this.setImageData(data)
            })
        }
    }

    @action public removeMarker = (fileName: string): void => {
        const markerName = path.parse(fileName).name
        if (this.imageData != null && this.imageData.markerNames.includes(markerName)) {
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

    @action public removeSegmentationFileFromMarkers = (): void => {
        const selectedSegmentationFile = this.imageSetStore.segmentationStore.selectedSegmentationFile
        if (selectedSegmentationFile) {
            this.removeMarker(selectedSegmentationFile)
        }
    }

    @action public setImageExportFilePath = (filePath: string): void => {
        this.imageExportFilename = filePath
    }

    @action public clearImageExportFilePath = (): void => {
        this.imageExportFilename = null
    }
}
