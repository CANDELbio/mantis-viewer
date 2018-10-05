import * as React from "react"
import { ImageStore } from "../stores/ImageStore"
import { ChannelControls } from "./ChannelControls"
import { observer } from "mobx-react"
import { ChannelName, SelectOption } from "../interfaces/UIDefinitions"
import { ImageViewer } from "./ImageViewer"
import { SelectedDirectory } from "./SelectedDirectory"
import { SegmentationControls } from "./SegmentationControls"
import { ScatterPlot } from "./ScatterPlot"
import { SelectedPopulations } from "./SelectedPopulations"
import { UnmountClosed } from 'react-collapse'
import { Button } from "@blueprintjs/core"
import { ClipLoader } from 'react-spinners'
import Flexbox from 'flexbox-react'
import { PopulationStore } from "../stores/PopulationStore";

export interface MainAppProps { 
    imageStore: ImageStore
    populationStore: PopulationStore
}

interface MainAppState { 
    channelsOpen: boolean,
    regionsOpen: boolean,
    segmentationOpen: boolean,
    graphOpen: boolean
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
        graphOpen: false
    }

    handleChannelClick = () => this.setState({channelsOpen: !this.state.channelsOpen})
    handleRegionsClick = () => this.setState({regionsOpen: !this.state.regionsOpen})
    handleSegmentationClick = () => this.setState({segmentationOpen: !this.state.segmentationOpen})
    handleGraphClick = () => this.setState({graphOpen: !this.state.graphOpen})

    onPlotChannelSelect = (x: SelectOption[]) => this.props.imageStore.setSelectedPlotChannels(x)
    onPlotMetricSelect = (x: SelectOption) => this.props.imageStore.setScatterPlotStatistic(x)

    getChannelMin = (s:ChannelName) => {
        let channelMarker = this.props.imageStore.channelMarker[s]
        if (channelMarker != null && this.props.imageStore.imageData != null) {
            return this.props.imageStore.imageData.minmax[channelMarker].min
        }
        return 0
    }

    getChannelMax = (s:ChannelName) => {
        let channelMarker = this.props.imageStore.channelMarker[s]
        if (channelMarker != null && this.props.imageStore.imageData != null) {
            return this.props.imageStore.imageData.minmax[channelMarker].max
        }
        return 100
    }

    render() {
        let imageViewer = null
        let selectedDirectory =  null
        let channelControls = null
        let scatterPlot = null
        let segmentationControls = null

        if(this.props.imageStore.selectedDirectory) {
            selectedDirectory = <SelectedDirectory
                selectedDirectory = {this.props.imageStore.selectedDirectory}
            />
        }

        if(this.props.imageStore.imageData != null) {
            let width = this.props.imageStore.imageData.width
            let height = this.props.imageStore.imageData.height

            let channelSelectOptions =  this.props.imageStore.imageData.channelNames.map((s) => {
                return({value: s, label: s})
            })
                
            imageViewer = <ImageViewer 
                imageData = {this.props.imageStore.imageData}
                segmentationData = {this.props.imageStore.segmentationData}
                segmentationAlpha = {this.props.imageStore.segmentationAlpha}
                segmentationCentroidsVisible = {this.props.imageStore.segmentationCentroidsVisible}
                channelDomain = {this.props.imageStore.channelDomain}
                channelMarker = {this.props.imageStore.channelMarker}
                canvasWidth = {width}
                canvasHeight = {height}
                windowWidth = {this.props.imageStore.windowWidth}
                onCanvasDataLoaded = {this.props.imageStore.setCanvasImageData}
                addSelectedRegion = {this.props.populationStore.addSelectedPopulation}
                selectedRegions = {this.props.populationStore.selectedPopulations}
                hightlightedRegions = {this.props.populationStore.highlightedPopulations}
                highlightedSegmentsFromGraph = {this.props.imageStore.segmentsHoveredOnGraph}
            />
 
            channelControls = ["rChannel", "gChannel", "bChannel"].map((s:ChannelName) => 
                <ChannelControls
                    key={s}
                    sliderMin = {this.getChannelMin(s)}
                    sliderMax = {this.getChannelMax(s)}
                    sliderValue = {this.props.imageStore.channelSliderValue[s]}
                    onSliderChange = {this.props.imageStore.setChannelSliderValue(s)}
                    onSliderRelease = {this.props.imageStore.setChannelDomain(s)}
                    selectOptions = {channelSelectOptions}
                    selectValue = {this.props.imageStore.channelMarker[s]}
                    onSelectChange = {this.props.imageStore.setChannelMarkerFromSelect(s)}
                    windowWidth = {this.props.imageStore.windowWidth}
                />
            )

            if (this.props.imageStore.selectedSegmentationFile != null) {
                segmentationControls = <SegmentationControls
                    segmentationPath = {this.props.imageStore.selectedSegmentationFile}
                    segmentationAlpha = {this.props.imageStore.segmentationAlpha}
                    onAlphaChange = {this.props.imageStore.setSegmentationSliderValue()}
                    centroidsVisible = {this.props.imageStore.segmentationCentroidsVisible}
                    onVisibilityChange = {this.props.imageStore.setCentroidVisibility()}
                    onClearSegmentation = {this.props.imageStore.clearSegmentationDataCallback()}
                />

                scatterPlot = <ScatterPlot 
                    windowWidth = {this.props.imageStore.windowWidth}
                    channelSelectOptions = {channelSelectOptions}
                    selectedPlotChannels = {this.props.imageStore.selectedPlotChannels}
                    setSelectedPlotChannels = {this.onPlotChannelSelect}
                    selectedStatistic= {this.props.imageStore.scatterPlotStatistic}
                    setSelectedStatistic = {this.onPlotMetricSelect}
                    selectedTransform = {this.props.imageStore.scatterPlotTransform}
                    setSelectedTransform = {this.props.imageStore.setScatterPlotTransform}
                    setSelectedPoints = {this.props.imageStore.setSegmentsSelectedOnGraph}
                    setHoveredPoints = {this.props.imageStore.setSegmentsHoveredOnGraph}
                    setUnHoveredPoints = {this.props.imageStore.clearSegmentsHoveredOnGraph}
                    scatterPlotData = {this.props.imageStore.scatterPlotData.get()}
                />
            }
        }
        
        let imageLoading = <ClipLoader
            sizeUnit={"px"}
            size={150}
            color={'#123abc'}
            loading={this.props.imageStore.imageDataLoading}
        />

        let selectedPopulations = <SelectedPopulations
            populations = {this.props.populationStore.selectedPopulations}
            updateName = {this.props.populationStore.updateSelectedPopulationName}
            updateNotes = {this.props.populationStore.updateSelectedPopulationNotes}
            updateColor = {this.props.populationStore.updateSelectedPopulationColor}
            updateVisibility = {this.props.populationStore.updateSelectedPopulationVisibility}
            deletePopulation = {this.props.populationStore.deleteSelectedPopulation}
            setAllVisibility = {this.props.populationStore.setAllSelectedPopulationVisibility}
            highlightPopulation = {this.props.populationStore.highlightSelectedPopulation}
            unhighlightPopulation = {this.props.populationStore.unhighlightSelectedPopulation}
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
                            <div>{selectedDirectory}</div>
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
                        <Button onClick={this.handleGraphClick}  style={fullWidth}>
                            {this.state.graphOpen ? "Hide" : "Show"} Graphing Pane
                        </Button>
                        <UnmountClosed isOpened={this.state.graphOpen} style={fullWidth}>
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