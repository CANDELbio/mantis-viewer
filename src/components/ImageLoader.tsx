import * as React from "react"
import { observer } from "mobx-react"
import { ClipLoader } from 'react-spinners'
import { css } from 'react-emotion'


interface ImageLoaderProps {
    imageDataLoading: boolean
}

@observer
export class ImageLoader extends React.Component<ImageLoaderProps, {}> {
    
    render() {
        return(
            <div>
                <ClipLoader
                    sizeUnit={"px"}
                    size={150}
                    color={'#123abc'}
                    loading={this.props.imageDataLoading}
                />
            </div>
        )
    }
}