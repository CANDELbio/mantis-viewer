/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint @typescript-eslint/no-explicit-any: 0 */

import { Menu, app, dialog, BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'

import * as Store from 'electron-store'
import { autoUpdater } from 'electron-updater'
import * as _ from 'underscore'
import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'

// TODO: Tried to import from FileDefinitions, but generates unwanted .js and .js.map files.
// Would be ideal to import instead of duplicating.
const DbFilename = '.mantisDb'

const openAboutWindow = require('about-window').default
const contextMenu = require('electron-context-menu')
const isDev = require('electron-is-dev')
log.transports.file.level = 'debug'
autoUpdater.logger = log

app.commandLine.appendSwitch('disable-gpu-process-crash-limit')
app.commandLine.appendSwitch('gpu-no-context-lost')
app.commandLine.appendSwitch('force-gpu-mem-available-mb', '9999999')
app.commandLine.appendSwitch('max-active-webgl-contexts', '32')
app.commandLine.appendSwitch('max-decoded-image-size-mb', '1000')
app.commandLine.appendSwitch('enable-zero-copy')

app.disableDomainBlockingFor3DAPIs()

Store.initRenderer()

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

// Checks if the directory is an existing project by checking if a Mantis DB has been created
function isExistingProject(dir: string): boolean {
    const dbFile = path.join(dir, DbFilename)
    return fs.existsSync(dbFile)
}

const openImageSet = (path: string): void => {
    if (mainWindow != null) {
        if (imageLoaded || projectLoaded) {
            const message =
                'The current open image(s) will be closed if you open a new image. Are you sure you want to do this?'
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

const openProject = (dir: string): void => {
    if (mainWindow != null) {
        if (isExistingProject(dir)) {
            if (imageLoaded || projectLoaded) {
                const message =
                    'The current open image(s) will be closed if you open a different project. Are you sure you want to do this?'
                dialog
                    .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
                    .then((value: Electron.MessageBoxReturnValue): void => {
                        if (value.response == 1) {
                            if (mainWindow != null) mainWindow.webContents.send('open-project', dir)
                        }
                    })
            } else {
                mainWindow.webContents.send('open-project', dir)
            }
        } else {
            const message =
                'No existing project found in the selected directory. Do you want to open it as a new project?'
            dialog
                .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
                .then((value: Electron.MessageBoxReturnValue): void => {
                    if (value.response == 1) {
                        if (mainWindow != null) {
                            mainWindow.webContents.send('set-project-import-modal-visibility', true)
                            mainWindow.webContents.send('project-import-set-directory', dir)
                        }
                    }
                })
        }
    }
}

const openSegmentation = (dir: string): void => {
    if (mainWindow != null) {
        if (segmentationLoaded) {
            const message =
                "Warning: Opening a new segmentation file will delete all segment features from the database and remove any populations that weren't selected on the image for all images. Are you sure you want to do this?"
            dialog
                .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
                .then((value: Electron.MessageBoxReturnValue): void => {
                    if (value.response == 1) {
                        if (mainWindow != null) mainWindow.webContents.send('open-segmentation-file', dir)
                    }
                })
        } else {
            mainWindow.webContents.send('open-segmentation-file', dir)
        }
    }
}

function showOpenDirectoryDialogCallback(callback: (value: string) => void, defaultPath?: string): () => void {
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

function showOpenFileDialogCallback(
    action: string | ((value: string) => void),
    name: string,
    defaultPath?: string,
    fileType?: string[],
): () => void {
    const dialogOptions: Electron.OpenDialogOptions = { properties: ['openFile'] }
    if (defaultPath != undefined) dialogOptions.defaultPath = defaultPath
    if (fileType != undefined) dialogOptions.filters = [{ name: name, extensions: fileType }]
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
            if (mainWindow != null && filename != null && filename != '')
                mainWindow.webContents.send(ipcMessageName, filename)
        })
    }
}

function imageExportDefaultFilePath(): string | undefined {
    if (activeImageDirectory) {
        return path.join(path.dirname(activeImageDirectory), path.basename(activeImageDirectory) + '.png')
    } else {
        return undefined
    }
}

const generateMenuTemplate = (): Electron.MenuItemConstructorOptions[] => {
    return [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open',
                    submenu: [
                        {
                            label: 'New Project',
                            click: (): void => {
                                if (mainWindow != null)
                                    mainWindow.webContents.send('set-project-import-modal-visibility', true)
                            },
                        },
                        {
                            label: 'Existing Project',
                            click: showOpenDirectoryDialogCallback(openProject),
                        },
                        {
                            label: 'Image',
                            click: showOpenDirectoryDialogCallback(openImageSet),
                        },
                    ],
                },
                {
                    label: 'Import',
                    submenu: [
                        {
                            label: 'Segmentation',
                            enabled: imageLoaded,
                            click: showOpenFileDialogCallback(
                                openSegmentation,
                                'Select Segmentation File',
                                activeImageDirectory,
                                ['tif', 'tiff', 'csv', 'txt'],
                            ),
                        },
                        {
                            label: 'Regions from TIFF',
                            enabled: imageLoaded,
                            click: showOpenFileDialogCallback(
                                'add-region-tiff',
                                'Select Region File',
                                activeImageDirectory,
                                ['tif', 'tiff'],
                            ),
                        },
                        {
                            label: 'Populations',
                            submenu: [
                                {
                                    label: 'For active image from CSV',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: showOpenFileDialogCallback(
                                        'add-populations-csv',
                                        'Select Population CSV',
                                        activeImageDirectory,
                                        ['csv', 'txt'],
                                    ),
                                },
                                {
                                    label: 'For project from single CSV',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenFileDialogCallback(
                                        'add-project-populations-csv',
                                        'Select Population CSV',
                                        activeImageDirectory,
                                        ['csv', 'txt'],
                                    ),
                                },
                            ],
                        },
                        {
                            label: 'Segment Features',
                            enabled: segmentationLoaded,
                            submenu: [
                                {
                                    label: 'For active image from CSV',
                                    enabled: segmentationLoaded,
                                    click: showOpenFileDialogCallback(
                                        'import-active-segment-features',
                                        'Select Segment Feature CSV',
                                        activeImageDirectory,
                                        ['csv', 'txt'],
                                    ),
                                },
                                {
                                    label: 'For project from CSV',
                                    enabled: projectLoaded && segmentationLoaded,
                                    click: showOpenFileDialogCallback(
                                        'import-project-segment-features',
                                        'Select Segment Feature CSV',
                                        activeImageDirectory,
                                        ['csv', 'txt'],
                                    ),
                                },
                            ],
                        },
                        {
                            label: 'Channel Marker Mappings from CSV',
                            enabled: segmentationLoaded,
                            click: showOpenFileDialogCallback(
                                'import-channel-marker-mappings-csv',
                                'Select Channel Marker Mappings CSV',
                                projectDirectory,
                                ['csv', 'txt'],
                            ),
                        },
                        {
                            label: 'Gates from CSV',
                            enabled: imageLoaded && segmentationLoaded,
                            click: showOpenFileDialogCallback(
                                'add-gates-csv',
                                'Select Gates CSV',
                                activeImageDirectory,
                                ['csv', 'txt'],
                            ),
                        },
                    ],
                },
                {
                    label: 'Export',
                    submenu: [
                        {
                            label: 'Image and layers to PNG',
                            enabled: imageLoaded,
                            click: showSaveFileIpcDialog('export-image', imageExportDefaultFilePath(), 'png'),
                        },
                        {
                            label: 'Regions to TIFF',
                            enabled: imageLoaded && populationsSelected,
                            click: showSaveFileIpcDialog('export-populations-tiff', activeImageDirectory, 'tiff'),
                        },
                        {
                            label: 'Populations',
                            submenu: [
                                {
                                    label: 'For active image to CSV',
                                    enabled: imageLoaded && populationsSelected,
                                    click: showSaveFileIpcDialog('export-populations-csv', activeImageDirectory, 'csv'),
                                },
                                {
                                    label: 'For project to single CSV',
                                    enabled: projectLoaded && imageLoaded && populationsSelected,
                                    click: showSaveFileIpcDialog(
                                        'export-project-populations-csv',
                                        activeImageDirectory,
                                        'csv',
                                    ),
                                },
                            ],
                        },
                        {
                            label: 'Segment features to CSV',
                            submenu: [
                                {
                                    label: 'For active image',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: showSaveFileIpcDialog(
                                        'export-segment-features',
                                        activeImageDirectory,
                                        'csv',
                                    ),
                                },
                                {
                                    label: 'For project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialogCallback((dir: string): void => {
                                        if (mainWindow != null)
                                            mainWindow.webContents.send('export-project-segment-features', dir)
                                    }, projectDirectory),
                                },
                            ],
                        },
                        {
                            label: 'Segment features to FCS',
                            submenu: [
                                {
                                    label: 'For all segments in active image',
                                    enabled: imageLoaded && segmentationLoaded,
                                    click: showSaveFileIpcDialog('export-segments-to-fcs', activeImageDirectory, 'fcs'),
                                },
                                {
                                    label: 'For all segments in project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialogCallback((dir: string): void => {
                                        if (mainWindow != null)
                                            mainWindow.webContents.send('export-project-segments-to-fcs', dir)
                                    }, projectDirectory),
                                },
                                {
                                    label: 'For all populations in active image',
                                    enabled: imageLoaded && segmentationLoaded && populationsSelected,
                                    click: showOpenDirectoryDialogCallback((dir: string): void => {
                                        if (mainWindow != null)
                                            mainWindow.webContents.send('export-populations-fcs', dir)
                                    }, activeImageDirectory),
                                },
                                {
                                    label: 'For all populations in project',
                                    enabled: projectLoaded && imageLoaded && segmentationLoaded,
                                    click: showOpenDirectoryDialogCallback((dir: string): void => {
                                        if (mainWindow != null)
                                            mainWindow.webContents.send('export-project-populations-fcs', dir)
                                    }, projectDirectory),
                                },
                            ],
                        },
                        {
                            label: 'Channel Marker Mappings to CSV',
                            enabled: imageLoaded && segmentationLoaded,
                            click: showSaveFileIpcDialog('export-channel-marker-mappings-csv', projectDirectory, 'csv'),
                        },
                    ],
                },
                {
                    label: 'Calculate',
                    submenu: [
                        {
                            label: 'Segment features for active image',
                            enabled: imageLoaded && segmentationLoaded,
                            click: (): void => {
                                if (mainWindow != null) mainWindow.webContents.send('calculate-segment-features')
                            },
                        },
                        {
                            label: 'Segment features for project',
                            enabled: imageLoaded && segmentationLoaded,
                            click: (): void => {
                                if (mainWindow != null)
                                    mainWindow.webContents.send('calculate-project-segment-features')
                            },
                        },
                    ],
                },
                {
                    label: 'Clear',
                    submenu: [
                        {
                            label: 'Segmentation',
                            enabled: imageLoaded && segmentationLoaded,
                            click: (): void => {
                                if (mainWindow != null) {
                                    const message =
                                        "Warning: Clearing segmentation will delete all segment features from the database and remove any populations that weren't selected on the image for all images. Are you sure you want to do this?"
                                    dialog
                                        .showMessageBox(mainWindow, {
                                            type: 'warning',
                                            message: message,
                                            buttons: ['No', 'Yes'],
                                        })
                                        .then((value: Electron.MessageBoxReturnValue): void => {
                                            if (value.response == 1) {
                                                if (mainWindow != null)
                                                    mainWindow.webContents.send('clear-segmentation')
                                            }
                                        })
                                }
                            },
                        },
                        {
                            label: 'Populations for Active Image',
                            enabled: imageLoaded,
                            click: (): void => {
                                if (mainWindow != null) {
                                    const message =
                                        'Are you sure you want to delete all of the populations on the active image?'
                                    dialog
                                        .showMessageBox(mainWindow, {
                                            type: 'warning',
                                            message: message,
                                            buttons: ['No', 'Yes'],
                                        })
                                        .then((value: Electron.MessageBoxReturnValue): void => {
                                            if (value.response == 1) {
                                                if (mainWindow != null)
                                                    mainWindow.webContents.send('clear-active-populations')
                                            }
                                        })
                                }
                            },
                        },
                        {
                            label: 'Populations for Project',
                            enabled: imageLoaded,
                            click: (): void => {
                                if (mainWindow != null) {
                                    const message =
                                        'Are you sure you want to delete all of the populations in the project?'
                                    dialog
                                        .showMessageBox(mainWindow, {
                                            type: 'warning',
                                            message: message,
                                            buttons: ['No', 'Yes'],
                                        })
                                        .then((value: Electron.MessageBoxReturnValue): void => {
                                            if (value.response == 1) {
                                                if (mainWindow != null)
                                                    mainWindow.webContents.send('clear-all-populations')
                                            }
                                        })
                                }
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
                    label: 'Full Screen Viewer',
                    enabled: imageLoaded,
                    click: (): void => {
                        if (mainWindow != null)
                            mainWindow.webContents.sendInputEvent({
                                keyCode: 'f',
                                type: 'keyDown',
                                modifiers: ['alt'],
                            })
                    },
                },
                {
                    label: 'Pop Out Plot Window',
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
                    role: 'undo',
                },
                {
                    label: 'Redo',
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    role: 'redo',
                },
                {
                    type: 'separator',
                },
                {
                    label: 'Cut',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut',
                },
                {
                    label: 'Copy',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy',
                },
                {
                    label: 'Paste',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste',
                },
                {
                    label: 'Select All',
                    accelerator: 'CmdOrCtrl+A',
                    role: 'selectAll',
                },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Keyboard Shortcuts',
                    click: (): void => {
                        if (mainWindow != null) mainWindow.webContents.send('toggle-shortcut-modal', false)
                    },
                },
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
                            icon_path: path.join(__dirname, '..', 'icon.png'),
                            use_version_info: true,
                            license: 'GPLv3',
                            product_name: 'Mantis Viewer',
                            // Have to manually set the about-window base path so it plays nicely with webpack.
                            about_page_dir: path.join(__dirname, '..', 'node_modules', 'about-window'),
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

const sendMainWindowSize = (): void => {
    if (mainWindow != null) {
        const dimensions = mainWindow.getSize()
        mainWindow.webContents.send('window-size', dimensions[0], dimensions[1])
    }
}

const sendPlotWindowSize = (): void => {
    if (plotWindow != null) {
        const dimensions = plotWindow.getSize()
        plotWindow.webContents.send('window-size', dimensions[0], dimensions[1])
    }
}

// Need to remove the event listener for close that prevents the default close
// Otherwise the window will never be destroyed and the application cannot exit.
const closePlotWindow = (): void => {
    if (plotWindow != null) {
        plotWindow.removeAllListeners('close')
        plotWindow.close()
        plotWindow = null
    }
}

const closePreferencesWindow = (): void => {
    if (preferencesWindow != null) {
        preferencesWindow.removeAllListeners('close')
        preferencesWindow.close()
        preferencesWindow = null
    }
}

function registerOnReadyLoadEventHandler(window: BrowserWindow, readyFn?: (window: BrowserWindow) => void): void {
    window.webContents.once('dom-ready', () => {
        if (readyFn) readyFn(window)
        if (isDev) {
            contextMenu({ showInspectElement: true })
            window.webContents.openDevTools()
            window.webContents.on('devtools-opened', () => {
                window.focus()
            })
        }
    })
}

function initializeMainWindow(width?: number, height?: number): BrowserWindow {
    const newWindow = new BrowserWindow({
        width: width ? width : 1540,
        height: height ? height : 900,
        show: false,
        webPreferences: {
            experimentalFeatures: true,
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            contextIsolation: false,
        },
    })

    newWindow.setMinimumSize(1540, 900)

    // and load the index.html of the app.
    newWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'mainWindow.html'),
            protocol: 'file:',
            slashes: true,
        }),
    )

    const readyFn = (window: BrowserWindow) => {
        window.webContents.send('set-app-version', app.getVersion())
    }

    // Open the DevTools.
    registerOnReadyLoadEventHandler(newWindow, readyFn)
    return newWindow
}

