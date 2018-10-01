import * as React from "react"
import { observer } from "mobx-react"
import { ClipLoader } from 'react-spinners'
import { css } from 'react-emotion'


interface ImageLoaderProps {
    imageDataLoading: boolean
}

const override = css`
    display: block;
    margin: 0 auto;
    border-color: red;
`;


@observer
export class ImageLoader extends React.Component<ImageLoaderProps, {}> {
    
    render() {
        let loading = this.props.imageDataLoading
        let message = "ImageLoader Rerender. Image loading status: " + loading
        console.log(message)

        return(
            <div>
                {message}
                <ClipLoader
                    sizeUnit={"px"}
                    size={150}
                    color={'#123abc'}
                    loading={loading}
                />
            </div>
        )
    }
}