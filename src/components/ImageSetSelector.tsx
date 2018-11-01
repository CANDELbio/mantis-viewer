import * as React from "react"
import Select from 'react-select'
import { observer } from "mobx-react"

export interface ImageSetSelectorProps {
    selectedImageSet: string | null
    imageSetOptions: {value: string, label:string}[]
    setSelectedImageSet: ((x: {value:string, label:string}) => void)
}

@observer
export class ImageSetSelector extends React.Component<ImageSetSelectorProps, {}> {

    constructor(props:ImageSetSelectorProps) {
        super(props)
    }

    render() {
        if(this.props.selectedImageSet){
            return(
                <div>
                    <div>Selected Image Set:</div>
                    <Select
                        value = {(this.props.selectedImageSet == null) ? undefined : this.props.selectedImageSet}
                        options = {this.props.imageSetOptions}
                        onChange = {this.props.setSelectedImageSet}
                        clearable = {false}
                    />
                </div>
            )
        } else {
            return <p>Use the menu to select a file or folder.</p>
        }
    }



}