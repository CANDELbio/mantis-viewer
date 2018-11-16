import {Menu, app, dialog, BrowserWindow, ipcMain} from "electron"
import * as _ from "underscore"

const path = require('path')
const url = require('url')
const isDev = require('electron-is-dev');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: Electron.BrowserWindow | null
let plotWindow: Electron.BrowserWindow | null

// The current active image directory. Used to set default directories for menu items.
let activeImageDirectory: string | undefined
// Whether or not an image is loaded. Used to enable/disable menu items that require an image to be loaded.
let imageLoaded = false

function generateMenuTemplate() {
  return [{
    label: "File",
    submenu: [
    {
      label: "Open",
      submenu:  [
        {
          label: "Folder",
          click: () => {
            dialog.showOpenDialog({properties: ["openDirectory"]}, (dirName:string[]) => {
              if(mainWindow != null && dirName != null){
                mainWindow.webContents.send("open-directory", dirName[0])
                // Send the window size when loading a new directory so the PIXI stage resizes to fit the window.
                sendWindowSize()
              }
            })
          }
        },
        {
          label: "Project",
          click: () => {
            dialog.showOpenDialog({properties: ["openDirectory"]}, (dirName:string[]) => {
              if(mainWindow != null && dirName != null){
                mainWindow.webContents.send("open-project", dirName[0])
                // Send the window size when loading a new directory so the PIXI stage resizes to fit the window.
                sendWindowSize()
              }
            })
          }
        }
      ]
    },
    {
      label: "Import",
      submenu: [
        {
          label: "Segmentation",
          submenu: [
            {
              label: "For active image set",
              enabled: imageLoaded,
              click: () => {
                dialog.showOpenDialog({properties: ["openFile"], defaultPath: activeImageDirectory},  (fileNames:string[]) => {
                  if(mainWindow != null && fileNames != null){
                    mainWindow.webContents.send("open-segmentation-file", fileNames[0])
                  }
                })
              }
            }
          ]
        },
        {
          label: "Populations",
          submenu: [
            {
              label: "For active image set from CSV",
              enabled: imageLoaded,
              click: () => {
                dialog.showOpenDialog({properties: ["openFile"], defaultPath: activeImageDirectory, filters: [{ name: 'csv', extensions: ['csv'] }]},
                (fileNames:string[]) => {
                  if(mainWindow != null && fileNames != null)
                    mainWindow.webContents.send("add-populations-csv", fileNames[0])
                })
              }
            },
            {
              label: "For active image set from JSON",
              enabled: imageLoaded,
              click: () => {
                dialog.showOpenDialog({properties: ["openFile"], defaultPath: activeImageDirectory, filters: [{ name: 'json', extensions: ['json'] }]},
                (fileNames:string[]) => {
                  if(mainWindow != null && fileNames != null)
                    mainWindow.webContents.send("import-active-selected-populations", fileNames[0])
                })
              }
            },
            {
              label: "For all image sets from JSON",
              enabled: imageLoaded,
              click: () => {
                dialog.showOpenDialog({properties: ["openFile"], defaultPath: activeImageDirectory, filters: [{ name: 'json', extensions: ['json'] }]},
                (fileNames:string[]) => {
                  if(mainWindow != null && fileNames != null)
                    mainWindow.webContents.send("import-all-selected-populations", fileNames[0])
                })
              }
            }
          ]
        }
      ]
    },
    {
      label: "Export",
      submenu: [
        {
          label: "Populations",
          submenu: [
            {
              label: "For active image set to JSON",
              enabled: imageLoaded,
              click: () => {
                dialog.showSaveDialog({filters: [{ name: 'json', extensions: ['json'] }], defaultPath: activeImageDirectory},
                (filename:string) => {
                  if(mainWindow != null && filename != null)
                    mainWindow.webContents.send("export-active-selected-populations", filename)
                })
              }
            },
            {
              label: "For all image sets to JSON",
              enabled: imageLoaded,
              click: () => {
                dialog.showSaveDialog({filters: [{ name: 'json', extensions: ['json'] }], defaultPath: activeImageDirectory},
                (filename:string) => {
                  if(mainWindow != null && filename != null)
                    mainWindow.webContents.send("export-all-selected-populations", filename)
                })
              }
            }
          ]
        },
        {
          label: "Image",
          submenu: [
            {
              label: "Current image and layers",
              enabled: imageLoaded,
              click: () => {
                dialog.showSaveDialog({filters: [{ name: 'png', extensions: ['png'] }]}, (filename:string) => {
                  if(mainWindow != null && filename != null)
                    mainWindow.webContents.send("export-image", filename)
                })
              }
            }
          ]
        }
      ]
    },
    {
      label: "Quit",
      click: () => {
        app.quit()
      }
    }
    ],
  },
{
  label: "Window",
  submenu: [
    {
      label: "Open Plot Window",
      click: () => {
        if(plotWindow != null) plotWindow.show()
        if(mainWindow != null) mainWindow.webContents.send('plot-in-main-window', false)
      }
    }
  ]
}]
}

