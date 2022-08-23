import { ipcRenderer } from 'electron'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Preferences } from '../components/Preferences'
import { ChannelName } from '../definitions/UIDefinitions'

let maxImageSetsInMemory: number
let blurPixels: boolean
let calculateFeatures: boolean
let defaultChannelMarkers: Record<ChannelName, string[]>
let defaultChannelDomains: Record<ChannelName, [number, number]>
let defaultSegmentation: string | null
let useAnyMarker: Record<ChannelName, boolean>
let scaleChannelDomainValues: boolean
let maintainImageScale: boolean
let optimizeSegmentation: boolean
let reloadOnError: boolean

const setMaxImageSetsInMemory = (max: number): void => {
    ipcRenderer.send('preferencesWindow-set-max-image-sets', max)
}

const setBlurPixels = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-blur-pixels', value)
}

const setCalculateFeatures = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-calculate-features', value)
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

const setScale = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-scale-channel-domain-values', value)
}

const setMaintainImageScale = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-maintain-image-scale', value)
}

const setOptimizeSegmentation = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-optimize-segmentation', value)
}

const setReloadOnError = (value: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-reload-on-error', value)
}

function render(): void {
    ReactDOM.render(
        <div style={{ paddingTop: '10px', paddingLeft: '15px', paddingRight: '15px' }}>
            <Preferences
                maxImageSetsInMemory={maxImageSetsInMemory}
                setMaxImageSetsInMemory={setMaxImageSetsInMemory}
                blurPixels={blurPixels}
                setBlurPixels={setBlurPixels}
                calculate={calculateFeatures}
                setCalculate={setCalculateFeatures}
                defaultSegmentationBasename={defaultSegmentation}
                setDefaultSegmentation={setDefaultSegmentation}
                defaultChannelMarkers={defaultChannelMarkers}
                setDefaultChannelMarkers={setDefaultChannelMarkers}
                defaultChannelDomains={defaultChannelDomains}
                setDefaultChannelDomain={setDefaultChannelDomain}
                useAnyMarker={useAnyMarker}
                setUseAnyMarker={setUseAnyMarker}
                scaleChannelBrightness={scaleChannelDomainValues}
                setScaleChannelBrightness={setScale}
                maintainImageScale={maintainImageScale}
                setMaintainImageScale={setMaintainImageScale}
                optimizeSegmentation={optimizeSegmentation}
                setOptimizeSegmentation={setOptimizeSegmentation}
                reloadOnError={reloadOnError}
                setReloadOnError={setReloadOnError}
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
        blur: boolean,
        calculate: boolean,
        segmentation: string | null,
        markers: Record<ChannelName, string[]>,
        domains: Record<ChannelName, [number, number]>,
        anyMarker: Record<ChannelName, boolean>,
        scaleDomainValues: boolean,
        maintainScale: boolean,
        optimize: boolean,
        reload: boolean,
    ): void => {
        maxImageSetsInMemory = maxImageSets
        blurPixels = blur
        calculateFeatures = calculate
        defaultSegmentation = segmentation
        defaultChannelMarkers = markers
        defaultChannelDomains = domains
        useAnyMarker = anyMarker
        scaleChannelDomainValues = scaleDomainValues
        maintainImageScale = maintainScale
        optimizeSegmentation = optimize
        reloadOnError = reload
        render()
    },
)
