/* eslint @typescript-eslint/camelcase: 0 */
/* eslint @typescript-eslint/no-explicit-any: 0 */

import { Menu, app, dialog, BrowserWindow, ipcMain } from 'electron'

import * as _ from 'underscore'

import path = require('path')
import url = require('url')
const openAboutWindow = require('about-window').default
const contextMenu = require('electron-context-menu').default

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: Electron.BrowserWindow | null
let plotWindow: Electron.BrowserWindow | null
let preferencesWindow: Electron.BrowserWindow | null

// The current active image directory. Used to set default directories for menu items.
let activeImageDirectory: string | undefined
let projectDirectory: string | undefined

// Flags used for whether or not certain things are loaded/selected used for enabling/disabling menu items.
let imageLoaded = false
let projectLoaded = false
let segmentationLoaded = false
let populationsSelected = false

function debugging(): boolean {
    const argv = process.argv
    if (argv.length > 2 && argv[2] == 'debug') {
        return true
    }
    return false
}

function openImageSet(path: string): void {
    if (mainWindow != null) {
        if (imageLoaded || projectLoaded) {
            const message =
                'Warning: Opening a new image set will close all open image sets. Are you sure you wish to do this?'
            dialog
                .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
                .then((value: Electron.MessageBoxReturnValue): void => {
                    if (value.response == 1) {
                        if (mainWindow != null) mainWindow.webContents.send('open-image-set', path)
                    }
                })
        } else {
            mainWindow.webContents.send('open-image-set', path)
        }
    }
}

function openProject(path: string): void {
    if (mainWindow != null) {
        if (imageLoaded || projectLoaded) {
            const message =
                'Warning: Opening a new project will close all open image sets. Are you sure you wish to do this?'
            dialog
                .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
                .then((value: Electron.MessageBoxReturnValue): void => {
                    if (value.response == 1) {
                        if (mainWindow != null) mainWindow.webContents.send('open-project', path)
                    }
                })
        } else {
            mainWindow.webContents.send('open-project', path)
        }
    }
}

function openSegmentation(path: string): void {
    if (mainWindow != null) {
        if (segmentationLoaded) {
            const message =
                "Warning: Opening a new segmentation file will remove any populations that weren't selected on the image for all image sets. Are you sure you wish to do this?"
            dialog
                .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
                .then((value: Electron.MessageBoxReturnValue): void => {
                    if (value.response == 1) {
                        if (mainWindow != null) mainWindow.webContents.send('open-segmentation-file', path)
                    }
                })
        } else {
            mainWindow.webContents.send('open-segmentation-file', path)
        }
    }
}

function showOpenDirectoryDialog(callback: (value: string) => void, defaultPath?: string): () => void {
    const dialogOptions: Electron.OpenDialogOptions = { properties: ['openDirectory'] }
    if (defaultPath != undefined) dialogOptions.defaultPath = defaultPath
    return (): void => {
        dialog.showOpenDialog(dialogOptions).then((value: Electron.OpenDialogReturnValue): void => {
            const filePaths = value.filePaths
            if (mainWindow != null && filePaths && filePaths[0]) {
                callback(filePaths[0])
            }
        })
    }
}

function showOpenFileDialog(
    action: string | ((value: string) => void),
    defaultPath?: string,
    fileType?: string,
): () => void {
    const dialogOptions: Electron.OpenDialogOptions = { properties: ['openFile'] }
    if (defaultPath != undefined) dialogOptions.defaultPath = defaultPath
    if (fileType != undefined) dialogOptions.filters = [{ name: fileType, extensions: [fileType] }]
    return (): void => {
        dialog.showOpenDialog(dialogOptions).then((value: Electron.OpenDialogReturnValue): void => {
            const filePaths = value.filePaths
            if (mainWindow != null && filePaths && filePaths[0]) {
                if (typeof action == 'string') {
                    mainWindow.webContents.send(action, filePaths[0])
                } else {
                    action(filePaths[0])
                }
            }
        })
    }
}