const registerMainWindowEvents = (): void => {
    if (mainWindow) {
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
    }
}

const createMainWindow = (): void => {
    mainWindow = initializeMainWindow()
    setMenu()
    registerMainWindowEvents()
    // Don't let this window open other new windows.
    // Stops command clicking on empty links from opening new windows.
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' }
    })
    mainWindow.on('ready-to-show', (): void => {
        if (mainWindow != null) mainWindow.show()
    })
}

const createPlotWindow = (): void => {
    plotWindow = new BrowserWindow({
        width: 800,
        height: 800,
        show: false,
        webPreferences: {
            experimentalFeatures: true,
            nodeIntegration: true,
            nodeIntegrationInWorker: false,
            contextIsolation: false,
        },
    })

    plotWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'plotWindow.html'),
            protocol: 'file:',
            slashes: true,
        }),
    )

    registerOnReadyLoadEventHandler(plotWindow)

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
        height: 785,
        resizable: false,
        show: false,
        webPreferences: {
            experimentalFeatures: true,
            nodeIntegration: true,
            nodeIntegrationInWorker: false,
            contextIsolation: false,
        },
    })

    preferencesWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, 'preferencesWindow.html'),
            protocol: 'file:',
            slashes: true,
        }),
    )

    registerOnReadyLoadEventHandler(preferencesWindow)

    // Instead of destroying and recreating the plot window, we just hide/show it (unless the application is exited).
    preferencesWindow.on('close', function (event: Electron.Event): void {
        event.preventDefault()
        if (preferencesWindow != null) preferencesWindow.hide()
    })
}

