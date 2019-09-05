import { observable, action } from 'mobx'
import * as path from 'path'
import * as fs from 'fs'

import { ImageStore } from '../stores/ImageStore'
import { ConfigurationHelper } from '../lib/ConfigurationHelper'
import { PlotStore } from '../stores/PlotStore'

import {
    ImageChannels,
    ChannelName,
    PlotNormalization,
    PlotStatistic,
    PlotTransform,
    PlotType,
    ImageSettingsFilename,
} from '../definitions/UIDefinitions'

interface SettingStoreData {
    channelMarker: Record<ChannelName, string | null> | null
    channelDomainPercentage: Record<ChannelName, [number, number]> | null
    channelVisibility: Record<ChannelName, boolean> | null
    segmentationBasename: string | null
    selectedPlotMarkers: string[] | null
    plotStatistic: PlotStatistic | null
    plotTransform: PlotTransform | null
    plotType: PlotType | null
    plotNormalization: PlotNormalization | null
    segmentationFillAlpha: number | null
    segmentationOutlineAlpha: number | null
    segmentationCentroidsVisible: boolean | null
}

export class SettingStore {
    public constructor(imageStore: ImageStore, plotStore: PlotStore) {
        this.initialize(imageStore, plotStore)
    }

    // Storing the base path of the image set or project path for saving/loading settings from a file.
    @observable public basePath: string | null

    // Storing channel marker and channel domain so that we can copy across image sets even if a channel is missing in a set
    @observable public channelMarker: Record<ChannelName, string | null>
    // channelDomain stored here as percentages.
    @observable public channelDomainPercentage: Record<ChannelName, [number, number]>
    // Which channels are visible
    @observable public channelVisibility: Record<ChannelName, boolean>
    // segmentation file basename when a segmentation file is selected for the whole project
    @observable public segmentationBasename: string | null
    // selected plot channels to be copied
    @observable.ref public selectedPlotMarkers: string[]

    @observable public plotStatistic: PlotStatistic
    @observable public plotTransform: PlotTransform
    @observable public plotType: PlotType
    @observable public plotNormalization: PlotNormalization

    @observable public segmentationFillAlpha: number
    @observable public segmentationOutlineAlpha: number
    @observable public segmentationCentroidsVisible: boolean

    @action public initialize = (imageStore: ImageStore, plotStore: PlotStore) => {
        this.basePath = null

        this.channelMarker = {
            rChannel: null,
            gChannel: null,
            bChannel: null,
            cChannel: null,
            mChannel: null,
            yChannel: null,
            kChannel: null,
        }

        this.channelDomainPercentage = {
            rChannel: [0, 1],
            gChannel: [0, 1],
            bChannel: [0, 1],
            cChannel: [0, 1],
            mChannel: [0, 1],
            yChannel: [0, 1],
            kChannel: [0, 1],
        }

        this.channelVisibility = {
            rChannel: true,
            gChannel: true,
            bChannel: true,
            cChannel: true,
            mChannel: true,
            yChannel: true,
            kChannel: true,
        }

        this.segmentationBasename = null

        this.selectedPlotMarkers = []

        this.plotStatistic = plotStore.plotStatistic
        this.plotTransform = plotStore.plotTransform
        this.plotType = plotStore.plotType
        this.plotNormalization = plotStore.plotNormalization

        this.segmentationFillAlpha = imageStore.segmentationFillAlpha
        this.segmentationOutlineAlpha = imageStore.segmentationOutlineAlpha
        this.segmentationCentroidsVisible = imageStore.segmentationCentroidsVisible
    }

    @action public setBasePath = (path: string) => {
        this.basePath = path
        this.importSettingsFromFile()
    }

    @action public setPlotStatistic = (statistic: PlotStatistic) => {
        this.plotStatistic = statistic
        this.exportSettings()
    }

    @action public setPlotTransform = (transform: PlotTransform) => {
        this.plotTransform = transform
        this.exportSettings()
    }

    // TODO: Feels hacky unsetting selectedPlot markers here and in plot store.
    // Should probably use the same plot store across image sets
    // And extract the settings we want to persist into an ImageSettingStore
    @action public setPlotType = (type: PlotType) => {
        this.plotType = type
        this.selectedPlotMarkers = []
        this.exportSettings()
    }

    @action public setPlotNormalization = (normalization: PlotNormalization) => {
        this.plotNormalization = normalization
        this.exportSettings()
    }

    @action public setSegmentationFillAlpha = (alpha: number) => {
        this.segmentationFillAlpha = alpha
        this.exportSettings()
    }

    @action public setSegmentationOutlineAlpha = (alpha: number) => {
        this.segmentationOutlineAlpha = alpha
        this.exportSettings()
    }

    @action public setSegmentationCentroidsVisible = (visible: boolean) => {
        this.segmentationCentroidsVisible = visible
        this.exportSettings()
    }

    @action public setChannelDomainPercentage = (name: ChannelName, value: [number, number]) => {
        this.channelDomainPercentage[name] = value
        this.exportSettings()
    }

    @action public setChannelVisibility = (name: ChannelName, visible: boolean) => {
        this.channelVisibility[name] = visible
        this.exportSettings()
    }

    @action public setSegmentationBasename = (basename: string) => {
        this.segmentationBasename = basename
        this.exportSettings()
    }

    @action public setSelectedPlotMarkers = (markers: string[]) => {
        this.selectedPlotMarkers = markers
        this.exportSettings()
    }

    @action public clearSelectedPlotMarkers = () => {
        this.selectedPlotMarkers = []
        this.exportSettings()
    }