function showSaveFileIpcDialog(ipcMessageName: string, defaultPath?: string, fileType?: string): () => void {
    const dialogOptions: Electron.SaveDialogOptions = {}
    if (defaultPath != undefined) dialogOptions.defaultPath = defaultPath
    if (fileType != undefined) dialogOptions.filters = [{ name: fileType, extensions: [fileType] }]
    return (): void => {
        dialog.showSaveDialog(dialogOptions).then((value: Electron.SaveDialogReturnValue): void => {
            const filename = value.filePath
            if (mainWindow != null && filename != null) mainWindow.webContents.send(ipcMessageName, filename)
        })
    }
}

function generateMenuTemplate(): any {
    return [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open',
                    submenu: [
                        {
                            label: 'Image Set',
                            click: showOpenDirectoryDialog(openImageSet),
                        },
                        {
                            label: 'Project',
                            click: showOpenDirectoryDialog(openProject),
                        },
                    ],
                },
                {
                    label: 'Import',
                    submenu: [
                        {
                            label: 'Segmentation',
                            enabled: imageLoaded,
                            click: showOpenFileDialog(openSegmentation, activeImageDirectory),
                        },
                        {
                            label: 'Populations',
                            submenu: [
                                {
                                    label: 'For active image set from JSON',
                                    enabled: imageLoaded,
                                    click: showOpenFileDialog('add-populations-json', activeImageDirectory, 'json'),
                                },
                                {
                                    label: 'For active image set from CSV',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: showOpenFileDialog('add-populations-csv', activeImageDirectory, 'csv'),
                                },
                                {
                                    label: 'For project from single CSV',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenFileDialog(
                                        'add-project-populations-csv',
                                        activeImageDirectory,
                                        'csv',
                                    ),
                                },
                            ],
                        },
                        {
                            label: 'Segment Level Data',
                            enabled: segmentationLoaded,
                            submenu: [
                                {
                                    label: 'For active image set from CSV',
                                    enabled: segmentationLoaded,
                                    click: showOpenFileDialog('add-segment-data', activeImageDirectory, 'csv'),
                                },
                                {
                                    label: 'For project from single CSV',
                                    enabled: segmentationLoaded,
                                    click: showOpenFileDialog('add-project-segment-data', activeImageDirectory, 'csv'),
                                },
                            ],
                        },
                    ],
                },
                {
                    label: 'Export',
                    submenu: [
                        {
                            label: 'Image and layers to PNG',
                            enabled: imageLoaded,
                            click: showSaveFileIpcDialog('export-image', activeImageDirectory, 'png'),
                        },
                        {
                            label: 'Populations',
                            submenu: [
                                {
                                    label: 'For active image set to JSON',
                                    enabled: imageLoaded && populationsSelected,
                                    click: showSaveFileIpcDialog(
                                        'export-populations-json',
                                        activeImageDirectory,
                                        'json',
                                    ),
                                },
                                {
                                    label: 'For active image set to CSV',
                                    enabled: imageLoaded && populationsSelected,
                                    click: showSaveFileIpcDialog('export-populations-csv', activeImageDirectory, 'csv'),
                                },
                                {
                                    label: 'For project to single CSV',
                                    enabled: imageLoaded && populationsSelected,
                                    click: showSaveFileIpcDialog(
                                        'export-project-populations-csv',
                                        activeImageDirectory,
                                        'csv',
                                    ),
                                },
                            ],
                        },
                        {
                            label: 'Segment statistics to CSV',
                            submenu: [
                                {
                                    label: 'Mean intensities for active image set',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: showSaveFileIpcDialog(
                                        'export-mean-intensities',
                                        activeImageDirectory,
                                        'csv',
                                    ),
                                },
                                {
                                    label: 'Median intensities for active image set',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: showSaveFileIpcDialog(
                                        'export-median-intensities',
                                        activeImageDirectory,
                                        'csv',
                                    ),
                                },
                                {
                                    label: 'Mean intensities for project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialog((dir: string): void => {
                                        mainWindow.webContents.send('export-project-mean-intensities', dir)
                                    }, projectDirectory),
                                },
                                {
                                    label: 'Median intensities for project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialog((dir: string): void => {
                                        mainWindow.webContents.send('export-project-median-intensities', dir)
                                    }, projectDirectory),
                                },
                            ],
                        },
                        {
                            label: 'Segment statistics to FCS',
                            submenu: [
                                {
                                    label: 'Mean intensities for all segments in active image set',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: showSaveFileIpcDialog(
                                        'export-mean-segmentation-to-fcs',
                                        activeImageDirectory,
                                        'fcs',
                                    ),
                                },
                                {
                                    label: 'Median intensities for all segments in active image set',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: showSaveFileIpcDialog(
                                        'export-median-segmentation-to-fcs',
                                        activeImageDirectory,
                                        'fcs',
                                    ),
                                },
                                {
                                    label: 'Mean intensities for all populations in active image set',
                                    enabled: imageLoaded && segmentationLoaded && populationsSelected,
                                    click: showOpenDirectoryDialog((dir: string): void => {
                                        mainWindow.webContents.send('export-mean-populations-fcs', dir)
                                    }, activeImageDirectory),
                                },
                                {
                                    label: 'Median intensities for all populations in active image set',
                                    enabled: imageLoaded && segmentationLoaded && populationsSelected,
                                    click: showOpenDirectoryDialog((dir: string): void => {
                                        mainWindow.webContents.send('export-median-populations-fcs', dir)
                                    }, activeImageDirectory),
                                },
                                {
                                    label: 'Mean intensities for all segments in project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialog((dir: string): void => {
                                        mainWindow.webContents.send('export-project-mean-segmentation-to-fcs', dir)
                                    }, projectDirectory),
                                },
                                {
                                    label: 'Median intensities for all segments in project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialog((dir: string): void => {
                                        mainWindow.webContents.send('export-project-median-segmentation-to-fcs', dir)
                                    }, projectDirectory),
                                },
                                {
                                    label: 'Mean intensities for all populations in project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialog((dir: string): void => {
                                        mainWindow.webContents.send('export-project-mean-populations-fcs', dir)
                                    }, projectDirectory),
                                },
                                {
                                    label: 'Median intensities for all populations in project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialog((dir: string): void => {
                                        mainWindow.webContents.send('export-project-median-populations-fcs', dir)
                                    }, projectDirectory),
                                },
                            ],
                        },
                    ],
                },
                {
                    label: 'Calculate',
                    submenu: [
                        {
                            label: 'Segment intensities for active image set',
                            enabled: imageLoaded && segmentationLoaded,
                            click: (): void => {
                                mainWindow.webContents.send('recalculate-segment-data')
                            },
                        },
                    ],
                },
                {
                    label: 'Preferences',
                    click: (): void => {
                        if (preferencesWindow != null) {
                            preferencesWindow.show()
                        }
                    },
                },
                {
                    label: 'Quit',
                    click: (): void => {
                        app.quit()
                    },
                },
            ],
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Pop-out Plot Window',
                    enabled: segmentationLoaded,
                    click: (): void => {
                        if (plotWindow != null) {
                            plotWindow.show()
                        }
                        if (mainWindow != null) mainWindow.webContents.send('plot-in-main-window', false)
                    },
                },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z',
                    selector: 'undo:',
                },
                {
                    label: 'Redo',
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    selector: 'redo:',
                },
                {
                    type: 'separator',
                },
                {
                    label: 'Cut',
                    accelerator: 'CmdOrCtrl+X',
                    selector: 'cut:',
                },
                {
                    label: 'Copy',
                    accelerator: 'CmdOrCtrl+C',
                    selector: 'copy:',
                },
                {
                    label: 'Paste',
                    accelerator: 'CmdOrCtrl+V',
                    selector: 'paste:',
                },
                {
                    label: 'Select All',
                    accelerator: 'CmdOrCtrl+A',
                    selector: 'selectAll:',
                },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Open Developer Tools',
                    click: (): void => {
                        if (mainWindow != null) mainWindow.webContents.openDevTools()
                        if (plotWindow != null) plotWindow.webContents.openDevTools()
                    },
                },
                {
                    label: 'About',
                    click: (): void => {
                        openAboutWindow({
                            icon_path: path.join(__dirname, 'icon.png'),
                            use_version_info: true,
                            license: 'GPLv3',
                            product_name: 'Mantis Viewer',
                        })
                    },
                },
            ],
        },
    ]
}

