import { observable, action, autorun, toJS } from 'mobx'

import { ImageStore } from '../stores/ImageStore'
import { Db } from '../lib/Db'
import { randomHexColor } from '../lib/ColorHelper'

import {
    ImageChannels,
    ChannelName,
    PlotNormalization,
    PlotStatistic,
    PlotTransform,
    PlotType,
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

type SettingStoreData = {
    imageSubdirectory?: string | null
    channelMarker?: Record<ChannelName, string | null> | null
    channelDomainPercentage?: Record<ChannelName, [number, number]> | null
    channelVisibility?: Record<ChannelName, boolean> | null
    segmentationBasename?: string | null
    regionsBasename?: string | null
    regionsFilesLoaded?: string[] | null
    selectedPlotFeatures?: string[] | null
    plotStatistic?: PlotStatistic | null
    plotTransform?: PlotTransform | null
    plotType?: PlotType | null
    plotNormalization?: PlotNormalization | null
    plotDotSize?: number
    plotAllImageSets?: boolean
    plotCheckGenerateAllFeatures?: boolean
    plotCollapseAllImageSets?: boolean
    plotDownsample?: boolean
    plotDownsamplePercent?: number
    plotImageSetColors?: Record<string, number>
    segmentationFillAlpha?: number | null
    segmentationOutlineAlpha?: number | null
    segmentationCentroidsVisible?: boolean | null
    legendVisible?: boolean | null
    zoomInsetVisible?: boolean | null
    transformCoefficient?: number | null
}

export class SettingStore {
    public constructor(projectStore: ProjectStore) {
        this.projectStore = projectStore
        this.initialize()
    }

    private projectStore: ProjectStore
    @observable private db: Db | null

    // Storing the base path of the image set or project path for saving/loading settings from a file.
    @observable public basePath: string | null
    // Storing the subdirectory name where images are stored in an ImageSet. Blank if not used.
    @observable public imageSubdirectory: string | null
    // Image settings below
    // Storing channel marker and channel domain so that we can copy across image sets even if a channel is missing in a set
    @observable public channelMarker: Record<ChannelName, string | null>
    // channelDomain stored here as percentages.
    @observable public channelDomainPercentage: Record<ChannelName, [number, number]>
    // Which channels are visible
    @observable public channelVisibility: Record<ChannelName, boolean>
    // segmentation file basename when a segmentation file is selected for the whole project
    @observable public segmentationBasename: string | null
    // Region file basename when a region file is selected for teh whole project
    @observable public regionsBasename: string | null
    @observable public regionsFilesLoaded: string[]
    // Whether or not the legend is visible on the image
    @observable public legendVisible: boolean
    // Whether or not the zoom inset is visible on the image
    @observable public zoomInsetVisible: boolean

    // Segmentation visibility on image settings below
    @observable public segmentationFillAlpha: number
    @observable public segmentationOutlineAlpha: number
    @observable public segmentationCentroidsVisible: boolean

    // Plot settings below
    // Selected plot features to be copied
    @observable public selectedPlotFeatures: string[]
    @observable public plotStatistic: PlotStatistic
    @observable public plotTransform: PlotTransform
    @observable public transformCoefficient: number | null
    @observable public plotType: PlotType
    @observable public plotNormalization: PlotNormalization
    @observable public plotDotSize: number
    @observable public plotAllImageSets: boolean
    @observable public plotCollapseAllImageSets: boolean
    @observable public plotCheckGenerateAllFeatures: boolean
    @observable public plotDownsample: boolean
    @observable public plotDownsamplePercent: number
    @observable public plotImageSetColors: Record<string, number>

    @action public initialize = (): void => {
        this.basePath = null
        this.db = null
        this.imageSubdirectory = null

        this.channelMarker = {
            rChannel: null,
            gChannel: null,
            bChannel: null,
            cChannel: null,
            mChannel: null,
            yChannel: null,
            kChannel: null,
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
        this.regionsBasename = null
        this.regionsFilesLoaded = []

        this.selectedPlotFeatures = []

        this.plotStatistic = PlotStatisticOptions[0].value as PlotStatistic
        this.plotTransform = PlotTransformOptions[0].value as PlotTransform
        this.plotType = PlotTypeOptions[0].value as PlotType
        this.plotNormalization = PlotNormalizationOptions[0].value as PlotNormalization
        this.plotDotSize = DefaultDotSize
        this.plotAllImageSets = false
        this.plotCollapseAllImageSets = true
        this.plotCheckGenerateAllFeatures = true
        this.plotDownsample = false
        this.plotDownsamplePercent = 1
        this.plotImageSetColors = {}

        this.segmentationFillAlpha = DefaultSegmentFillAlpha
        this.segmentationOutlineAlpha = DefaultSegmentOutlineAlpha
        this.segmentationCentroidsVisible = DefaultCentroidsVisible

        this.legendVisible = true
        this.zoomInsetVisible = true
        this.transformCoefficient = null

        this.segmentationBasename = this.projectStore.preferencesStore.defaultSegmentationBasename
        this.channelDomainPercentage = this.projectStore.preferencesStore.getChannelDomainPercentage()
    }

    @action public setBasePath = (path: string): void => {
        this.initialize()
        this.basePath = path
        this.db = new Db(path)
        this.importSettingsFromDb()
    }

    private initializePlotImageSetColors = autorun(() => {
        const imageSetNames = this.projectStore.allImageSetNames
        if (imageSetNames.length > 0) {
            const imageSetColors: Record<string, number> = {}
            for (const imageSet of imageSetNames) {
                if (imageSet in this.plotImageSetColors) {
                    imageSetColors[imageSet] = this.plotImageSetColors[imageSet]
                } else {
                    imageSetColors[imageSet] = randomHexColor()
                }
            }
            this.setPlotImageSetColors(imageSetColors)
        }
    })

    @action public setImageSubdirectory = (subDir: string): void => {
        this.imageSubdirectory = subDir
    }

    @action public setPlotStatistic = (statistic: PlotStatistic): void => {
        this.plotStatistic = statistic
    }

    @action public setPlotTransform = (transform: PlotTransform): void => {
        this.plotTransform = transform
    }

    @action public setPlotType = (type: PlotType): void => {
        this.plotType = type
    }

    @action public setPlotNormalization = (normalization: PlotNormalization): void => {
        this.plotNormalization = normalization
    }

    @action public setPlotDotSize = (size: number): void => {
        this.plotDotSize = size
    }

    @action public setPlotAllImageSets = (value: boolean): void => {
        this.plotAllImageSets = value
    }

    @action public setPlotCollapseAllImageSets = (value: boolean): void => {
        this.plotCollapseAllImageSets = value
    }

    @action public setPlotDownsample = (value: boolean): void => {
        this.plotDownsample = value
    }

    @action public setPlotDownsamplePercent = (value: number): void => {
        if (value > 1) {
            this.plotDownsamplePercent = 1
        } else if (value < 0) {
            this.plotDownsamplePercent = 0
        } else {
            this.plotDownsamplePercent = value
        }
    }

    @action public setPlotCheckGenerateAllFeatures = (value: boolean): void => {
        this.plotCheckGenerateAllFeatures = value
    }

    @action public setPlotImageSetColors = (imageSetColors: Record<string, number>): void => {
        this.plotImageSetColors = imageSetColors
    }

    @action public setTransformCoefficient = (coefficient: number): void => {
        this.transformCoefficient = coefficient
    }

    @action public setSegmentationFillAlpha = (alpha: number): void => {
        this.segmentationFillAlpha = alpha
    }

    @action public setSegmentationOutlineAlpha = (alpha: number): void => {
        this.segmentationOutlineAlpha = alpha
    }

    @action public setSegmentationCentroidsVisible = (visible: boolean): void => {
        this.segmentationCentroidsVisible = visible
    }

    @action public setLegendVisible = (visible: boolean): void => {
        this.legendVisible = visible
    }

    @action public setZoomInsetVisible = (visible: boolean): void => {
        this.zoomInsetVisible = visible
    }

    @action public setChannelDomainPercentageCallback = (name: ChannelName): ((value: [number, number]) => void) => {
        return action((value: [number, number]) => {
            this.setChannelDomainPercentage(name, value)
        })
    }

    @action public setChannelDomainPercentage = (name: ChannelName, value: [number, number]): void => {
        this.channelDomainPercentage[name] = value
    }

    @action public setChannelVisibilityCallback = (name: ChannelName): ((value: boolean) => void) => {
        return action((value: boolean) => {
            this.setChannelVisibility(name, value)
        })
    }

    @action public setChannelVisibility = (name: ChannelName, visible: boolean): void => {
        this.channelVisibility[name] = visible
    }

    @action public setChannelMarkerCallback = (name: ChannelName): ((x: string | null) => void) => {
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

    @action public setSegmentationBasename = (basename: string | null): void => {
        this.segmentationBasename = basename
    }

    @action public setRegionsBasename = (basename: string | null): void => {
        this.regionsBasename = basename
        this.regionsFilesLoaded = []
    }

    @action public addToRegionFilesLoaded = (imageSet: string): void => {
        this.regionsFilesLoaded = this.regionsFilesLoaded.concat([imageSet])
    }

    @action public setSelectedPlotFeatures = (features: string[]): void => {
        this.selectedPlotFeatures = features
    }

    @action public clearSelectedPlotFeatures = (): void => {
        this.selectedPlotFeatures = []
    }

    @action public setDefaultImageSetSettings = (imageStore: ImageStore): void => {
        const markers = this.channelMarker
        // Set defaults if the project markers are uninitialized
        const allMarkersUninitialized = ImageChannels.map((value: ChannelName) => {
            return markers[value] == null
        }).reduce((previous: boolean, current: boolean) => {
            return previous && current
        })
        if (allMarkersUninitialized) {
            this.setChannelMarkerDefaults(imageStore)
        }
    }

    // If the image store has image data, sets the defaults based on the users' preferences.
    @action public setChannelMarkerDefaults = (imageStore: ImageStore): void => {
        if (imageStore.imageData != null) {
            const preferencesStore = this.projectStore.preferencesStore
            const defaultValues = preferencesStore.getDefaultChannelMarkers(imageStore.imageData.markerNames)
            for (const s in defaultValues) {
                const channelName = s as ChannelName
                const markerName = defaultValues[channelName]
                if (markerName != null) this.setChannelMarker(channelName, markerName)
            }
        }
    }
    @action public setChannelMarker = (channelName: ChannelName, markerName: string): void => {
        this.channelMarker[channelName] = markerName
        this.setDefaultChannelDomainPercentage(channelName)
    }

    @action public unsetChannelMarker = (channelName: ChannelName): void => {
        this.channelMarker[channelName] = null
        this.setDefaultChannelDomainPercentage(channelName)
    }

    @action private setDefaultChannelDomainPercentage = (channelName: ChannelName): void => {
        const preferencesStore = this.projectStore.preferencesStore
        const domains = preferencesStore.getChannelDomainPercentage()
        const domainPercentage = domains[channelName]
        this.channelDomainPercentage[channelName] = domainPercentage
    }

    private exportSettings = autorun(() => {
        if (this.db != null) {
            const exporting: SettingStoreData = {
                imageSubdirectory: this.imageSubdirectory,
                channelMarker: this.channelMarker,
                channelVisibility: this.channelVisibility,
                channelDomainPercentage: this.channelDomainPercentage,
                segmentationBasename: this.segmentationBasename,
                regionsBasename: this.regionsBasename,
                regionsFilesLoaded: toJS(this.regionsFilesLoaded),
                selectedPlotFeatures: toJS(this.selectedPlotFeatures),
                plotStatistic: this.plotStatistic,
                plotTransform: this.plotTransform,
                plotType: this.plotType,
                plotNormalization: this.plotNormalization,
                plotDotSize: this.plotDotSize,
                plotAllImageSets: this.plotAllImageSets,
                plotCollapseAllImageSets: this.plotCollapseAllImageSets,
                plotCheckGenerateAllFeatures: this.plotCheckGenerateAllFeatures,
                plotDownsample: this.plotDownsample,
                plotDownsamplePercent: this.plotDownsamplePercent,
                plotImageSetColors: this.plotImageSetColors,
                segmentationFillAlpha: this.segmentationFillAlpha,
                segmentationOutlineAlpha: this.segmentationOutlineAlpha,
                segmentationCentroidsVisible: this.segmentationCentroidsVisible,
                legendVisible: this.legendVisible,
                zoomInsetVisible: this.zoomInsetVisible,
                transformCoefficient: this.transformCoefficient,
            }
            try {
                this.db.upsertSettings(exporting)
            } catch (e) {
                console.log('Error exporting settings to db:')
                console.log(e)
            }
        }
    })

    private importSettingsFromDb = (): void => {
        if (this.db != null) {
            try {
                const importingSettings: SettingStoreData = this.db.getSettings()
                if (importingSettings.imageSubdirectory) this.imageSubdirectory = importingSettings.imageSubdirectory
                if (importingSettings.channelMarker) this.channelMarker = importingSettings.channelMarker
                if (importingSettings.channelVisibility) this.channelVisibility = importingSettings.channelVisibility
                if (importingSettings.channelDomainPercentage)
                    this.channelDomainPercentage = importingSettings.channelDomainPercentage
                if (importingSettings.segmentationBasename)
                    this.segmentationBasename = importingSettings.segmentationBasename
                if (importingSettings.regionsBasename) this.regionsBasename = importingSettings.regionsBasename
                if (importingSettings.regionsFilesLoaded) this.regionsFilesLoaded = importingSettings.regionsFilesLoaded
                if (importingSettings.selectedPlotFeatures)
                    this.selectedPlotFeatures = importingSettings.selectedPlotFeatures
                if (importingSettings.plotStatistic) this.plotStatistic = importingSettings.plotStatistic
                if (importingSettings.plotTransform) this.plotTransform = importingSettings.plotTransform
                if (importingSettings.plotType) this.plotType = importingSettings.plotType
                if (importingSettings.plotNormalization) this.plotNormalization = importingSettings.plotNormalization
                if (importingSettings.plotDotSize) this.plotDotSize = importingSettings.plotDotSize
                if (importingSettings.plotAllImageSets != null)
                    this.plotAllImageSets = importingSettings.plotAllImageSets
                if (importingSettings.plotCollapseAllImageSets != null)
                    this.plotCollapseAllImageSets = importingSettings.plotCollapseAllImageSets
                if (importingSettings.plotCheckGenerateAllFeatures != null)
                    this.plotCheckGenerateAllFeatures = importingSettings.plotCheckGenerateAllFeatures
                if (importingSettings.plotDownsample) this.plotDownsample = importingSettings.plotDownsample
                if (importingSettings.plotDownsamplePercent)
                    this.plotDownsamplePercent = importingSettings.plotDownsamplePercent
                if (importingSettings.plotImageSetColors) this.plotImageSetColors = importingSettings.plotImageSetColors
                if (importingSettings.segmentationFillAlpha)
                    this.segmentationFillAlpha = importingSettings.segmentationFillAlpha
                if (importingSettings.segmentationOutlineAlpha)
                    this.segmentationOutlineAlpha = importingSettings.segmentationOutlineAlpha
                if (importingSettings.segmentationCentroidsVisible != null)
                    this.segmentationCentroidsVisible = importingSettings.segmentationCentroidsVisible
                if (importingSettings.legendVisible != null) this.legendVisible = importingSettings.legendVisible
                if (importingSettings.zoomInsetVisible != null)
                    this.zoomInsetVisible = importingSettings.zoomInsetVisible
                if (importingSettings.transformCoefficient)
                    this.transformCoefficient = importingSettings.transformCoefficient
            } catch (e) {
                console.log('Error importing settings from db:')
                console.log(e)
            }
        }
    }
}
