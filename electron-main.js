// Modules to control application life and create native browser window
const {app, BrowserWindow, screen} = require('electron')
// const path = require('path')
var scrWidth = 2000
var scrHeight = 1200
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.

  // console.log("scr=", scrWidth, scrHeight)
  mainWindow = new BrowserWindow({
    width: scrWidth,
    height: scrHeight,
    x:0,
    y:0,
    // backgroundColor: '#2e2c29',
    // fullscreen: true,
    webPreferences: {
    //   preload: path.join(__dirname, 'preload.js')
        zoomFactor: 1.1,
    }
  })
//   mainWindow.maximize()
//   mainWindow.setFullScreen(true)
//   mainWindow.setMenu(null);

  // and load the index.html of the app.
  mainWindow.loadFile('public/index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

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
app.on('ready', () => {
    const wa = screen.getPrimaryDisplay().workAreaSize
    scrWidth = wa.width //- 100
    scrHeight = wa.height //- 100
    createWindow()

})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') app.quit()
  app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
