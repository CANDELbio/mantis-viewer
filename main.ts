import * as Electron from "electron"




const shell = Electron.shell
const Menu = Electron.Menu

// Module to control application life.
const app = Electron.app
// Module to create native browser window.
const BrowserWindow = Electron.BrowserWindow
const dialog = Electron.dialog


const path = require('path')
const url = require('url')


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: Electron.BrowserWindow | null


let menuTemplate = [{
  label: "File",
  submenu: [/*{
    label: "Open",
    click: () => {
      dialog.showOpenDialog((fileNames:string[]) => {
        if(mainWindow != null)
          mainWindow.webContents.send("open-file", fileNames[0])
      })
    }}, */{
    label: "Open folder",
    click: () => {
      dialog.showOpenDialog({properties: ["openDirectory"]}, (dirName:string[]) => {
        if(mainWindow != null && dirName != null)
          mainWindow.webContents.send("open-directory", dirName[0])
      })
    }
  },
  {
  label: "Open segmentation file",
  click: () => {
    dialog.showOpenDialog({properties: ["openFile"]},  (fileNames:string[]) => {
      if(mainWindow != null && fileNames != null)
        mainWindow.webContents.send("open-segmentation-file", fileNames[0])
    })
  }
}
]
}]

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 2395, height: 1032})
  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
  
  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'app', 'mainWindow.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

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
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
