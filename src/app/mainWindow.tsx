/* eslint @typescript-eslint/no-explicit-any: 0 */

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as Mobx from 'mobx'
import { ipcRenderer } from 'electron'
import * as Mousetrap from 'mousetrap'

import { MainApp } from '../components/MainApp'
import { ProjectStore } from '../stores/ProjectStore'
import { GraphSelectionPrefix } from '../definitions/UIDefinitions'
import { dirname } from 'path'

Mobx.configure({ enforceActions: 'always' })

const projectStore = new ProjectStore()

// Listeners for menu items from the main thread.
ipcRenderer.on('open-image-set', async (event: Electron.Event, dirName: string) => {
    projectStore.openImageSet(dirName)
})

ipcRenderer.on('open-project', async (event: Electron.Event, dirName: string) => {
    projectStore.openProject(dirName)
})

ipcRenderer.on('open-segmentation-file', (event: Electron.Event, filename: string) => {
    projectStore.setSegmentationBasename(filename)
})

ipcRenderer.on('add-populations-json', (event: Electron.Event, filename: string) => {
    projectStore.activePopulationStore.addPopulationsFromJSON(filename)
})

ipcRenderer.on('export-populations-json', (event: Electron.Event, filename: string) => {
    projectStore.activePopulationStore.exportPopulationsToJSON(filename)
})

ipcRenderer.on('add-populations-csv', (event: Electron.Event, filename: string) => {
    projectStore.activePopulationStore.addPopulationsFromCSV(filename)
})

ipcRenderer.on('export-populations-csv', (event: Electron.Event, filename: string) => {
    projectStore.activePopulationStore.exportPopulationsToCSV(filename)
})

ipcRenderer.on('export-image', (event: Electron.Event, filename: string) => {
    projectStore.activeImageStore.setImageExportFilename(filename)
})

ipcRenderer.on('export-mean-intensities', (event: Electron.Event, filename: string) => {
    projectStore.exportMarkerIntensisties(filename, 'mean')
})

ipcRenderer.on('export-median-intensities', (event: Electron.Event, filename: string) => {
    projectStore.exportMarkerIntensisties(filename, 'median')
})

ipcRenderer.on('export-project-mean-intensities', (event: Electron.Event, dirName: string) => {
    console.log('TODO')
})

ipcRenderer.on('export-project-median-intensities', (event: Electron.Event, dirName: string) => {
    console.log('TODO')
})

// Only the main thread can get window resize events. Listener for these events to resize various elements.
ipcRenderer.on('window-size', (event: Electron.Event, width: number, height: number) => {
    projectStore.setWindowDimensions(width, height)
})

ipcRenderer.on('delete-active-image-set', () => {
    projectStore.deleteActiveImageSet()
})

// Listener to turn on/off the plot in the main window if the plotWindow is open.
ipcRenderer.on('plot-in-main-window', (event: Electron.Event, inMain: boolean) => {
    projectStore.setPlotInMainWindow(inMain)
})

// Methods to get data from the plotWindow relayed by the main thread
ipcRenderer.on('set-plot-markers', (event: Electron.Event, markers: string[]) => {
    projectStore.activePlotStore.setSelectedPlotMarkers(markers)
})

ipcRenderer.on('set-plot-statistic', (event: Electron.Event, statistic: any) => {
    projectStore.activePlotStore.setPlotStatistic(statistic)
})

ipcRenderer.on('set-plot-transform', (event: Electron.Event, transform: any) => {
    projectStore.activePlotStore.setPlotTransform(transform)
})

ipcRenderer.on('set-plot-type', (event: Electron.Event, type: any) => {
    projectStore.activePlotStore.setPlotType(type)
})

ipcRenderer.on('set-plot-normalization', (event: Electron.Event, normalization: any) => {
    projectStore.activePlotStore.setPlotNormalization(normalization)
})

ipcRenderer.on('add-plot-selected-population', (event: Electron.Event, segmentIds: number[]) => {
    projectStore.activePopulationStore.addSelectedPopulation(null, segmentIds, GraphSelectionPrefix)
})

ipcRenderer.on('set-plot-hovered-segments', (event: Electron.Event, segmentIds: number[]) => {
    projectStore.activePlotStore.setSegmentsHoveredOnPlot(segmentIds)
})

ipcRenderer.on('add-plot-population-from-range', (event: Electron.Event, min: number, max: number) => {
    projectStore.addPopulationFromRange(min, max)
})

