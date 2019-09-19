import { observable, action } from 'mobx'
import * as path from 'path'
import * as fs from 'fs'

import { ImageStore } from '../stores/ImageStore'

import {
    ImageChannels,
    ChannelName,
    PlotNormalization,
    PlotStatistic,
    PlotTransform,
    PlotType,
    ImageSettingsFilename,
    DefaultDotSize,
    DefaultSegmentOutlineAlpha,
    DefaultSegmentFillAlpha,
    DefaultCentroidsVisible,
    PlotStatisticOptions,
    PlotTransformOptions,
    PlotTypeOptions,
    PlotNormalizationOptions,
} from '../definitions/UIDefinitions'
import { ProjectStore } from './ProjectStore'

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
    plotDotSize: number
    segmentationFillAlpha: number | null
    segmentationOutlineAlpha: number | null
    segmentationCentroidsVisible: boolean | null
    legendVisible: boolean | null
    transformCoefficient: number | null
}

export class SettingStore {
    public constructor(projectStore: ProjectStore) {
        this.projectStore = projectStore
        this.initialize()
    }

    private projectStore: ProjectStore

    // Storing the base path of the image set or project path for saving/loading settings from a file.
    @observable public basePath: string | null

    // Image settings below
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
    //Whether or not the legend is visible on the image
    @observable public legendVisible: boolean

    // Segmentation visibility on image settings below
    @observable public segmentationFillAlpha: number
    @observable public segmentationOutlineAlpha: number
    @observable public segmentationCentroidsVisible: boolean

    //Plot settings below
    @observable public plotStatistic: PlotStatistic
    @observable public plotTransform: PlotTransform
    @observable public transformCoefficient: number | null
    @observable public plotType: PlotType
    @observable public plotNormalization: PlotNormalization
    @observable public plotDotSize: number

    @action public initialize = () => {
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

        this.plotStatistic = PlotStatisticOptions[0].value as PlotStatistic
        this.plotTransform = PlotTransformOptions[0].value as PlotTransform
        this.plotType = PlotTypeOptions[0].value as PlotType
        this.plotNormalization = PlotNormalizationOptions[0].value as PlotNormalization
        this.plotDotSize = DefaultDotSize

        this.segmentationFillAlpha = DefaultSegmentFillAlpha
        this.segmentationOutlineAlpha = DefaultSegmentOutlineAlpha
        this.segmentationCentroidsVisible = DefaultCentroidsVisible

        this.legendVisible = false
        this.transformCoefficient = null
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
        this.exportSettings()
    }

    @action public setPlotNormalization = (normalization: PlotNormalization) => {
        this.plotNormalization = normalization
        this.exportSettings()
    }

    @action public setPlotDotSize = (size: number) => {
        this.plotDotSize = size
        this.exportSettings()
    }

