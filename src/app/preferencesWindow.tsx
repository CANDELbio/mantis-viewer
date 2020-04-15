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

let setMaxImageSetsInMemory = (max: number): void => {
    ipcRenderer.send('preferencesWindow-set-max-image-sets', max)
}

let setDefaultChannelMarkers = (channel: ChannelName, markers: string[]): void => {
    ipcRenderer.send('preferencesWindow-set-channel-markers', channel, markers)
}

let setDefaultChannelDomain = (channel: ChannelName, domain: [number, number]): void => {
    ipcRenderer.send('preferencesWindow-set-channel-domain', channel, domain)
}

let setDefaultSegmentation = (basename: string): void => {
    ipcRenderer.send('preferencesWindow-set-segmentation', basename)
}

let setUseAnyMarker = (channel: ChannelName, useAnyChannel: boolean): void => {
    ipcRenderer.send('preferencesWindow-set-use-any-marker', channel, useAnyChannel)
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
    ): void => {
        maxImageSetsInMemory = maxImageSets
        defaultSegmentation = segmentation
        defaultChannelMarkers = markers
        defaultChannelDomains = domains
        useAnyMarker = anyMarker
        render()
    },
)
