import * as React from "react"
import { ImageStore } from "../stores/ImageStore"
import { ChannelControls } from "./ChannelControls"
import { observer } from "mobx-react"
import { ChannelName, SelectOption } from "../interfaces/UIDefinitions"
import { ImageViewer } from "./ImageViewer"
import { SelectedDirectory } from "./SelectedDirectory"
import { SegmentationControls } from "./SegmentationControls"
import { ScatterPlot } from "./ScatterPlot"
import { SelectedRegions } from "./SelectedRegions"
import { UnmountClosed } from 'react-collapse'
import { Button } from "@blueprintjs/core"
import { ClipLoader } from 'react-spinners'
import Flexbox from 'flexbox-react'

export interface MainAppProps { 
    store: ImageStore
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
        let imageViewer = null
        let selectedDirectory =  null
        let channelControls = null
        let scatterPlot = null
        let segmentationControls = null

        if(this.props.store.selectedDirectory) {
            selectedDirectory = <SelectedDirectory
                selectedDirectory = {this.props.store.selectedDirectory}
            />
        }

        if(this.props.store.imageData != null) {
            let width = this.props.store.imageData.width
            let height = this.props.store.imageData.height

            let channelSelectOptions =  this.props.store.imageData.channelNames.map((s) => {
                return({value: s, label: s})
            })
                
            imageViewer = <ImageViewer 
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
                    onSelectChange = {this.props.store.setChannelMarkerFromSelect(s)}
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
                    scatterPlotData = {this.props.store.scatterPlotData.get()}
                />
            }
        }
        
        let imageLoading = <ClipLoader
            sizeUnit={"px"}
            size={150}
            color={'#123abc'}
            loading={this.props.store.imageDataLoading}
        />

        let selectedRegions = <SelectedRegions
            regions = {this.props.store.selectedRegions}
            updateName = {this.props.store.updateSelectedRegionName}
            updateNotes = {this.props.store.updateSelectedRegionNotes}
            updateColor = {this.props.store.updateSelectedRegionColor}
            updateVisibility = {this.props.store.updateSelectedRegionVisibility}
            deleteRegion = {this.props.store.deleteSelectedRegion}
            setAllVisibility = {this.props.store.setAllSelectedRegionVisibility}
            highlightRegion = {this.props.store.highlightSelectedRegion}
            unhighlightRegion = {this.props.store.unhighlightSelectedRegion}
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
                            {selectedRegions}
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