const createWindows = (): void => {
    createMainWindow()
    createPlotWindow()
    createPreferencesWindow()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    createWindows()
    autoUpdater.checkForUpdatesAndNotify()
})

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

// Show an info dialog with the message passed in.
ipcMain.on('mainWindow-show-info-dialog', (event: Electron.Event, message: string): void => {
    if (mainWindow != null) dialog.showMessageBox(mainWindow, { type: 'info', message: message })
})

// Show a 'remove image' dialog and tell the main window to remove it if the user approves.
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

ipcMain.on('mainWindow-show-calculate-segment-features-dialog', (): void => {
    if (mainWindow != null) {
        const options = {
            type: 'question',
            buttons: ['Yes', 'No'],
            defaultId: 0,
            message: 'Do you want Mantis to calculate mean and median segment intensities?',
            detail: 'If you select no you will not be able to generate plots until you have loaded your own features.',
        }
        dialog.showMessageBox(mainWindow, options).then((value: Electron.MessageBoxReturnValue) => {
            if (mainWindow != null)
                mainWindow.webContents.send('set-auto-calculate-segment-features', value.response == 0)
        })
    }
})

// TODO: Combine with 'mainWindow-show-continue-importing-segment-features-dialog' to DRY up.
ipcMain.on('mainWindow-show-continue-calculating-segment-features-dialog', (): void => {
    if (mainWindow != null) {
        const options = {
            type: 'question',
            buttons: ['Yes', 'No'],
            defaultId: 0,
            message:
                'Segment features are present in the database with the same names that Mantis uses. Do you want Mantis to continue calculating and overwrite these existing features?',
        }
        dialog.showMessageBox(mainWindow, options).then((value: Electron.MessageBoxReturnValue) => {
            if (mainWindow != null)
                mainWindow.webContents.send('continue-calculating-segment-features', value.response == 0)
        })
    }
})

