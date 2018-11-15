import * as React from "react"
import { UnmountClosed } from 'react-collapse'
import { Button } from "@blueprintjs/core"
import { ClipLoader } from 'react-spinners'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { SizeMe } from 'react-sizeme'

import { ProjectStore } from "../stores/ProjectStore"
import { ChannelControls } from "./ChannelControls"
import { observer } from "mobx-react"
import { ChannelName, WindowHeightBufferSize } from "../interfaces/UIDefinitions"
import { ImageViewer } from "./ImageViewer"
import { ImageSetSelector } from "./ImageSetSelector"
import { SegmentationControls } from "./SegmentationControls"
import { ScatterPlot } from "./ScatterPlot"
import { SelectedPopulations } from "./SelectedPopulations"

export interface MainAppProps { 
    projectStore: ProjectStore
}

interface MainAppState { 
    channelsOpen: boolean,
    regionsOpen: boolean,
    segmentationOpen: boolean,
    plotOpen: boolean
}

@observer
export class MainApp extends React.Component<MainAppProps, MainAppState> {
    constructor(props: MainAppProps) {
        super(props)
    }

    public state = {
        channelsOpen: true,
        regionsOpen: true,
        segmentationOpen: false,
        plotOpen: false
    }

    handleChannelClick = () => this.setState({channelsOpen: !this.state.channelsOpen})
    handleRegionsClick = () => this.setState({regionsOpen: !this.state.regionsOpen})
    handleSegmentationClick = () => this.setState({segmentationOpen: !this.state.segmentationOpen})
    handlePlotClick = () => this.setState({plotOpen: !this.state.plotOpen})

    addSelectedPopulation = (segmentIds: number[]) => {
        let populationStore = this.props.projectStore.activePopulationStore
        if(segmentIds.length > 0) populationStore.addSelectedPopulation(null, segmentIds)
    }

    getChannelMin = (s:ChannelName) => {
        let imageStore = this.props.projectStore.activeImageStore
        let channelMarker = imageStore.channelMarker[s]
        if (channelMarker != null && imageStore.imageData != null) {
            return imageStore.imageData.minmax[channelMarker].min
        }
        return 0
    }

    getChannelMax = (s:ChannelName) => {
        let imageStore = this.props.projectStore.activeImageStore
        let channelMarker = imageStore.channelMarker[s]
        if (channelMarker != null && imageStore.imageData != null) {
            return imageStore.imageData.minmax[channelMarker].max
        }
        return 100
    }

    renderImageViewer = (maxWidth: number) => {
        let projectStore = this.props.projectStore
        let imageStore = projectStore.activeImageStore
        let populationStore = projectStore.activePopulationStore
        let plotStore = projectStore.activePlotStore

        let viewer = null
        if(imageStore.imageData != null && projectStore.windowHeight != null) {
            viewer = <ImageViewer
                imageData = {imageStore.imageData}
                segmentationData = {imageStore.segmentationData}
                segmentationFillAlpha = {imageStore.segmentationFillAlpha}
                segmentationOutlineAlpha = {imageStore.segmentationOutlineAlpha}
                segmentationCentroidsVisible = {imageStore.segmentationCentroidsVisible}
                channelDomain = {imageStore.channelDomain}
                channelMarker = {imageStore.channelMarker}
                canvasWidth = {imageStore.imageData.width}
                canvasHeight = {imageStore.imageData.height}
                maxRendererSize = {{width: maxWidth, height: projectStore.windowHeight - WindowHeightBufferSize}}
                onCanvasDataLoaded = {imageStore.setCanvasImageData}
                addSelectedRegion = {populationStore.addSelectedPopulation}
                selectedRegions = {populationStore.selectedPopulations}
                hightlightedRegions = {populationStore.highlightedPopulations}
                highlightedSegmentsFromPlot = {plotStore.segmentsHoveredOnPlot}
                exportPath = {imageStore.imageExportFilename}
                onExportComplete = {imageStore.clearImageExportFilename}
            />
        }

        return viewer
    }

