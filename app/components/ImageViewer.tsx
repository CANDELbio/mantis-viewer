import * as React from "react";
import { RangeSlider } from "@blueprintjs/core"
import { Button } from "@blueprintjs/core"


import { ImageStore } from "../stores/ImageStore"
import { ChannelControls } from "../components/ChannelControls"
import { IMCImage } from "../components/IMCImage"
import { observer } from "mobx-react"

const Select = require("react-select")



export interface HelloProps { 
    store: ImageStore
}

@observer
export class ImageViewer extends React.Component<HelloProps, undefined> {
    constructor(props: HelloProps) {
        super(props)
    }


    
    render() {
        let imgComponent = null
        let rChannelControls = null
        let gChannelControls = null
        let bChannelControls = null

        if(this.props.store.imageData != null &&
            this.props.store.imageStats != null) {
  
            let channelSelectOptions =  this.props.store.channelNames!.map((s) => {
                    return({value: s, label: s})
            })

            imgComponent = <IMCImage 
                imageData={this.props.store.imageData}
                stats={this.props.store.imageStats}
                channelDomain={this.props.store.channelDomain}
                channelMarker={this.props.store.channelMarker}
               
            />
            rChannelControls = <ChannelControls
                sliderMin = {0}
                sliderMax = {1000}
                sliderValue = {this.props.store.channelSliderValue["rChannel"]}
                onSliderChange = {this.props.store.setChannelSliderValue("rChannel")}
                onSliderRelease = {this.props.store.setChannelDomain("rChannel")}
                selectOptions = {channelSelectOptions}
                selectValue = {this.props.store.channelMarker["rChannel"]}
                onSelectChange = {this.props.store.setChannelMarker("rChannel")}

            />
        }

        return(
            <div>
  
                <p>File selected is {this.props.store.selectedFile}</p>
                {rChannelControls}
                {imgComponent}

            </div>
        )
    }
}