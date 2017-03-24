import * as React from "react";
import { RangeSlider } from "@blueprintjs/core"
import { Button } from "@blueprintjs/core"


import { ImageStore } from "../stores/ImageStore"
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
        let rChannelSlider = null
        let rChannel = "191Ir(Ir191Di)"
        let rChannelSelect = null
        
        if(this.props.store.imageData != null &&
            this.props.store.imageStats != null) {
  
            imgComponent = <IMCImage 
                imageData={this.props.store.imageData}
                stats={this.props.store.imageStats}
                rChannel={this.props.store.rChannel}
                rChannelDomain={this.props.store.rChannelDomain}
            />
            rChannelSlider = <RangeSlider
                min={this.props.store.imageStats[rChannel][0]}
                max={this.props.store.imageStats[rChannel][1]}
                value={this.props.store.temp}
                onRelease={this.props.store.setRChannelDomain}
                onChange={this.props.store.setTemp}
                stepSize={0.1}
            />
            rChannelSelect = <Select
                name="rchannel-select"
                value={this.props.store.rChannel}
                options={this.props.store.channelNames!.map((s) => 
                    {return({value: s, label: s})}
                )}
                
                onChange={this.props.store.setRChannel}
            />
        }

        return(
            <div>
  
                <p>File selected is {this.props.store.selectedFile}</p>
                {rChannelSelect}
                {rChannelSlider}
                {imgComponent}

            </div>
        )
    }
}