function setMenu(): void {
    const menuTemplate = generateMenuTemplate()
    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)
}

function sendMainWindowSize(): void {
    if (mainWindow != null) {
        const dimensions = mainWindow.getSize()
        mainWindow.webContents.send('window-size', dimensions[0], dimensions[1])
    }
}

function sendPlotWindowSize(): void {
    if (plotWindow != null) {
        const dimensions = plotWindow.getSize()
        plotWindow.webContents.send('window-size', dimensions[0], dimensions[1])
    }
}

// Need to remove the event listener for close that prevents the default close
// Otherwise the window will never be destroyed and the application cannot exit.
function closePlotWindow(): void {
    if (plotWindow != null) {
        plotWindow.removeAllListeners('close')
        plotWindow.close()
        plotWindow = null
    }
}

function closePreferencesWindow(): void {
    if (preferencesWindow != null) {
        preferencesWindow.removeAllListeners('close')
        preferencesWindow.close()
        preferencesWindow = null
    }
}

function createMainWindow(): void {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1540,
        height: 860,
        show: false,
        webPreferences: { experimentalFeatures: true, nodeIntegration: true, nodeIntegrationInWorker: true },
    })
    setMenu()

    mainWindow.setMinimumSize(1540, 860)

    // and load the index.html of the app.
    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'app', 'mainWindow.html'),
            protocol: 'file:',
            slashes: true,
        }),
    )

    // Open the DevTools.
    if (debugging()) {
        mainWindow.webContents.openDevTools()
        contextMenu({ showInspectElement: true })
    }

    // Use throttle so that when we resize we only send the window size every 333 ms
    mainWindow.on('resize', _.throttle(sendMainWindowSize, 333))
    mainWindow.on('enter-full-screen', sendMainWindowSize)
    mainWindow.on('leave-full-screen', sendMainWindowSize)
    mainWindow.on('show', sendMainWindowSize)

    // Emitted when the window is closed.
    mainWindow.on('closed', function (): void {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
        closePlotWindow()
        closePreferencesWindow()
    })

    mainWindow.on('ready-to-show', (): void => {
        if (mainWindow != null) mainWindow.show()
    })
}