ipcRenderer.on('export-mean-populations-fcs', (event: Electron.Event, dirName: string) => {
    projectStore.exportPopulationsToFCS(dirName, 'mean')
})

ipcRenderer.on('export-median-populations-fcs', (event: Electron.Event, dirName: string) => {
    projectStore.exportPopulationsToFCS(dirName, 'median')
})

ipcRenderer.on('export-project-mean-populations-fcs', (event: Electron.Event, dirName: string) => {
    console.log('TODO')
})

ipcRenderer.on('export-project-median-populations-fcs', (event: Electron.Event, dirName: string) => {
    console.log('TODO')
})

ipcRenderer.on('export-mean-segmentation-to-fcs', (event: Electron.Event, filename: string) => {
    projectStore.exportToFCS(filename, 'mean')
})

ipcRenderer.on('export-median-segmentation-to-fcs', (event: Electron.Event, filename: string) => {
    projectStore.exportToFCS(filename, 'median')
})

ipcRenderer.on('export-project-mean-segmentation-to-fcs', (event: Electron.Event, dirName: string) => {
    console.log('Export project to mean fcs at ' + dirname)
    projectStore.exportProjectToFCS(dirName, 'mean')
})

ipcRenderer.on('export-project-median-segmentation-to-fcs', (event: Electron.Event, dirName: string) => {
    console.log('Export project to median fcs at ' + dirname)
    projectStore.exportProjectToFCS(dirName, 'median')
})

// Keyboard shortcuts!
Mousetrap.bind(['command+left', 'alt+left'], function() {
    projectStore.setPreviousImageSet()
})

Mousetrap.bind(['command+right', 'alt+right'], function() {
    projectStore.setNextImageSet()
})

// Autorun that sends plot related data to the main thread to be relayed to the plotWindow
Mobx.autorun(() => {
    let imageStore = projectStore.activeImageStore
    let plotStore = projectStore.activePlotStore
    ipcRenderer.send(
        'mainWindow-set-plot-data',
        imageStore.markerSelectOptions,
        plotStore.selectedPlotMarkers,
        plotStore.plotStatistic,
        plotStore.plotTransform,
        plotStore.plotType,
        plotStore.plotNormalization,
        plotStore.plotData,
    )
})

// Sends the active image set path to the main thread when changed.
// Used for setting default menu directories.
Mobx.autorun(() => {
    ipcRenderer.send('set-active-image-directory', projectStore.activeImageSetPath)
})

Mobx.autorun(() => {
    ipcRenderer.send('set-project-directory', projectStore.projectPath)
})

Mobx.autorun(() => {
    if (projectStore.errorMessage != null) {
        ipcRenderer.send('mainWindow-show-error-dialog', projectStore.errorMessage)
        projectStore.clearErrorMessage()
    }
})

Mobx.autorun(() => {
    if (projectStore.removeMessage != null) {
        ipcRenderer.send('mainWindow-show-remove-dialog', projectStore.removeMessage)
        projectStore.clearRemoveMessage()
    }
})

Mobx.autorun(() => {
    if (projectStore.activeImageStore.imageData && projectStore.activeImageStore.imageData.errors.length > 0) {
        let msg =
            'Error(s) opening tiffs for the following markers: ' +
            projectStore.activeImageStore.imageData.errors.join(', ')
        ipcRenderer.send('mainWindow-show-error-dialog', msg)
        projectStore.activeImageStore.imageData.clearErrors()
    }
})

Mobx.autorun(() => {
    if (projectStore.activeImageStore.segmentationData && projectStore.activeImageStore.segmentationData.errorLoading) {
        let msg = 'Error opening segmentation data.'
        ipcRenderer.send('mainWindow-show-error-dialog', msg)
        projectStore.activeImageStore.clearSegmentationData()
    }
})

// Update the main thread on whether or not an image store with image data loaded is selected.
Mobx.autorun(() => {
    ipcRenderer.send('set-image-loaded', projectStore.imageSetPaths.length > 0)
})

Mobx.autorun(() => {
    ipcRenderer.send('set-project-loaded', projectStore.imageSetPaths.length > 1)
})

Mobx.autorun(() => {
    ipcRenderer.send('set-segmentation-loaded', projectStore.activeImageStore.segmentationData != null)
})

Mobx.autorun(() => {
    ipcRenderer.send('set-populations-selected', projectStore.activePopulationStore.selectedPopulations.length > 0)
})

ReactDOM.render(
    <div>
        <MainApp projectStore={projectStore} />
    </div>,
    document.getElementById('main'),
)
