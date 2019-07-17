import { observable, action } from 'mobx'
import * as path from 'path'
import * as fs from 'fs'

import { ChannelName } from '../interfaces/UIDefinitions'
import { ImageStore } from '../stores/ImageStore'
import { ConfigurationHelper } from '../lib/ConfigurationHelper'
import { PlotStore } from '../stores/PlotStore'

export class SettingStore {
    public constructor() {
        this.initialize()
    }

    // Storing channel marker and channel domain on the project store
    // So that we can copy across image sets even if a channel is missing in a set
    @observable public channelMarker: Record<ChannelName, string | null>
    // channelDomain stored here as percentages.
    @observable public channelDomainPercentage: Record<ChannelName, [number, number]>
    // segmentation file basename when a segmentation file is selected for the whole project
    @observable public segmentationBasename: string | null
    // selected plot channels to be copied
    @observable.ref public selectedPlotChannels: string[]

    @action public initialize = () => {
        this.channelMarker = {
            rChannel: null,
            gChannel: null,
            bChannel: null,
        }

        this.channelDomainPercentage = {
            rChannel: [0, 1],
            gChannel: [0, 1],
            bChannel: [0, 1],
        }

        this.segmentationBasename = null

        this.selectedPlotChannels = []
    }

    @action public setChannelDomainPercentage = (name: ChannelName, value: [number, number]) => {
        this.channelDomainPercentage[name] = value
    }

    @action public setSegmentationBasename = (basename: string) => {
        this.segmentationBasename = basename
    }

    @action public setSelectedPlotChannels = (channels: string[]) => {
        this.selectedPlotChannels = channels
    }

    @action public clearSelectedPlotChannels = () => {
        this.selectedPlotChannels = []
    }

    @action public setDefaultImageSetSettings = (imageStore: ImageStore, configurationHelper: ConfigurationHelper) => {
        let markers = this.channelMarker
        // Set defaults if copyImageSettings is disabled or if the project markers are uninitialized
        if (markers['rChannel'] == null && markers['gChannel'] == null && markers['bChannel'] == null) {
            this.setChannelMarkerDefaults(imageStore, configurationHelper)
            this.setChannelDomainDefaults(imageStore, configurationHelper)
        }
    }

    // If the image store has image data, sets the defaults based on the configuration helper.
    @action public setChannelMarkerDefaults = (imageStore: ImageStore, configurationHelper: ConfigurationHelper) => {
        if (imageStore.imageData != null) {
            let defaultValues = configurationHelper.getDefaultChannelMarkers(imageStore.imageData.channelNames)
            for (let s in defaultValues) {
                let channelName = s as ChannelName
                let markerName = defaultValues[channelName]
                if (markerName != null) this.setChannelMarker(imageStore, configurationHelper, channelName, markerName)
            }
        }
    }

    @action public setChannelDomainDefaults = (imageStore: ImageStore, configurationHelper: ConfigurationHelper) => {
        let defaultValues = configurationHelper.getDefaultChannelDomains()
        for (let s in defaultValues) {
            let channelName = s as ChannelName
            let defaultDomain = defaultValues[channelName]
            this.channelDomainPercentage[channelName] = defaultDomain
            imageStore.setChannelDomainFromPercentage(channelName, defaultDomain)
        }
    }

    @action public setChannelMarker = (
        imageStore: ImageStore,
        configurationHelper: ConfigurationHelper,
        channelName: ChannelName,
        markerName: string,
    ) => {
        this.channelMarker[channelName] = markerName
        imageStore.setChannelMarker(channelName, markerName)
        // Set the channel domain to the default for that channel when we change it.
        let domainPercentage = configurationHelper.getDefaultChannelDomains()[channelName]
        this.channelDomainPercentage[channelName] = domainPercentage
        imageStore.setChannelDomainFromPercentage(channelName, domainPercentage)
    }

