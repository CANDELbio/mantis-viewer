import * as React from 'react'
import { observer } from 'mobx-react'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { Button, Collapse } from 'reactstrap'

import * as bottomBar from '../assets/bottom_bar.png'
import * as piciLogo from '../assets/pici_logo.png'

import { ProjectStore } from '../stores/ProjectStore'
import {
    ChannelName,
    MainPlotHeightPadding,
    ChannelControlsCombinedHeight,
    ImageChannels,
    SelectedPopulationsTableHeight,
} from '../definitions/UIDefinitions'
import { ChannelControls } from './ChannelControls'
import { ImageViewer } from './ImageViewer'
import { ImageSetSelector } from './ImageSetSelector'
import { ImageControls } from './ImageControls'
import { Plot } from './Plot'
import { SelectedPopulations } from './SelectedPopulations'
import { WelcomeModal } from './modals/WelcomeModal'
import { ProgressModal } from './modals/ProgressModal'
import { LoadingModal } from './modals/LoadingModal'
import { ProjectImportModal } from './modals/ProjectImportModal'
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

    private notEnoughSpaceForChannelAndControls = (): boolean => {
        const windowHeight = this.props.projectStore.windowHeight
        if (windowHeight && windowHeight < ChannelControlsCombinedHeight) return true
        return false
    }

    // If opening channels, close image controls
    private handleChannelClick = (): void => {
        const newChannelsOpenValue = !this.state.channelsOpen
        this.setState({ channelsOpen: newChannelsOpenValue })
        if (newChannelsOpenValue && this.notEnoughSpaceForChannelAndControls()) this.setState({ controlsOpen: false })
    }
    // If opening image controls, close channels
    private handleControlsClick = (): void => {
        const newControlsOpenValue = !this.state.controlsOpen
        this.setState({ controlsOpen: newControlsOpenValue })
        if (newControlsOpenValue && this.notEnoughSpaceForChannelAndControls()) this.setState({ channelsOpen: false })
    }
    private handleRegionsClick = (): void => this.setState({ regionsOpen: !this.state.regionsOpen })
    private handlePlotClick = (): void => this.setState({ plotOpen: !this.state.plotOpen })

    private getChannelMin(s: ChannelName): number {
        const settingStore = this.props.projectStore.settingStore
        const imageStore = this.props.projectStore.activeImageSetStore.imageStore
        const channelMarker = settingStore.channelMarker[s]
        if (channelMarker != null && imageStore.imageData != null) {
            const minmax = imageStore.imageData.minmax[channelMarker]
            if (minmax) return imageStore.imageData.minmax[channelMarker].min
        }
        return 0
    }

    private getChannelMax(s: ChannelName): number {
        const settingStore = this.props.projectStore.settingStore
        const imageStore = this.props.projectStore.activeImageSetStore.imageStore
        const channelMarker = settingStore.channelMarker[s]
        if (channelMarker != null && imageStore.imageData != null) {
            const minmax = imageStore.imageData.minmax[channelMarker]
            if (minmax) return imageStore.imageData.minmax[channelMarker].max
        }
        return 100
    }

    public static getDerivedStateFromProps(props: MainAppProps, state: MainAppState): Partial<MainAppState> | null {
        const windowHeight = props.projectStore.windowHeight
        // If window height is defined, and we are now too short for both image controls and channels to be open, close controls.
        if (windowHeight && windowHeight < ChannelControlsCombinedHeight && state.channelsOpen && state.controlsOpen)
            return {
                controlsOpen: false,
            }
        return null
    }

    public render(): React.ReactNode {
        const projectStore = this.props.projectStore
        const imageSetStore = this.props.projectStore.activeImageSetStore
        const imageStore = imageSetStore.imageStore
        const segmentationStore = imageSetStore.segmentationStore
        const segmentFeatureStore = projectStore.segmentFeatureStore
        const populationStore = imageSetStore.populationStore
        const plotStore = imageSetStore.plotStore
        const settingStore = projectStore.settingStore
        const notificationStore = projectStore.notificationStore
        const projectImportStore = projectStore.projectImportStore

        let imageViewer = null
        let imageMessage = null
        let imageSetSelector = null
        let channelControls = null
        let plotControls = null
        let scatterPlot = null
        let imageControls = null

        const fullWidth = { width: '100%' }
        const fullWidthBottomSpaced = { marginBottom: '5px', width: '100%' }
        const paddingStyle = { paddingTop: '8px' }

        const imageDataLoading = imageStore.imageDataLoading
        const segmentationDataLoading = segmentationStore.segmentationDataLoading
        const segmentFeaturesLoading = segmentFeatureStore.activeFeaturesLoading
        const segmentFeaturesImporting = projectStore.importingSegmentFeaturesPath != null
        const selectionsLoading = populationStore.selectionsLoading

        const displayLoadingModal =
            imageDataLoading ||
            segmentationDataLoading ||
            segmentFeaturesLoading ||
            segmentFeaturesImporting ||
            selectionsLoading

        const numExported = notificationStore.numCalculated
        const numToExport = notificationStore.numToCalculate
        const displayProgressModal = numToExport > 0

        const displayProjectImportModal = projectImportStore.modalOpen && !(displayLoadingModal || displayProgressModal)

        const displayWelcomeModal =
            imageStore.imageData == null && !imageStore.imageDataLoading && !displayProjectImportModal

        const modalOpen =
            displayWelcomeModal || displayLoadingModal || displayProgressModal || displayProjectImportModal

        imageSetSelector = (
            <div className="grey-card">
                <ImageSetSelector
                    selectedImageSet={projectStore.activeImageSetPath}
                    imageSets={projectStore.imageSetPaths}
                    setSelectedImageSet={projectStore.setActiveImageSet}
                    previousImageSet={projectStore.setPreviousImageSet}
                    nextImageSet={projectStore.setNextImageSet}
                />
            </div>
        )

        if (imageStore.imageData != null) {
            const markerNames = imageStore.imageData.markerNames
            if (markerNames.length > 0) {
                channelControls = this.imageChannelsForControls.map((s: ChannelName) => {
                    const channelMarker = settingStore.channelMarker[s]
                    const selectedMarker = channelMarker && markerNames.includes(channelMarker) ? channelMarker : null
                    return (
                        <div className="grey-card channel-controls" key={s}>
                            <ChannelControls
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
                        </div>
                    )
                })
            }

            imageControls = (
                <div className="grey-card image-controls">
                    <ImageControls
                        fillAlpha={settingStore.segmentationFillAlpha}
                        outlineAlpha={settingStore.segmentationOutlineAlpha}
                        onFillAlphaChange={settingStore.setSegmentationFillAlpha}
                        onOutlineAlphaChange={settingStore.setSegmentationOutlineAlpha}
                        centroidsVisible={settingStore.segmentationCentroidsVisible}
                        setCentroidsVisible={settingStore.setSegmentationCentroidsVisible}
                        onClearSegmentation={(): void => {
                            notificationStore.setClearSegmentationRequested(true)
                        }}
                        zoomInsetVisible={settingStore.zoomInsetVisible}
                        setZoomInsetVisible={settingStore.setZoomInsetVisible}
                        legendVisible={settingStore.legendVisible}
                        setLegendVisible={settingStore.setLegendVisible}
                        selectedSegmentationFile={segmentationStore.selectedSegmentationFile}
                        segmentationLoaded={segmentationStore.segmentationData != null}
                    />
                </div>
            )

            let windowHeight = projectStore.windowHeight
            if (imageStore.imageData.scaled) {
                imageMessage = (
                    <div style={{ position: 'relative', textAlign: 'center' }}>
                        This image has been downsampled to fit in memory.
                    </div>
                )
                if (windowHeight) windowHeight -= 20
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
                    addSelectedRegion={populationStore.createPopulationFromPixels}
                    selectedRegions={populationStore.selectedPopulations}
                    highlightedRegions={populationStore.highlightedPopulations}
                    highlightedSegmentsFromPlot={plotStore.segmentsHoveredOnPlot}
                    exportPath={imageStore.imageExportFilename}
                    onExportComplete={imageStore.clearImageExportFilePath}
                    legendVisible={settingStore.legendVisible}
                    zoomInsetVisible={settingStore.zoomInsetVisible}
                    windowHeight={windowHeight}
                />
            )
            if (segmentationStore.segmentationData != null) {
                if (projectStore.plotInMainWindow) {
                    let maxPlotHeight = null
                    if (projectStore.windowHeight != null)
                        maxPlotHeight = projectStore.windowHeight - MainPlotHeightPadding
                    if (maxPlotHeight && !this.state.regionsOpen) maxPlotHeight += SelectedPopulationsTableHeight
                    plotControls = (
                        <div className="grey-card plot-controls">
                            <PlotControls
                                windowWidth={projectStore.windowWidth}
                                modalOpen={modalOpen}
                                features={segmentFeatureStore.activeAvailableFeatures}
                                selectedPlotFeatures={settingStore.selectedPlotFeatures}
                                setSelectedPlotFeatures={settingStore.setSelectedPlotFeatures}
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
                                projectLoaded={projectStore.imageSetPaths.length > 1}
                                plotAllImageSets={settingStore.plotAllImageSets}
                                setPlotAllImageSets={projectStore.setPlotAllImageSets}
                                downsample={settingStore.plotDownsample}
                                setDownsample={settingStore.setPlotDownsample}
                                downsamplePercentage={settingStore.plotDownsamplePercentage}
                                setDownsamplePercentage={settingStore.setPlotDownsamplePercentage}
                            />
                        </div>
                    )
                    scatterPlot = (
                        <div>
                            <Plot
                                windowWidth={projectStore.windowWidth}
                                selectedType={settingStore.plotType}
                                setSelectedSegments={populationStore.createPopulationFromSegments}
                                setSelectedRange={projectStore.addPopulationFromRange}
                                setHoveredSegments={plotStore.setSegmentsHoveredOnPlot}
                                plotData={plotStore.plotData}
                                maxPlotHeight={maxPlotHeight}
                            />
                        </div>
                    )
                }
            }
        }

        const selectedPopulations = (
            <SelectedPopulations
                populations={populationStore.selectedPopulations}
                updateName={populationStore.updateSelectedPopulationName}
                updateColor={populationStore.updateSelectedPopulationColor}
                updateVisibility={populationStore.updateSelectedPopulationVisibility}
                updateSegments={populationStore.updateSelectedPopulationSegments}
                deletePopulation={populationStore.deleteSelectedPopulation}
                setAllVisibility={populationStore.setAllSelectedPopulationVisibility}
                highlightPopulation={populationStore.highlightSelectedPopulation}
                unhighlightPopulation={populationStore.unHighlightSelectedPopulation}
                addEmptyPopulation={populationStore.addEmptyPopulation}
                segmentationDataLoaded={segmentationStore.segmentationData != null}
            />
        )

        return (
            <div>
                <WelcomeModal displayModal={displayWelcomeModal} />
                <LoadingModal
                    imageDataLoading={imageDataLoading}
                    segmentationDataLoading={segmentationDataLoading}
                    segmentFeaturesLoading={segmentFeaturesLoading}
                    segmentFeaturesImporting={segmentFeaturesImporting}
                    selectionsLoading={selectionsLoading}
                />
                <ProgressModal numCalculated={numExported} numToCalculate={numToExport} />
                <ProjectImportModal
                    open={displayProjectImportModal}
                    directory={projectImportStore.directory}
                    openDirectoryPicker={(): void => projectImportStore.setShowDirectoryPicker(true)}
                    closeModal={(): void => projectImportStore.setModalOpen(false)}
                    readyToImport={projectImportStore.readyToImport}
                    import={projectImportStore.import}
                    projectDirectories={projectImportStore.projectDirectories}
                    projectCsvs={projectImportStore.projectCsvs}
                    setImageSet={projectImportStore.setImageSet}
                    imageSet={projectImportStore.imageSet}
                    imageSetTiffs={projectImportStore.imageSetTiffs}
                    imageSetCsvs={projectImportStore.imageSetCsvs}
                    imageSetDirs={projectImportStore.imageSetDirs}
                    imageSubdir={projectImportStore.imageSubdirectory}
                    setImageSubdir={projectImportStore.setImageSubdirectory}
                    region={projectImportStore.imageSetRegionFile}
                    setRegion={projectImportStore.setImageSetRegionFile}
                    segmentation={projectImportStore.imageSetSegmentationFile}
                    setSegmentation={projectImportStore.setImageSetSegmentationFile}
                    features={projectImportStore.projectSegmentFeaturesFile}
                    setFeatures={projectImportStore.setProjectSegmentFeaturesFile}
                    population={projectImportStore.projectPopulationFile}
                    setPopulations={projectImportStore.setProjectPopulationFile}
                />
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
                                {plotControls}
                                {scatterPlot}
                            </Collapse>
                        </Col>
                    </Row>
                </Grid>
                <div className="bottom-bar">
                    <img className="bar" src={bottomBar} />
                    <img className="logo" src={piciLogo} />
                </div>
            </div>
        )
    }
}
