import * as React from "react"
import * as Path from "path"

export interface SelectedDataProps {
    selectedDirectory: string | null
}

export class SelectedData extends React.Component<SelectedDataProps, {}> {

    constructor(props:SelectedDataProps) {
        super(props)
    }

    render() {
        if(this.props.selectedDirectory){
            return(
                <p>Directory selected is {Path.parse(this.props.selectedDirectory).base}</p>
            )
        } else {
            return <p>Use the menu to select a file or folder.</p>
        }
    }



}