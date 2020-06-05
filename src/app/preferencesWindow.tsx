import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import { ChannelName } from '../definitions/UIDefinitions'
import { Preferences } from '../components/Preferences'

let maxImageSetsInMemory: number
let defaultChannelMarkers: Record<ChannelName, string[]>
let defaultChannelDomains: Record<ChannelName, [number, number]>
let defaultSegmentation: string | null
let useAnyMarker: Record<ChannelName, boolean>
let rememberCalculateSegmentationStatistics: boolean
let calculateSegmentationStatistics: boolean
let rememberRecalculateSegmentationStatistics: boolean
let recalculateSegmentationStatistics: boolean
let rememberClearDuplicateSegmentFeatures: boolean
let clearDuplicateSegmentFeatures: boolean

const setMaxImageSetsInMemory = (max: number): void => {
    ipcRenderer.send('preferencesWindow-set-max-image-sets', max)
}

const setDefaultChannelMarkers = (channel: ChannelName, markers: string[]): void => {
    ipcRenderer.send('preferencesWindow-set-channel-markers', channel, markers)
}

const setDefaultChannelDomain = (channel: ChannelName, domain: [number, number]): void => {
    ipcRenderer.send('preferencesWindow-set-channel-domain', channel, domain)
}

const setDefaultSegmentation = (basename: string): void => {
    ipcRenderer.send('preferencesWindow-set-segmentation', basename)
}

const setUseAnyMarker = (channel: ChannelName, useAnyChannel: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-use-any-marker', channel, useAnyChannel)
}

const setRememberCalculate = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-remember-calculate', value)
}

const setCalculate = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-calculate', value)
}

const setRememberRecalculate = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-remember-recalculate', value)
}

const setRecalculate = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-recalculate', value)
}

const setRememberClear = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-remember-clear', value)
}

const setClear = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-clear', value)
}

function render(): void {
    ReactDOM.render(
        <div style={{ paddingTop: '10px', paddingLeft: '15px', paddingRight: '15px' }}>
            <Preferences
                maxImageSetsInMemory={maxImageSetsInMemory}
                setMaxImageSetsInMemory={setMaxImageSetsInMemory}
                defaultSegmentationBasename={defaultSegmentation}
                setDefaultSegmentation={setDefaultSegmentation}
                defaultChannelMarkers={defaultChannelMarkers}
                setDefaultChannelMarkers={setDefaultChannelMarkers}
                defaultChannelDomains={defaultChannelDomains}
                setDefaultChannelDomain={setDefaultChannelDomain}
                useAnyMarker={useAnyMarker}
                setUseAnyMarker={setUseAnyMarker}
                rememberCalculate={rememberCalculateSegmentationStatistics}
                setRememberCalculate={setRememberCalculate}
                calculate={calculateSegmentationStatistics}
                setCalculate={setCalculate}
                rememberRecalculate={rememberRecalculateSegmentationStatistics}
                setRememberRecalculate={setRememberRecalculate}
                recalculate={recalculateSegmentationStatistics}
                setRecalculate={setRecalculate}
                rememberClearDuplicates={rememberClearDuplicateSegmentFeatures}
                setRememberClearDuplicates={setRememberClear}
                clearDuplicates={clearDuplicateSegmentFeatures}
                setClearDuplicates={setClear}
            />
        </div>,
        document.getElementById('preferences'),
    )
}

ipcRenderer.on(
    'set-preferences',
    (
        event: Electron.Event,
        maxImageSets: number,
        segmentation: string | null,
        markers: Record<ChannelName, string[]>,
        domains: Record<ChannelName, [number, number]>,
        anyMarker: Record<ChannelName, boolean>,
        rememberCalculate: boolean,
        calculate: boolean,
        rememberRecalculate: boolean,
        recalculate: boolean,
        rememberClear: boolean,
        clear: boolean,
    ): void => {
        maxImageSetsInMemory = maxImageSets
        defaultSegmentation = segmentation
        defaultChannelMarkers = markers
        defaultChannelDomains = domains
        useAnyMarker = anyMarker
        rememberCalculateSegmentationStatistics = rememberCalculate
        calculateSegmentationStatistics = calculate
        rememberRecalculateSegmentationStatistics = rememberRecalculate
        recalculateSegmentationStatistics = recalculate
        rememberClearDuplicateSegmentFeatures = rememberClear
        clearDuplicateSegmentFeatures = clear
        render()
    },
)
