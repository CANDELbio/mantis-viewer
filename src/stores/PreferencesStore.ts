// Stores and exposes preferences for application behavior that apply across projects.
// These values can be modified by users in the preferences window.
import * as Store from 'electron-store'
import { observable, action, autorun } from 'mobx'
import { ProjectStore } from './ProjectStore'
import { ChannelName } from '../definitions/UIDefinitions'

export class PreferencesStore {
    public constructor(projectStore: ProjectStore) {
        this.projectStore = projectStore
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        this.store = new Store({ projectName: 'mantis-viewer' })
        this.initialize()
        this.loadFromStore()
    }

    private projectStore: ProjectStore
    private store: Store

    @observable public maxImageSetsInMemory: number

    @observable public blurPixels: boolean

    @observable public defaultSegmentationBasename: string | null

    @observable public defaultChannelMarkers: Record<ChannelName, string[]>

    @observable public defaultChannelDomains: Record<ChannelName, [number, number]>

    @observable public useAnyMarkerIfNoMatch: Record<ChannelName, boolean>

    // Segmentation statistics/Segment level data settings
    @observable public scaleChannelDomainValues: boolean
    // If the user wants to maintain the image scale (zoom) between images
    // Instead of maintaining them individually for each image.
    @observable public maintainImageScale: boolean
    @observable public optimizeSegmentation: boolean
    @observable public reloadOnError: boolean

    private channelSelectionOrder: ChannelName[] = [
        'bChannel',
        'gChannel',
        'rChannel',
        'cChannel',
        'mChannel',
        'yChannel',
        'kChannel',
    ]

    private initialize(): void {
        this.blurPixels = false
        this.maxImageSetsInMemory = 3
        this.defaultChannelMarkers = {
            rChannel: ['catenin', 'CD8', 'CD4', 'CD20', 'CD68'],
            gChannel: ['CD8', 'CD4', 'CD20', 'CD68', 'catenin'],
            bChannel: ['DAPI', '191 Ir', '191Ir', '193 Ir', '193Ir', 'DNA', 'nucleus'],
            cChannel: [],
            mChannel: [],
            yChannel: [],
            kChannel: [],
        }
        this.defaultChannelDomains = {
            rChannel: [0, 0.7] as [number, number],
            gChannel: [0, 0.7] as [number, number],
            bChannel: [0, 0.7] as [number, number],
            cChannel: [0, 0.7] as [number, number],
            mChannel: [0, 0.7] as [number, number],
            yChannel: [0, 0.7] as [number, number],
            kChannel: [0, 0.7] as [number, number],
        }
        this.useAnyMarkerIfNoMatch = {
            rChannel: true,
            gChannel: true,
            bChannel: true,
            cChannel: false,
            mChannel: false,
            yChannel: false,
            kChannel: false,
        }
        this.scaleChannelDomainValues = false
        this.scaleChannelDomainValues = false
        this.maintainImageScale = false
        this.optimizeSegmentation = true
        this.reloadOnError = true
    }

    @action public setMaxImageSetsInMemory(max: number): void {
        this.maxImageSetsInMemory = max
    }

    @action public setBlurPixels(value: boolean): void {
        this.blurPixels = value
    }

    @action public setDefaultChannelMarkers(channel: ChannelName, markers: string[]): void {
        this.defaultChannelMarkers[channel] = markers
    }

    @action public setDefaultChannelDomain(channel: ChannelName, domain: [number, number]): void {
        this.defaultChannelDomains[channel] = domain
    }

    @action public setUseAnyMarker(channel: ChannelName, useAnyMarker: boolean): void {
        this.useAnyMarkerIfNoMatch[channel] = useAnyMarker
    }

    // Use this to make a copy of domain percentages when getting defaults for setting store
    // Setting from the actual object was causing them to be linked, and when the user changed the setting it would also change the default.
    public getChannelDomainPercentage(): Record<ChannelName, [number, number]> {
        const domains = this.defaultChannelDomains
        return {
            rChannel: domains['rChannel'],
            gChannel: domains['gChannel'],
            bChannel: domains['bChannel'],
            cChannel: domains['cChannel'],
            mChannel: domains['mChannel'],
            yChannel: domains['yChannel'],
            kChannel: domains['kChannel'],
        }
    }

    @action public setDefaultSegmentationBasename(name: string): void {
        this.defaultSegmentationBasename = name
    }

