/* eslint @typescript-eslint/camelcase: 0 */
/* eslint @typescript-eslint/no-explicit-any: 0 */

import { Menu, app, dialog, BrowserWindow, ipcMain } from 'electron'
import * as _ from 'underscore'

import path = require('path')
import url = require('url')
const openAboutWindow = require('about-window').default

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: Electron.BrowserWindow | null
let plotWindow: Electron.BrowserWindow | null

// The current active image directory. Used to set default directories for menu items.
let activeImageDirectory: string | undefined

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
                            click: () => {
                                dialog.showOpenDialog({ properties: ['openDirectory'] }, (dirName: string[]) => {
                                    if (mainWindow != null && dirName != null) {
                                        openImageSet(dirName[0])
                                    }
                                })
                            },
                        },
                        {
                            label: 'Project',
                            click: () => {
                                dialog.showOpenDialog({ properties: ['openDirectory'] }, (dirName: string[]) => {
                                    if (mainWindow != null && dirName != null) {
                                        openProject(dirName[0])
                                    }
                                })
                            },
                        },
                    ],
                },
                {
                    label: 'Import',
                    submenu: [
                        {
                            label: 'Segmentation',
                            enabled: imageLoaded,
                            click: () => {
                                dialog.showOpenDialog(
                                    { properties: ['openFile'], defaultPath: activeImageDirectory },
                                    (fileNames: string[]) => {
                                        if (mainWindow != null && fileNames != null) {
                                            mainWindow.webContents.send('open-segmentation-file', fileNames[0])
                                        }
                                    },
                                )
                            },
                        },
                        {
                            label: 'Populations',
                            submenu: [
                                {
                                    label: 'For active image set from CSV',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: () => {
                                        dialog.showOpenDialog(
                                            {
                                                properties: ['openFile'],
                                                defaultPath: activeImageDirectory,
                                                filters: [{ name: 'csv', extensions: ['csv'] }],
                                            },
                                            (fileNames: string[]) => {
                                                if (mainWindow != null && fileNames != null)
                                                    mainWindow.webContents.send('add-populations-csv', fileNames[0])
                                            },
                                        )
                                    },
                                },
                                {
                                    label: 'For active image set from JSON',
                                    enabled: imageLoaded,
                                    click: () => {
                                        dialog.showOpenDialog(
                                            {
                                                properties: ['openFile'],
                                                defaultPath: activeImageDirectory,
                                                filters: [{ name: 'json', extensions: ['json'] }],
                                            },
                                            (fileNames: string[]) => {
                                                if (mainWindow != null && fileNames != null)
                                                    mainWindow.webContents.send('add-populations-json', fileNames[0])
                                            },
                                        )
                                    },
                                },
                            ],
                        },
                    ],
                },
                {
                    label: 'Export',
                    submenu: [
                        {
                            label: 'Populations',
                            submenu: [
                                {
                                    label: 'For active image set to JSON',
                                    enabled: imageLoaded && populationsSelected,
                                    click: () => {
                                        dialog
                                            .showSaveDialog({
                                                filters: [{ name: 'json', extensions: ['json'] }],
                                                defaultPath: activeImageDirectory,
                                            })
                                            .then((value: Electron.SaveDialogReturnValue) => {
                                                let filename = value.filePath
                                                if (mainWindow != null && filename != null)
                                                    mainWindow.webContents.send('export-populations-json', filename)
                                            })
                                    },
                                },
                                {
                                    label: 'For active image set to CSV',
                                    enabled: imageLoaded && populationsSelected,
                                    click: () => {
                                        dialog
                                            .showSaveDialog({
                                                filters: [{ name: 'csv', extensions: ['csv'] }],
                                                defaultPath: activeImageDirectory,
                                            })
                                            .then((value: Electron.SaveDialogReturnValue) => {
                                                let filename = value.filePath
                                                if (mainWindow != null && filename != null)
                                                    mainWindow.webContents.send('export-populations-csv', filename)
                                            })
                                    },
                                },
                            ],
                        },
                        {
                            label: 'Summary Statistics',
                            submenu: [
                                {
                                    label: 'Mean intensities for active image set',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: () => {
                                        dialog
                                            .showSaveDialog({ filters: [{ name: 'csv', extensions: ['csv'] }] })
                                            .then((value: Electron.SaveDialogReturnValue) => {
                                                let filename = value.filePath
                                                if (mainWindow != null && filename != null)
                                                    mainWindow.webContents.send('export-mean-intensities', filename)
                                            })
                                    },
                                },
                                {
                                    label: 'Median intensities for active image set',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: () => {
                                        dialog
                                            .showSaveDialog({ filters: [{ name: 'csv', extensions: ['csv'] }] })
                                            .then((value: Electron.SaveDialogReturnValue) => {
                                                let filename = value.filePath
                                                if (mainWindow != null && filename != null)
                                                    mainWindow.webContents.send('export-median-intensities', filename)
                                            })
                                    },
                                },
                            ],
                        },
                        {
                            label: 'Image',
                            submenu: [
                                {
                                    label: 'Current image and layers',
                                    enabled: imageLoaded,
                                    click: () => {
                                        dialog
                                            .showSaveDialog({ filters: [{ name: 'png', extensions: ['png'] }] })
                                            .then((value: Electron.SaveDialogReturnValue) => {
                                                let filename = value.filePath
                                                if (mainWindow != null && filename != null)
                                                    mainWindow.webContents.send('export-image', filename)
                                            })
                                    },
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
                        if (plotWindow != null) plotWindow.show()
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

function sendWindowSize(): void {
    if (mainWindow != null) {
        let dimensions = mainWindow.getSize()
        mainWindow.webContents.send('window-size', dimensions[0], dimensions[1])
    }
    if (plotWindow != null) {
        let dimensions = plotWindow.getSize()
        plotWindow.webContents.send('window-size', dimensions[0], dimensions[1])
    }
}

function setMenu(): void {
    let menuTemplate = generateMenuTemplate()
    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)
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
    if (debugging()) mainWindow.webContents.openDevTools()

    // Use throttle so that when we resize we only send the window size every 333 ms
    mainWindow.on('resize', _.throttle(sendWindowSize, 333))
    mainWindow.on('enter-full-screen', sendWindowSize)
    mainWindow.on('leave-full-screen', sendWindowSize)

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
        sendWindowSize()
    })
}

function createPlotWindow(): void {
    plotWindow = new BrowserWindow({
        width: 800,
        height: 800,
        show: false,
        webPreferences: { experimentalFeatures: true, nodeIntegrationInWorker: false },
    })

    plotWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'app', 'plotWindow.html'),
            protocol: 'file:',
            slashes: true,
        }),
    )

    if (debugging()) plotWindow.webContents.openDevTools()

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

// Show an error dialog with the message passed in.
ipcMain.on('mainWindow-show-error-dialog', (event: Electron.Event, message: string) => {
    if (mainWindow != null) dialog.showMessageBox(mainWindow, { type: 'error', message: message })
})

// Show a 'remove image set' dialog and tell the main window to remove it if the user approves.
ipcMain.on('mainWindow-show-remove-dialog', (event: Electron.Event, message: string) => {
    if (mainWindow != null)
        dialog
            .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
            .then((value: Electron.MessageBoxReturnValue) => {
                if (value.response == 1) {
                    if (mainWindow != null) mainWindow.webContents.send('delete-active-image-set')
                }
            })
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