ipcMain.on('mainWindow-show-continue-importing-segment-features-dialog', (): void => {
    if (mainWindow != null) {
        const options = {
            type: 'question',
            buttons: ['Yes', 'No'],
            defaultId: 0,
            message:
                'Segment features are present in the database with the same names that are being imported. Do you want Mantis to continue importing and overwrite these existing features?',
        }
        dialog.showMessageBox(mainWindow, options).then((value: Electron.MessageBoxReturnValue) => {
            if (mainWindow != null)
                mainWindow.webContents.send(
                    'continue-segment-feature-import',
                    value.response == 0,
                    value.checkboxChecked,
                )
        })
    }
})

ipcMain.on('mainWindow-show-calculate-features-for-plot-dialog', (): void => {
    if (mainWindow != null) {
        const options = {
            type: 'question',
            buttons: ['Yes', 'No'],
            defaultId: 0,
            message: 'Do you want to calculate segment intensities for all images for the plot?',
            detail: 'If you select no you will not be able to view data for all images on the plot. If you change your mind you can manually calculate the intensities from the menu.',
        }
        dialog.showMessageBox(mainWindow, options).then((value: Electron.MessageBoxReturnValue): void => {
            if (value.response == 0) {
                if (mainWindow != null) mainWindow.webContents.send('calculate-project-segment-features')
            }
        })
    }
})

