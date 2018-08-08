import * as React from "react"
import { RangeSlider } from "@blueprintjs/core"
import { Button } from "@blueprintjs/core"
import { Grid, Row, Col } from 'react-flexbox-grid'
import { ImageStore } from "../stores/ImageStore"
import { ChannelControls } from "../components/ChannelControls"
import { IMCImage } from "../components/IMCImage"
import { observer } from "mobx-react"
import { ChannelName, BrushEventHandler, SelectOption } from "../interfaces/UIDefinitions"
import { ViewPort } from "../components/ViewPort"
import { LayerTable } from "../components/LayerTable"
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

    onPlotChannelSelect = (x: SelectOption[]) => this.props.store.setSelectedPlotChannels(x)

    getChannelMin = (s:ChannelName) => {
        let channelMarker = this.props.store.channelMarker[s]
        if (channelMarker != null && this.props.store.imageData != null) {
            return this.props.store.imageData.minmax[channelMarker].min
        }
        return 0
    }

    getChannelMax = (s:ChannelName) => {
        let channelMarker = this.props.store.channelMarker[s]
        if (channelMarker != null && this.props.store.imageData != null) {
            return this.props.store.imageData.minmax[channelMarker].max
        }
        return 100
    }

    render() {
        let viewPort = null

        let channelControls = null
        let plotChannelSelect = null
        let histogram = null

        if(this.props.store.imageData != null) {
  
            let channelSelectOptions =  this.props.store.imageData.channelNames.map((s) => {
                    return({value: s, label: s})
            })

            let width = this.props.store.imageData.width
            let height = this.props.store.imageData.height
                
            viewPort = <ViewPort 
                imageData = {this.props.store.imageData}
                segmentationData = {this.props.store.segmentationData}
                channelDomain = {this.props.store.channelDomain}
                channelMarker = {this.props.store.channelMarker}
                canvasWidth = {width}
                canvasHeight = {height}
                onBrushEnd = {this.onBrushEnd}
                onCanvasDataLoaded = {this.props.store.setCanvasImageData}
                labelsLayers = {this.props.store.labelsLayers}
            />
 
            channelControls = ["rChannel", "gChannel", "bChannel"].map((s:ChannelName) => 
                <ChannelControls
                    key={s}
                    sliderMin = {this.getChannelMin(s)}
                    sliderMax = {this.getChannelMax(s)}
                    sliderValue = {this.props.store.channelSliderValue[s]}
                    onSliderChange = {this.props.store.setChannelSliderValue(s)}
                    onSliderRelease = {this.props.store.setChannelDomain(s)}
                    selectOptions = {channelSelectOptions}
                    selectValue = {this.props.store.channelMarker[s]}
                    onSelectChange = {this.props.store.setChannelMarker(s)}
                />
            )
            
            plotChannelSelect = 
                <Select
                    value = {this.props.store.selectedPlotChannels}
                    options = {channelSelectOptions}
                    onChange = {this.onPlotChannelSelect}
                    multi = {true}
                />
        }
     
        return(
            <div>
                <Grid fluid>
                    <p>File selected is {this.props.store.selectedFile}</p>
                    <Row>
                        <Col lg={3}>
                            {channelControls}
                            {plotChannelSelect}
                            <Button
                                text = {"Plot"}
                                onClick = {this.updatePlotData}
                            />
                            <Button
                                text = {"Segment"}
                                onClick = {this.props.store.doSegmentation}
                            />
                            <LayerTable 
                                data = {this.props.store.labelsLayers}
                                onToggleLayerVisbile = {this.props.store.toggleLayerVisibility}
                            />
                        </Col>
                        <Col lg={9}>
                            {viewPort}
                        </Col>
                    </Row>
                </Grid>
            </div>
        )
    }
}