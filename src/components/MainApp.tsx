import * as React from 'react'
import { observer } from 'mobx-react'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { Button, Collapse } from 'reactstrap'

import { ProjectStore } from '../stores/ProjectStore'
import {
    ChannelName,
    ImageViewerHeightPadding,
    MainPlotHeightPadding,
    ChannelControlsCombinedHeight,
    ImageChannels,
    GraphSelectionPrefix,
    ImageSelectionPrefix,
} from '../definitions/UIDefinitions'
import { ChannelControls } from './ChannelControls'
import { ImageViewer } from './ImageViewer'
import { ImageSetSelector } from './ImageSetSelector'
import { ImageControls } from './ImageControls'
import { Plot } from './Plot'
import { SelectedPopulations } from './SelectedPopulations'
import { WelcomeModal } from './modals/WelcomeModal'
import { ExportModal } from './modals/ExportModal'
import { LoadingModal } from './modals/LoadingModal'
import { SelectedPopulation } from '../interfaces/ImageInterfaces'
import { PlotControls } from './PlotControls'

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
        let populationStore = this.props.projectStore.activeImageSetStore.populationStore
        if (segmentIds.length > 0) populationStore.addSelectedPopulation(null, segmentIds, GraphSelectionPrefix)
    }

    private addSelectionFromImage = (selectedRegion: number[], segmentIds: number[], color: number) => {
        let populationStore = this.props.projectStore.activeImageSetStore.populationStore
        populationStore.addSelectedPopulation(selectedRegion, segmentIds, ImageSelectionPrefix, null, color)
    }

    private updateSelectionsFromImage = (selected: SelectedPopulation[]) => {
        let populationStore = this.props.projectStore.activeImageSetStore.populationStore
        populationStore.setSelectedPopulations(selected)
    }

    private getChannelMin(s: ChannelName): number {
        let settingStore = this.props.projectStore.settingStore
        let imageStore = this.props.projectStore.activeImageSetStore.imageStore
        let channelMarker = settingStore.channelMarker[s]
        if (channelMarker != null && imageStore.imageData != null) {
            let minmax = imageStore.imageData.minmax[channelMarker]
            if (minmax) return imageStore.imageData.minmax[channelMarker].min
        }
        return 0
    }

    private getChannelMax(s: ChannelName): number {
        let settingStore = this.props.projectStore.settingStore
        let imageStore = this.props.projectStore.activeImageSetStore.imageStore
        let channelMarker = settingStore.channelMarker[s]
        if (channelMarker != null && imageStore.imageData != null) {
            let minmax = imageStore.imageData.minmax[channelMarker]
            if (minmax) return imageStore.imageData.minmax[channelMarker].max
        }
        return 100
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
        let imageSetStore = this.props.projectStore.activeImageSetStore
        let imageStore = imageSetStore.imageStore
        let segmentationStore = imageSetStore.segmentationStore
        let populationStore = imageSetStore.populationStore
        let plotStore = imageSetStore.plotStore
        let settingStore = projectStore.settingStore

        let imageViewer = null
        let imageMessage = null
        let imageSetSelector = null
        let channelControls = null
        let plotControls = null
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
                channelControls = this.imageChannelsForControls.map((s: ChannelName) => {
                    let channelMarker = settingStore.channelMarker[s]
                    let selectedMarker = channelMarker && markerNames.includes(channelMarker) ? channelMarker : null
                    return (
                        <ChannelControls
                            key={s}
                            channel={s}
                            channelVisible={settingStore.channelVisibility[s]}
                            setChannelVisibility={settingStore.setChannelVisibilityCallback(s)}
                            sliderMin={this.getChannelMin(s)}
                            sliderMax={this.getChannelMax(s)}
                            sliderValue={imageStore.channelDomain[s]}
                            setChannelDomainPercentage={settingStore.setChannelDomainPercentageCallback(s)}
                            markers={markerNames}
                            selectedMarker={selectedMarker}
                            allSelectedMarkers={Object.values(settingStore.channelMarker)}
                            setMarker={settingStore.setChannelMarkerCallback(s)}
                            windowWidth={projectStore.windowWidth}
                        />
                    )
                })
            }

            imageControls = (
                <ImageControls
                    fillAlpha={settingStore.segmentationFillAlpha}
                    outlineAlpha={settingStore.segmentationOutlineAlpha}
                    onFillAlphaChange={settingStore.setSegmentationFillAlpha}
                    onOutlineAlphaChange={settingStore.setSegmentationOutlineAlpha}
                    centroidsVisible={settingStore.segmentationCentroidsVisible}
                    setCentroidsVisible={settingStore.setSegmentationCentroidsVisible}
                    onClearSegmentation={() => {
                        projectStore.setClearSegmentationRequested(true)
                    }}
                    legendVisible={settingStore.legendVisible}
                    setLegendVisible={settingStore.setLegendVisible}
                    selectedSegmentationFile={segmentationStore.selectedSegmentationFile}
                    segmentationLoaded={segmentationStore.segmentationData != null}
                />
            )

            let maxImageHeight = null
            if (projectStore.windowHeight != null) maxImageHeight = projectStore.windowHeight - ImageViewerHeightPadding
            if (imageStore.imageData.scaled) {
                imageMessage = (
                    <div style={{ position: 'relative', textAlign: 'center' }}>
                        This image has been downsampled to fit in memory.
                    </div>
                )
                if (maxImageHeight) maxImageHeight -= 20
            }
            imageViewer = (
                <ImageViewer
                    imageData={imageStore.imageData}
                    segmentationData={segmentationStore.segmentationData}
                    segmentationFillAlpha={settingStore.segmentationFillAlpha}
                    segmentationOutlineAlpha={settingStore.segmentationOutlineAlpha}
                    segmentationCentroidsVisible={settingStore.segmentationCentroidsVisible}
                    channelDomain={imageStore.channelDomain}
                    channelVisibility={settingStore.channelVisibility}
                    channelMarker={settingStore.channelMarker}
                    position={imageStore.position}
                    scale={imageStore.scale}
                    setPositionAndScale={imageStore.setPositionAndScale}
                    addSelectedRegion={this.addSelectionFromImage}
                    updateSelectedRegions={this.updateSelectionsFromImage}
                    selectedRegions={populationStore.selectedPopulations}
                    hightlightedRegions={populationStore.highlightedPopulations}
                    highlightedSegmentsFromPlot={plotStore.segmentsHoveredOnPlot}
                    exportPath={imageStore.imageExportFilename}
                    onExportComplete={imageStore.clearImageExportFilename}
                    legendVisible={settingStore.legendVisible}
                    maxHeight={maxImageHeight}
                />
            )
            if (segmentationStore.segmentationData != null) {
                if (projectStore.plotInMainWindow) {
                    let maxPlotHeight = null
                    if (projectStore.windowHeight != null)
                        maxPlotHeight = projectStore.windowHeight - MainPlotHeightPadding
                    plotControls = (
                        <PlotControls
                            windowWidth={projectStore.windowWidth}
                            markers={markerNames}
                            selectedPlotMarkers={settingStore.selectedPlotMarkers}
                            setSelectedPlotMarkers={settingStore.setSelectedPlotMarkers}
                            selectedStatistic={settingStore.plotStatistic}
                            setSelectedStatistic={settingStore.setPlotStatistic}
                            selectedTransform={settingStore.plotTransform}
                            setSelectedTransform={settingStore.setPlotTransform}
                            selectedType={settingStore.plotType}
                            setSelectedType={settingStore.setPlotType}
                            selectedNormalization={settingStore.plotNormalization}
                            setSelectedNormalization={settingStore.setPlotNormalization}
                            dotSize={settingStore.plotDotSize}
                            setDotSize={settingStore.setPlotDotSize}
                            transformCoefficient={settingStore.transformCoefficient}
                            setTransformCoefficient={settingStore.setTransformCoefficient}
                        />
                    )
                    scatterPlot = (
                        <Plot
                            windowWidth={projectStore.windowWidth}
                            selectedType={settingStore.plotType}
                            setSelectedSegments={this.addSelectionFromGraph}
                            setSelectedRange={projectStore.addPopulationFromRange}
                            setHoveredSegments={plotStore.setSegmentsHoveredOnPlot}
                            plotData={plotStore.plotData}
                            maxPlotHeight={maxPlotHeight}
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
        let paddingStyle = { paddingTop: '8px' }

        let displayWelcomeModal = imageStore.imageData == null && !imageStore.imageDataLoading

        let imageDataLoading = imageStore.imageDataLoading
        let segmentationDataLoading = segmentationStore.segmentationDataLoading

        let numExported = projectStore.numExported
        let numToExport = projectStore.numToExport

        return (
            <div>
                <WelcomeModal displayModal={displayWelcomeModal} />
                <LoadingModal imageDataLoading={imageDataLoading} segmentationDataLoading={segmentationDataLoading} />
                <ExportModal numExported={numExported} numToExport={numToExport} />
                <Grid fluid={true} style={paddingStyle}>
                    <Row between="xs">
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
                            {imageMessage}
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
                                disabled={segmentationStore.segmentationData == null}
                            >
                                {this.state.plotOpen ? 'Hide' : 'Show'} Plot Pane
                            </Button>
                            <Collapse isOpen={this.state.plotOpen} style={fullWidth}>
                                <div>{plotControls}</div>
                                <div>{scatterPlot}</div>
                            </Collapse>
                        </Col>
                    </Row>
                </Grid>
            </div>
        )
    }
}