ipcMain.on('mainWindow-ask-calculate-features', (event: Electron.Event, channel: string, dir: string): void => {
    if (mainWindow != null) {
        const options = {
            type: 'question',
            buttons: ['Yes', 'No'],
            defaultId: 0,
            title: 'Question',
            message:
                'Not all images have segment features present in the database. Do you want to calculate mean and median features for images missing features before exporting?',
            detail: 'These features will also be available in the plot once data has been exported',
        }
        dialog.showMessageBox(mainWindow, options).then((value: Electron.MessageBoxReturnValue) => {
            if (mainWindow != null) mainWindow.webContents.send(channel, dir, value.response == 0)
        })
    }
})

// Functions to relay data from the mainWindow to the plotWindow
ipcMain.on(
    'mainWindow-set-plot-data',
    (
        event: Electron.Event,
        selectOptions: { value: string; label: string }[],
        plotFeatures: string[],
        statistic: string,
        transform: string,
        type: string,
        normalization: string,
        size: number,
        coefficient: number,
        plotAllImageSets: boolean,
        collapseAllImageSets: boolean,
        downsample: boolean,
        downsamplePercent: number,
        numHistogramBins: number,
        xLogScale: boolean,
        yLogScale: boolean,
        hiddenPopulations: string[],
        plotData: any,
    ): void => {
        if (plotWindow != null)
            plotWindow.webContents.send(
                'set-plot-data',
                selectOptions,
                plotFeatures,
                statistic,
                transform,
                type,
                normalization,
                size,
                coefficient,
                projectLoaded,
                plotAllImageSets,
                collapseAllImageSets,
                downsample,
                downsamplePercent,
                numHistogramBins,
                xLogScale,
                yLogScale,
                hiddenPopulations,
                plotData,
            )
    },
)