function createPlotWindow(): void {
    plotWindow = new BrowserWindow({
        width: 800,
        height: 800,
        show: false,
        webPreferences: { experimentalFeatures: true, nodeIntegration: true, nodeIntegrationInWorker: false },
    })

    plotWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'app', 'plotWindow.html'),
            protocol: 'file:',
            slashes: true,
        }),
    )

    if (debugging()) plotWindow.webContents.openDevTools()

    // Use throttle so that when we resize we only send the window size every 333 ms
    plotWindow.on('resize', _.throttle(sendPlotWindowSize, 333))
    plotWindow.on('enter-full-screen', sendPlotWindowSize)
    plotWindow.on('leave-full-screen', sendPlotWindowSize)
    plotWindow.on('show', sendPlotWindowSize)

    // Instead of destroying and recreating the plot window, we just hide/show it (unless the application is exited).
    plotWindow.on('close', function (event: Electron.Event): void {
        event.preventDefault()
        if (plotWindow != null) plotWindow.hide()
        if (mainWindow != null) mainWindow.webContents.send('plot-in-main-window', true)
    })
}

function createPreferencesWindow(): void {
    preferencesWindow = new BrowserWindow({
        width: 475,
        height: 580,
        resizable: false,
        show: false,
        webPreferences: { experimentalFeatures: true, nodeIntegration: true, nodeIntegrationInWorker: false },
    })

    preferencesWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'app', 'preferencesWindow.html'),
            protocol: 'file:',
            slashes: true,
        }),
    )

    if (debugging()) preferencesWindow.webContents.openDevTools()

    // Instead of destroying and recreating the plot window, we just hide/show it (unless the application is exited).
    preferencesWindow.on('close', function (event: Electron.Event): void {
        event.preventDefault()
        if (preferencesWindow != null) preferencesWindow.hide()
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createMainWindow)
app.on('ready', createPlotWindow)
app.on('ready', createPreferencesWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function (): void {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function (): void {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createMainWindow()
    if (plotWindow === null) createPlotWindow()
    if (preferencesWindow === null) createPreferencesWindow()
})

app.on('before-quit', (): void => {
    closePlotWindow()
    closePreferencesWindow()
})

//Functions for setting menu flags and regenerating the menu
ipcMain.on('set-image-loaded', (event: Electron.Event, loaded: boolean): void => {
    imageLoaded = loaded
    setMenu()
})

ipcMain.on('set-project-loaded', (event: Electron.Event, loaded: boolean): void => {
    projectLoaded = loaded
    setMenu()
})

ipcMain.on('set-segmentation-loaded', (event: Electron.Event, loaded: boolean): void => {
    segmentationLoaded = loaded
    setMenu()
})

ipcMain.on('set-populations-selected', (event: Electron.Event, selected: boolean): void => {
    populationsSelected = selected
    setMenu()
})

ipcMain.on('set-active-image-directory', (event: Electron.Event, directory: string): void => {
    activeImageDirectory = directory
    setMenu()
})

ipcMain.on('set-project-directory', (event: Electron.Event, directory: string): void => {
    projectDirectory = directory
    setMenu()
})

// Show an error dialog with the message passed in.
ipcMain.on('mainWindow-show-error-dialog', (event: Electron.Event, message: string): void => {
    if (mainWindow != null) dialog.showMessageBox(mainWindow, { type: 'error', message: message })
})

// Show a 'remove image set' dialog and tell the main window to remove it if the user approves.
ipcMain.on('mainWindow-show-remove-image-dialog', (event: Electron.Event, message: string): void => {
    if (mainWindow != null)
        dialog
            .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
            .then((value: Electron.MessageBoxReturnValue): void => {
                if (value.response == 1) {
                    if (mainWindow != null) mainWindow.webContents.send('delete-active-image-set')
                }
            })
})

// Show a 'remove image set' dialog and tell the main window to remove it if the user approves.
ipcMain.on('mainWindow-show-remove-segmentation-dialog', (): void => {
    if (mainWindow != null) {
        const message =
            "Warning: Clearing segmentation will remove any populations that weren't selected on the image for all image sets. Are you sure you wish to do this?"
        dialog
            .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
            .then((value: Electron.MessageBoxReturnValue): void => {
                if (value.response == 1) {
                    if (mainWindow != null) mainWindow.webContents.send('clear-segmentation')
                }
            })
    }
})

ipcMain.on('mainWindow-show-recalculate-segmentation-stats-dialog', (): void => {
    if (mainWindow != null) {
        const options = {
            type: 'question',
            buttons: ['Yes', 'No'],
            defaultId: 0,
            title: 'Question',
            message:
                'Segment intensities have been previously calculated for this image set. Do you want to use the previously calculated intensities?',
            detail: 'You can manually refresh segment intensities from the main menu at any time',
            checkboxLabel: 'Remember my answer (you can change this in preferences)',
            checkboxChecked: true,
        }
        dialog.showMessageBox(null, options).then((value: Electron.MessageBoxReturnValue) => {
            if (mainWindow != null)
                mainWindow.webContents.send(
                    'recalculate-segmentation-stats',
                    value.response == 1,
                    value.checkboxChecked,
                )
        })
    }
})

ipcMain.on('mainWindow-show-clear-segment-features-dialog', (): void => {
    if (mainWindow != null) {
        const options = {
            type: 'question',
            buttons: ['Yes', 'No'],
            defaultId: 0,
            title: 'Question',
            message:
                'Some of the segment features you are importing are already present. Do you wish to drop these features before importing?',
            detail: 'Choosing no can lead to duplicate or overlapping data',
            checkboxLabel: 'Remember my answer (you can change this in preferences)',
            checkboxChecked: true,
        }
        dialog.showMessageBox(null, options).then((value: Electron.MessageBoxReturnValue) => {
            if (mainWindow != null)
                mainWindow.webContents.send('clear-segment-features', value.response == 0, value.checkboxChecked)
        })
    }
})

// Functions to relay data from the mainWindow to the plotWindow
ipcMain.on(
    'mainWindow-set-plot-data',
    (
        event: Electron.Event,
        selectOptions: { value: string; label: string }[],
        plotChannels: string[],
        statistic: string,
        transform: string,
        type: string,
        normalization: string,
        size: number,
        coefficient: number,
        plotData: any,
    ): void => {
        if (plotWindow != null)
            plotWindow.webContents.send(
                'set-plot-data',
                selectOptions,
                plotChannels,
                statistic,
                transform,
                type,
                normalization,
                size,
                coefficient,
                plotData,
            )
    },
)

// Functions to relay data from the plotWindow to the mainWindow
ipcMain.on('plotWindow-set-markers', (event: Electron.Event, markers: string[]): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-markers', markers)
})

ipcMain.on('plotWindow-set-statistic', (event: Electron.Event, statistic: any): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-statistic', statistic)
})