function sendWindowSize() {
  if(mainWindow != null){
    let dimensions = mainWindow.getSize()
    mainWindow.webContents.send("window-size", dimensions[0], dimensions[1])
  }
  if(plotWindow != null){
    let dimensions = plotWindow.getSize()
    plotWindow.webContents.send("window-size", dimensions[0], dimensions[1])
  }
}

function setMenu() {
  let menuTemplate = generateMenuTemplate()
  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
}

function createMainWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1540, height: 740, show: false, webPreferences: { experimentalFeatures: true, nodeIntegrationInWorker: true }})
  setMenu()
  
  // TODO: Set to 1280 x 720 when not using DevTools.
  mainWindow.setMinimumSize(1540, 740)

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'app', 'mainWindow.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  if(isDev) mainWindow.webContents.openDevTools()

  // Use throttle so that when we resize we only send the window size every 333 ms
  mainWindow.on('resize', _.throttle(sendWindowSize, 333))
  mainWindow.on('enter-full-screen', sendWindowSize)
  mainWindow.on('leave-full-screen', sendWindowSize)

  // Emitted when the user requests to close but before the window is actually closed.
  mainWindow.on('close', function () {
    // Clean up the webworkers. We don't do this earlier as it causes issues with transferrables.
    if(mainWindow != null) mainWindow.webContents.send('clean-up-webworkers')
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
    closePlotWindow()
  })

  mainWindow.on('ready-to-show', () => {
    if(mainWindow != null) mainWindow.show()
  })
}

function createPlotWindow() {
  plotWindow = new BrowserWindow({width: 800, height: 800, show: false, webPreferences: { experimentalFeatures: true, nodeIntegrationInWorker: true}})

  plotWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'app', 'plotWindow.html'),
      protocol: 'file:',
      slashes: true
    }))

  if(isDev) plotWindow.webContents.openDevTools()

  // Instead of destroying and recreating the plot window, we just hide/show it (unless the application is exited).
  plotWindow.on('close', function (event: Electron.Event) {
    event.preventDefault()
    if(plotWindow != null) plotWindow.hide()
    if(mainWindow != null) mainWindow.webContents.send('plot-in-main-window', true)
  })
}

// Need to remove the event listener for close that prevents the default close
// Otherwise the window will never be destroyed and the application cannot exit.
function closePlotWindow() {
  if(plotWindow != null){
    plotWindow.removeAllListeners('close')
    plotWindow.close()
    plotWindow = null
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createMainWindow)
app.on('ready', createPlotWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createMainWindow()
  if (plotWindow === null) createPlotWindow()
})

app.on('before-quit', () => {
  closePlotWindow()
})

// Used to enable disabled menu items when images have been loaded.
ipcMain.on('set-image-loaded', (event:Electron.Event, loaded:boolean) => {
  imageLoaded = loaded
  setMenu()
})

ipcMain.on('set-active-image-directory', (event:Electron.Event, directory:string) => {
  activeImageDirectory = directory
  setMenu()
})

// Functions to relay data from the mainWindow to the plotWindow
ipcMain.on('mainWindow-set-plot-data', (event:Electron.Event,
  selectOptions: { value: string, label: string}[],
  plotChannels: string[],
  statistic: string,
  transform: string,
  plotData: any) => {

  if(plotWindow != null) plotWindow.webContents.send("set-plot-data", selectOptions, plotChannels, statistic, transform, plotData)
})

// Functions to relay data from the plotWindow to the mainWindow
ipcMain.on('plotWindow-set-channels', (event:Electron.Event, channels: string[]) => {
  if(mainWindow != null) mainWindow.webContents.send('set-plot-channels', channels)
})

ipcMain.on('plotWindow-set-statistic', (event:Electron.Event, statistic: any) => {
  if(mainWindow != null) mainWindow.webContents.send('set-plot-statistic', statistic)
})

ipcMain.on('plotWindow-set-transform', (event:Electron.Event, transform: any) => {
  if(mainWindow != null) mainWindow.webContents.send('set-plot-transform', transform)
})

ipcMain.on('plotWindow-add-selected-population', (event:Electron.Event, segmentIds: number[]) => {
  if(mainWindow != null) mainWindow.webContents.send('add-plot-selected-population', segmentIds)
})

ipcMain.on('plotWindow-set-hovered-segments', (event:Electron.Event, segmentIds: number[]) => {
  if(mainWindow != null) mainWindow.webContents.send('set-plot-hovered-segments', segmentIds)
})