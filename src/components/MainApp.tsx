import * as React from 'react'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { Button, Collapse, Modal, ModalHeader, ModalBody, Spinner, Progress } from 'reactstrap'

import { ProjectStore } from '../stores/ProjectStore'
import { ChannelControls } from './ChannelControls'
import { observer } from 'mobx-react'
import { ChannelName, WindowHeightBufferSize, ChannelControlsCombinedHeight } from '../definitions/UIDefinitions'
import { ImageViewer } from './ImageViewer'
import { ImageSetSelector } from './ImageSetSelector'
import { ImageControls } from './ImageControls'
import { Plot } from './Plot'
import { SelectedPopulations } from './SelectedPopulations'
import { SelectedPopulation } from '../interfaces/ImageInterfaces'
import { ImageChannels, GraphSelectionPrefix, ImageSelectionPrefix } from '../definitions/UIDefinitions'

export interface MainAppProps {
    projectStore: ProjectStore
}

interface MainAppState {
    channelsOpen: boolean
    regionsOpen: boolean
    controlsOpen: boolean
    plotOpen: boolean
}

@observer
export class MainApp extends React.Component<MainAppProps, MainAppState> {
    public constructor(props: MainAppProps) {
        super(props)
    }

    public state = {
        channelsOpen: true,
        regionsOpen: true,
        controlsOpen: false,
        plotOpen: false,
    }

    // Reverse ImageChannels so that select order is RGBCMYK
    private imageChannelsForControls = ImageChannels.slice().reverse()

    private notEnoughSpaceForChannelAndControls = () => {
        let windowHeight = this.props.projectStore.windowHeight
        if (windowHeight && windowHeight < ChannelControlsCombinedHeight) return true
        return false
    }

    // If opening channels, close image controls
    private handleChannelClick = () => {
        let newChannelsOpenValue = !this.state.channelsOpen
        this.setState({ channelsOpen: newChannelsOpenValue })
        if (newChannelsOpenValue && this.notEnoughSpaceForChannelAndControls()) this.setState({ controlsOpen: false })
    }
    // If opening image controls, close channels
    private handleControlsClick = () => {
        let newControlsOpenValue = !this.state.controlsOpen
        this.setState({ controlsOpen: newControlsOpenValue })
        if (newControlsOpenValue && this.notEnoughSpaceForChannelAndControls()) this.setState({ channelsOpen: false })
    }
    private handleRegionsClick = () => this.setState({ regionsOpen: !this.state.regionsOpen })
    private handlePlotClick = () => this.setState({ plotOpen: !this.state.plotOpen })

    private addSelectionFromGraph = (segmentIds: number[]) => {
        let populationStore = this.props.projectStore.activePopulationStore
        if (segmentIds.length > 0) populationStore.addSelectedPopulation(null, segmentIds, GraphSelectionPrefix)
    }

    private addSelectionFromImage = (selectedRegion: number[], segmentIds: number[], color: number) => {
        let populationStore = this.props.projectStore.activePopulationStore
        populationStore.addSelectedPopulation(selectedRegion, segmentIds, ImageSelectionPrefix, null, color)
    }

    private updateSelectionsFromImage = (selected: SelectedPopulation[]) => {
        let populationStore = this.props.projectStore.activePopulationStore
        populationStore.setSelectedPopulations(selected)
    }

    private getChannelMin(s: ChannelName): number {
        let imageStore = this.props.projectStore.activeImageStore
        let channelMarker = imageStore.channelMarker[s]
        if (channelMarker != null && imageStore.imageData != null) {
            return imageStore.imageData.minmax[channelMarker].min
        }
        return 0
    }

    private getChannelMax(s: ChannelName): number {
        let imageStore = this.props.projectStore.activeImageStore
        let channelMarker = imageStore.channelMarker[s]
        if (channelMarker != null && imageStore.imageData != null) {
            return imageStore.imageData.minmax[channelMarker].max
        }
        return 100
    }

