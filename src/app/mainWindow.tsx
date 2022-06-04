/* eslint @typescript-eslint/no-explicit-any: 0 */

import { ipcRenderer } from 'electron'
// Importing the log even though it's not used in this file.
// This makes sure the log is properly wired to the main thread.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import log from 'electron-log'
import hotkeys from 'hotkeys-js'
import * as Mobx from 'mobx'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { MainApp } from '../components/MainApp'
import { ChannelName } from '../definitions/UIDefinitions'
import { ProjectStore } from '../stores/ProjectStore'
// Require electron-log to get main notifications in renderer.

Mobx.configure({ enforceActions: 'always' })

const projectStore = new ProjectStore()

// Listeners for menu items from the main thread.
ipcRenderer.on('set-app-version', async (_event: Electron.Event, version: string): Promise<void> => {
    projectStore.setAppVersion(version)
})

ipcRenderer.on('open-image-set', async (_event: Electron.Event, dirName: string): Promise<void> => {
    projectStore.openImageSet(dirName)
})

ipcRenderer.on('open-project', async (_event: Electron.Event, dirName: string): Promise<void> => {
    projectStore.openProject(dirName)
})

ipcRenderer.on('open-segmentation-file', (_event: Electron.Event, filePath: string): void => {
    projectStore.setSegmentationBasename(filePath, true)
})

ipcRenderer.on('add-gates-csv', (_event: Electron.Event, filePath: string): void => {
    projectStore.importGatesFromCSV(filePath)
})

ipcRenderer.on('add-populations-csv', (_event: Electron.Event, filePath: string): void => {
    projectStore.importActivePopulationsFromCSV(filePath)
})

ipcRenderer.on('add-project-populations-csv', (_event: Electron.Event, filePath: string): void => {
    projectStore.importProjectPopulationsFromCSV(filePath)
})

ipcRenderer.on('add-region-tiff', (_event: Electron.Event, filePath: string): void => {
    projectStore.importRegionTiff(filePath)
})

ipcRenderer.on('export-populations-tiff', (_event: Electron.Event, filePath: string): void => {
    projectStore.exportActivePopulationsToTIFF(filePath)
})

ipcRenderer.on('export-populations-csv', (_event: Electron.Event, filePath: string): void => {
    projectStore.exportActivePopulationsToCSV(filePath)
})

ipcRenderer.on('export-project-populations-csv', (_event: Electron.Event, filePath: string): void => {
    projectStore.exportProjectPopulationsToCSV(filePath)
})

ipcRenderer.on('export-image', (_event: Electron.Event, filePath: string): void => {
    projectStore.exportImage(filePath)
})

ipcRenderer.on('export-segment-features', (_event: Electron.Event, filePath: string): void => {
    projectStore.exportActiveImageSetMarkerIntensities(filePath)
})

// Only the main thread can get window resize events. Listener for these events to resize various elements.
ipcRenderer.on('window-size', (_event: Electron.Event, width: number, height: number): void => {
    projectStore.setWindowDimensions(width, height)
})

ipcRenderer.on('delete-active-image-set', (): void => {
    projectStore.deleteActiveImageSet()
})

ipcRenderer.on('clear-segmentation', (): void => {
    projectStore.clearSegmentation()
})

// Listener to turn on/off the plot in the main window if the plotWindow is open.
ipcRenderer.on('plot-in-main-window', (_event: Electron.Event, inMain: boolean): void => {
    projectStore.setPlotInMainWindow(inMain)
})

//Methods to get data from the preferencesWindow to the main thread
ipcRenderer.on('set-max-image-sets', (_event: Electron.Event, max: number): void => {
    projectStore.preferencesStore.setMaxImageSetsInMemory(max)
})

ipcRenderer.on('set-blur-pixels', (_event: Electron.Event, value: boolean): void => {
    projectStore.preferencesStore.setBlurPixels(value)
})

ipcRenderer.on('set-calculate-features', (_event: Electron.Event, value: boolean): void => {
    projectStore.settingStore.setAutoCalculateSegmentFeatures(value)
})

ipcRenderer.on('set-default-segmentation', (_event: Electron.Event, segmentation: string): void => {
    projectStore.preferencesStore.setDefaultSegmentationBasename(segmentation)
})

ipcRenderer.on(
    'set-default-channel-domain',
    (_event: Electron.Event, channel: ChannelName, domain: [number, number]): void => {
        projectStore.preferencesStore.setDefaultChannelDomain(channel, domain)
    },
)

ipcRenderer.on(
    'set-default-channel-markers',
    (_event: Electron.Event, channel: ChannelName, markers: string[]): void => {
        projectStore.preferencesStore.setDefaultChannelMarkers(channel, markers)
    },
)

ipcRenderer.on('set-use-any-marker', (_event: Electron.Event, channel: ChannelName, useAny: boolean): void => {
    projectStore.preferencesStore.setUseAnyMarker(channel, useAny)
})

ipcRenderer.on('set-scale-channel-domain-values', (_event: Electron.Event, value: boolean): void => {
    projectStore.preferencesStore.setScaleChannelDomainValues(value)
})

