import * as React from "react"
import { UnmountClosed } from 'react-collapse'
import { Button } from "@blueprintjs/core"
import { ClipLoader } from 'react-spinners'
import Flexbox from 'flexbox-react'

import { ProjectStore } from "../stores/ProjectStore";
import { ChannelControls } from "./ChannelControls"
import { observer } from "mobx-react"
import { ChannelName } from "../interfaces/UIDefinitions"
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

    render() {

        let imageStore = this.props.projectStore.activeImageStore
        let populationStore = this.props.projectStore.activePopulationStore
        let plotStore = this.props.projectStore.activePlotStore

        let imageViewer = null
        let imageSetSelector =  null
        let channelControls = null
        let scatterPlot = null
        let segmentationControls = null

        imageSetSelector = <ImageSetSelector
            selectedImageSet = {this.props.projectStore.activeImageSetPath}
            imageSetOptions = {this.props.projectStore.imageSetPathOptions.get()}
            setSelectedImageSet = {this.props.projectStore.setActiveImageSetFromSelect()}
            persistData = {this.props.projectStore.persistImageSetSettings}
            setPersistData = {this.props.projectStore.setPersistImageSetSettings}
        />

        if(imageStore.imageData != null) {
            imageViewer = <ImageViewer 
                imageData = {imageStore.imageData}
                segmentationData = {imageStore.segmentationData}
                segmentationFillAlpha = {imageStore.segmentationFillAlpha}
                segmentationOutlineAlpha = {imageStore.segmentationOutlineAlpha}
                segmentationCentroidsVisible = {imageStore.segmentationCentroidsVisible}
                channelDomain = {imageStore.channelDomain}
                channelMarker = {imageStore.channelMarker}
                canvasWidth = {imageStore.imageData.width}
                canvasHeight = {imageStore.imageData.height}
                windowWidth = {imageStore.windowWidth}
                onCanvasDataLoaded = {imageStore.setCanvasImageData}
                addSelectedRegion = {populationStore.addSelectedPopulation}
                selectedRegions = {populationStore.selectedPopulations}
                hightlightedRegions = {populationStore.highlightedPopulations}
                highlightedSegmentsFromPlot = {plotStore.segmentsHoveredOnPlot}
                exportPath = {imageStore.imageExportFilename}
                onExportComplete = {imageStore.clearImageExportFilename}
            />
 
            channelControls = ["rChannel", "gChannel", "bChannel"].map((s:ChannelName) => 
                <ChannelControls
                    key={s}
                    sliderMin = {this.getChannelMin(s)}
                    sliderMax = {this.getChannelMax(s)}
                    sliderValue = {imageStore.channelDomain[s]}
                    onSliderChange = {imageStore.setChannelDomain(s)}
                    selectOptions = {imageStore.channelSelectOptions.get()}
                    selectValue = {imageStore.channelMarker[s]}
                    onSelectChange = {imageStore.setChannelMarkerFromSelect(s)}
                    windowWidth = {imageStore.windowWidth}
                />
            )

            if (imageStore.segmentationData != null) {
                segmentationControls = <SegmentationControls
                    fillAlpha = {imageStore.segmentationFillAlpha}
                    outlineAlpha = {imageStore.segmentationOutlineAlpha}
                    onFillAlphaChange = {imageStore.setSegmentationFillAlpha}
                    onOutlineAlphaChange = {imageStore.setSegmentationOutlineAlpha}
                    centroidsVisible = {imageStore.segmentationCentroidsVisible}
                    setCentroidsVisible = {imageStore.setCentroidVisibility}
                    onClearSegmentation = {imageStore.clearSegmentationData}
                />

                if(plotStore.plotInMainWindow) {
                    scatterPlot = <ScatterPlot
                        windowWidth = {imageStore.windowWidth}
                        channelSelectOptions = {imageStore.channelSelectOptions.get()}
                        selectedPlotChannels = {plotStore.selectedPlotChannels}
                        setSelectedPlotChannels = {plotStore.setSelectedPlotChannels}
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
     
        return(
            <div>
                <Flexbox flexDirection="row" justifyContent="space-between">
                    <Flexbox flexDirection="column" flex="0 1 auto" alignItems="flex-start" paddingLeft="20px" paddingRight="10px" paddingTop="10px">
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
                    </Flexbox>
                    <Flexbox flexDirection="column" flex="1 1 auto" alignItems="center" minWidth="550px"  paddingTop="10px">
                        {imageViewer}
                        {imageLoading}
                    </Flexbox>
                    <Flexbox flexDirection="column" flex="1 1 auto" alignItems="flex-end" paddingLeft="10px" paddingRight="20px" paddingTop="10px">
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
                            <Flexbox flexDirection="column" flex="flex-grow" minWidth="400px">
                                {scatterPlot}
                            </Flexbox>
                        </UnmountClosed>
                    </Flexbox>
                </Flexbox>
            </div>
        )
    }
}