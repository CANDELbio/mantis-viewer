import { observable, action, autorun } from 'mobx'
import { ChannelName } from '../definitions/UIDefinitions'

import * as Store from 'electron-store'

export class PreferencesStore {
    public constructor() {
        this.store = new Store()
        this.initialize()
        this.loadFromStore()
    }

    private store: Store

    @observable public maxImageSetsInMemory: number

    @observable public defaultSegmentationBasename: string | null

    @observable public defaultChannelMarkers: Record<ChannelName, string[]>

    @observable public defaultChannelDomains: Record<ChannelName, [number, number]>

    @observable public useAnyMarkerIfNoMatch: Record<ChannelName, boolean>

    // Segmentation statistics/Segment level data settings
    @observable public rememberCalculateSegmentFeatures: boolean
    @observable public calculateSegmentFeatures: boolean
    @observable public rememberRecalculateSegmentFeatures: boolean
    @observable public recalculateSegmentFeatures: boolean
    @observable public rememberClearDuplicateSegmentFeatures: boolean
    @observable public clearDuplicateSegmentFeatures: boolean

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
        this.rememberCalculateSegmentFeatures = false
        this.calculateSegmentFeatures = false
        this.rememberRecalculateSegmentFeatures = false
        this.recalculateSegmentFeatures = false
        this.rememberClearDuplicateSegmentFeatures = false
        this.clearDuplicateSegmentFeatures = false
    }

    @action public setMaxImageSetsInMemory(max: number): void {
        this.maxImageSetsInMemory = max
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

    @action public setRememberCalculateSegmentFeatures = (remember: boolean): void => {
        this.rememberCalculateSegmentFeatures = remember
        if (!remember) this.calculateSegmentFeatures = false
    }

    @action public setCalculateSegmentFeatures = (calculate: boolean): void => {
        this.calculateSegmentFeatures = calculate
    }

    @action public setRememberRecalculateSegmentFeatures = (remember: boolean): void => {
        this.rememberRecalculateSegmentFeatures = remember
        if (!remember) this.recalculateSegmentFeatures = false
    }

    @action public setRecalculateSegmentFeatures = (recalculate: boolean): void => {
        this.recalculateSegmentFeatures = recalculate
    }

    @action public setRememberClearDuplicateSegmentFeatures = (remember: boolean): void => {
        this.rememberClearDuplicateSegmentFeatures = remember
        if (!remember) this.clearDuplicateSegmentFeatures = false
    }

    @action public setClearDuplicateSegmentFeatures = (clear: boolean): void => {
        this.clearDuplicateSegmentFeatures = clear
    }

    private saveToStore = autorun(() => {
        const store = this.store
        store.set('maxImageSetsInMemory', this.maxImageSetsInMemory)
        store.set('defaultChannelMarkers', this.defaultChannelMarkers)
        store.set('defaultChannelDomains', this.defaultChannelDomains)
        store.set('useAnyMarkerIfNoMatch', this.useAnyMarkerIfNoMatch)
        store.set('rememberCalculateSegmentationStatistics', this.rememberCalculateSegmentFeatures)
        store.set('calculateSegmentationStatistics', this.calculateSegmentFeatures)
        store.set('rememberRecalculateSegmentationStatistics', this.rememberRecalculateSegmentFeatures)
        store.set('recalculateSegmentationStatistics', this.recalculateSegmentFeatures)
        store.set('rememberClearDuplicateSegmentFeatures', this.rememberClearDuplicateSegmentFeatures)
        store.set('clearDuplicateSegmentFeatures', this.clearDuplicateSegmentFeatures)
        if (this.defaultSegmentationBasename) {
            store.set('defaultSegmentationBasename', this.defaultSegmentationBasename)
        } else {
            store.delete('defaultSegmentationBasename')
        }
    })

    private loadFromStore(): void {
        const store = this.store
        const maxImageSetsInMemory = store.get('maxImageSetsInMemory')
        if (maxImageSetsInMemory) this.maxImageSetsInMemory = maxImageSetsInMemory
        const defaultChannelMarkers = store.get('defaultChannelMarkers')
        if (defaultChannelMarkers) this.defaultChannelMarkers = defaultChannelMarkers
        const defaultChannelDomains = store.get('defaultChannelDomains')
        if (defaultChannelDomains) this.defaultChannelDomains = defaultChannelDomains
        const useAnyMarkerIfNoMatch = store.get('useAnyMarkerIfNoMatch')
        if (useAnyMarkerIfNoMatch) this.useAnyMarkerIfNoMatch = useAnyMarkerIfNoMatch
        const defaultSegmentationBasename = store.get('defaultSegmentationBasename')
        if (defaultSegmentationBasename) this.defaultSegmentationBasename = defaultSegmentationBasename
        const rememberCalculate = store.get('rememberCalculateSegmentationStatistics')
        if (rememberCalculate) this.rememberCalculateSegmentFeatures = rememberCalculate
        const calculate = store.get('calculateSegmentationStatistics')
        if (calculate) this.calculateSegmentFeatures = calculate
        const rememberRecalculate = store.get('rememberRecalculateSegmentationStatistics')
        if (rememberRecalculate) this.rememberRecalculateSegmentFeatures = rememberRecalculate
        const recalculate = store.get('recalculateSegmentationStatistics')
        if (recalculate) this.recalculateSegmentFeatures = recalculate
        const rememberClear = store.get('rememberClearDuplicateSegmentFeatures')
        if (rememberClear) this.rememberClearDuplicateSegmentFeatures = rememberClear
        const clear = store.get('clearDuplicateSegmentFeatures')
        if (clear) this.clearDuplicateSegmentFeatures = clear
    }
}