    render() {

        let projectStore = this.props.projectStore
        let imageStore = projectStore.activeImageStore
        let populationStore = projectStore.activePopulationStore
        let plotStore = projectStore.activePlotStore

        let imageSetSelector =  null
        let channelControls = null
        let scatterPlot = null
        let segmentationControls = null

        imageSetSelector = <ImageSetSelector
            selectedImageSet = {projectStore.activeImageSetPath}
            imageSetOptions = {projectStore.imageSetPathOptions.get()}
            setSelectedImageSet = {projectStore.setActiveImageSetFromSelect()}
            persistData = {projectStore.copyImageSetSettingsEnabled}
            setPersistData = {projectStore.setCopyImageSetSettings}
        />

        if(imageStore.imageData != null) {
            if(imageStore.imageData.channelNames.length > 0){
                channelControls = ["rChannel", "gChannel", "bChannel"].map((s:ChannelName) =>
                    <ChannelControls
                        key={s}
                        sliderMin = {this.getChannelMin(s)}
                        sliderMax = {this.getChannelMax(s)}
                        sliderValue = {imageStore.channelDomain[s]}
                        onSliderChange = {projectStore.setChannelDomainCallback(s)}
                        selectOptions = {imageStore.channelSelectOptions.get()}
                        selectValue = {imageStore.channelMarker[s]}
                        onSelectChange = {projectStore.setChannelMarkerCallback(s)}
                        windowWidth = {projectStore.windowWidth}
                    />
                )
            }

            if (imageStore.segmentationData != null) {
                segmentationControls = <SegmentationControls
                    fillAlpha = {imageStore.segmentationFillAlpha}
                    outlineAlpha = {imageStore.segmentationOutlineAlpha}
                    onFillAlphaChange = {imageStore.setSegmentationFillAlpha}
                    onOutlineAlphaChange = {imageStore.setSegmentationOutlineAlpha}
                    centroidsVisible = {imageStore.segmentationCentroidsVisible}
                    setCentroidsVisible = {imageStore.setCentroidVisibility}
                    onClearSegmentation = {projectStore.clearActiveSegmentationData}
                />

                if(projectStore.plotInMainWindow) {
                    scatterPlot = <ScatterPlot
                        windowWidth = {projectStore.windowWidth}
                        channelSelectOptions = {imageStore.channelSelectOptions.get()}
                        selectedPlotChannels = {plotStore.selectedPlotChannels}
                        setSelectedPlotChannels = {projectStore.setSelectedPlotChannels}
                        selectedStatistic= {plotStore.scatterPlotStatistic}
                        setSelectedStatistic = {plotStore.setScatterPlotStatistic}
                        selectedTransform = {plotStore.scatterPlotTransform}
                        setSelectedTransform = {plotStore.setScatterPlotTransform}
                        setSelectedSegments = {this.addSelectedPopulation}
                        setHoveredSegments = {plotStore.setSegmentsHoveredOnPlot}
                        scatterPlotData = {plotStore.scatterPlotData}
                    />
                }
            }
        }
        
        let imageLoading = <ClipLoader
            sizeUnit={"px"}
            size={150}
            color={'#123abc'}
            loading={imageStore.imageDataLoading}
        />

        let selectedPopulations = <SelectedPopulations
            populations = {populationStore.selectedPopulations}
            updateName = {populationStore.updateSelectedPopulationName}
            updateNotes = {populationStore.updateSelectedPopulationNotes}
            updateColor = {populationStore.updateSelectedPopulationColor}
            updateVisibility = {populationStore.updateSelectedPopulationVisibility}
            deletePopulation = {populationStore.deleteSelectedPopulation}
            setAllVisibility = {populationStore.setAllSelectedPopulationVisibility}
            highlightPopulation = {populationStore.highlightSelectedPopulation}
            unhighlightPopulation = {populationStore.unhighlightSelectedPopulation}
        />

        let fullWidth = {width: "100%"}
        let paddingStyle = {paddingTop: "10px"}
     
        return(
            <div>
                <Grid fluid={true} style={paddingStyle}>
                    <Row between="xs">
                        <Col xs={2} sm={2} md={2} lg={2}>
                            <Button onClick={this.handleChannelClick} style={fullWidth}>
                                {this.state.channelsOpen ? "Hide" : "Show"} Channel Controls
                            </Button>
                            <UnmountClosed isOpened={this.state.channelsOpen} style={fullWidth}>
                                <div>{imageSetSelector}</div>
                                <div>{channelControls ? "Channel Controls:" : null}</div>
                                <div>{channelControls}</div>
                            </UnmountClosed>
                            <br></br>
                            <Button onClick={this.handleSegmentationClick} style={fullWidth}>
                                {this.state.segmentationOpen ? "Hide" : "Show"} Segmentation Controls
                            </Button>
                            <UnmountClosed isOpened={this.state.segmentationOpen} style={fullWidth}>
                                <div>{segmentationControls}</div>
                            </UnmountClosed>
                        </Col>
                        <SizeMe refreshRate={32}>{({ size }) =>
                            <Col xs={6} sm={6} md={6} lg={6}>
                                <Grid fluid={true}>
                                    <Row center="xs">
                                        <Col>
                                            {this.renderImageViewer(size.width)}
                                            {imageLoading}
                                        </Col>
                                    </Row>
                                </Grid>
                            </Col>}
                        </SizeMe>
                        <Col xs={4} sm={4} md={4} lg={4}>
                            <Button onClick={this.handleRegionsClick} style={fullWidth}>
                                {this.state.regionsOpen ? "Hide" : "Show"} Selected Regions
                            </Button>
                            <UnmountClosed isOpened={this.state.regionsOpen} style={fullWidth}>
                                {selectedPopulations}
                            </UnmountClosed>
                            <Button onClick={this.handlePlotClick}  style={fullWidth}>
                                {this.state.plotOpen ? "Hide" : "Show"} Plot Pane
                            </Button>
                            <UnmountClosed isOpened={this.state.plotOpen} style={fullWidth}>
                                    {scatterPlot}
                            </UnmountClosed>
                        </Col>
                    </Row>
                </Grid>
            </div>
        )
    }
}