    @action public unsetChannelMarker = (imageStore: ImageStore, channelName: ChannelName) => {
        this.channelMarker[channelName] = null
        imageStore.unsetChannelMarker(channelName)
        // When we modify channel markers the channel domain changes. We want to update our domain here to reflect that.
        this.channelDomainPercentage[channelName] = imageStore.getChannelDomainPercentage(channelName)
    }

    // Looks for a segmentation file with the same filename from source in dest and sets it if it exists.
    @action public setImageStoreSegmentationFile = (imageStore: ImageStore) => {
        if (this.segmentationBasename != null) {
            let destinationPath = imageStore.selectedDirectory
            if (destinationPath != null) {
                let segmentationFile = path.join(destinationPath, this.segmentationBasename)
                // Only copy the segmentation basename if basename exists in the dest image set and it's not already set to that.
                if (fs.existsSync(segmentationFile) && imageStore.selectedSegmentationFile == null) {
                    imageStore.setSegmentationFile(segmentationFile)
                }
            }
        }
    }

    // Copies channel markers from the project store to the image store being passed in
    // If a channel marker isn't present in the image store that channel is unset.
    @action public copyImageStoreChannelMarkers = (imageStore: ImageStore) => {
        if (imageStore.imageData != null) {
            for (let s in this.channelMarker) {
                let channelName = s as ChannelName
                let channelValue = this.channelMarker[channelName]
                if (channelValue != null) {
                    if (imageStore.imageData.channelNames.indexOf(channelValue) != -1) {
                        // If the file selected is not null and the destination has a file with the same name set that
                        imageStore.setChannelMarker(channelName, channelValue)
                    } else {
                        // Otherwise unset that channel for the destination
                        imageStore.unsetChannelMarker(channelName)
                    }
                } else {
                    // Unset the channel for the destination if it's unset in the source
                    imageStore.unsetChannelMarker(channelName)
                }
            }
        }
    }

    @action public setImageStoreChannelDomains = (imageStore: ImageStore) => {
        if (imageStore.imageData != null) {
            for (let s in this.channelDomainPercentage) {
                let channelName = s as ChannelName
                let channelPercentages = this.channelDomainPercentage[channelName]
                let channelMarker = imageStore.channelMarker[channelName]
                // Copy the domain if it's not null and if the channelMarker in the destination is the same.
                if (channelMarker != null && channelMarker == this.channelMarker[channelName]) {
                    imageStore.setChannelDomainFromPercentage(channelName, channelPercentages)
                }
            }
        }
    }

    // TODO:
    @action public copyPlotStoreSettings = (
        sourcePlotStore: PlotStore,
        destinationImageStore: ImageStore,
        destinationPlotStore: PlotStore,
    ) => {
        destinationPlotStore.setPlotType(sourcePlotStore.plotType)
        destinationPlotStore.setPlotStatistic(sourcePlotStore.plotStatistic)
        destinationPlotStore.setPlotTransform(sourcePlotStore.plotTransform)
        // Check if the source selected plot channels are in the destination image set. If they are, use them.
        this.setPlotStoreChannels(destinationImageStore, destinationPlotStore)
    }

    @action public setPlotStoreChannels = (destinationImageStore: ImageStore, destinationPlotStore: PlotStore) => {
        let destinationImageData = destinationImageStore.imageData
        if (destinationImageData != null) {
            let selectedPlotChannels = []
            for (let channel of this.selectedPlotChannels) {
                if (destinationImageData.channelNames.indexOf(channel) != -1) {
                    selectedPlotChannels.push(channel)
                }
            }
            destinationPlotStore.setSelectedPlotChannels(selectedPlotChannels)
        }
    }

    @action public copySegmentationSettings = (sourceImageStore: ImageStore, destinationImageStore: ImageStore) => {
        destinationImageStore.setSegmentationFillAlpha(sourceImageStore.segmentationFillAlpha)
        destinationImageStore.setSegmentationOutlineAlpha(sourceImageStore.segmentationOutlineAlpha)
        destinationImageStore.setCentroidVisibility(sourceImageStore.segmentationCentroidsVisible)
    }
}