ipcRenderer.on('set-optimize-segmentation', (_event: Electron.Event, value: boolean): void => {
    projectStore.preferencesStore.setOptimizeSegmentation(value)
})

ipcRenderer.on('set-reload-on-error', (_event: Electron.Event, value: boolean): void => {
    projectStore.preferencesStore.setReloadOnError(value)
})

// Methods to get data from the plotWindow relayed by the main thread
ipcRenderer.on('set-plot-features', (_event: Electron.Event, features: string[]): void => {
    projectStore.settingStore.setSelectedPlotFeatures(features)
})

ipcRenderer.on('set-plot-statistic', (_event: Electron.Event, statistic: any): void => {
    projectStore.settingStore.setPlotStatistic(statistic)
})

ipcRenderer.on('set-plot-transform', (_event: Electron.Event, transform: any): void => {
    projectStore.settingStore.setPlotTransform(transform)
})

ipcRenderer.on('set-plot-type', (_event: Electron.Event, type: any): void => {
    projectStore.settingStore.setPlotType(type)
})

ipcRenderer.on('set-plot-normalization', (_event: Electron.Event, normalization: any): void => {
    projectStore.settingStore.setPlotNormalization(normalization)
})

ipcRenderer.on('set-plot-dot-size', (_event: Electron.Event, size: number): void => {
    projectStore.settingStore.setPlotDotSize(size)
})

ipcRenderer.on('set-plot-coefficient', (_event: Electron.Event, coefficient: number): void => {
    projectStore.settingStore.setTransformCoefficient(coefficient)
})

ipcRenderer.on('set-plot-all-image-sets', (_event: Electron.Event, value: boolean): void => {
    projectStore.setPlotAllImageSets(value)
})

ipcRenderer.on('set-collapse-all-image-sets', (_event: Electron.Event, value: boolean): void => {
    projectStore.settingStore.setPlotCollapseAllImageSets(value)
})

ipcRenderer.on('set-plot-downsample', (_event: Electron.Event, value: boolean): void => {
    projectStore.settingStore.setPlotDownsample(value)
})

ipcRenderer.on('set-plot-downsample-percent', (_event: Electron.Event, value: number): void => {
    projectStore.settingStore.setPlotDownsamplePercent(value)
})

ipcRenderer.on('set-plot-num-histogram-bins', (_event: Electron.Event, value: number): void => {
    projectStore.settingStore.setPlotNumHistogramBins(value)
})

ipcRenderer.on('set-plot-x-log-scale', (_event: Electron.Event, value: boolean): void => {
    projectStore.settingStore.setPlotXLogScale(value)
})

ipcRenderer.on('set-plot-y-log-scale', (_event: Electron.Event, value: boolean): void => {
    projectStore.settingStore.setPlotYLogScale(value)
})

ipcRenderer.on('update-plot-hidden-population', (_event: Electron.Event, value: string): void => {
    projectStore.settingStore.updateHiddenPopulation(value)
})

ipcRenderer.on('add-plot-selected-population', (_event: Electron.Event, segmentIds: number[]): void => {
    projectStore.activeImageSetStore.populationStore.createPopulationFromSegments(segmentIds)
})

ipcRenderer.on('set-plot-hovered-segments', (_event: Electron.Event, segmentIds: number[]): void => {
    projectStore.activeImageSetStore.plotStore.setSegmentsHoveredOnPlot(segmentIds)
})

