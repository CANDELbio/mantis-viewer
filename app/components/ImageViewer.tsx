import * as React from "react"
import { RangeSlider } from "@blueprintjs/core"
import { Button } from "@blueprintjs/core"


import { Grid, Row, Col } from 'react-flexbox-grid'

import { ImageStore } from "../stores/ImageStore"
import { ChannelControls } from "../components/ChannelControls"
import { IMCImage } from "../components/IMCImage"
import { observer } from "mobx-react"
import { ChannelName } from "../interfaces/UIDefinitions"
let Plotly = require("../lib/plotly-latest.min")

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

        let channelControls = null

        if(this.props.store.imageData != null) {
  
            let channelSelectOptions =  this.props.store.channelNames!.map((s) => {
                    return({value: s, label: s})
            })

            imgComponent = <IMCImage 
                imageData = {this.props.store.imageData}
                channelDomain = {this.props.store.channelDomain}
                channelMarker = {this.props.store.channelMarker}
                canvasWidth = {800}
                canvasHeight = {600}
               
            />

            channelControls = ["rChannel", "gChannel", "bChannel"].map((s:ChannelName) => 
                <ChannelControls
                    key={s}
                    sliderMin = {0}
                    sliderMax = {100}
                    sliderValue = {this.props.store.channelSliderValue[s]}
                    onSliderChange = {this.props.store.setChannelSliderValue(s)}
                    onSliderRelease = {this.props.store.setChannelDomain(s)}
                    selectOptions = {channelSelectOptions}
                    selectValue = {this.props.store.channelMarker[s]}
                    onSelectChange = {this.props.store.setChannelMarker(s)}
                />
            )
        }

        return(
            <div>
                <Grid fluid>
                    <p>File selected is {this.props.store.selectedFile}</p>
                    <Row>
                        <Col lg={3}>
                            {channelControls}
                        </Col>
                        <Col lg={9}>
                            {imgComponent}
                        </Col>
                    </Row>
                </Grid>
                <div id="plotly-tester" ref={(el) => this.testPlotly(el)}>
                </div>
            </div>
        )
    }
}