// Functions to relay data from the plotWindow to the mainWindow
ipcMain.on('plotWindow-set-features', (event: Electron.Event, features: string[]): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-features', features)
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

ipcMain.on('plotWindow-set-plot-all-image-sets', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-all-image-sets', value)
})

ipcMain.on('plotWindow-set-collapse-all-image-sets', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-collapse-all-image-sets', value)
})

ipcMain.on('plotWindow-set-plot-downsample', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-downsample', value)
})

ipcMain.on('plotWindow-set-plot-downsample-percent', (event: Electron.Event, value: number): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-downsample-percent', value)
})

ipcMain.on('plotWindow-set-plot-num-histogram-bins', (event: Electron.Event, value: number): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-num-histogram-bins', value)
})

ipcMain.on('plotWindow-set-x-log-scale', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-x-log-scale', value)
})

ipcMain.on('plotWindow-set-y-log-scale', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-plot-y-log-scale', value)
})

ipcMain.on('plotWindow-update-hidden-population', (event: Electron.Event, value: string): void => {
    if (mainWindow != null) mainWindow.webContents.send('update-plot-hidden-population', value)
})

// Functions to relay data from the mainWindow to the preferencesWindow
ipcMain.on(
    'mainWindow-set-preferences',
    (
        event: Electron.Event,
        maxImageSets: number,
        blurPixels: boolean,
        calculateFeatures: boolean,
        defaultSegmentation: string | null,
        markers: any,
        domains: any,
        anyChannel: any,
        scaleChannelDomainValues: boolean,
        maintainImageScale: boolean,
        optimizeSegmentation: boolean,
        reloadOnError: boolean,
    ): void => {
        if (preferencesWindow != null)
            preferencesWindow.webContents.send(
                'set-preferences',
                maxImageSets,
                blurPixels,
                calculateFeatures,
                defaultSegmentation,
                markers,
                domains,
                anyChannel,
                scaleChannelDomainValues,
                maintainImageScale,
                optimizeSegmentation,
                reloadOnError,
            )
    },
)

// Functions to relay data from the preferencesWindow to the mainWindow
ipcMain.on('preferencesWindow-set-max-image-sets', (event: Electron.Event, max: number): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-max-image-sets', max)
})

ipcMain.on('preferencesWindow-set-blur-pixels', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-blur-pixels', value)
})

