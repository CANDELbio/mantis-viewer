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

// The current active image directory. Used to set default directories for menu items.
let activeImageDirectory: string | undefined
let projectDirectory: string | undefined

// Flags used for whether or not certain things are loaded/selected used for enabling/disabling menu items.
let imageLoaded = false
let projectLoaded = false
let segmentationLoaded = false
let populationsSelected = false

function debugging(): boolean {
    let argv = process.argv
    if (argv.length > 2 && argv[2] == 'debug') {
        return true
    }
    return false
}

function openImageSet(path: string): void {
    if (mainWindow != null) {
        if (imageLoaded || projectLoaded) {
            let message =
                'Warning: Opening a new image set will close all open image sets. Are you sure you wish to do this?'
            dialog
                .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
                .then((value: Electron.MessageBoxReturnValue) => {
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
            let message =
                'Warning: Opening a new project will close all open image sets. Are you sure you wish to do this?'
            dialog
                .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
                .then((value: Electron.MessageBoxReturnValue) => {
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
            let message =
                "Warning: Opening a new segmentation file will remove any populations that weren't selected on the image for all image sets. Are you sure you wish to do this?"
            dialog
                .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
                .then((value: Electron.MessageBoxReturnValue) => {
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
    let dialogOptions: Electron.OpenDialogOptions = { properties: ['openDirectory'] }
    if (defaultPath != undefined) dialogOptions.defaultPath = defaultPath
    return () => {
        dialog.showOpenDialog(dialogOptions).then((value: Electron.OpenDialogReturnValue) => {
            let filePaths = value.filePaths
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
    let dialogOptions: Electron.OpenDialogOptions = { properties: ['openFile'] }
    if (defaultPath != undefined) dialogOptions.defaultPath = defaultPath
    if (fileType != undefined) dialogOptions.filters = [{ name: fileType, extensions: [fileType] }]
    return () => {
        dialog.showOpenDialog(dialogOptions).then((value: Electron.OpenDialogReturnValue) => {
            let filePaths = value.filePaths
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
    let dialogOptions: Electron.SaveDialogOptions = {}
    if (defaultPath != undefined) dialogOptions.defaultPath = defaultPath
    if (fileType != undefined) dialogOptions.filters = [{ name: fileType, extensions: [fileType] }]
    return () => {
        dialog.showSaveDialog(dialogOptions).then((value: Electron.SaveDialogReturnValue) => {
            let filename = value.filePath
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
                                    label: 'For active image set from CSV',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: showOpenFileDialog('add-populations-csv', activeImageDirectory, 'csv'),
                                },
                                {
                                    label: 'For active image set from JSON',
                                    enabled: imageLoaded,
                                    click: showOpenFileDialog('add-populations-json', activeImageDirectory, 'json'),
                                },
                            ],
                        },
                    ],
                },
                {
                    label: 'Export',
                    submenu: [
                        {
                            label: 'Image',
                            submenu: [
                                {
                                    label: 'Current image and layers',
                                    enabled: imageLoaded,
                                    click: showSaveFileIpcDialog('export-image', activeImageDirectory, 'png'),
                                },
                            ],
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
                                    click: showOpenDirectoryDialog((dir: string) => {
                                        mainWindow.webContents.send('export-project-mean-intensities', dir)
                                    }, projectDirectory),
                                },
                                {
                                    label: 'Median intensities for project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialog((dir: string) => {
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
                                    click: showOpenDirectoryDialog((dir: string) => {
                                        mainWindow.webContents.send('export-mean-populations-fcs', dir)
                                    }, activeImageDirectory),
                                },
                                {
                                    label: 'Median intensities for all populations in active image set',
                                    enabled: imageLoaded && segmentationLoaded && populationsSelected,
                                    click: showOpenDirectoryDialog((dir: string) => {
                                        mainWindow.webContents.send('export-median-populations-fcs', dir)
                                    }, activeImageDirectory),
                                },
                                {
                                    label: 'Mean intensities for all segments in project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialog((dir: string) => {
                                        mainWindow.webContents.send('export-project-mean-segmentation-to-fcs', dir)
                                    }, projectDirectory),
                                },
                                {
                                    label: 'Median intensities for all segments in project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialog((dir: string) => {
                                        mainWindow.webContents.send('export-project-median-segmentation-to-fcs', dir)
                                    }, projectDirectory),
                                },
                                {
                                    label: 'Mean intensities for all populations in project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialog((dir: string) => {
                                        mainWindow.webContents.send('export-project-mean-populations-fcs', dir)
                                    }, projectDirectory),
                                },
                                {
                                    label: 'Median intensities for all populations in project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialog((dir: string) => {
                                        mainWindow.webContents.send('export-project-median-populations-fcs', dir)
                                    }, projectDirectory),
                                },
                            ],
                        },
                    ],
                },
                {
                    label: 'Quit',
                    click: () => {
                        app.quit()
                    },
                },
            ],
        },
        {
            label: 'Window',
            submenu: [
                {
                    label: 'Open Plot Window',
                    enabled: segmentationLoaded,
                    click: () => {
                        if (plotWindow != null) {
                            plotWindow.show()
                        }
                        if (mainWindow != null) mainWindow.webContents.send('plot-in-main-window', false)
                    },
                },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Open Developer Tools',
                    click: () => {
                        if (mainWindow != null) mainWindow.webContents.openDevTools()
                        if (plotWindow != null) plotWindow.webContents.openDevTools()
                    },
                },
                {
                    label: 'About',
                    click: () => {
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
    let menuTemplate = generateMenuTemplate()
    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)
}

function sendMainWindowSize(): void {
    if (mainWindow != null) {
        let dimensions = mainWindow.getSize()
        mainWindow.webContents.send('window-size', dimensions[0], dimensions[1])
    }
}

function sendPlotWindowSize(): void {
    if (plotWindow != null) {
        let dimensions = plotWindow.getSize()
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

function createMainWindow(): void {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1540,
        height: 740,
        show: false,
        webPreferences: { experimentalFeatures: true, nodeIntegration: true, nodeIntegrationInWorker: true },
    })
    setMenu()

    // TODO: Set to 1280 x 720 when not using DevTools.
    mainWindow.setMinimumSize(1540, 740)

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
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
        closePlotWindow()
    })

    mainWindow.on('ready-to-show', () => {
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
    plotWindow.on('close', function(event: Electron.Event) {
        event.preventDefault()
        if (plotWindow != null) plotWindow.hide()
        if (mainWindow != null) mainWindow.webContents.send('plot-in-main-window', true)
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createMainWindow)
app.on('ready', createPlotWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createMainWindow()
    if (plotWindow === null) createPlotWindow()
})

app.on('before-quit', () => {
    closePlotWindow()
})

//Functions for setting menu flags and regenerating the menu
ipcMain.on('set-image-loaded', (event: Electron.Event, loaded: boolean) => {
    imageLoaded = loaded
    setMenu()
})

ipcMain.on('set-project-loaded', (event: Electron.Event, loaded: boolean) => {
    projectLoaded = loaded
    setMenu()
})

ipcMain.on('set-segmentation-loaded', (event: Electron.Event, loaded: boolean) => {
    segmentationLoaded = loaded
    setMenu()
})

ipcMain.on('set-populations-selected', (event: Electron.Event, selected: boolean) => {
    populationsSelected = selected
    setMenu()
})

ipcMain.on('set-active-image-directory', (event: Electron.Event, directory: string) => {
    activeImageDirectory = directory
    setMenu()
})

ipcMain.on('set-project-directory', (event: Electron.Event, directory: string) => {
    projectDirectory = directory
    setMenu()
})

// Show an error dialog with the message passed in.
ipcMain.on('mainWindow-show-error-dialog', (event: Electron.Event, message: string) => {
    if (mainWindow != null) dialog.showMessageBox(mainWindow, { type: 'error', message: message })
})

// Show a 'remove image set' dialog and tell the main window to remove it if the user approves.
ipcMain.on('mainWindow-show-remove-image-dialog', (event: Electron.Event, message: string) => {
    if (mainWindow != null)
        dialog
            .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
            .then((value: Electron.MessageBoxReturnValue) => {
                if (value.response == 1) {
                    if (mainWindow != null) mainWindow.webContents.send('delete-active-image-set')
                }
            })
})

// Show a 'remove image set' dialog and tell the main window to remove it if the user approves.
ipcMain.on('mainWindow-show-remove-segmentation-dialog', () => {
    if (mainWindow != null) {
        let message =
            "Warning: Clearing segmentation will remove any populations that weren't selected on the image for all image sets. Are you sure you wish to do this?"
        dialog
            .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
            .then((value: Electron.MessageBoxReturnValue) => {
                if (value.response == 1) {
                    if (mainWindow != null) mainWindow.webContents.send('clear-segmentation')
                }
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
    ) => {
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
ipcMain.on('plotWindow-set-markers', (event: Electron.Event, markers: string[]) => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-markers', markers)
})

ipcMain.on('plotWindow-set-statistic', (event: Electron.Event, statistic: any) => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-statistic', statistic)
})

ipcMain.on('plotWindow-set-transform', (event: Electron.Event, transform: any) => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-transform', transform)
})

ipcMain.on('plotWindow-set-type', (event: Electron.Event, type: any) => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-type', type)
})

ipcMain.on('plotWindow-set-dot-size', (event: Electron.Event, size: number) => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-dot-size', size)
})

ipcMain.on('plotWindow-set-normalization', (event: Electron.Event, normalization: any) => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-normalization', normalization)
})

ipcMain.on('plotWindow-add-selected-population', (event: Electron.Event, segmentIds: number[]) => {
    if (mainWindow != null) mainWindow.webContents.send('add-plot-selected-population', segmentIds)
})

ipcMain.on('plotWindow-set-hovered-segments', (event: Electron.Event, segmentIds: number[]) => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-hovered-segments', segmentIds)
})

ipcMain.on('plotWindow-add-population-from-range', (event: Electron.Event, min: number, max: number) => {
    if (mainWindow != null) mainWindow.webContents.send('add-plot-population-from-range', min, max)
})

ipcMain.on('plotWindow-set-coefficient', (event: Electron.Event, coefficient: number) => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-coefficient', coefficient)
})