ipcMain.on('plotWindow-set-transform', (event: Electron.Event, transform: any): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-transform', transform)
})

ipcMain.on('plotWindow-set-type', (event: Electron.Event, type: any): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-type', type)
})

ipcMain.on('plotWindow-set-dot-size', (event: Electron.Event, size: number): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-dot-size', size)
})

ipcMain.on('plotWindow-set-normalization', (event: Electron.Event, normalization: any): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-normalization', normalization)
})

ipcMain.on('plotWindow-add-selected-population', (event: Electron.Event, segmentIds: number[]): void => {
    if (mainWindow != null) mainWindow.webContents.send('add-plot-selected-population', segmentIds)
})

ipcMain.on('plotWindow-set-hovered-segments', (event: Electron.Event, segmentIds: number[]): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-hovered-segments', segmentIds)
})

ipcMain.on('plotWindow-add-population-from-range', (event: Electron.Event, min: number, max: number): void => {
    if (mainWindow != null) mainWindow.webContents.send('add-plot-population-from-range', min, max)
})

ipcMain.on('plotWindow-set-coefficient', (event: Electron.Event, coefficient: number): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-coefficient', coefficient)
})

// Functions to relay data from the mainWindow to the preferencesWindow
ipcMain.on(
    'mainWindow-set-preferences',
    (
        event: Electron.Event,
        maxImageSets: number,
        defaultSegmentation: string | null,
        markers: any,
        domains: any,
        anyChannel: any,
        rememberRecalculateSegmentationStatistics: boolean,
        recalculateSegmentationStatistics: boolean,
        rememberClearDuplicateSegmentFeatures: boolean,
        clearDuplicateSegmentFeatures: boolean,
    ): void => {
        if (preferencesWindow != null)
            preferencesWindow.webContents.send(
                'set-preferences',
                maxImageSets,
                defaultSegmentation,
                markers,
                domains,
                anyChannel,
                rememberRecalculateSegmentationStatistics,
                recalculateSegmentationStatistics,
                rememberClearDuplicateSegmentFeatures,
                clearDuplicateSegmentFeatures,
            )
    },
)