    // Not the fastest way to do this, but realistically the list of default values and incoming markerNames should be small.
    // If we want to optimize we could do one pass through all of the incoming markerNames and store highest priority hit from each channel.
    public getDefaultChannelMarkers(markerNames: string[]): Record<ChannelName, string | null> {
        const defaultMarkers: Record<ChannelName, string | null> = {
            rChannel: null,
            gChannel: null,
            bChannel: null,
            cChannel: null,
            mChannel: null,
            yChannel: null,
            kChannel: null,
        }
        // Iterate through the channels in the order they should be selected
        for (const curChannel of this.channelSelectionOrder) {
            const channelDefaults: string[] = this.defaultChannelMarkers[curChannel]
            // Then iterate through the defaults
            for (const curDefault of channelDefaults) {
                // Then iterate through the remaining markerNames
                for (const curMarker of markerNames) {
                    // If the current default is a substring of the current markerName set the markerName as a default for the marker
                    // And then remove it from the set of channel names
                    if (curMarker.toLowerCase().includes(curDefault.toLowerCase())) {
                        defaultMarkers[curChannel] = curMarker
                        markerNames = markerNames.filter((e) => e != curMarker)
                        break
                    }
                }
                // Break if we already set the default for this channel.
                if (defaultMarkers[curChannel] != null) break
            }
        }

        for (const s in defaultMarkers) {
            const curChannel = s as ChannelName
            // If useAnyMarkerIfNoMatch, goes and fills the defaults with the first unused value in markerNames.
            if (defaultMarkers[curChannel] == null && this.useAnyMarkerIfNoMatch[curChannel]) {
                if (markerNames.length > 0) {
                    const curName = markerNames[0]
                    defaultMarkers[curChannel] = curName
                    markerNames = markerNames.filter((e) => e != curName)
                }
            }
        }

        return defaultMarkers
    }

    @action public setScaleChannelDomainValues = (scale: boolean): void => {
        this.scaleChannelDomainValues = scale
        this.projectStore.settingStore.resetChannelDomainValues()
    }

    @action public setOptimizeSegmentation = (optimize: boolean): void => {
        this.optimizeSegmentation = optimize
    }

    @action public setReloadOnError = (reload: boolean): void => {
        this.reloadOnError = reload
    }

    @action public setMaintainImageScale = (maintain: boolean): void => {
        this.maintainImageScale = maintain
    }

    private saveToStore = autorun(() => {
        const store = this.store
        store.set('maxImageSetsInMemory', this.maxImageSetsInMemory)
        store.set('blurPixels', this.blurPixels)
        store.set('defaultChannelMarkers', this.defaultChannelMarkers)
        store.set('defaultChannelDomains', this.defaultChannelDomains)
        store.set('useAnyMarkerIfNoMatch', this.useAnyMarkerIfNoMatch)
        store.set('scaleChannelDomainValues', this.scaleChannelDomainValues)
        store.set('optimizeSegmentation', this.optimizeSegmentation)
        store.set('reloadOnError', this.reloadOnError)
        store.set('maintainImageScale', this.maintainImageScale)
        if (this.defaultSegmentationBasename) {
            store.set('defaultSegmentationBasename', this.defaultSegmentationBasename)
        } else {
            store.delete('defaultSegmentationBasename')
        }
    })

    private loadFromStore(): void {
        const store = this.store
        const maxImageSetsInMemory = store.get('maxImageSetsInMemory')
        if (maxImageSetsInMemory) this.maxImageSetsInMemory = maxImageSetsInMemory as number
        const blurPixels = store.get('blurPixels')
        if (blurPixels) this.blurPixels = blurPixels as boolean
        const defaultChannelMarkers = store.get('defaultChannelMarkers')
        if (defaultChannelMarkers) this.defaultChannelMarkers = defaultChannelMarkers as Record<ChannelName, string[]>
        const defaultChannelDomains = store.get('defaultChannelDomains')
        if (defaultChannelDomains)
            this.defaultChannelDomains = defaultChannelDomains as Record<ChannelName, [number, number]>
        const useAnyMarkerIfNoMatch = store.get('useAnyMarkerIfNoMatch')
        if (useAnyMarkerIfNoMatch) this.useAnyMarkerIfNoMatch = useAnyMarkerIfNoMatch as Record<ChannelName, boolean>
        const defaultSegmentationBasename = store.get('defaultSegmentationBasename')
        if (defaultSegmentationBasename) this.defaultSegmentationBasename = defaultSegmentationBasename as string
        const scale = store.get('scaleChannelDomainValues')
        if (scale) this.scaleChannelDomainValues = scale as boolean
        const optimize = store.get('optimizeSegmentation')
        if (optimize != null) this.optimizeSegmentation = optimize as boolean
        const reload = store.get('reloadOnError')
        if (reload != null) this.reloadOnError = reload as boolean
        const maintain = store.get('maintainImageScale')
        if (maintain != null) this.maintainImageScale = maintain as boolean
    }
}
