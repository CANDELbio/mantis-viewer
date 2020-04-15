/* eslint @typescript-eslint/no-explicit-any: 0 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as Mobx from 'mobx'
import { ipcRenderer, remote } from 'electron'
import * as Mousetrap from 'mousetrap'

import { MainApp } from '../components/MainApp'
import { ProjectStore } from '../stores/ProjectStore'
import { GraphSelectionPrefix, ChannelName } from '../definitions/UIDefinitions'

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

ipcRenderer.on(
    'open-segmentation-file',
    (event: Electron.Event, filename: string): void => {
        projectStore.setSegmentationBasename(filename)
    },
)

ipcRenderer.on(
    'add-populations-json',
    (event: Electron.Event, filename: string): void => {
        projectStore.importActivePopulationsFromJSON(filename)
    },
)

ipcRenderer.on(
    'export-populations-json',
    (event: Electron.Event, filename: string): void => {
        projectStore.exportActivePopulationsToJSON(filename)
    },
)

ipcRenderer.on(
    'add-populations-csv',
    (event: Electron.Event, filename: string): void => {
        projectStore.importActivePopulationsFromCSV(filename)
    },
)

ipcRenderer.on(
    'add-project-populations-csv',
    (event: Electron.Event, filename: string): void => {
        projectStore.importProjectPopulationsFromCSV(filename)
    },
)

ipcRenderer.on(
    'export-populations-csv',
    (event: Electron.Event, filename: string): void => {
        projectStore.exportActivePopulationsToCSV(filename)
    },
)

ipcRenderer.on(
    'export-project-populations-csv',
    (event: Electron.Event, filename: string): void => {
        projectStore.exportProjectPopulationsToCSV(filename)
    },
)

ipcRenderer.on(
    'export-image',
    (event: Electron.Event, filename: string): void => {
        projectStore.activeImageSetStore.imageStore.setImageExportFilename(filename)
    },
)

ipcRenderer.on(
    'export-mean-intensities',
    (event: Electron.Event, filename: string): void => {
        projectStore.exportActiveImageSetMarkerIntensities(filename, 'mean')
    },
)

ipcRenderer.on(
    'export-median-intensities',
    (event: Electron.Event, filename: string): void => {
        projectStore.exportActiveImageSetMarkerIntensities(filename, 'median')
    },
)

ipcRenderer.on(
    'export-project-mean-intensities',
    (event: Electron.Event, dirName: string): void => {
        projectStore.exportProjectMarkerIntensities(dirName, 'mean')
    },
)

ipcRenderer.on(
    'export-project-median-intensities',
    (event: Electron.Event, dirName: string): void => {
        projectStore.exportProjectMarkerIntensities(dirName, 'median')
    },
)

// Only the main thread can get window resize events. Listener for these events to resize various elements.
ipcRenderer.on(
    'window-size',
    (event: Electron.Event, width: number, height: number): void => {
        projectStore.setWindowDimensions(width, height)
    },
)

ipcRenderer.on(
    'delete-active-image-set',
    (): void => {
        projectStore.deleteActiveImageSet()
    },
)

ipcRenderer.on(
    'clear-segmentation',
    (): void => {
        projectStore.clearSegmentation()
    },
)

// Listener to turn on/off the plot in the main window if the plotWindow is open.
ipcRenderer.on(
    'plot-in-main-window',
    (event: Electron.Event, inMain: boolean): void => {
        projectStore.setPlotInMainWindow(inMain)
    },
)

//Methods to get data from the preferencesWindow to the main thread
ipcRenderer.on(
    'set-max-image-sets',
    (event: Electron.Event, max: number): void => {
        projectStore.preferencesStore.setMaxImageSetsInMemory(max)
    },
)

ipcRenderer.on(
    'set-default-segmentation',
    (event: Electron.Event, segmentation: string): void => {
        projectStore.preferencesStore.setDefaultSegmentationBasename(segmentation)
    },
)

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

ipcRenderer.on(
    'set-use-any-marker',
    (event: Electron.Event, channel: ChannelName, useAny: boolean): void => {
        projectStore.preferencesStore.setUseAnyMarker(channel, useAny)
    },
)

// Methods to get data from the plotWindow relayed by the main thread
ipcRenderer.on(
    'set-plot-markers',
    (event: Electron.Event, markers: string[]): void => {
        projectStore.settingStore.setSelectedPlotMarkers(markers)
    },
)

ipcRenderer.on(
    'set-plot-statistic',
    (event: Electron.Event, statistic: any): void => {
        projectStore.settingStore.setPlotStatistic(statistic)
    },
)

ipcRenderer.on(
    'set-plot-transform',
    (event: Electron.Event, transform: any): void => {
        projectStore.settingStore.setPlotTransform(transform)
    },
)

ipcRenderer.on(
    'set-plot-type',
    (event: Electron.Event, type: any): void => {
        projectStore.settingStore.setPlotType(type)
    },
)

ipcRenderer.on(
    'set-plot-normalization',
    (event: Electron.Event, normalization: any): void => {
        projectStore.settingStore.setPlotNormalization(normalization)
    },
)

ipcRenderer.on(
    'set-plot-dot-size',
    (event: Electron.Event, size: number): void => {
        projectStore.settingStore.setPlotDotSize(size)
    },
)

ipcRenderer.on(
    'set-plot-coefficient',
    (event: Electron.Event, coefficient: number): void => {
        projectStore.settingStore.setTransformCoefficient(coefficient)
    },
)

ipcRenderer.on(
    'add-plot-selected-population',
    (event: Electron.Event, segmentIds: number[]): void => {
        projectStore.activeImageSetStore.populationStore.addSelectedPopulation(null, segmentIds, GraphSelectionPrefix)
    },
)

ipcRenderer.on(
    'set-plot-hovered-segments',
    (event: Electron.Event, segmentIds: number[]): void => {
        projectStore.activeImageSetStore.plotStore.setSegmentsHoveredOnPlot(segmentIds)
    },
)

ipcRenderer.on(
    'add-plot-population-from-range',
    (event: Electron.Event, min: number, max: number): void => {
        projectStore.addPopulationFromRange(min, max)
    },
)

ipcRenderer.on(
    'export-mean-populations-fcs',
    (event: Electron.Event, dirName: string): void => {
        projectStore.exportActiveImageSetPopulationsToFcs(dirName, 'mean')
    },
)

ipcRenderer.on(
    'export-median-populations-fcs',
    (event: Electron.Event, dirName: string): void => {
        projectStore.exportActiveImageSetPopulationsToFcs(dirName, 'median')
    },
)

ipcRenderer.on(
    'export-project-mean-populations-fcs',
    (event: Electron.Event, dirName: string): void => {
        projectStore.exportProjectToFCS(dirName, 'mean', true)
    },
)

ipcRenderer.on(
    'export-project-median-populations-fcs',
    (event: Electron.Event, dirName: string): void => {
        projectStore.exportProjectToFCS(dirName, 'median', true)
    },
)

ipcRenderer.on(
    'export-mean-segmentation-to-fcs',
    (event: Electron.Event, filename: string): void => {
        projectStore.exportActiveImageSetToFcs(filename, 'mean')
    },
)

ipcRenderer.on(
    'export-median-segmentation-to-fcs',
    (event: Electron.Event, filename: string): void => {
        projectStore.exportActiveImageSetToFcs(filename, 'median')
    },
)

ipcRenderer.on(
    'export-project-mean-segmentation-to-fcs',
    (event: Electron.Event, dirName: string): void => {
        projectStore.exportProjectToFCS(dirName, 'mean', false)
    },
)

ipcRenderer.on(
    'export-project-median-segmentation-to-fcs',
    (event: Electron.Event, dirName: string): void => {
        projectStore.exportProjectToFCS(dirName, 'median', false)
    },
)

// Keyboard shortcuts!
// Only let them work if we aren't actively loading data or exporting data.
Mousetrap.bind(['command+left', 'alt+left'], function(): void {
    let imageSetStore = projectStore.activeImageSetStore
    if (
        !imageSetStore.imageStore.imageDataLoading &&
        !imageSetStore.segmentationStore.segmentationDataLoading &&
        projectStore.numToExport == 0
    ) {
        projectStore.setPreviousImageSet()
    }
})

Mousetrap.bind(['command+right', 'alt+right'], function(): void {
    let imageSetStore = projectStore.activeImageSetStore
    if (
        !imageSetStore.imageStore.imageDataLoading &&
        !imageSetStore.segmentationStore.segmentationDataLoading &&
        projectStore.numToExport == 0
    ) {
        projectStore.setNextImageSet()
    }
})

// Autorun that sends plot related data to the main thread to be relayed to the plotWindow
Mobx.autorun(
    (): void => {
        let imageSet = projectStore.activeImageSetStore
        let imageStore = imageSet.imageStore
        let plotStore = imageSet.plotStore
        let settingStore = projectStore.settingStore
        let markerNames = imageStore.imageData ? imageStore.imageData.markerNames : null
        ipcRenderer.send(
            'mainWindow-set-plot-data',
            markerNames,
            Mobx.toJS(settingStore.selectedPlotMarkers),
            settingStore.plotStatistic,
            settingStore.plotTransform,
            settingStore.plotType,
            settingStore.plotNormalization,
            settingStore.plotDotSize,
            settingStore.transformCoefficient,
            plotStore.plotData,
        )
    },
)

// Autorun that sends plot related data to the main thread to be relayed to the plotWindow
Mobx.autorun(
    (): void => {
        let preferencesStore = projectStore.preferencesStore
        ipcRenderer.send(
            'mainWindow-set-preferences',
            preferencesStore.maxImageSetsInMemory,
            preferencesStore.defaultSegmentationBasename,
            Mobx.toJS(preferencesStore.defaultChannelMarkers),
            Mobx.toJS(preferencesStore.defaultChannelDomains),
            Mobx.toJS(preferencesStore.useAnyMarkerIfNoMatch),
        )
    },
)

// Sends the active image set path to the main thread when changed.
// Used for setting default menu directories.
Mobx.autorun(
    (): void => {
        ipcRenderer.send('set-active-image-directory', projectStore.activeImageSetPath)
    },
)

Mobx.autorun(
    (): void => {
        ipcRenderer.send('set-project-directory', projectStore.projectPath)
    },
)

Mobx.autorun(
    (): void => {
        if (projectStore.errorMessage != null) {
            ipcRenderer.send('mainWindow-show-error-dialog', projectStore.errorMessage)
            projectStore.clearErrorMessage()
        }
    },
)

Mobx.autorun(
    (): void => {
        if (projectStore.removeMessage != null) {
            ipcRenderer.send('mainWindow-show-remove-image-dialog', projectStore.removeMessage)
            projectStore.clearRemoveMessage()
        }
    },
)

Mobx.autorun(
    (): void => {
        let activeImageStore = projectStore.activeImageSetStore.imageStore
        if (activeImageStore.imageData && activeImageStore.imageData.errors.length > 0) {
            let msg =
                'Error(s) opening tiffs for the following markers:\n' + activeImageStore.imageData.errors.join('\n')
            ipcRenderer.send('mainWindow-show-error-dialog', msg)
            activeImageStore.imageData.clearErrors()
        }
    },
)

Mobx.autorun(
    (): void => {
        let activeSegmentationStore = projectStore.activeImageSetStore.segmentationStore
        if (activeSegmentationStore.segmentationData) {
            let errorMessage = activeSegmentationStore.segmentationData.errorMessage
            if (errorMessage) {
                ipcRenderer.send('mainWindow-show-error-dialog', errorMessage)
            }
        }
    },
)

Mobx.autorun(
    (): void => {
        if (projectStore.clearSegmentationRequested) {
            ipcRenderer.send('mainWindow-show-remove-segmentation-dialog')
            projectStore.setClearSegmentationRequested(false)
        }
    },
)

// Update the main thread on whether or not an image store with image data loaded is selected.
Mobx.autorun(
    (): void => {
        ipcRenderer.send('set-image-loaded', projectStore.imageSetPaths.length > 0)
    },
)

Mobx.autorun(
    (): void => {
        ipcRenderer.send('set-project-loaded', projectStore.imageSetPaths.length > 1)
    },
)

Mobx.autorun(
    (): void => {
        ipcRenderer.send(
            'set-segmentation-loaded',
            projectStore.activeImageSetStore.segmentationStore.segmentationData != null,
        )
    },
)

Mobx.autorun(
    (): void => {
        ipcRenderer.send(
            'set-populations-selected',
            projectStore.activeImageSetStore.populationStore.selectedPopulations.length > 0,
        )
    },
)

ReactDOM.render(
    <div>
        <MainApp projectStore={projectStore} />
    </div>,
    document.getElementById('main'),
)
