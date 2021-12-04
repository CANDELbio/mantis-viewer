/* eslint @typescript-eslint/no-explicit-any: 0 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as Mobx from 'mobx'
import { ipcRenderer, remote } from 'electron'
import * as Mousetrap from 'mousetrap'

import { MainApp } from '../components/MainApp'
import { ProjectStore } from '../stores/ProjectStore'
import { ChannelName } from '../definitions/UIDefinitions'

Mobx.configure({ enforceActions: 'always' })

const projectStore = new ProjectStore(remote.app.getVersion())

// Listeners for menu items from the main thread.
ipcRenderer.on(
    'open-image-set',
    async (event: Electron.Event, dirName: string): Promise<void> => {
        projectStore.openImageSet(dirName)
    },
)

ipcRenderer.on(
    'open-project',
    async (event: Electron.Event, dirName: string): Promise<void> => {
        projectStore.openProject(dirName)
    },
)

ipcRenderer.on('open-segmentation-file', (event: Electron.Event, filePath: string): void => {
    projectStore.setSegmentationBasename(filePath, true)
})

ipcRenderer.on('add-gates-csv', (event: Electron.Event, filePath: string): void => {
    projectStore.importGatesFromCSV(filePath)
})

ipcRenderer.on('add-populations-csv', (event: Electron.Event, filePath: string): void => {
    projectStore.importActivePopulationsFromCSV(filePath)
})

ipcRenderer.on('add-project-populations-csv', (event: Electron.Event, filePath: string): void => {
    projectStore.importProjectPopulationsFromCSV(filePath)
})

ipcRenderer.on('add-region-tiff', (event: Electron.Event, filePath: string): void => {
    projectStore.importRegionTiff(filePath)
})

ipcRenderer.on('export-populations-tiff', (event: Electron.Event, filePath: string): void => {
    projectStore.exportActivePopulationsToTIFF(filePath)
})

ipcRenderer.on('export-populations-csv', (event: Electron.Event, filePath: string): void => {
    projectStore.exportActivePopulationsToCSV(filePath)
})

ipcRenderer.on('export-project-populations-csv', (event: Electron.Event, filePath: string): void => {
    projectStore.exportProjectPopulationsToCSV(filePath)
})

ipcRenderer.on('export-image', (event: Electron.Event, filePath: string): void => {
    projectStore.activeImageSetStore.imageStore.setImageExportFilePath(filePath)
})

ipcRenderer.on('export-segment-features', (event: Electron.Event, filePath: string): void => {
    projectStore.exportActiveImageSetMarkerIntensities(filePath)
})

// Only the main thread can get window resize events. Listener for these events to resize various elements.
ipcRenderer.on('window-size', (event: Electron.Event, width: number, height: number): void => {
    projectStore.setWindowDimensions(width, height)
})

ipcRenderer.on('delete-active-image-set', (): void => {
    projectStore.deleteActiveImageSet()
})

ipcRenderer.on('clear-segmentation', (): void => {
    projectStore.clearSegmentation()
})

// Listener to turn on/off the plot in the main window if the plotWindow is open.
ipcRenderer.on('plot-in-main-window', (event: Electron.Event, inMain: boolean): void => {
    projectStore.setPlotInMainWindow(inMain)
})

//Methods to get data from the preferencesWindow to the main thread
ipcRenderer.on('set-max-image-sets', (event: Electron.Event, max: number): void => {
    projectStore.preferencesStore.setMaxImageSetsInMemory(max)
})

ipcRenderer.on('set-blur-pixels', (event: Electron.Event, value: boolean): void => {
    projectStore.preferencesStore.setBlurPixels(value)
})

ipcRenderer.on('set-calculate-features', (event: Electron.Event, value: boolean): void => {
    projectStore.settingStore.setAutoCalculateSegmentFeatures(value)
})

ipcRenderer.on('set-default-segmentation', (event: Electron.Event, segmentation: string): void => {
    projectStore.preferencesStore.setDefaultSegmentationBasename(segmentation)
})

ipcRenderer.on(
    'set-default-channel-domain',
    (event: Electron.Event, channel: ChannelName, domain: [number, number]): void => {
        projectStore.preferencesStore.setDefaultChannelDomain(channel, domain)
    },
)

ipcRenderer.on(
    'set-default-channel-markers',
    (event: Electron.Event, channel: ChannelName, markers: string[]): void => {
        projectStore.preferencesStore.setDefaultChannelMarkers(channel, markers)
    },
)

ipcRenderer.on('set-use-any-marker', (event: Electron.Event, channel: ChannelName, useAny: boolean): void => {
    projectStore.preferencesStore.setUseAnyMarker(channel, useAny)
})

ipcRenderer.on('set-scale-channel-domain-values', (event: Electron.Event, value: boolean): void => {
    projectStore.preferencesStore.setScaleChannelDomainValues(value)
})

ipcRenderer.on('set-optimize-segmentation', (event: Electron.Event, value: boolean): void => {
    projectStore.preferencesStore.setOptimizeSegmentation(value)
})

ipcRenderer.on('set-reload-on-error', (event: Electron.Event, value: boolean): void => {
    projectStore.preferencesStore.setReloadOnError(value)
})

// Methods to get data from the plotWindow relayed by the main thread
ipcRenderer.on('set-plot-features', (event: Electron.Event, features: string[]): void => {
    projectStore.settingStore.setSelectedPlotFeatures(features)
})

ipcRenderer.on('set-plot-statistic', (event: Electron.Event, statistic: any): void => {
    projectStore.settingStore.setPlotStatistic(statistic)
})

ipcRenderer.on('set-plot-transform', (event: Electron.Event, transform: any): void => {
    projectStore.settingStore.setPlotTransform(transform)
})

ipcRenderer.on('set-plot-type', (event: Electron.Event, type: any): void => {
    projectStore.settingStore.setPlotType(type)
})

ipcRenderer.on('set-plot-normalization', (event: Electron.Event, normalization: any): void => {
    projectStore.settingStore.setPlotNormalization(normalization)
})

ipcRenderer.on('set-plot-dot-size', (event: Electron.Event, size: number): void => {
    projectStore.settingStore.setPlotDotSize(size)
})

ipcRenderer.on('set-plot-coefficient', (event: Electron.Event, coefficient: number): void => {
    projectStore.settingStore.setTransformCoefficient(coefficient)
})

ipcRenderer.on('set-plot-all-image-sets', (event: Electron.Event, value: boolean): void => {
    projectStore.setPlotAllImageSets(value)
})

ipcRenderer.on('set-collapse-all-image-sets', (event: Electron.Event, value: boolean): void => {
    projectStore.settingStore.setPlotCollapseAllImageSets(value)
})

ipcRenderer.on('set-plot-downsample', (event: Electron.Event, value: boolean): void => {
    projectStore.settingStore.setPlotDownsample(value)
})

ipcRenderer.on('set-plot-downsample-percent', (event: Electron.Event, value: number): void => {
    projectStore.settingStore.setPlotDownsamplePercent(value)
})

ipcRenderer.on('set-plot-num-histogram-bins', (event: Electron.Event, value: number): void => {
    projectStore.settingStore.setPlotNumHistogramBins(value)
})

ipcRenderer.on('set-plot-x-log-scale', (event: Electron.Event, value: boolean): void => {
    projectStore.settingStore.setPlotXLogScale(value)
})

ipcRenderer.on('set-plot-y-log-scale', (event: Electron.Event, value: boolean): void => {
    projectStore.settingStore.setPlotYLogScale(value)
})

ipcRenderer.on('update-plot-hidden-population', (event: Electron.Event, value: string): void => {
    projectStore.settingStore.updateHiddenPopulation(value)
})

ipcRenderer.on('add-plot-selected-population', (event: Electron.Event, segmentIds: number[]): void => {
    projectStore.activeImageSetStore.populationStore.createPopulationFromSegments(segmentIds)
})

ipcRenderer.on('set-plot-hovered-segments', (event: Electron.Event, segmentIds: number[]): void => {
    projectStore.activeImageSetStore.plotStore.setSegmentsHoveredOnPlot(segmentIds)
})

ipcRenderer.on('add-plot-population-from-range', (event: Electron.Event, min: number, max: number): void => {
    projectStore.addPopulationFromPlotRange(min, max)
})

const checkIfFeaturesExportable = (channel: string, dir: string, calculateFeatures: boolean | undefined): boolean => {
    let exportFeatures = true
    if (calculateFeatures == undefined) {
        const allImageSetsHaveFeatures = projectStore.segmentFeatureStore.allImageSetsHaveFeatures()
        if (!allImageSetsHaveFeatures) {
            exportFeatures = false
            ipcRenderer.send('mainWindow-ask-calculate-features', channel, dir)
        }
    }
    return exportFeatures
}

ipcRenderer.on(
    'export-project-segment-features',
    (event: Electron.Event, dir: string, calculateFeatures?: boolean): void => {
        const exportFeatures = checkIfFeaturesExportable('export-project-segment-features', dir, calculateFeatures)
        if (exportFeatures) {
            if (calculateFeatures == undefined) calculateFeatures = false
            projectStore.exportProjectFeaturesToCSV(dir, calculateFeatures)
        }
    },
)

ipcRenderer.on('export-populations-fcs', (event: Electron.Event, dirName: string): void => {
    projectStore.exportActiveImageSetPopulationsToFCS(dirName)
})

ipcRenderer.on(
    'export-project-populations-fcs',
    (event: Electron.Event, dir: string, calculateFeatures?: boolean): void => {
        const exportFeatures = checkIfFeaturesExportable('export-project-populations-fcs', dir, calculateFeatures)
        if (exportFeatures) {
            if (calculateFeatures == undefined) calculateFeatures = false
            projectStore.exportProjectFeaturesToFCS(dir, true, calculateFeatures)
        }
    },
)

ipcRenderer.on('export-segments-to-fcs', (event: Electron.Event, filePath: string): void => {
    projectStore.exportActiveImageSetToFCS(filePath)
})

ipcRenderer.on(
    'export-project-segments-to-fcs',
    (event: Electron.Event, dir: string, calculateFeatures?: boolean): void => {
        const exportFeatures = checkIfFeaturesExportable('export-project-segments-to-fcs', dir, calculateFeatures)
        if (exportFeatures) {
            if (calculateFeatures == undefined) calculateFeatures = false
            projectStore.exportProjectFeaturesToFCS(dir, false, calculateFeatures)
        }
    },
)

ipcRenderer.on('import-active-segment-features', (event: Electron.Event, filePath: string): void => {
    projectStore.setImportingSegmentFeaturesValues(filePath, false, true)
})

ipcRenderer.on('import-project-segment-features', (event: Electron.Event, filePath: string): void => {
    projectStore.setImportingSegmentFeaturesValues(filePath, true, true)
})

ipcRenderer.on('continue-segment-feature-import', (event: Electron.Event, overwrite: boolean): void => {
    // TODO: Wire into notification store checkOverwriteImportingSegmentFeatures
    projectStore.continueImportingSegmentFeatures(overwrite)
})

ipcRenderer.on('set-auto-calculate-segment-features', (event: Electron.Event, autoCalculate: boolean): void => {
    projectStore.settingStore.setAutoCalculateSegmentFeatures(autoCalculate)
    projectStore.segmentFeatureStore.autoCalculateSegmentFeatures(projectStore.activeImageSetStore)
})

ipcRenderer.on('calculate-project-segment-features', (): void => {
    projectStore.calculateAllSegmentFeatures()
})

ipcRenderer.on('continue-calculating-segment-features', (event: Electron.Event, overwrite: boolean): void => {
    projectStore.continueCalculatingSegmentFeatures(overwrite)
})

ipcRenderer.on('calculate-segment-features', (): void => {
    projectStore.calculateSegmentFeaturesFromMenu()
})

ipcRenderer.on('set-project-import-modal-visibility', (event: Electron.Event, visibility: boolean): void => {
    projectStore.projectImportStore.setModalOpen(visibility)
})

ipcRenderer.on('project-import-set-directory', (event: Electron.Event, directory: string): void => {
    projectStore.projectImportStore.setDirectory(directory)
})

ipcRenderer.on('continue-project-import', (): void => {
    projectStore.projectImportStore.continueImport()
})

ipcRenderer.on('cancel-response', (event: Electron.Event, cancel: boolean): void => {
    if (cancel) projectStore.setCancelTask(cancel)
    projectStore.notificationStore.setCancellationRequested(false)
})

ipcRenderer.on('export-channel-marker-mappings-csv', (event: Electron.Event, filename: string): void => {
    projectStore.settingStore.exportChannelMarkerMappingsToCSV(filename)
})

ipcRenderer.on('import-channel-marker-mappings-csv', (event: Electron.Event, filename: string): void => {
    projectStore.settingStore.importChannelMarkerMappingsFromCSV(filename)
})
// Keyboard shortcuts!
// Only let them work if we aren't actively loading data or exporting data.
Mousetrap.bind(['command+left', 'alt+left'], function (): void {
    const imageSetStore = projectStore.activeImageSetStore
    if (
        !imageSetStore.imageStore.imageDataLoading &&
        !imageSetStore.segmentationStore.segmentationDataLoading &&
        projectStore.notificationStore.numToCalculate == 0
    ) {
        projectStore.setPreviousImageSet()
    }
})

Mousetrap.bind(['command+right', 'alt+right'], function (): void {
    const imageSetStore = projectStore.activeImageSetStore
    if (
        !imageSetStore.imageStore.imageDataLoading &&
        !imageSetStore.segmentationStore.segmentationDataLoading &&
        projectStore.notificationStore.numToCalculate == 0
    ) {
        projectStore.setNextImageSet()
    }
})

Mousetrap.bind(['command+up', 'alt+up'], function (): void {
    const settingStore = projectStore.settingStore
    if (settingStore.activeChannelMarkerMapping) {
        settingStore.nextChannelMarkerMapping()
    }
})

Mousetrap.bind(['command+down', 'alt+down'], function (): void {
    const settingStore = projectStore.settingStore
    if (settingStore.activeChannelMarkerMapping) {
        settingStore.previousChannelMarkerMapping()
    }
})

// Autorun that sends plot related data to the main thread to be relayed to the plotWindow
Mobx.autorun((): void => {
    const imageSet = projectStore.activeImageSetStore
    const plotStore = imageSet.plotStore
    const settingStore = projectStore.settingStore
    const featureNames = projectStore.segmentFeatureStore.activeAvailableFeatures
    ipcRenderer.send(
        'mainWindow-set-plot-data',
        Mobx.toJS(featureNames),
        Mobx.toJS(settingStore.selectedPlotFeatures),
        settingStore.plotStatistic,
        settingStore.plotTransform,
        settingStore.plotType,
        settingStore.plotNormalization,
        settingStore.plotDotSize,
        settingStore.transformCoefficient,
        settingStore.plotAllImageSets,
        settingStore.plotCollapseAllImageSets,
        settingStore.plotDownsample,
        settingStore.plotDownsamplePercent,
        settingStore.plotNumHistogramBins,
        settingStore.plotXLogScale,
        settingStore.plotYLogScale,
        Mobx.toJS(settingStore.plotHiddenPopulations),
        plotStore.plotData,
    )
})

// Autorun that sends plot related data to the main thread to be relayed to the plotWindow
Mobx.autorun((): void => {
    const preferencesStore = projectStore.preferencesStore
    const settingStore = projectStore.settingStore
    ipcRenderer.send(
        'mainWindow-set-preferences',
        preferencesStore.maxImageSetsInMemory,
        preferencesStore.blurPixels,
        settingStore.autoCalculateSegmentFeatures,
        preferencesStore.defaultSegmentationBasename,
        Mobx.toJS(preferencesStore.defaultChannelMarkers),
        Mobx.toJS(preferencesStore.defaultChannelDomains),
        Mobx.toJS(preferencesStore.useAnyMarkerIfNoMatch),
        preferencesStore.scaleChannelDomainValues,
        preferencesStore.optimizeSegmentation,
        preferencesStore.reloadOnError,
    )
})

// Sends the active image path to the main thread when changed.
// Used for setting default menu directories.
Mobx.autorun((): void => {
    ipcRenderer.send('set-active-image-directory', projectStore.activeImageSetPath)
})

Mobx.autorun((): void => {
    ipcRenderer.send('set-project-directory', projectStore.projectPath)
})

Mobx.autorun((): void => {
    const notificationStore = projectStore.notificationStore
    const infoMessage = notificationStore.infoMessage
    if (infoMessage != null) {
        ipcRenderer.send('mainWindow-show-info-dialog', infoMessage)
        notificationStore.clearInfoMessage()
    }
})

Mobx.autorun((): void => {
    const notificationStore = projectStore.notificationStore
    const errorMessage = notificationStore.errorMessage
    if (errorMessage != null) {
        ipcRenderer.send('mainWindow-show-error-dialog', errorMessage)
        notificationStore.clearErrorMessage()
    }
})

Mobx.autorun((): void => {
    const notificationStore = projectStore.notificationStore
    const removeMessage = notificationStore.errorMessage
    if (removeMessage != null) {
        ipcRenderer.send('mainWindow-show-remove-image-dialog', removeMessage)
        notificationStore.clearRemoveMessage()
    }
})

Mobx.autorun((): void => {
    const activeImageStore = projectStore.activeImageSetStore.imageStore
    if (activeImageStore.imageData && activeImageStore.imageData.errors.length > 0) {
        const msg = 'Error(s) opening tiffs for the following markers:\n' + activeImageStore.imageData.errors.join('\n')
        ipcRenderer.send('mainWindow-show-error-dialog', msg)
        activeImageStore.imageData.clearErrors()
    }
})

Mobx.autorun((): void => {
    const activeSegmentationStore = projectStore.activeImageSetStore.segmentationStore
    if (activeSegmentationStore.segmentationData) {
        const errorMessage = activeSegmentationStore.segmentationData.errorMessage
        if (errorMessage) {
            ipcRenderer.send('mainWindow-show-error-dialog', errorMessage)
        }
    }
})

Mobx.autorun((): void => {
    const notificationStore = projectStore.notificationStore
    if (notificationStore.clearSegmentationRequested) {
        ipcRenderer.send('mainWindow-show-remove-segmentation-dialog')
        notificationStore.setClearSegmentationRequested(false)
    }
})

// Update the main thread on whether or not an image store with image data loaded is selected.
Mobx.autorun((): void => {
    ipcRenderer.send('set-image-loaded', projectStore.imageSetPaths.length > 0)
})

Mobx.autorun((): void => {
    ipcRenderer.send('set-project-loaded', projectStore.imageSetPaths.length > 1)
})

Mobx.autorun((): void => {
    ipcRenderer.send(
        'set-segmentation-loaded',
        projectStore.activeImageSetStore.segmentationStore.segmentationData != null,
    )
})

Mobx.autorun((): void => {
    ipcRenderer.send(
        'set-populations-selected',
        projectStore.activeImageSetStore.populationStore.selectedPopulations.length > 0,
    )
})

Mobx.autorun((): void => {
    const notificationStore = projectStore.notificationStore
    if (notificationStore.checkCalculateSegmentFeatures) {
        ipcRenderer.send('mainWindow-show-calculate-segment-features-dialog')
        notificationStore.setCheckCalculateSegmentFeatures(false)
    }
})

Mobx.autorun((): void => {
    const notificationStore = projectStore.notificationStore
    if (notificationStore.checkOverwriteGeneratingSegmentFeatures) {
        ipcRenderer.send('mainWindow-show-continue-calculating-segment-features-dialog')
        notificationStore.setCheckOverwriteGeneratingSegmentFeatures(false)
    }
})

Mobx.autorun((): void => {
    const notificationStore = projectStore.notificationStore
    if (notificationStore.checkOverwriteImportingSegmentFeatures) {
        ipcRenderer.send('mainWindow-show-continue-importing-segment-features-dialog')
        notificationStore.setCheckOverwriteImportingSegmentFeatures(false)
    }
})

Mobx.autorun((): void => {
    const notificationStore = projectStore.notificationStore
    if (notificationStore.checkCalculateAllFeaturesForPlot) {
        ipcRenderer.send('mainWindow-show-calculate-features-for-plot-dialog')
        notificationStore.setCheckCalculateAllFeaturesForPlot(false)
    }
})

Mobx.autorun((): void => {
    const dataImportStore = projectStore.projectImportStore
    const showDirectoryPicker = dataImportStore.showDirectoryPicker
    if (showDirectoryPicker) {
        ipcRenderer.send('mainWindow-show-project-import-directory-picker')
        dataImportStore.setShowDirectoryPicker(false)
    }
})

Mobx.autorun((): void => {
    const notificationStore = projectStore.notificationStore
    if (notificationStore.checkImportProject) {
        ipcRenderer.send('mainWindow-check-import-project')
        notificationStore.setCheckImportProject(false)
    }
})

Mobx.autorun((): void => {
    const notificationStore = projectStore.notificationStore
    const preferencesStore = projectStore.preferencesStore
    if (notificationStore.reloadMainWindow && preferencesStore.reloadOnError) {
        ipcRenderer.send('mainWindow-reload')
    }
})

Mobx.autorun((): void => {
    const notificationStore = projectStore.notificationStore
    if (notificationStore.cancellationRequested) {
        ipcRenderer.send('mainWindow-check-cancel')
    }
})

ReactDOM.render(
    <div>
        <MainApp projectStore={projectStore} />
    </div>,
    document.getElementById('main'),
)
