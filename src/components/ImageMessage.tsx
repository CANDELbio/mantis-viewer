import * as React from 'react'
import { observer } from 'mobx-react'
import { ImageData } from '../lib/ImageData'

export interface ImageMessageProps {
    imageData: ImageData | null
}

@observer
export class ImageMessage extends React.Component<ImageMessageProps, Record<string, never>> {
    public constructor(props: ImageMessageProps) {
        super(props)
    }

    public render(): React.ReactElement | null {
        let scaleMessage = null

        const imageData = this.props.imageData

        if (imageData) {
            // Get an array of the marker names for the channels that are visible.

            if (imageData.scaled) {
                scaleMessage = 'This image has been downsampled to fit in memory.'
            }
        }

        if (scaleMessage) {
            return <div style={{ position: 'relative', textAlign: 'center' }}>{scaleMessage}</div>
        } else {
            return null
        }
    }
}