    @action public setTransformCoefficient = (coefficient: number) => {
        this.transformCoefficient = coefficient
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

    @action public setLegendVisible = (visible: boolean) => {
        this.legendVisible = visible
        this.exportSettings()
    }

    @action public setChannelDomainPercentageCallback = (name: ChannelName) => {
        return action((value: [number, number]) => {
            this.setChannelDomainPercentage(name, value)
        })
    }

    @action public setChannelDomainPercentage = (name: ChannelName, value: [number, number]) => {
        this.channelDomainPercentage[name] = value
        this.exportSettings()
    }

    @action public setChannelVisibilityCallback = (name: ChannelName) => {
        return action((value: boolean) => {
            this.setChannelVisibility(name, value)
        })
    }

    @action public setChannelVisibility = (name: ChannelName, visible: boolean) => {
        this.channelVisibility[name] = visible
        this.exportSettings()
    }

    @action public setChannelMarkerCallback = (name: ChannelName) => {
        return action((x: string | null) => {
            // If the SelectOption has a value.
            if (x) {
                this.setChannelMarker(name, x)
                // If SelectOption doesn't have a value the channel has been cleared and values should be reset.
            } else {
                this.unsetChannelMarker(name)
            }
        })
    }

    @action public setSegmentationBasename = (basename: string | null) => {
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

    @action public setDefaultImageSetSettings = (imageStore: ImageStore) => {
        let markers = this.channelMarker
        // Set defaults if the project markers are uninitialized
        let allMarkersUninitalized = ImageChannels.map((value: ChannelName) => {
            return markers[value] == null
        }).reduce((previous: boolean, current: boolean) => {
            return previous && current
        })
        if (allMarkersUninitalized) {
            this.setChannelMarkerDefaults(imageStore)
            this.setChannelDomainDefaults()
        }
    }

    // If the image store has image data, sets the defaults based on the configuration helper.
    @action public setChannelMarkerDefaults = (imageStore: ImageStore) => {
        if (imageStore.imageData != null) {
            let configurationHelper = this.projectStore.configurationStore
            let defaultValues = configurationHelper.getDefaultChannelMarkers(imageStore.imageData.markerNames)
            for (let s in defaultValues) {
                let channelName = s as ChannelName
                let markerName = defaultValues[channelName]
                if (markerName != null) this.setChannelMarker(channelName, markerName)
            }
        }
    }

    @action public setChannelDomainDefaults = () => {
        let configurationHelper = this.projectStore.configurationStore
        let defaultValues = configurationHelper.getDefaultChannelDomains()
        for (let s in defaultValues) {
            let channelName = s as ChannelName
            let defaultDomain = defaultValues[channelName]
            this.channelDomainPercentage[channelName] = defaultDomain
            this.setChannelDomainPercentage(channelName, defaultDomain)
        }
    }

    @action public setChannelMarker = (channelName: ChannelName, markerName: string) => {
        let configurationHelper = this.projectStore.configurationStore
        this.channelMarker[channelName] = markerName
        this.channelDomainPercentage[channelName] = [0, 1]
        // Set the channel domain to the default for that channel when we change it.
        let domainPercentage = configurationHelper.getDefaultChannelDomains()[channelName]
        this.channelDomainPercentage[channelName] = domainPercentage
        this.exportSettings()
    }

    @action public unsetChannelMarker = (channelName: ChannelName) => {
        this.channelMarker[channelName] = null
        this.channelDomainPercentage[channelName] = [0, 1]
        this.exportSettings()
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
                plotDotSize: this.plotDotSize,
                segmentationFillAlpha: this.segmentationFillAlpha,
                segmentationOutlineAlpha: this.segmentationOutlineAlpha,
                segmentationCentroidsVisible: this.segmentationCentroidsVisible,
                legendVisible: this.legendVisible,
                transformCoefficient: this.transformCoefficient,
            }
            let exportingString = JSON.stringify(exporting)
            let filename = path.join(this.basePath, ImageSettingsFilename)
            // Write data to file
            fs.writeFileSync(filename, exportingString, 'utf8')
        }
    }

    @action private importSettingsFromFile = () => {
        if (this.basePath != null) {
            let filename = path.join(this.basePath, ImageSettingsFilename)
            if (fs.existsSync(filename)) {
                try {
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
                    if (importingContent.plotDotSize) this.plotDotSize = importingContent.plotDotSize
                    if (importingContent.segmentationFillAlpha)
                        this.segmentationFillAlpha = importingContent.segmentationFillAlpha
                    if (importingContent.segmentationOutlineAlpha)
                        this.segmentationOutlineAlpha = importingContent.segmentationOutlineAlpha
                    if (importingContent.segmentationCentroidsVisible)
                        this.segmentationCentroidsVisible = importingContent.segmentationCentroidsVisible
                    if (importingContent.legendVisible) this.legendVisible = importingContent.legendVisible
                    if (importingContent.transformCoefficient)
                        this.transformCoefficient = importingContent.transformCoefficient
                } catch (e) {
                    console.log('Error importing settings file:')
                    console.log(e)
                }
            }
        }
    }
}
