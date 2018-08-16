import * as React from "react"
import { Grid, Row, Col } from 'react-flexbox-grid'
import { ImageStore } from "../stores/ImageStore"
import { ChannelControls } from "../components/ChannelControls"
import { observer } from "mobx-react"
import { ChannelName, BrushEventHandler, SelectOption } from "../interfaces/UIDefinitions"
import { ViewPort } from "../components/ViewPort"
import { SelectedData } from "../components/SelectedData"
import { SegmentationControls } from "../components/SegmentationControls"
import { ScatterPlot } from "../components/ScatterPlot";

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

    // updatePlotData = () => this.props.store.updatePlotData()

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

        let selectedData = null
        let channelControls = null
        let scatterPlot = null
        let segmentationControls = null

        if(this.props.store.selectedFile || this.props.store.selectedDirectory) {
            selectedData = <SelectedData
                selectedFile = {this.props.store.selectedFile}
                selectedDirectory = {this.props.store.selectedDirectory}
            />
        }

        if(this.props.store.imageData != null) {
            let width = this.props.store.imageData.width
            let height = this.props.store.imageData.height

            let channelSelectOptions =  this.props.store.imageData.channelNames.map((s) => {
                return({value: s, label: s})
            })
                
            viewPort = <ViewPort 
                imageData = {this.props.store.imageData}
                segmentationData = {this.props.store.segmentationData}
                segmentationAlpha = {this.props.store.segmentationAlpha}
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

            if (this.props.store.selectedSegmentationFile != null) {
                segmentationControls = <SegmentationControls
                    segmentationPath = {this.props.store.selectedSegmentationFile}
                    sliderValue = {this.props.store.segmentationAlpha}
                    onSliderChange = {this.props.store.setSegmentationSliderValue()}
                    onButtonClick = {this.props.store.clearSegmentationData()}
                />

                scatterPlot = <ScatterPlot 
                    channelSelectOptions = {channelSelectOptions}
                    selectedPlotChannels = {this.props.store.selectedPlotChannels}
                    setSelectedPlotChannels = {this.onPlotChannelSelect}
                    scatterPlotData = {this.props.store.scatterPlotData}
                />
            }


            
        }
     
        return(
            <div>
                <Grid fluid>
                    <Row>
                        <Col lg={3}>
                            {selectedData}
                            {channelControls}
                        </Col>
                        <Col lg={6}>
                            {viewPort}
                        </Col>
                        <Col lg={3}>
                            {segmentationControls}
                            {scatterPlot}
                        </Col>
                    </Row>
                </Grid>
            </div>
        )
    }
}