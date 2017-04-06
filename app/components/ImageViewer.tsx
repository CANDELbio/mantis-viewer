import * as React from "react"
import { RangeSlider } from "@blueprintjs/core"
import { Button } from "@blueprintjs/core"


import { Grid, Row, Col } from 'react-flexbox-grid'

import { ImageStore } from "../stores/ImageStore"
import { ChannelControls } from "../components/ChannelControls"
import { IMCImage } from "../components/IMCImage"
import { observer } from "mobx-react"
import { ChannelName, BrushEventHandler } from "../interfaces/UIDefinitions"
let Plotly = require("../lib/plotly-latest.min")

const Select = require("react-select")



export interface ImageViewerProps { 
    store: ImageStore
}

@observer
export class ImageViewer extends React.Component<ImageViewerProps, undefined> {
    constructor(props: ImageViewerProps) {
        super(props)
    }
    
    onBrushEnd:BrushEventHandler = (e) => {
        this.props.store.setCurrentSelection(e)
    }

    updatePlotData = () => this.props.store.updatePlotData()

    render() {
        let imgComponent = null

        let channelControls = null

        if(this.props.store.imageData != null) {
  
            let channelSelectOptions =  this.props.store.imageData.channelNames.map((s) => {
                    return({value: s, label: s})
            })

            imgComponent = <IMCImage 
                imageData = {this.props.store.imageData}
                channelDomain = {this.props.store.channelDomain}
                channelMarker = {this.props.store.channelMarker}
                canvasWidth = {800}
                canvasHeight = {600}
                onBrushEnd = {this.onBrushEnd}
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
        console.log(this.props.store.currentSelection)
        console.log(this.props.store.plotData)
        return(
            <div>
                <Grid fluid>
                    <p>File selected is {this.props.store.selectedFile}</p>
                    <Row>
                        <Col lg={3}>
                            {channelControls}
                            <Button
                                text = {"Plot"}
                                onClick = {this.updatePlotData}
                            />
                        </Col>
                        <Col lg={9}>
                            {imgComponent}
                        </Col>
                    </Row>
                </Grid>
            </div>
        )
    }
}