ipcMain.on('preferencesWindow-set-calculate-features', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-calculate-features', value)
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

ipcMain.on('preferencesWindow-set-scale-channel-domain-values', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-scale-channel-domain-values', value)
})

ipcMain.on('preferencesWindow-set-maintain-image-scale', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-maintain-image-scale', value)
})

ipcMain.on('preferencesWindow-set-optimize-segmentation', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-optimize-segmentation', value)
})

ipcMain.on('preferencesWindow-set-reload-on-error', (event: Electron.Event, value: boolean): void => {
    if (mainWindow != null) mainWindow.webContents.send('set-reload-on-error', value)
})

ipcMain.on('mainWindow-show-project-import-directory-picker', (): void => {
    showOpenDirectoryDialogCallback((directory: string) => {
        if (mainWindow != null) {
            if (isExistingProject(directory)) {
                const message =
                    'The selected directory contains an existing Mantis project. Do you want to reinitialize it or open it as an existing project?'
                const detail =
                    'If you choose to reinitialize any populations and features in the existing project will be lost.'
                dialog
                    .showMessageBox(mainWindow, {
                        type: 'warning',
                        message: message,
                        detail: detail,
                        buttons: ['Reinitialize', 'Open As Existing'],
                    })
                    .then((value: Electron.MessageBoxReturnValue): void => {
                        if (value.response == 1) {
                            if (mainWindow != null) {
                                mainWindow.webContents.send('set-project-import-modal-visibility', false)
                                mainWindow.webContents.send('open-project', directory)
                            }
                        } else {
                            if (mainWindow != null)
                                mainWindow.webContents.send('project-import-set-directory', directory)
                        }
                    })
            } else {
                mainWindow.webContents.send('project-import-set-directory', directory)
            }
        }
    })()
})

ipcMain.on('mainWindow-check-import-project', (): void => {
    if (mainWindow != null) {
        const message =
            'The current open image(s) will be closed if you open a new project. Are you sure you want to do this?'
        dialog
            .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
            .then((value: Electron.MessageBoxReturnValue): void => {
                if (value.response == 1) {
                    if (mainWindow != null) mainWindow.webContents.send('continue-project-import')
                }
            })
    }
})

ipcMain.on('mainWindow-check-cancel', (): void => {
    if (mainWindow != null) {
        const message = 'Are you sure you want to cancel?'
        dialog
            .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
            .then((value: Electron.MessageBoxReturnValue): void => {
                if (mainWindow != null) mainWindow.webContents.send('cancel-response', value.response == 1)
            })
    }
})

ipcMain.on('mainWindow-check-delete-population', (event: Electron.Event, name: string, id: string): void => {
    if (mainWindow != null) {
        const message = `Are you sure you want to delete the population ${name}?`
        dialog
            .showMessageBox(mainWindow, { type: 'warning', message: message, buttons: ['No', 'Yes'] })
            .then((value: Electron.MessageBoxReturnValue): void => {
                if (mainWindow != null && value.response == 1) mainWindow.webContents.send('delete-population', id)
            })
    }
})

ipcMain.on('mainWindow-reload', (): void => {
    const oldMainWindow = mainWindow
    if (oldMainWindow) {
        const projectWasLoaded = projectLoaded
        const oldProjectDirectory = projectDirectory
        const imageWasLoaded = imageLoaded
        const oldImageDirectory = activeImageDirectory

        // Reset global variables to keep track of what's going on in the mainWindow.
        projectLoaded = false
        imageLoaded = false
        segmentationLoaded = false
        populationsSelected = false

        const mainWindowDimensions = oldMainWindow.getSize()
        mainWindow = initializeMainWindow(mainWindowDimensions[0], mainWindowDimensions[1])
        setMenu()
        registerMainWindowEvents()

        const message = 'Mantis has encountered an error and will restart.'
        dialog.showMessageBox(oldMainWindow, { type: 'error', message: message }).then((): void => {
            oldMainWindow.removeAllListeners()
            oldMainWindow.destroy()
            if (mainWindow) {
                mainWindow.show()
                if (projectWasLoaded) {
                    mainWindow.webContents.send('open-project', oldProjectDirectory)
                } else if (imageWasLoaded) {
                    mainWindow.webContents.send('open-image-set', oldImageDirectory)
                }
            }
        })
    }
})
