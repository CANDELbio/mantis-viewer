import * as React from "react"
import Select from 'react-select'
import { Checkbox } from "@blueprintjs/core"
import { observer } from "mobx-react"

export interface ImageSetSelectorProps {
    selectedImageSet: string | null
    imageSetOptions: {value: string, label:string}[]
    setSelectedImageSet: ((x: {value:string, label:string}) => void)
    persistData: boolean
    setPersistData: ((persist: boolean) => void)
}

@observer
export class ImageSetSelector extends React.Component<ImageSetSelectorProps, {}> {

    constructor(props:ImageSetSelectorProps) {
        super(props)
    }

    onPersistDataChange = (event: React.FormEvent<HTMLInputElement>) => this.props.setPersistData(event.currentTarget.checked)

    render() {
        if(this.props.imageSetOptions.length > 0){
            return(
                <div>
                    <div>Selected Image Set:</div>
                    <Select
                        value = {(this.props.selectedImageSet == null) ? undefined : this.props.selectedImageSet}
                        options = {this.props.imageSetOptions}
                        onChange = {this.props.setSelectedImageSet}
                        clearable = {false}
                    />
                    <Checkbox checked={this.props.persistData} label="Copy Image Set Data" onChange={this.onPersistDataChange} />

                </div>
            )
        } else {
            return <p>Use the menu to select a file or folder.</p>
        }
    }



}