// Functions to relay data from the preferencesWindow to the mainWindow
ipcMain.on('preferencesWindow-set-max-image-sets', (event: Electron.Event, max: number): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-max-image-sets', max)
})

ipcMain.on('preferencesWindow-set-segmentation', (event: Electron.Event, basename: string): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-default-segmentation', basename)
})

ipcMain.on(
    'preferencesWindow-set-channel-markers',
    (event: Electron.Event, channel: string, markers: string[]): void => {
        if (mainWindow != null) mainWindow.webContents.send('set-default-channel-markers', channel, markers)
    },
)

ipcMain.on(
    'preferencesWindow-set-channel-domain',
    (event: Electron.Event, channel: string, domain: [number, number]): void => {
        if (mainWindow != null) mainWindow.webContents.send('set-default-channel-domain', channel, domain)
    },
)

ipcMain.on('preferencesWindow-set-use-any-marker', (event: Electron.Event, channel: string, useAny: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-use-any-marker', channel, useAny)
})

ipcMain.on('preferencesWindow-set-remember-recalculate', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-remember-recalculate', value)
})

ipcMain.on('preferencesWindow-set-recalculate', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-recalculate', value)
})

ipcMain.on('preferencesWindow-set-remember-clear', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-remember-clear', value)
})

ipcMain.on('preferencesWindow-set-clear', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-clear', value)
})
