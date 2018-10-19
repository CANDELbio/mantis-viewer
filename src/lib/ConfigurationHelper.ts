import { ChannelName } from '../interfaces/UIDefinitions'

    // Will eventually get the below variable names from a configuration file. Setting up in here for now.
    const defaultChannelMarkers:Record<ChannelName, string[]> = {
        rChannel : [
            'catenin',
            'CD8',
            'CD4',
            'CD20',
            'CD68'
        ],
        gChannel: [
            'CD8',
            'CD4',
            'CD20',
            'CD68',
            'catenin'
        ],
        bChannel: [
            '191 Ir',
            '191Ir',
            '193 Ir',
            '193Ir',
            'DNA',
            'nucleus'
        ]
    }

    const channelSelectionOrder:ChannelName[] = ['bChannel', 'gChannel', 'rChannel']

    const useAnyChannelIfNoMatch = true

    // Not the fastest way to do this, but realistically the list of default values and incoming markerNames should be small.
    // If we want to optimize we could do one pass through all of the incoming markerNames and store highest priority hit from each channel.
    export function getDefaultChannelMarkers(markerNames:string[]) {
        let defaultMarkers:Record<ChannelName, string|null> = {rChannel: null, gChannel: null, bChannel: null}
        // Iterate through the channels in the order they should be selected
        for(let curChannel of channelSelectionOrder){
            let channelDefaults:string[] = defaultChannelMarkers[curChannel]
            // Then iterate through the defaults 
            for(let curDefault of channelDefaults){
                // Then iterate through the remaining markerNames
                for(let curMarker of markerNames){
                    // If the current default is a substring of the current markerName set the markerName as a default for the marker
                    // And then remove it from the set of channel names
                    if(curMarker.toLowerCase().includes(curDefault.toLowerCase())){
                        defaultMarkers[curChannel] = curMarker
                        markerNames = markerNames.filter(e => e != curMarker)
                        break
                    }
                }
                // Break if we already set the default for this channel.
                if(defaultMarkers[curChannel] != null) break
            }
        }

        // If useAnyChannelIfNoMatch, goes and fills the defaults with the first unused value in markerNames.
        if(useAnyChannelIfNoMatch){
            for(let s in defaultMarkers){
                let curChannel = s as ChannelName
                if(defaultMarkers[curChannel] == null){
                    if(markerNames.length > 0){
                        let curName = markerNames[0]
                        defaultMarkers[curChannel] = curName
                        markerNames = markerNames.filter(e => e != curName)
                    }
                }
            }
        }

        return defaultMarkers
    }