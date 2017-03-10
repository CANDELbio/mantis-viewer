import * as React from "react";
import { Slider } from "@blueprintjs/core"
import { Button } from "@blueprintjs/core"
import { Image } from "./Image"



export interface HelloProps { 
    compiler: string
    framework: string 
    value: number
    onSliderChange?: (value: number) => void 
    onSelectFile?: (value: string) => void
}


export class Hello extends React.Component<HelloProps, undefined> {
    constructor(props: HelloProps) {
        super(props)
    }

    onFileOpenButtonClicked() {
    //    shell.showItemInFolder(os.homedir())
    }

    render() {
        return(
            <div>
                <h1>Hello from {this.props.compiler} and {this.props.framework}! Number is: {this.props.value}</h1>
                <Slider 
                    max={10} 
                    min={0}
                    value={this.props.value}
                    stepSize={1} 
                    onChange={this.props.onSliderChange}
                />
                <Button 
                    iconName="document"
                    onClick={this.onFileOpenButtonClicked}
                />
                <Image width ={250} height = {250}/>
            </div>
        )
    }
}

