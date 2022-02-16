import * as React from 'react'
import { observer } from 'mobx-react'
import { ChannelName } from '../definitions/UIDefinitions'
import { ImageData } from '../lib/ImageData'

export interface ImageMessageProps {
    channelMarker: Record<ChannelName, string | null>
    channelVisibility: Record<ChannelName, boolean>
    imageData: ImageData | null
}

@observer
export class ImageMessage extends React.Component<ImageMessageProps, Record<string, never>> {
    public constructor(props: ImageMessageProps) {
        super(props)
    }

    public render(): React.ReactElement | null {
        let scaleMessage = null
        let visibilityMessage = null
        let markerMessage = null
        const imageData = this.props.imageData
        const channelMarker = this.props.channelMarker
        const channelVisibility = this.props.channelVisibility

        if (imageData) {
            // Get an array of the marker names for the channels that are visible.
            const channelMarkerVisibility = Object.keys(channelVisibility)
                .map((channel: ChannelName) => {
                    if (channelVisibility[channel]) {
                        return channelMarker[channel]
                    } else {
                        return null
                    }
                })
                .filter(Boolean)

            if (Object.values(channelMarker).filter(Boolean).length == 0) {
                markerMessage = 'No markers selected.'
            } else if (channelMarkerVisibility.length == 0) {
                visibilityMessage = 'No markers visible.'
            } else if (imageData.scaled) {
                scaleMessage = 'This image has been downsampled to fit in memory.'
            }
        }

        const messageBody = [scaleMessage, visibilityMessage, markerMessage].filter(Boolean).join(' ')
        if (messageBody) {
            return <div style={{ position: 'relative', textAlign: 'center' }}>{messageBody}</div>
        } else {
            return null
        }
    }
}
