// Stores settings for the current project.
// Used to copy settings (e.g. selected channels) when switching between images
// in a project or when reloading a project after closing the application.
//
// TODO: Would probably be best to refactor this setting store into appropriate existing
// stores or new stores and then create a util that saves and loads to/from db to
// the appropriate store
import log from 'electron-log'
import { action, autorun, computed, observable, toJS } from 'mobx'

import { ProjectStore } from './ProjectStore'
import {
    ImageChannels,
    ChannelName,
    ChannelColorMap,
    PlotNormalization,
    PlotStatistic,
    PlotTransform,
    PlotType,
    DefaultDotSize,
    DefaultSegmentOutlineAlpha,
    DefaultSegmentFillAlpha,
    DefaultSelectedRegionAlpha,
    DefaultNumHistogramBins,
    PlotStatisticOptions,
    PlotTransformOptions,
    PlotTypeOptions,
    PlotNormalizationOptions,
    MinZoomCoefficient,
} from '../definitions/UIDefinitions'
import {
    MinMax,
    ChannelMappings,
    ChannelMarkerMapping,
    ChannelColorMapping,
    Coordinate,
} from '../interfaces/ImageInterfaces'
import { randomHexColor } from '../lib/ColorHelper'
import { Db } from '../lib/Db'
import { parseChannelMarkerMappingCSV, writeChannelMarkerMappingsCSV } from '../lib/IO'
import { ImageStore } from '../stores/ImageStore'

