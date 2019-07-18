import { ChannelName } from '../definitions/UIDefinitions'

export class ConfigurationHelper {
    // Will eventually get the below variable names from a configuration file. Setting up in here for now.
    private defaultChannelMarkers: Record<ChannelName, string[]> = {
        rChannel: ['catenin', 'CD8', 'CD4', 'CD20', 'CD68'],
        gChannel: ['CD8', 'CD4', 'CD20', 'CD68', 'catenin'],
        bChannel: ['DAPI', '191 Ir', '191Ir', '193 Ir', '193Ir', 'DNA', 'nucleus'],
    }

    private channelSelectionOrder: ChannelName[] = ['bChannel', 'gChannel', 'rChannel']

    private useAnyMarkerIfNoMatch = true

    // Not the fastest way to do this, but realistically the list of default values and incoming markerNames should be small.
    // If we want to optimize we could do one pass through all of the incoming markerNames and store highest priority hit from each channel.
    public getDefaultChannelMarkers(markerNames: string[]): Record<ChannelName, string | null> {
        let defaultMarkers: Record<ChannelName, string | null> = { rChannel: null, gChannel: null, bChannel: null }
        // Iterate through the channels in the order they should be selected
        for (let curChannel of this.channelSelectionOrder) {
            let channelDefaults: string[] = this.defaultChannelMarkers[curChannel]
            // Then iterate through the defaults
            for (let curDefault of channelDefaults) {
                // Then iterate through the remaining markerNames
                for (let curMarker of markerNames) {
                    // If the current default is a substring of the current markerName set the markerName as a default for the marker
                    // And then remove it from the set of channel names
                    if (curMarker.toLowerCase().includes(curDefault.toLowerCase())) {
                        defaultMarkers[curChannel] = curMarker
                        markerNames = markerNames.filter(e => e != curMarker)
                        break
                    }
                }
                // Break if we already set the default for this channel.
                if (defaultMarkers[curChannel] != null) break
            }
        }

        // If useAnyMarkerIfNoMatch, goes and fills the defaults with the first unused value in markerNames.
        if (this.useAnyMarkerIfNoMatch) {
            for (let s in defaultMarkers) {
                let curChannel = s as ChannelName
                if (defaultMarkers[curChannel] == null) {
                    if (markerNames.length > 0) {
                        let curName = markerNames[0]
                        defaultMarkers[curChannel] = curName
                        markerNames = markerNames.filter(e => e != curName)
                    }
                }
            }
        }

        return defaultMarkers
    }

    public getDefaultChannelDomains(): Record<ChannelName, [number, number]> {
        return {
            rChannel: [0, 0.7] as [number, number],
            gChannel: [0, 0.7] as [number, number],
            bChannel: [0, 0.7] as [number, number],
        }
    }
}