    private exportModal(numExported: number, numToExport: number): JSX.Element | null {
        let modal = null
        if (numToExport > 0) {
            let exportProgress = (numExported / numToExport) * 100
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>Files exporting...</ModalHeader>
                    <ModalBody>
                        <div style={{ textAlign: 'center' }}>
                            <Progress value={exportProgress} />
                        </div>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }

    private loadingModal(imageDataLoading: boolean, segmentationDataLoading: boolean): JSX.Element | null {
        let modal = null
        if (imageDataLoading || segmentationDataLoading) {
            let modalType = imageDataLoading ? 'Image Data' : 'Segmentation Data'
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>{modalType} is loading...</ModalHeader>
                    <ModalBody>
                        <div style={{ textAlign: 'center' }}>
                            <Spinner style={{ width: '5rem', height: '5rem' }} />
                        </div>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }

    public static getDerivedStateFromProps(props: MainAppProps, state: MainAppState): Partial<MainAppState> | null {
        let windowHeight = props.projectStore.windowHeight
        // If window height is defined, and we are now too short for both image controls and channels to be open, close controls.
        if (windowHeight && windowHeight < ChannelControlsCombinedHeight && state.channelsOpen && state.controlsOpen)
            return {
                controlsOpen: false,
            }
        return null
    }

    public render(): React.ReactNode {
        let projectStore = this.props.projectStore
        let imageStore = projectStore.activeImageStore
        let populationStore = projectStore.activePopulationStore
        let plotStore = projectStore.activePlotStore
        let settingStore = projectStore.settingStore

        let imageViewer = null
        let imageSetSelector = null
        let channelControls = null
        let scatterPlot = null
        let imageControls = null

        imageSetSelector = (
            <ImageSetSelector
                selectedImageSet={projectStore.activeImageSetPath}
                imageSets={projectStore.imageSetPaths}
                setSelectedImageSet={projectStore.setActiveImageSet}
                previousImageSet={projectStore.setPreviousImageSet}
                nextImageSet={projectStore.setNextImageSet}
            />
        )

        if (imageStore.imageData != null) {
            let markerNames = imageStore.imageData.markerNames
            if (markerNames.length > 0) {
                channelControls = this.imageChannelsForControls.map((s: ChannelName) => (
                    <ChannelControls
                        key={s}
                        channel={s}
                        channelVisible={imageStore.channelVisibility[s]}
                        setChannelVisibility={projectStore.setChannelVisibilityCallback(s)}
                        sliderMin={this.getChannelMin(s)}
                        sliderMax={this.getChannelMax(s)}
                        sliderValue={imageStore.channelDomain[s]}
                        setChannelDomain={projectStore.setChannelDomainCallback(s)}
                        markers={markerNames}
                        selectedMarker={imageStore.channelMarker[s]}
                        allSelectedMarkers={Object.values(imageStore.channelMarker)}
                        setMarker={projectStore.setChannelMarkerCallback(s)}
                        windowWidth={projectStore.windowWidth}
                    />
                ))
            }

            imageControls = (
                <ImageControls
                    fillAlpha={imageStore.segmentationFillAlpha}
                    outlineAlpha={imageStore.segmentationOutlineAlpha}
                    onFillAlphaChange={projectStore.setSegmentationFillAlpha}
                    onOutlineAlphaChange={projectStore.setSegmentationOutlineAlpha}
                    centroidsVisible={imageStore.segmentationCentroidsVisible}
                    setCentroidsVisible={projectStore.setSegmentationCentroidsVisible}
                    onClearSegmentation={projectStore.clearActiveSegmentationData}
                    legendVisible={settingStore.legendVisible}
                    setLegendVisible={settingStore.setLegendVisible}
                    segmentationLoaded={imageStore.segmentationData != null}
                />
            )

            let windowHeight = null
            if (projectStore.windowHeight != null) windowHeight = projectStore.windowHeight - WindowHeightBufferSize
            imageViewer = (
                <ImageViewer
                    imageData={imageStore.imageData}
                    segmentationData={imageStore.segmentationData}
                    segmentationFillAlpha={imageStore.segmentationFillAlpha}
                    segmentationOutlineAlpha={imageStore.segmentationOutlineAlpha}
                    segmentationCentroidsVisible={imageStore.segmentationCentroidsVisible}
                    channelDomain={imageStore.channelDomain}
                    channelVisibility={imageStore.channelVisibility}
                    channelMarker={imageStore.channelMarker}
                    addSelectedRegion={this.addSelectionFromImage}
                    updateSelectedRegions={this.updateSelectionsFromImage}
                    selectedRegions={populationStore.selectedPopulations}
                    hightlightedRegions={populationStore.highlightedPopulations}
                    highlightedSegmentsFromPlot={plotStore.segmentsHoveredOnPlot}
                    exportPath={imageStore.imageExportFilename}
                    onExportComplete={imageStore.clearImageExportFilename}
                    legendVisible={settingStore.legendVisible}
                    maxHeight={windowHeight}
                />
            )
            if (imageStore.segmentationData != null) {
                if (projectStore.plotInMainWindow) {
                    scatterPlot = (
                        <Plot
                            windowWidth={projectStore.windowWidth}
                            markers={markerNames}
                            selectedPlotMarkers={plotStore.selectedPlotMarkers}
                            setSelectedPlotMarkers={projectStore.setSelectedPlotMarkers}
                            selectedStatistic={plotStore.plotStatistic}
                            setSelectedStatistic={projectStore.setPlotStatistic}
                            selectedTransform={plotStore.plotTransform}
                            setSelectedTransform={projectStore.setPlotTransform}
                            selectedType={plotStore.plotType}
                            setSelectedType={projectStore.setPlotType}
                            selectedNormalization={plotStore.plotNormalization}
                            setSelectedNormalization={projectStore.setPlotNormalization}
                            setSelectedSegments={this.addSelectionFromGraph}
                            setSelectedRange={projectStore.addPopulationFromRange}
                            setHoveredSegments={plotStore.setSegmentsHoveredOnPlot}
                            plotData={plotStore.plotData}
                        />
                    )
                }
            }
        }

        let selectedPopulations = (
            <SelectedPopulations
                populations={populationStore.selectedPopulations}
                updateName={populationStore.updateSelectedPopulationName}
                updateColor={populationStore.updateSelectedPopulationColor}
                updateVisibility={populationStore.updateSelectedPopulationVisibility}
                deletePopulation={populationStore.deleteSelectedPopulation}
                setAllVisibility={populationStore.setAllSelectedPopulationVisibility}
                highlightPopulation={populationStore.highlightSelectedPopulation}
                unhighlightPopulation={populationStore.unhighlightSelectedPopulation}
            />
        )

        let fullWidth = { width: '100%' }
        let fullWidthBottomSpaced = { marginBottom: '0.5rem', width: '100%' }
        let paddingStyle = { paddingTop: '10px' }

        let imageDataLoading = imageStore.imageDataLoading
        let segmentationDataLoading = imageStore.segmentationDataLoading

        let numExported = projectStore.numExported
        let numToExport = projectStore.numToExport

        return (
            <div>
                {this.loadingModal(imageDataLoading, segmentationDataLoading)}
                {this.exportModal(numExported, numToExport)}
                <Grid fluid={true} style={paddingStyle}>
                    <Row between="xs" center="xs">
                        <Col xs={2} sm={2} md={2} lg={2}>
                            <div style={fullWidthBottomSpaced}>{imageSetSelector}</div>
                            <Button onClick={this.handleChannelClick} style={fullWidthBottomSpaced} size="sm">
                                {this.state.channelsOpen ? 'Hide' : 'Show'} Channel Controls
                            </Button>
                            <Collapse isOpen={this.state.channelsOpen} style={fullWidth}>
                                <div>{channelControls}</div>
                            </Collapse>
                            <Button onClick={this.handleControlsClick} style={fullWidthBottomSpaced} size="sm">
                                {this.state.controlsOpen ? 'Hide' : 'Show'} Image Controls
                            </Button>
                            <Collapse isOpen={this.state.controlsOpen} style={fullWidth}>
                                <div>{imageControls}</div>
                            </Collapse>
                        </Col>
                        <Col xs={6} sm={6} md={6} lg={6}>
                            {imageViewer}
                        </Col>
                        <Col xs={4} sm={4} md={4} lg={4}>
                            <Button onClick={this.handleRegionsClick} style={fullWidthBottomSpaced} size="sm">
                                {this.state.regionsOpen ? 'Hide' : 'Show'} Selected Populations
                            </Button>
                            <Collapse isOpen={this.state.regionsOpen} style={fullWidth}>
                                {selectedPopulations}
                            </Collapse>
                            <Button
                                onClick={this.handlePlotClick}
                                style={fullWidthBottomSpaced}
                                size="sm"
                                disabled={imageStore.segmentationData == null}
                            >
                                {this.state.plotOpen ? 'Hide' : 'Show'} Plot Pane
                            </Button>
                            <Collapse isOpen={this.state.plotOpen} style={fullWidth}>
                                <div>{scatterPlot}</div>
                            </Collapse>
                        </Col>
                    </Row>
                </Grid>
            </div>
        )
    }
}