type SettingStoreData = {
    activeImageSet?: string | null
    imagePositionAndScales?: Record<string, { position: Coordinate; scale: Coordinate }>
    imageSubdirectory?: string | null
    markerNamesOverride?: { basename: string; project: boolean } | null
    channelColor?: ChannelColorMapping
    channelMarker?: ChannelMarkerMapping | null
    channelDomainValue?: Record<ChannelName, [number, number]> | null
    markerDomainValue?: Record<string, [number, number]>
    channelVisibility?: Record<ChannelName, boolean> | null
    segmentationBasename?: string | null
    autoLoadSegmentation?: boolean
    autoCalculateSegmentFeatures?: boolean
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
    plotNumHistogramBins?: number
    plotXLogScale?: boolean
    plotYLogScale?: boolean
    plotHiddenPopulations?: string[]
    segmentationFillAlpha?: number | null
    segmentationOutlineAlpha?: number | null
    selectedRegionAlpha?: number | null
    segmentationCentroidsVisible?: boolean | null
    channelLegendVisible?: boolean | null
    populationLegendVisible?: boolean | null
    regionLegendVisible?: boolean | null
    featureLegendVisible?: boolean | null
    sortLegendFeatures?: boolean | null
    zoomInsetVisible?: boolean | null
    transformCoefficient?: number | null
    channelMappings?: ChannelMappings
    zoomCoefficient?: number
    globalPopulationAttributes?: Record<string, { color: number; visible: boolean }>
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
    // Storing the active image set so we can reload it.
    // TODO: DRY up with activeImageSet in project store.
    @observable public activeImageSet: string | null
    // The position and scale for all images so they persist between reloads
    @observable public imagePositionAndScales: Record<string, { position: Coordinate; scale: Coordinate }>
    // The global zoom/scale. Used if the user chooses to maintain scale between images
    @observable public globalImageScale: Coordinate
    // Storing the subdirectory name where images are stored in an ImageSet. Blank if not used.
    @observable public imageSubdirectory: string | null
    // Information about file(s) to override marker names.
    // Only used for stacked tiffs.
    // If basename has a value and project is true, looks for a file in the project folder.
    // If basename has a value and project is false, looks for a file in the image folder.
    @observable public markerNamesOverride: { basename: string; project: boolean } | null
    // Image settings below
    // Storing channel marker and channel domain so that we can copy across image sets even if a channel is missing in a set
    @observable public channelMarker: Record<ChannelName, string | null>
    // channelDomain stored here as raw values or percentages depending on what the user has set in settings.
    @observable public channelDomainValue: Record<ChannelName, [number, number]>
    // channelDomain values but stored by marker to remember brightness values for a marker when switching.
    @observable public markerDomainValue: Record<string, [number, number]>
    // Which channels are visible
    @observable public channelVisibility: Record<ChannelName, boolean>
    // Mapping of channel to user selected colors.
    // TODO: Eventually should be replaced with any number of markers with colors and combined with the marker mapping,
    // but more work than we want to do before replacing the renderer.
    @observable public channelColor: Record<ChannelName, number>
    // segmentation file basename when a segmentation file is selected for the whole project
    @observable public segmentationBasename: string | null
    // Whether or not segmentation is automatically loaded when switching between images
    @observable public autoLoadSegmentation: boolean
    // Whether or not Mantis should automatically calculate segment features
    @observable public autoCalculateSegmentFeatures: boolean
    // Region file basename when a region file is selected for the whole project
    @observable public regionsBasename: string | null
    @observable public regionsFilesLoaded: string[]
    // Whether or not the channel/population/feature legend is visible on the image
    @observable public channelLegendVisible: boolean
    @observable public populationLegendVisible: boolean
    @observable public featureLegendVisible: boolean
    @observable public sortLegendFeatures: boolean
    @observable public regionLegendVisible: boolean
    // Whether or not the zoom inset is visible on the image
    @observable public zoomInsetVisible: boolean
    // Saves ChannelMappings with names so that the user can quickly switch between different mappings.
    @observable public channelMappings: ChannelMappings

    @observable public zoomCoefficient: number

    // Segmentation visibility on image settings below
    @observable public segmentationFillAlpha: number
    @observable public segmentationOutlineAlpha: number
    @observable public selectedRegionAlpha: number

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
    @observable public plotNumHistogramBins: number
    @observable public plotXLogScale: boolean
    @observable public plotYLogScale: boolean
    @observable public plotHiddenPopulations: string[]

    // Used to sync population visibility and color across images
    // Really dirty and hacky way to do this. Long term need to update
    // the db schema and population store. Doing this for now and will
    // revisit when adding cross-image populations
    @observable public globalPopulationAttributes: Record<string, { color: number; visible: boolean }>

    @action public initialize = (): void => {
        this.basePath = null
        this.db = null
        this.imageSubdirectory = null
        this.activeImageSet = null

        this.imagePositionAndScales = {}

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

        this.channelColor = ChannelColorMap

        this.segmentationBasename = null
        this.autoLoadSegmentation = true
        this.autoCalculateSegmentFeatures = false
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
        this.plotNumHistogramBins = DefaultNumHistogramBins
        this.plotXLogScale = false
        this.plotYLogScale = false
        this.plotHiddenPopulations = []

        this.segmentationFillAlpha = DefaultSegmentFillAlpha
        this.segmentationOutlineAlpha = DefaultSegmentOutlineAlpha
        this.selectedRegionAlpha = DefaultSelectedRegionAlpha

        this.channelLegendVisible = true
        this.populationLegendVisible = false
        this.featureLegendVisible = true
        this.sortLegendFeatures = false
        this.regionLegendVisible = false
        this.zoomInsetVisible = true
        this.transformCoefficient = null

        this.segmentationBasename = this.projectStore.preferencesStore.defaultSegmentationBasename
        this.channelDomainValue = this.projectStore.preferencesStore.getChannelDomainPercentage()
        this.markerDomainValue = {}
        this.channelMappings = {}

        this.zoomCoefficient = MinZoomCoefficient

        this.globalPopulationAttributes = {}
    }

    @action public setBasePath = (path: string): void => {
        this.initialize()
        this.basePath = path
        this.db = new Db(path)
        this.importSettingsFromDb()
    }

    private initializePlotImageSetColors = autorun(() => {
        const imageSetNames = this.projectStore.imageSetNames
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

    @action public setActiveImageSet = (imageSet: string): void => {
        this.activeImageSet = imageSet
    }

    @action public setMarkerNamesOverride = (basename: string, project: boolean): void => {
        this.markerNamesOverride = { basename: basename, project: project }
    }

    @action public clearMarkerNamesOverride = (): void => {
        this.markerNamesOverride = null
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

    @action public setPlotNumHistogramBins = (numBins: number): void => {
        this.plotNumHistogramBins = numBins
    }

    @action public setPlotXLogScale = (value: boolean): void => {
        this.plotXLogScale = value
    }

    @action public setPlotYLogScale = (value: boolean): void => {
        this.plotYLogScale = value
    }

    @action public updateHiddenPopulation = (populationName: string): void => {
        if (this.plotHiddenPopulations.includes(populationName)) {
            this.plotHiddenPopulations = this.plotHiddenPopulations.filter(
                (curPop: string): boolean => curPop != populationName,
            )
        } else {
            const updatedHiddenPopulations = this.plotHiddenPopulations.slice()
            updatedHiddenPopulations.push(populationName)
            this.plotHiddenPopulations = updatedHiddenPopulations
        }
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

    @action public setSelectedRegionAlpha = (alpha: number): void => {
        this.selectedRegionAlpha = alpha
    }

    @action public setZoomCoefficient = (value: number): void => {
        this.zoomCoefficient = value
    }

    @action public setChannelLegendVisible = (visible: boolean): void => {
        this.channelLegendVisible = visible
    }

    @action public setPopulationLegendVisible = (visible: boolean): void => {
        this.populationLegendVisible = visible
    }

    @action public setFeatureLegendVisible = (visible: boolean): void => {
        this.featureLegendVisible = visible
    }

    @action public setSortLegendFeatures = (sort: boolean): void => {
        this.sortLegendFeatures = sort
    }

    @action public setRegionLegendVisible = (visible: boolean): void => {
        this.regionLegendVisible = visible
    }

    @action public setZoomInsetVisible = (visible: boolean): void => {
        this.zoomInsetVisible = visible
    }

    @action public setChannelDomainValueCallback = (
        name: ChannelName,
    ): ((value: [number, number], minMax: MinMax) => void) => {
        return action((value: [number, number], minMax: MinMax) => {
            this.setChannelDomainValue(name, value, minMax)
        })
    }

    @action private setChannelDomainValue = (name: ChannelName, value: [number, number], minMax: MinMax): void => {
        this.channelDomainValue[name] = value
        const preferencesStore = this.projectStore.preferencesStore
        if (preferencesStore.scaleChannelDomainValues) {
            // If scaling, convert to a percentage based on the max first.
            this.channelDomainValue[name] = [value[0] / minMax.max, value[1] / minMax.max]
        } else {
            // Otherwise just store the raw values
            this.channelDomainValue[name] = value
        }
        const curMarker = this.channelMarker[name]
        if (curMarker) {
            this.markerDomainValue[curMarker] = this.channelDomainValue[name]
        }
    }

    @action private incrementChannelDomainValue = (
        name: ChannelName,
        incrementFn: (v: [number, number], minMax: MinMax) => [number, number],
    ): void => {
        const curMarker = this.channelMarker[name]
        const minMaxes = this.projectStore.activeImageSetStore.imageStore.imageData?.minmax
        if (curMarker && minMaxes) {
            const curMinMax = minMaxes[curMarker]
            const curValue = this.channelDomainValue[name]
            if (curMarker) {
                const newValues = incrementFn(curValue, curMinMax)
                const checkValue = (v: number): number => {
                    if (v > curMinMax.max) return curMinMax.max
                    if (v < curMinMax.min) return curMinMax.min
                    return v
                }
                this.channelDomainValue[name] = newValues.map(checkValue) as [number, number]
                this.markerDomainValue[curMarker] = this.channelDomainValue[name]
            }
        }
    }

    public increaseMaxChannelDomainValue = (name: ChannelName): void => {
        const increaseFn = (curValues: [number, number], minMax: MinMax): [number, number] => {
            return [curValues[0], curValues[1] + minMax.max * 0.01]
        }
        this.incrementChannelDomainValue(name, increaseFn)
    }

    public decreaseMaxChannelDomainValue = (name: ChannelName): void => {
        const decreaseFn = (curValues: [number, number], minMax: MinMax): [number, number] => {
            return [curValues[0], curValues[1] - minMax.max * 0.01]
        }
        this.incrementChannelDomainValue(name, decreaseFn)
    }

    public increaseMinChannelDomainValue = (name: ChannelName): void => {
        const increaseFn = (curValues: [number, number], minMax: MinMax): [number, number] => {
            return [curValues[0] + minMax.max * 0.01, curValues[1]]
        }
        this.incrementChannelDomainValue(name, increaseFn)
    }

    public decreaseMinChannelDomainValue = (name: ChannelName): void => {
        const decreaseFn = (curValues: [number, number], minMax: MinMax): [number, number] => {
            return [curValues[0] - minMax.max * 0.01, curValues[1]]
        }
        this.incrementChannelDomainValue(name, decreaseFn)
    }

    @action public setChannelVisibilityCallback = (name: ChannelName): ((value: boolean) => void) => {
        return action((value: boolean) => {
            this.setChannelVisibility(name, value)
        })
    }

    @action private setChannelVisibility = (name: ChannelName, visible: boolean): void => {
        this.channelVisibility[name] = visible
    }

    @action public toggleChannelVisibility = (name: ChannelName): void => {
        this.channelVisibility[name] = !this.channelVisibility[name]
    }

    @action public setChannelColorCallback = (name: ChannelName): ((value: number) => void) => {
        return action((value: number) => {
            this.setChannelColor(name, value)
        })
    }

    @action private setChannelColor = (name: ChannelName, color: number): void => {
        this.channelColor[name] = color
    }

    @action public setChannelMarkerCallback = (name: ChannelName): ((marker: string | null) => void) => {
        return action((marker: string | null) => {
            // If the SelectOption has a value.
            if (marker) {
                const activeImageData = this.projectStore.activeImageSetStore.imageStore.imageData
                if (activeImageData) {
                    this.setChannelMarker(name, marker, activeImageData.minmax[marker])
                }
                // If SelectOption doesn't have a value the channel has been cleared and values should be reset.
            } else {
                this.unsetChannelMarker(name)
            }
        })
    }

    @action public setSegmentationBasename = (basename: string | null): void => {
        this.segmentationBasename = basename
    }

    @action public setAutoLoadSegmentation = (value: boolean): void => {
        this.autoLoadSegmentation = value
    }

    @action public setAutoCalculateSegmentFeatures = (value: boolean): void => {
        this.autoCalculateSegmentFeatures = value
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
            const markerMinMaxes = imageStore.imageData.minmax
            for (const s in defaultValues) {
                const channelName = s as ChannelName
                const markerName = defaultValues[channelName]
                if (markerName != null) this.setChannelMarker(channelName, markerName, markerMinMaxes[markerName])
            }
        }
    }

    @action private setChannelMarker = (channelName: ChannelName, markerName: string, markerMinMax: MinMax): void => {
        this.channelMarker[channelName] = markerName
        this.setDefaultChannelDomainValue(channelName, markerMinMax)
    }

    @action public unsetChannelMarker = (channelName: ChannelName): void => {
        this.channelMarker[channelName] = null
        this.setDefaultChannelDomainValue(channelName)
    }

    @action public resetChannelDomainValues = (): void => {
        const activeImageData = this.projectStore.activeImageSetStore.imageStore.imageData
        if (activeImageData) {
            ImageChannels.map((channel: ChannelName) => {
                const marker = this.channelMarker[channel]
                if (marker) this.setDefaultChannelDomainValue(channel, activeImageData.minmax[marker])
            })
        }
    }

    @action private setDefaultChannelDomainValue = (channelName: ChannelName, markerMinMax?: MinMax): void => {
        let valueSet = false
        const curMarker = this.channelMarker[channelName]
        if (curMarker) {
            const markerDomainValue = this.markerDomainValue[curMarker]
            if (markerDomainValue) {
                this.channelDomainValue[channelName] = [...markerDomainValue]
                valueSet = true
            }
        }
        if (!valueSet) {
            const preferencesStore = this.projectStore.preferencesStore

            const domains = preferencesStore.getChannelDomainPercentage()
            const domainPercentage = domains[channelName]
            if (!preferencesStore.scaleChannelDomainValues && markerMinMax) {
                this.channelDomainValue[channelName] = [
                    domainPercentage[0] * markerMinMax.max,
                    domainPercentage[1] * markerMinMax.max,
                ]
            } else {
                this.channelDomainValue[channelName] = domainPercentage
            }
        }
    }

    @action public saveChannelMapping = (name: string): void => {
        if (this.channelMarker) {
            const activeMappingName = this.activeChannelMapping
            if (activeMappingName) delete this.channelMappings[activeMappingName]
            this.channelMappings[name] = {
                markers: JSON.parse(JSON.stringify(this.channelMarker)),
                colors: JSON.parse(JSON.stringify(this.channelColor)),
            }
        }
    }

    @action public deleteChannelMarkerMapping = (name: string): void => {
        delete this.channelMappings[name]
    }

    @action public loadChannelMarkerMapping = (name: string): void => {
        const selectedChannelMarkerMapping = this.channelMappings[name]
        if (selectedChannelMarkerMapping) {
            this.channelMarker = JSON.parse(JSON.stringify(selectedChannelMarkerMapping.markers))
            this.channelColor = JSON.parse(JSON.stringify(selectedChannelMarkerMapping.colors))
        }
        this.resetChannelDomainValues()
    }

    private get sortedChannelMappingNames(): string[] {
        const collator = new Intl.Collator(undefined, {
            numeric: true,
            sensitivity: 'base',
        })
        const sortedChannelMappingNames = Object.keys(this.channelMappings).slice().sort(collator.compare)
        return sortedChannelMappingNames
    }

    // TODO: Dry these two functions up by making a clever nextIndex callback function
    private incrementChannelMarkerMapping = (incIndexFn: (curIndex: number, sortedNames: string[]) => number): void => {
        const activeChannelMarkerMapping = this.activeChannelMapping
        if (activeChannelMarkerMapping) {
            const sortedChannelMappingNames = this.sortedChannelMappingNames
            const activeChannelMarkerMappingIndex = sortedChannelMappingNames.indexOf(activeChannelMarkerMapping)
            const nextIndex = incIndexFn(activeChannelMarkerMappingIndex, sortedChannelMappingNames)
            this.loadChannelMarkerMapping(sortedChannelMappingNames[nextIndex])
        }
    }

    public nextChannelMarkerMapping = (): void => {
        const nextIndexFn = (curIndex: number, sortedNames: string[]): number => {
            return curIndex == sortedNames.length - 1 ? 0 : curIndex + 1
        }
        this.incrementChannelMarkerMapping(nextIndexFn)
    }

    public previousChannelMarkerMapping = (): void => {
        const prevIndexFn = (curIndex: number, sortedNames: string[]): number => {
            return curIndex == 0 ? sortedNames.length - 1 : curIndex - 1
        }
        this.incrementChannelMarkerMapping(prevIndexFn)
    }

    @action public importChannelMarkerMappingsFromCSV = (filename: string): void => {
        const importing = parseChannelMarkerMappingCSV(filename)
        this.channelMappings = { ...this.channelMappings, ...importing }
    }

    public exportChannelMarkerMappingsToCSV = (filename: string): void => {
        writeChannelMarkerMappingsCSV(this.channelMappings, filename)
    }

    @computed public get activeChannelMapping(): string | null {
        const activeMarkerMapping = this.channelMarker
        const activeColorMapping = this.channelColor
        const mappings = this.channelMappings
        for (const name in mappings) {
            const curMapping = mappings[name]
            let allTheSame = true
            for (const curChannel of ImageChannels) {
                if (
                    curMapping.markers[curChannel] != activeMarkerMapping[curChannel] ||
                    curMapping.colors[curChannel] != activeColorMapping[curChannel]
                ) {
                    allTheSame = false
                    break
                }
            }
            if (allTheSame) return name
        }
        return null
    }

    @action public updateGlobalPopulationAttributes = (name: string, color: number, visible: boolean): void => {
        this.globalPopulationAttributes[name] = { color: color, visible: visible }
    }

    @action public addToGlobalPopulationAttributes = (name: string, color: number, visible: boolean): void => {
        if (!this.globalPopulationAttributes[name])
            this.globalPopulationAttributes[name] = { color: color, visible: visible }
    }

    @action public setActivePositionAndScale = (position: Coordinate, scale: Coordinate): void => {
        const activeImageSet = this.activeImageSet
        if (activeImageSet) {
            this.imagePositionAndScales[activeImageSet] = { position: position, scale: scale }
            this.globalImageScale = scale
        }
    }

    @computed public get activePositionAndScale(): {
        position: Coordinate
        scale: Coordinate
    } | null {
        const activeImageSet = this.activeImageSet
        if (activeImageSet) {
            const maintainScale = this.projectStore.preferencesStore.maintainImageScale
            const activePositionAndScale = this.imagePositionAndScales[activeImageSet]
            const position = activePositionAndScale ? activePositionAndScale.position : { x: 0, y: 0 }
            if (maintainScale) return { position: position, scale: this.globalImageScale }
            return activePositionAndScale
        }
        return null
    }

    private exportSettings = autorun(() => {
        if (this.db != null) {
            const exporting: SettingStoreData = {
                imageSubdirectory: this.imageSubdirectory,
                activeImageSet: this.activeImageSet,
                imagePositionAndScales: this.imagePositionAndScales,
                markerNamesOverride: this.markerNamesOverride,
                channelColor: this.channelColor,
                channelMarker: this.channelMarker,
                channelVisibility: this.channelVisibility,
                channelDomainValue: this.channelDomainValue,
                markerDomainValue: this.markerDomainValue,
                segmentationBasename: this.segmentationBasename,
                autoLoadSegmentation: this.autoLoadSegmentation,
                autoCalculateSegmentFeatures: this.autoCalculateSegmentFeatures,
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
                plotNumHistogramBins: this.plotNumHistogramBins,
                plotXLogScale: this.plotXLogScale,
                plotYLogScale: this.plotYLogScale,
                plotHiddenPopulations: toJS(this.plotHiddenPopulations),
                segmentationFillAlpha: this.segmentationFillAlpha,
                segmentationOutlineAlpha: this.segmentationOutlineAlpha,
                selectedRegionAlpha: this.selectedRegionAlpha,
                channelLegendVisible: this.channelLegendVisible,
                populationLegendVisible: this.populationLegendVisible,
                featureLegendVisible: this.featureLegendVisible,
                sortLegendFeatures: this.sortLegendFeatures,
                regionLegendVisible: this.regionLegendVisible,
                zoomInsetVisible: this.zoomInsetVisible,
                transformCoefficient: this.transformCoefficient,
                channelMappings: this.channelMappings,
                zoomCoefficient: this.zoomCoefficient,
                globalPopulationAttributes: this.globalPopulationAttributes,
            }
            try {
                this.db.upsertSettings(exporting)
            } catch (e) {
                log.error('Error exporting settings to db:')
                log.error(e)
            }
        }
    })

    private importSettingsFromDb = (): void => {
        if (this.db != null) {
            try {
                const importingSettings: SettingStoreData = this.db.getSettings()
                if (importingSettings.imageSubdirectory) this.imageSubdirectory = importingSettings.imageSubdirectory
                if (importingSettings.activeImageSet) this.activeImageSet = importingSettings.activeImageSet
                if (importingSettings.imagePositionAndScales)
                    this.imagePositionAndScales = importingSettings.imagePositionAndScales
                if (importingSettings.markerNamesOverride)
                    this.markerNamesOverride = importingSettings.markerNamesOverride
                if (importingSettings.channelColor) this.channelColor = importingSettings.channelColor
                if (importingSettings.channelMarker) this.channelMarker = importingSettings.channelMarker
                if (importingSettings.channelVisibility) this.channelVisibility = importingSettings.channelVisibility
                if (importingSettings.channelDomainValue) this.channelDomainValue = importingSettings.channelDomainValue
                if (importingSettings.markerDomainValue) this.markerDomainValue = importingSettings.markerDomainValue
                if (importingSettings.segmentationBasename)
                    this.segmentationBasename = importingSettings.segmentationBasename
                if (importingSettings.autoLoadSegmentation != null)
                    this.autoLoadSegmentation = importingSettings.autoLoadSegmentation
                if (importingSettings.autoCalculateSegmentFeatures != null)
                    this.autoCalculateSegmentFeatures = importingSettings.autoCalculateSegmentFeatures
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
                if (importingSettings.plotNumHistogramBins)
                    this.plotNumHistogramBins = importingSettings.plotNumHistogramBins
                if (importingSettings.plotXLogScale) this.plotXLogScale = importingSettings.plotXLogScale
                if (importingSettings.plotYLogScale) this.plotYLogScale = importingSettings.plotYLogScale
                if (importingSettings.plotHiddenPopulations)
                    this.plotHiddenPopulations = importingSettings.plotHiddenPopulations
                if (importingSettings.segmentationFillAlpha)
                    this.segmentationFillAlpha = importingSettings.segmentationFillAlpha
                if (importingSettings.segmentationOutlineAlpha)
                    this.segmentationOutlineAlpha = importingSettings.segmentationOutlineAlpha
                if (importingSettings.selectedRegionAlpha)
                    this.selectedRegionAlpha = importingSettings.selectedRegionAlpha
                if (importingSettings.channelLegendVisible != null)
                    this.channelLegendVisible = importingSettings.channelLegendVisible
                if (importingSettings.populationLegendVisible != null)
                    this.populationLegendVisible = importingSettings.populationLegendVisible
                if (importingSettings.featureLegendVisible != null)
                    this.featureLegendVisible = importingSettings.featureLegendVisible
                if (importingSettings.sortLegendFeatures != null)
                    this.sortLegendFeatures = importingSettings.sortLegendFeatures
                if (importingSettings.regionLegendVisible != null)
                    this.regionLegendVisible = importingSettings.regionLegendVisible
                if (importingSettings.zoomInsetVisible != null)
                    this.zoomInsetVisible = importingSettings.zoomInsetVisible
                if (importingSettings.transformCoefficient)
                    this.transformCoefficient = importingSettings.transformCoefficient
                if (importingSettings.channelMappings) this.channelMappings = importingSettings.channelMappings
                if (importingSettings.zoomCoefficient) this.zoomCoefficient = importingSettings.zoomCoefficient
                if (importingSettings.globalPopulationAttributes)
                    this.globalPopulationAttributes = importingSettings.globalPopulationAttributes
            } catch (e) {
                log.error('Error importing settings from db:')
                log.error(e)
            }
        }
    }
}