    @action public setDefaultImageSetSettings = (imageStore: ImageStore, configurationHelper: ConfigurationHelper) => {
        let markers = this.channelMarker
        // Set defaults if the project markers are uninitialized
        let allMarkersUninitalized = ImageChannels.map((value: ChannelName) => {
            return markers[value] == null
        }).reduce((previous: boolean, current: boolean) => {
            return previous && current
        })
        if (allMarkersUninitalized) {
            this.setChannelMarkerDefaults(imageStore, configurationHelper)
            this.setChannelDomainDefaults(imageStore, configurationHelper)
        }
    }

    // If the image store has image data, sets the defaults based on the configuration helper.
    @action public setChannelMarkerDefaults = (imageStore: ImageStore, configurationHelper: ConfigurationHelper) => {
        if (imageStore.imageData != null) {
            let defaultValues = configurationHelper.getDefaultChannelMarkers(imageStore.imageData.markerNames)
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
        this.exportSettings()
    }

    @action public unsetChannelMarker = (imageStore: ImageStore, channelName: ChannelName) => {
        this.channelMarker[channelName] = null
        imageStore.unsetChannelMarker(channelName)
        // When we modify channel markers the channel domain changes. We want to update our domain here to reflect that.
        this.channelDomainPercentage[channelName] = imageStore.getChannelDomainPercentage(channelName)
        this.exportSettings()
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
                    if (imageStore.imageData.markerNames.indexOf(channelValue) != -1) {
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

    @action public copyImageStoreChannelVisibility = (imageStore: ImageStore) => {
        for (let s in this.channelMarker) {
            let channel = s as ChannelName
            imageStore.setChannelVisibility(channel, this.channelVisibility[channel])
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

    @action public copyPlotStoreSettings = (imageStore: ImageStore, plotStore: PlotStore) => {
        plotStore.setPlotType(this.plotType)
        plotStore.setPlotStatistic(this.plotStatistic)
        plotStore.setPlotTransform(this.plotTransform)
        plotStore.setPlotNormalization(this.plotNormalization)
        // Check if the source selected plot markers are in the destination image set. If they are, use them.
        this.setPlotStoreMarkers(imageStore, plotStore)
    }

    @action public setPlotStoreMarkers = (imageStore: ImageStore, plotStore: PlotStore) => {
        let imageData = imageStore.imageData
        if (imageData != null) {
            let selectedPlotMarkers = []
            for (let marker of this.selectedPlotMarkers) {
                if (imageData.markerNames.indexOf(marker) != -1) {
                    selectedPlotMarkers.push(marker)
                }
            }
            plotStore.setSelectedPlotMarkers(selectedPlotMarkers)
        }
    }

    @action public copySegmentationSettings = (imageStore: ImageStore) => {
        imageStore.setSegmentationFillAlpha(this.segmentationFillAlpha)
        imageStore.setSegmentationOutlineAlpha(this.segmentationOutlineAlpha)
        imageStore.setCentroidVisibility(this.segmentationCentroidsVisible)
    }

    // Was an autorun function, but then was getting triggered on first create/initialize and then clobbering any saved settings.
    // As a result, we need to manually call this from any function that we want to trigger an update of settings.
    private exportSettings = () => {
        if (this.basePath != null) {
            let exporting: SettingStoreData = {
                channelMarker: this.channelMarker,
                channelVisibility: this.channelVisibility,
                channelDomainPercentage: this.channelDomainPercentage,
                segmentationBasename: this.segmentationBasename,
                selectedPlotMarkers: this.selectedPlotMarkers,
                plotStatistic: this.plotStatistic,
                plotTransform: this.plotTransform,
                plotType: this.plotType,
                plotNormalization: this.plotNormalization,
                segmentationFillAlpha: this.segmentationFillAlpha,
                segmentationOutlineAlpha: this.segmentationOutlineAlpha,
                segmentationCentroidsVisible: this.segmentationCentroidsVisible,
            }
            let exportingString = JSON.stringify(exporting)
            let filename = path.join(this.basePath, ImageSettingsFilename)
            // Write data to file
            fs.writeFile(filename, exportingString, 'utf8', function(err) {
                if (err) {
                    console.log('An error occured while writing image settings to file.')
                    return console.log(err)
                }
            })
        }
    }

    @action private importSettingsFromFile = () => {
        if (this.basePath != null) {
            let filename = path.join(this.basePath, ImageSettingsFilename)
            if (fs.existsSync(filename)) {
                let importingContent: SettingStoreData = JSON.parse(fs.readFileSync(filename, 'utf8'))
                if (importingContent.channelMarker) this.channelMarker = importingContent.channelMarker
                if (importingContent.channelVisibility) this.channelVisibility = importingContent.channelVisibility
                if (importingContent.channelDomainPercentage)
                    this.channelDomainPercentage = importingContent.channelDomainPercentage
                this.segmentationBasename = importingContent.segmentationBasename
                if (importingContent.selectedPlotMarkers)
                    this.selectedPlotMarkers = importingContent.selectedPlotMarkers
                if (importingContent.plotStatistic) this.plotStatistic = importingContent.plotStatistic
                if (importingContent.plotTransform) this.plotTransform = importingContent.plotTransform
                if (importingContent.plotType) this.plotType = importingContent.plotType
                if (importingContent.plotNormalization) this.plotNormalization = importingContent.plotNormalization
                if (importingContent.segmentationFillAlpha)
                    this.segmentationFillAlpha = importingContent.segmentationFillAlpha
                if (importingContent.segmentationOutlineAlpha)
                    this.segmentationOutlineAlpha = importingContent.segmentationOutlineAlpha
                if (importingContent.segmentationCentroidsVisible)
                    this.segmentationCentroidsVisible = importingContent.segmentationCentroidsVisible
            }
        }
    }
}