ipcRenderer.on('add-plot-population-from-range', (_event: Electron.Event, min: number, max: number): void => {
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
    (_event: Electron.Event, dir: string, calculateFeatures?: boolean): void => {
        const exportFeatures = checkIfFeaturesExportable('export-project-segment-features', dir, calculateFeatures)
        if (exportFeatures) {
            if (calculateFeatures == undefined) calculateFeatures = false
            projectStore.exportProjectFeaturesToCSV(dir, calculateFeatures)
        }
    },
)

ipcRenderer.on('export-populations-fcs', (_event: Electron.Event, dirName: string): void => {
    projectStore.exportActiveImageSetPopulationsToFCS(dirName)
})

ipcRenderer.on(
    'export-project-populations-fcs',
    (_event: Electron.Event, dir: string, calculateFeatures?: boolean): void => {
        const exportFeatures = checkIfFeaturesExportable('export-project-populations-fcs', dir, calculateFeatures)
        if (exportFeatures) {
            if (calculateFeatures == undefined) calculateFeatures = false
            projectStore.exportProjectFeaturesToFCS(dir, true, calculateFeatures)
        }
    },
)

ipcRenderer.on('export-segments-to-fcs', (_event: Electron.Event, filePath: string): void => {
    projectStore.exportActiveImageSetToFCS(filePath)
})

ipcRenderer.on(
    'export-project-segments-to-fcs',
    (_event: Electron.Event, dir: string, calculateFeatures?: boolean): void => {
        const exportFeatures = checkIfFeaturesExportable('export-project-segments-to-fcs', dir, calculateFeatures)
        if (exportFeatures) {
            if (calculateFeatures == undefined) calculateFeatures = false
            projectStore.exportProjectFeaturesToFCS(dir, false, calculateFeatures)
        }
    },
)

ipcRenderer.on('import-active-segment-features', (_event: Electron.Event, filePath: string): void => {
    projectStore.setImportingSegmentFeaturesValues(filePath, false, true)
})

ipcRenderer.on('import-project-segment-features', (_event: Electron.Event, filePath: string): void => {
    projectStore.setImportingSegmentFeaturesValues(filePath, true, true)
})

ipcRenderer.on('continue-segment-feature-import', (_event: Electron.Event, overwrite: boolean): void => {
    // TODO: Wire into notification store checkOverwriteImportingSegmentFeatures
    projectStore.continueImportingSegmentFeatures(overwrite)
})

ipcRenderer.on('set-auto-calculate-segment-features', (_event: Electron.Event, autoCalculate: boolean): void => {
    projectStore.settingStore.setAutoCalculateSegmentFeatures(autoCalculate)
    projectStore.segmentFeatureStore.autoCalculateSegmentFeatures(projectStore.activeImageSetStore)
})

ipcRenderer.on('calculate-project-segment-features', (): void => {
    projectStore.calculateAllSegmentFeatures()
})

ipcRenderer.on('continue-calculating-segment-features', (_event: Electron.Event, overwrite: boolean): void => {
    projectStore.continueCalculatingSegmentFeatures(overwrite)
})

ipcRenderer.on('calculate-segment-features', (): void => {
    projectStore.calculateActiveSegmentFeatures()
})

ipcRenderer.on('set-project-import-modal-visibility', (_event: Electron.Event, visibility: boolean): void => {
    projectStore.projectImportStore.setModalOpen(visibility)
})

ipcRenderer.on('project-import-set-directory', (_event: Electron.Event, directory: string): void => {
    projectStore.projectImportStore.setDirectory(directory)
})

ipcRenderer.on('continue-project-import', (): void => {
    projectStore.projectImportStore.continueImport()
})

ipcRenderer.on('cancel-response', (_event: Electron.Event, cancel: boolean): void => {
    if (cancel) projectStore.setCancelTask(cancel)
    projectStore.notificationStore.setCancellationRequested(false)
})

ipcRenderer.on('export-channel-marker-mappings-csv', (_event: Electron.Event, filename: string): void => {
    projectStore.settingStore.exportChannelMarkerMappingsToCSV(filename)
})

ipcRenderer.on('import-channel-marker-mappings-csv', (_event: Electron.Event, filename: string): void => {
    projectStore.settingStore.importChannelMarkerMappingsFromCSV(filename)
})

// Keyboard shortcuts!
// Only let them work if we aren't actively loading data or exporting data.
hotkeys('command+left, alt+left', function (): void {
    const imageSetStore = projectStore.activeImageSetStore
    if (
        !imageSetStore.imageStore.imageDataLoading &&
        !imageSetStore.segmentationStore.segmentationDataLoading &&
        projectStore.notificationStore.numToCalculate == 0
    ) {
        projectStore.setPreviousImageSet()
    }
})

hotkeys('command+right, alt+right', function (): void {
    const imageSetStore = projectStore.activeImageSetStore
    if (
        !imageSetStore.imageStore.imageDataLoading &&
        !imageSetStore.segmentationStore.segmentationDataLoading &&
        projectStore.notificationStore.numToCalculate == 0
    ) {
        projectStore.setNextImageSet()
    }
})

hotkeys('alt+up, command+up', function (): void {
    const settingStore = projectStore.settingStore
    if (settingStore.activeChannelMapping) {
        settingStore.nextChannelMarkerMapping()
    }
})

hotkeys('alt+down, command+down', function (): void {
    const settingStore = projectStore.settingStore
    if (settingStore.activeChannelMapping) {
        settingStore.previousChannelMarkerMapping()
    }
})

hotkeys('shift+/', function (): void {
    projectStore.notificationStore.toggleShortcutModal()
})

const channelKeys: Record<ChannelName, string> = {
    rChannel: 'q',
    gChannel: 'w',
    bChannel: 'e',
    cChannel: 'r',
    mChannel: 'a',
    yChannel: 's',
    kChannel: 'd',
}

for (const c in channelKeys) {
    const channel = c as ChannelName
    const curKey = channelKeys[channel]
    hotkeys(curKey + '+up', function (): void {
        projectStore.settingStore.increaseMaxChannelDomainValue(channel)
    })
    hotkeys(curKey + '+down', function (): void {
        projectStore.settingStore.decreaseMaxChannelDomainValue(channel)
    })
    hotkeys(curKey + '+right', function (): void {
        projectStore.settingStore.increaseMinChannelDomainValue(channel)
    })
    hotkeys(curKey + '+left', function (): void {
        projectStore.settingStore.decreaseMinChannelDomainValue(channel)
    })
    hotkeys(curKey + '+space', function (): void {
        projectStore.settingStore.toggleChannelVisibility(channel)
    })
}

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
