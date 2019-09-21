import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import { ChannelName } from '../definitions/UIDefinitions'
import { Configuration } from '../components/Configuration'

let maxImageSetsInMemory: number
let defaultChannelMarkers: Record<ChannelName, string[]>
let defaultChannelDomains: Record<ChannelName, [number, number]>

let setMaxImageSetsInMemory = (max: number): void => {
    ipcRenderer.send('configWindow-set-max-image-sets', max)
}

let setDefaultChannelMarkers = (channel: ChannelName, markers: string[]): void => {
    ipcRenderer.send('configWindow-set-channel-markers', channel, markers)
}

let setDefaultChannelDomain = (channel: ChannelName, domain: [number, number]): void => {
    ipcRenderer.send('configWindow-set-channel-domain', channel, domain)
}

function render(): void {
    ReactDOM.render(
        <div style={{ paddingTop: '10px', paddingLeft: '15px', paddingRight: '15px' }}>
            <Configuration
                maxImageSetsInMemory={maxImageSetsInMemory}
                setMaxImageSetsInMemory={setMaxImageSetsInMemory}
                defaultChannelMarkers={defaultChannelMarkers}
                setDefaultChannelMarkers={setDefaultChannelMarkers}
                defaultChannelDomains={defaultChannelDomains}
                setDefaultChannelDomain={setDefaultChannelDomain}
            />
        </div>,
        document.getElementById('config'),
    )
}

ipcRenderer.on(
    'set-config-values',
    (
        event: Electron.Event,
        maxImageSets: number,
        markers: Record<ChannelName, string[]>,
        domains: Record<ChannelName, [number, number]>,
    ) => {
        maxImageSetsInMemory = maxImageSets
        defaultChannelMarkers = markers
        defaultChannelDomains = domains
        render()
    },
)
