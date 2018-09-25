import * as React from "react"
import { Grid, Row, Col } from 'react-flexbox-grid'
import { ImageStore } from "../stores/ImageStore"
import { ChannelControls } from "../components/ChannelControls"
import { observer } from "mobx-react"
import { ChannelName, SelectOption } from "../interfaces/UIDefinitions"
import { ViewPort } from "../components/ViewPort"
import { SelectedData } from "../components/SelectedData"
import { SegmentationControls } from "../components/SegmentationControls"
import { ScatterPlot } from "../components/ScatterPlot";
import { SelectedRegions } from "../components/SelectedRegions";
import { Button, Collapse } from "@blueprintjs/core"

export interface ImageViewerProps { 
    store: ImageStore
}

interface ImageViewerState { 
    channelsOpen: boolean,
    regionsOpen: boolean,
    segmentationOpen: boolean,
    graphOpen: boolean
}

@observer
export class ImageViewer extends React.Component<ImageViewerProps, ImageViewerState> {
    constructor(props: ImageViewerProps) {
        super(props)
    }

    public state = {
        channelsOpen: true,
        regionsOpen: true,
        segmentationOpen: false,
        graphOpen: false
    }


    handleChannelClick = () => this.setState({channelsOpen: !this.state.channelsOpen})
    handleRegionsClick = () => this.setState({regionsOpen: !this.state.regionsOpen})
    handleSegmentationClick = () => this.setState({segmentationOpen: !this.state.segmentationOpen})
    handleGraphClick = () => this.setState({graphOpen: !this.state.graphOpen})

    onPlotChannelSelect = (x: SelectOption[]) => this.props.store.setSelectedPlotChannels(x)
    onPlotMetricSelect = (x: SelectOption) => this.props.store.setScatterPlotStatistic(x)

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
        let selectedRegions = null

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
                segmentationCentroidsVisible = {this.props.store.segmentationCentroidsVisible}
                channelDomain = {this.props.store.channelDomain}
                channelMarker = {this.props.store.channelMarker}
                canvasWidth = {width}
                canvasHeight = {height}
                windowWidth = {this.props.store.windowWidth}
                onCanvasDataLoaded = {this.props.store.setCanvasImageData}
                addSelectedRegion = {this.props.store.addSelectedRegion}
                selectedRegions = {this.props.store.selectedRegions}
                hightlightedRegions = {this.props.store.highlightedRegions}
                highlightedSegmentsFromGraph = {this.props.store.segmentsHoveredOnGraph}
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
                    windowWidth = {this.props.store.windowWidth}
                />
            )

            if (this.props.store.selectedSegmentationFile != null) {
                segmentationControls = <SegmentationControls
                    segmentationPath = {this.props.store.selectedSegmentationFile}
                    segmentationAlpha = {this.props.store.segmentationAlpha}
                    onAlphaChange = {this.props.store.setSegmentationSliderValue()}
                    centroidsVisible = {this.props.store.segmentationCentroidsVisible}
                    onVisibilityChange = {this.props.store.setCentroidVisibility()}
                    onClearSegmentation = {this.props.store.clearSegmentationData()}
                />

                scatterPlot = <ScatterPlot 
                    windowWidth = {this.props.store.windowWidth}
                    channelSelectOptions = {channelSelectOptions}
                    selectedPlotChannels = {this.props.store.selectedPlotChannels}
                    setSelectedPlotChannels = {this.onPlotChannelSelect}
                    selectedStatistic= {this.props.store.scatterPlotStatistic}
                    setSelectedStatistic = {this.onPlotMetricSelect}
                    selectedTransform = {this.props.store.scatterPlotTransform}
                    setSelectedTransform = {this.props.store.setScatterPlotTransform}
                    setSelectedPoints = {this.props.store.setSegmentsSelectedOnGraph}
                    setHoveredPoints = {this.props.store.setSegmentsHoveredOnGraph}
                    setUnHoveredPoints = {this.props.store.clearSegmentsHoveredOnGraph}
                    scatterPlotData = {this.props.store.scatterPlotData}
                />
            }

            selectedRegions = <SelectedRegions
                regions = {this.props.store.selectedRegions}
                updateName = {this.props.store.updateSelectedRegionName}
                updateNotes = {this.props.store.updateSelectedRegionNotes}
                deleteRegion = {this.props.store.deleteSelectedRegion}
                highlightRegion = {this.props.store.highlightSelectedRegion}
                unhighlightRegion = {this.props.store.unhighlightSelectedRegion}
                />
        }
     
        return(
            <div>
                <Grid fluid>
                    <Row>
                        <Col lg={2}>
                            {selectedData}
                            <Button onClick={this.handleChannelClick}>
                                {this.state.channelsOpen ? "Hide" : "Show"} Channel Controls
                            </Button>
                            <Collapse isOpen={this.state.channelsOpen}>
                                {channelControls}
                            </Collapse>
                            <br></br>
                            <Button onClick={this.handleSegmentationClick}>
                                {this.state.segmentationOpen ? "Hide" : "Show"} Segmentation Controls
                            </Button>
                            <Collapse isOpen={this.state.segmentationOpen}>
                                {segmentationControls}
                            </Collapse>
                        </Col>
                        <Col lg={6}>
                            {viewPort}
                        </Col>
                        <Col lg={4}>
                            <Button onClick={this.handleRegionsClick}>
                                {this.state.regionsOpen ? "Hide" : "Show"} Selected Regions
                            </Button>
                            <Collapse isOpen={this.state.regionsOpen}>
                                {selectedRegions}
                            </Collapse>
                            <Button onClick={this.handleGraphClick}>
                                {this.state.graphOpen ? "Hide" : "Show"} Graphing Pane
                            </Button>
                            <Collapse isOpen={this.state.graphOpen}>
                                {scatterPlot}
                            </Collapse>
                        </Col>
                    </Row>
                </Grid>
            </div>
        )
    }
}