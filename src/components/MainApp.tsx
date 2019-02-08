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
import { Plot } from "./Plot"
import { SelectedPopulations } from "./SelectedPopulations"
import { ImageData } from "../lib/ImageData"
import { SegmentationData } from "../lib/SegmentationData"
import { SelectedPopulation } from "../interfaces/ImageInterfaces"

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

    renderImageViewer = (imageData: ImageData| null,
        segmentationData: SegmentationData | null,
        segmentationFillAlpha: number,
        segmentationOutlineAlpha: number,
        segmentationCentroidsVisible: boolean,
        channelDomain: Record<ChannelName, [number, number]>,
        channelMarker: Record<ChannelName, string | null>,
        maxWidth: number,
        windowHeight: number | null,
        onCanvasDataLoaded: (data: ImageData) => void,
        addSelectedRegion: (selectedRegion: number[] | null, selectedSegments: number[], color: number) => void,
        selectedRegions: SelectedPopulation[] | null,
        hightlightedRegions: string[],
        highlightedSegments: number[],
        exportPath: string | null,
        onExportComplete: () => void) =>
    {
        let viewer = null
        if(imageData != null && windowHeight != null) {
            let maxRendererSize = {width: maxWidth, height: windowHeight - WindowHeightBufferSize}
            viewer = <ImageViewer
                imageData = {imageData}
                segmentationData = {segmentationData}
                segmentationFillAlpha = {segmentationFillAlpha}
                segmentationOutlineAlpha = {segmentationOutlineAlpha}
                segmentationCentroidsVisible = {segmentationCentroidsVisible}
                channelDomain = {channelDomain}
                channelMarker = {channelMarker}
                maxRendererSize = {maxRendererSize}
                onCanvasDataLoaded = {onCanvasDataLoaded}
                addSelectedRegion = {addSelectedRegion}
                selectedRegions = {selectedRegions}
                hightlightedRegions = {hightlightedRegions}
                highlightedSegmentsFromPlot = {highlightedSegments}
                exportPath = {exportPath}
                onExportComplete = {onExportComplete}
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
            setSelectedImageSet = {projectStore.setActiveImageSetCallback()}
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
                    scatterPlot = <Plot
                        windowWidth = {projectStore.windowWidth}
                        channelSelectOptions = {imageStore.channelSelectOptions.get()}
                        selectedPlotChannels = {plotStore.selectedPlotChannels}
                        setSelectedPlotChannels = {projectStore.setSelectedPlotChannels}
                        selectedStatistic= {plotStore.plotStatistic}
                        setSelectedStatistic = {plotStore.setPlotStatistic}
                        selectedTransform = {plotStore.plotTransform}
                        setSelectedTransform = {plotStore.setPlotTransform}
                        selectedType = {plotStore.plotType}
                        setSelectedType = {plotStore.setPlotType}
                        selectedNormalization = {plotStore.plotNormalization}
                        setSelectedNormalization = {plotStore.setPlotNormalization}
                        setSelectedSegments = {this.addSelectedPopulation}
                        setSelectedRange = {projectStore.addPopulationFromRange}
                        setHoveredSegments = {plotStore.setSegmentsHoveredOnPlot}
                        plotData = {plotStore.plotData}
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

        // Dereferencing these here for rendering the image viewer
        // With the way SizeMe works, any variables dereferenced within it
        // don't work as dereferences to trigger a React rerender
        let imageData = imageStore.imageData
        let segmentationData = imageStore.segmentationData
        let segmentationFillAlpha = imageStore.segmentationFillAlpha
        let segmentationOutlineAlpha = imageStore.segmentationOutlineAlpha
        let segmentationCentroidsVisible = imageStore.segmentationCentroidsVisible
        let channelDomain = imageStore.channelDomain
        let channelMarker = imageStore.channelMarker
        let windowHeight = projectStore.windowHeight
        let onCanvasDataLoaded = imageStore.setCanvasImageData
        let addSelectedRegion = populationStore.addSelectedPopulation
        let selectedRegions = populationStore.selectedPopulations
        let hightlightedRegions = populationStore.highlightedPopulations
        let highlightedSegmentsFromPlot = plotStore.segmentsHoveredOnPlot
        let exportPath = imageStore.imageExportFilename
        let onExportComplete = imageStore.clearImageExportFilename
     
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
                        <SizeMe>{({ size }) =>
                            <Col xs={6} sm={6} md={6} lg={6}>
                                <Grid fluid={true}>
                                    <Row center="xs">
                                        <Col>
                                            {this.renderImageViewer(
                                                imageData,
                                                segmentationData,
                                                segmentationFillAlpha,
                                                segmentationOutlineAlpha,
                                                segmentationCentroidsVisible,
                                                channelDomain,
                                                channelMarker,
                                                size.width,
                                                windowHeight,
                                                onCanvasDataLoaded,
                                                addSelectedRegion,
                                                selectedRegions,
                                                hightlightedRegions,
                                                highlightedSegmentsFromPlot,
                                                exportPath,
                                                onExportComplete
                                            )}
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
                                <div>{scatterPlot}</div>
                            </UnmountClosed>
                        </Col>
                    </Row>
                </Grid>
            </div>
        )
    }
}