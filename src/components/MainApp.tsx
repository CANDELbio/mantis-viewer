import * as React from 'react'
import { observer } from 'mobx-react'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { Button, Collapse, Spinner } from 'reactstrap'
import { ContextMenuTrigger } from 'react-contextmenu'

import bottomBar from '../assets/bottom_bar.png'
import piciLogo from '../assets/pici_logo.png'

import { ProjectStore } from '../stores/ProjectStore'
import {
    ChannelName,
    MainPlotHeightPadding,
    ChannelControlsCombinedHeight,
    ImageChannels,
    SelectedPopulationsTableHeight,
    MainWindowBottomHeight,
} from '../definitions/UIDefinitions'
import { ChannelControls } from './ChannelControls'
import { ImageViewer } from './ImageViewer'
import { ImageSelector } from './image-selector/Component'
import { ImageControls } from './ImageControls'
import { Plot } from './Plot'
import { SelectedPopulations } from './populations/SelectedPopulations'
import { WelcomeModal } from './modals/WelcomeModal'
import { LoadingModal } from './modals/LoadingModal'
import { ShortcutModal } from './modals/ShortcutModal'
import { ProjectImportModal } from './modals/ProjectImportModal'
import { PlotControls } from './PlotControls'
import { ImageMessage } from './ImageMessage'
import { ImageContextMenu, ImageContextMenuId } from './ImageContextMenu'
import { SegmentPopulationModal } from './modals/SegmentPopulationModal'
import { ChooseSegmentFeaturesModal } from './modals/ChooseSegmentFeaturesModal'

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

    componentDidCatch(): void {
        this.props.projectStore.notificationStore.requestReloadMainWindow()
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

        let imageSetSelector = null
        let channelControls = null
        let plotControls = null
        let plot = null
        let imageControls = null

        const fullWidth = { width: '100%' }
        const fullWidthBottomSpaced = { marginBottom: '5px', width: '100%' }
        const paddingStyle = { paddingTop: '8px' }

        const numCalculated = notificationStore.numCalculated
        const numToCalculate = notificationStore.numToCalculate

        const numImported = notificationStore.numImported
        const numToImport = notificationStore.numToImport

        const imageDataLoading = imageStore.imageDataLoading
        const segmentationDataLoading = segmentationStore.segmentationDataLoading
        const segmentFeaturesImporting = projectStore.importingSegmentFeaturesPath != null
        const segmentFeaturesCalculating =
            segmentFeatureStore.activeFeaturesLoading || notificationStore.projectSegmentFeaturesCalculating
        const selectionsLoading = populationStore.selectionsLoading
        const dataLoading = numToCalculate > 0
        const dataImporting = numToImport > 0

        const displayLoadingModal =
            imageDataLoading ||
            segmentationDataLoading ||
            segmentFeaturesImporting ||
            segmentFeaturesCalculating ||
            selectionsLoading ||
            dataLoading ||
            dataImporting

        const displayProjectImportModal = projectImportStore.modalOpen && !displayLoadingModal

        const displayWelcomeModal =
            imageStore.imageData == null && !imageStore.imageDataLoading && !displayProjectImportModal

        const displayShortcutModal =
            !(displayWelcomeModal || displayLoadingModal || displayProjectImportModal) &&
            notificationStore.showShortcutModal

        const displaySegmentFeaturesModal = notificationStore.chooseSegmentFeatures != null

        const modalOpen =
            displayWelcomeModal ||
            displayLoadingModal ||
            displayProjectImportModal ||
            displayShortcutModal ||
            displaySegmentFeaturesModal

        let windowHeight = projectStore.windowHeight
        const imageMessage = <ImageMessage imageData={imageStore.imageData}></ImageMessage>
        // Reduce windowHeight to account for the height of the message
        if (imageMessage && windowHeight) windowHeight -= 20

        let highlightedSegments = plotStore.segmentsHoveredOnPlot
        if (segmentationStore.highlightedSegment)
            highlightedSegments = highlightedSegments.concat([segmentationStore.highlightedSegment])
        const imageViewer = (
            <div>
                <ContextMenuTrigger
                    id={ImageContextMenuId}
                    holdToDisplay={-1}
                    disable={segmentationStore.mousedOverSegments.length == 0}
                >
                    <ImageViewer
                        imageData={imageStore.imageData}
                        segmentationData={segmentationStore.segmentationData}
                        segmentationFillAlpha={settingStore.segmentationFillAlpha}
                        segmentOutlineAttributes={segmentationStore.outlineAttributes}
                        channelDomain={imageStore.channelDomain}
                        channelVisibility={settingStore.channelVisibility}
                        channelMarker={settingStore.channelMarker}
                        positionAndScale={settingStore.activePositionAndScale}
                        setPositionAndScale={settingStore.setActivePositionAndScale}
                        addSelectedPopulation={populationStore.createPopulationFromPixels}
                        selectedPopulations={populationStore.selectedPopulations}
                        highlightedPopulations={populationStore.highlightedPopulations}
                        highlightedSegments={highlightedSegments}
                        mousedOverSegmentsFromImage={segmentationStore.mousedOverSegments}
                        segmentFeaturesInLegend={segmentFeatureStore.segmentFeaturesForMousedOverSegments}
                        segmentPopulationsInLegend={populationStore.populationsForMousedOverSegments}
                        exportPath={imageStore.imageExportFilename}
                        onExportComplete={imageStore.clearImageExportFilePath}
                        channelLegendVisible={settingStore.channelLegendVisible}
                        populationLegendVisible={settingStore.populationLegendVisible}
                        zoomInsetVisible={settingStore.zoomInsetVisible}
                        windowHeight={windowHeight}
                        onWebGLContextLoss={projectStore.onWebGLContextLoss}
                        setMousedOverPixel={projectStore.setMousedOverPixel}
                        featureLegendVisible={settingStore.featureLegendVisible}
                        blurPixels={projectStore.preferencesStore.blurPixels}
                    />
                </ContextMenuTrigger>
                <ImageContextMenu
                    segmentIds={projectStore.contextMenuSegmentIds}
                    hideMenu={projectStore.editingPopulationsSegmentId != null}
                    setEditingPopulations={projectStore.setEditingPopulationsSegmentId}
                    onImageContextMenuOpen={projectStore.lockContextMenuSegmentIds}
                    onImageContextMenuClose={projectStore.unlockContextMenuSegmentIds}
                />
            </div>
        )

        imageSetSelector = (
            <div className="grey-card">
                <ImageSelector
                    selectedImage={projectStore.activeImageSetPath}
                    images={projectStore.imageSetPaths}
                    setSelectedImage={projectStore.setActiveImageSet}
                    previousImage={projectStore.setPreviousImageSet}
                    nextImage={projectStore.setNextImageSet}
                    selectedChannelMapping={settingStore.activeChannelMarkerMapping}
                    channelMarkerMappings={settingStore.channelMarkerMappings}
                    saveChannelMarkerMapping={settingStore.saveChannelMarkerMapping}
                    loadChannelMarkerMapping={settingStore.loadChannelMarkerMapping}
                    deleteChannelMarkerMapping={settingStore.deleteChannelMarkerMapping}
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
                                channelMin={this.getChannelMin(s)}
                                channelMax={this.getChannelMax(s)}
                                sliderValue={imageStore.channelDomain[s]}
                                setChannelDomainValue={settingStore.setChannelDomainValueCallback(s)}
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
                        highlightedSegment={segmentationStore.highlightedSegment}
                        setHighlightedSegment={segmentationStore.setHighlightedSegment}
                        fillAlpha={settingStore.segmentationFillAlpha}
                        outlineAlpha={settingStore.segmentationOutlineAlpha}
                        onFillAlphaChange={settingStore.setSegmentationFillAlpha}
                        onOutlineAlphaChange={settingStore.setSegmentationOutlineAlpha}
                        onClearSegmentation={(): void => {
                            notificationStore.setClearSegmentationRequested(true)
                        }}
                        zoomInsetVisible={settingStore.zoomInsetVisible}
                        setZoomInsetVisible={settingStore.setZoomInsetVisible}
                        channelLegendVisible={settingStore.channelLegendVisible}
                        setChannelLegendVisible={settingStore.setChannelLegendVisible}
                        populationLegendVisible={settingStore.populationLegendVisible}
                        setPopulationLegendVisible={settingStore.setPopulationLegendVisible}
                        selectedSegmentationFile={segmentationStore.selectedSegmentationFile}
                        segmentationLoaded={segmentationStore.segmentationData != null}
                        autoLoadSegmentation={settingStore.autoLoadSegmentation}
                        setAutoLoadSegmentation={settingStore.setAutoLoadSegmentation}
                        featureLegendVisible={settingStore.featureLegendVisible}
                        setFeatureLegendVisible={settingStore.setFeatureLegendVisible}
                    />
                </div>
            )

            let maxPlotHeight = null
            if (projectStore.windowHeight != null) maxPlotHeight = projectStore.windowHeight - MainPlotHeightPadding
            if (maxPlotHeight && !this.state.regionsOpen) maxPlotHeight += SelectedPopulationsTableHeight

            if (segmentationStore.segmentationData != null) {
                if (projectStore.plotInMainWindow) {
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
                                collapseAllImageSets={settingStore.plotCollapseAllImageSets}
                                setCollapseAllImageSets={settingStore.setPlotCollapseAllImageSets}
                                downsample={settingStore.plotDownsample}
                                setDownsample={settingStore.setPlotDownsample}
                                downsamplePercent={settingStore.plotDownsamplePercent}
                                setDownsamplePercent={settingStore.setPlotDownsamplePercent}
                                numHistogramBins={settingStore.plotNumHistogramBins}
                                setNumHistogramBins={settingStore.setPlotNumHistogramBins}
                                xLogScale={settingStore.plotXLogScale}
                                setXLogScale={settingStore.setPlotXLogScale}
                                yLogScale={settingStore.plotYLogScale}
                                setYLogScale={settingStore.setPlotYLogScale}
                            />
                        </div>
                    )
                    if (segmentFeatureStore.activeAvailableFeatures.length == 0) {
                        plot = (
                            <p style={{ textAlign: 'center' }}>
                                <Button onClick={projectStore.calculateActiveSegmentFeatures} size="sm">
                                    Calculate Segment Features
                                </Button>
                            </p>
                        )
                    } else if (notificationStore.segmentFeaturesLoading) {
                        plot = (
                            <Row center="xs">
                                <Spinner
                                    style={{
                                        width: '5rem',
                                        height: '5rem',
                                    }}
                                    color="secondary"
                                />
                            </Row>
                        )
                    } else {
                        plot = (
                            <div>
                                <Plot
                                    windowWidth={projectStore.windowWidth}
                                    selectedType={settingStore.plotType}
                                    setSelectedSegments={populationStore.createPopulationFromSegments}
                                    setSelectedRange={projectStore.addPopulationFromPlotRange}
                                    setHoveredSegments={plotStore.setSegmentsHoveredOnPlot}
                                    updateHiddenPopulation={settingStore.updateHiddenPopulation}
                                    hiddenPopulations={settingStore.plotHiddenPopulations}
                                    plotData={plotStore.plotData}
                                    maxPlotHeight={maxPlotHeight}
                                    downsample={settingStore.plotDownsample}
                                />
                            </div>
                        )
                    }
                }
            }
        }

        let populationsTableHeight = SelectedPopulationsTableHeight
        if (!this.state.plotOpen && windowHeight) populationsTableHeight = windowHeight - MainWindowBottomHeight
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
                createPopulationFromSegments={populationStore.createPopulationFromSegments}
                createPopulationFromRange={projectStore.addPopulationFromRange}
                segmentationDataLoaded={segmentationStore.segmentationData != null}
                availableFeatures={segmentFeatureStore.activeAvailableFeatures}
                selectedFeature={populationStore.selectedFeatureForNewPopulation}
                setSelectedFeature={populationStore.setSelectedFeatureForNewPopulation}
                selectedFeatureMinMax={segmentFeatureStore.activeFeatureMinMaxes(
                    populationStore.selectedFeatureForNewPopulation,
                )}
                tableHeight={populationsTableHeight}
            />
        )

        const rightColWidth = this.state.regionsOpen || this.state.plotOpen ? 4 : 1
        const centerColWidth = 10 - rightColWidth

        return (
            <div>
                <WelcomeModal displayModal={displayWelcomeModal} />
                <ShortcutModal
                    displayModal={displayShortcutModal}
                    toggleModal={notificationStore.toggleShortcutModal}
                />
                <ChooseSegmentFeaturesModal
                    displayModal={displaySegmentFeaturesModal}
                    setSelectedStatistics={projectStore.setSelectedStatistics}
                    selectedStatistics={projectStore.selectedStatistics}
                    closeModal={projectStore.cancelSegFeatureCalculation}
                    calculate={projectStore.runFeatureCalculations}
                />
                <SegmentPopulationModal
                    segmentId={projectStore.editingPopulationsSegmentId}
                    populations={populationStore.selectedPopulations}
                    closeModal={projectStore.clearEditingPopulationSegmentId}
                    addSegmentToPopulation={populationStore.addSegmentToPopulation}
                    removeSegmentFromPopulation={populationStore.removeSegmentFromPopulation}
                    createPopulationFromSegments={populationStore.createPopulationFromSegments}
                ></SegmentPopulationModal>
                <LoadingModal
                    numToCalculate={numToCalculate}
                    numCalculated={numCalculated}
                    numToImport={numToImport}
                    numImported={numImported}
                    imageDataLoading={imageDataLoading}
                    segmentationDataLoading={segmentationDataLoading}
                    segmentFeaturesImporting={segmentFeaturesImporting}
                    segmentFeaturesCalculating={segmentFeaturesCalculating}
                    selectionsLoading={selectionsLoading}
                    applicationReloading={notificationStore.reloadMainWindow}
                    requestCancellation={notificationStore.setCancellationRequested}
                    cancelRequested={notificationStore.cancellationRequested || projectStore.cancelTask}
                />
                <ProjectImportModal
                    open={displayProjectImportModal}
                    directory={projectImportStore.directory}
                    openDirectoryPicker={(): void => projectImportStore.setShowDirectoryPicker(true)}
                    closeModal={projectImportStore.cancelImport}
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
                    calculateFeatures={projectImportStore.autoCalculateFeatures}
                    setCalculateFeatures={projectImportStore.setAutoCalculateFeatures}
                    setProjectFeatures={projectImportStore.setProjectSegmentFeaturesFile}
                    projectFeatures={projectImportStore.projectSegmentFeaturesFile}
                    setImageSetFeatures={projectImportStore.setImageSetSegmentFeaturesFile}
                    imageSetFeatures={projectImportStore.imageSetSegmentFeaturesFile}
                    numFeatures={projectImportStore.numFeaturesInFeaturesFile}
                    numImageSetsWithFeatures={projectImportStore.numImageSetsInFeaturesFile}
                    featuresError={projectImportStore.featuresFileError}
                    population={projectImportStore.projectPopulationFile}
                    setPopulations={projectImportStore.setProjectPopulationFile}
                    numPopulations={projectImportStore.numPopulationsInPopulationsFile}
                    numImageSetsWithPopulations={projectImportStore.numImageSetsInPopulationFile}
                    populationError={projectImportStore.featuresFileError}
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
                        <Col xs={centerColWidth} sm={centerColWidth} md={centerColWidth} lg={centerColWidth}>
                            {imageMessage}
                            {imageViewer}
                        </Col>
                        <Col xs={rightColWidth} sm={rightColWidth} md={rightColWidth} lg={rightColWidth}>
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
                                {plot}
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
