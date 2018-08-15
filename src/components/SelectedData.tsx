import * as React from "react";

export interface SelectedDataProps {
    selectedFile: string | null
    selectedDirectory: string | null
}

export class SelectedData extends React.Component<SelectedDataProps, undefined> {

    constructor(props:SelectedDataProps) {
        super(props)
    }

    render() {
        if(this.props.selectedFile) { 
            return(
                <p>File selected is {this.props.selectedFile}</p>
            )
        } else if(this.props.selectedDirectory){
            return(
                <p>Directory selected is {this.props.selectedDirectory}</p>
            )
        } else {
            return <p>Use the menu to select a file or folder.</p>
        }
    }



}