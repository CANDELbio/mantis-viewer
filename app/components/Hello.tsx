import * as React from "react";
import { Slider } from "@blueprintjs/core"
import { Button } from "@blueprintjs/core"
import { Image } from "./Image"

import { ImageStore } from "../stores/ImageStore"
import { observer } from "mobx-react"

export interface HelloProps { 
    /*compiler: string
    framework: string 
    value: number
    selectedFile: string | null
    onSliderChange?: (value: number) => void 
    onSelectFile?: (value: string) => void*/
    store: ImageStore
}

@observer
export class Hello extends React.Component<HelloProps, undefined> {
    constructor(props: HelloProps) {
        super(props)
    }

    onFileOpenButtonClicked() {
    //    shell.showItemInFolder(os.homedir())
    }

    render() {
        let imgComponent = null
        if(this.props.store.imageData.value != null)
            imgComponent =    
            <Image width ={250} height = {250} imgData=     {this.props.store.imageData.value}/>

        return(
            <div>
                <h1>Hello from {this.props.store.compiler} and {this.props.store.framework}! Number is: {this.props.store.value}</h1>
                <p>File selected is {this.props.store.selectedFile}</p>
                <Slider 
                    max={10} 
                    min={0}
                    value={this.props.store.value}
                    stepSize={1} 
                    onChange={this.props.store.setValue}
                    
                />
                <Button 
                    iconName="document"
                    onClick={this.onFileOpenButtonClicked}
                />
                {imgComponent}

            </div>
        )
    }
}
/*
                <Image width ={250} height = {250} fileName={this.props.selectedFile}/>*/