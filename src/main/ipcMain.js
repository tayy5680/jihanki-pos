import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
const fs = require('fs')
const path = require('path')
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setIpcData } from './hardware'

let mainWindow = null
// let config = require('electron-node-config');
const basePath = app.isPackaged ? process.resourcesPath : app.getAppPath()
export let configFile = require(join(basePath, 'extraResources', 'config.json'))
const configFilePath = join(basePath, 'extraResources', 'config.json')
const log = require('electron-log')
// 監聽 config.json 檔案的變化
fs.watch(configFilePath, (eventType, filename) => {
  if (eventType === 'change') updateConfigToVue()
})

export function createWindow() {
  const displays = screen.getAllDisplays()
  const mainScreen = displays[0]
  const secondScreen = displays[1] ?? displays[0]
  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: mainScreen.bounds.x,
    y: mainScreen.bounds.y,
    width: 900,
    height: 670,

    show: false,
    fullscreen: false,
    frame: true,
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },s
  })

  if (configFile.debug_mode) mainWindow.webContents.openDevTools()

  ipcMain.on('sendData', (event, data) => {
    setLog('info', `成功取得渲染層資料：\n${JSON.stringify(data)}`)
    setIpcData(data)
  })
  ipcMain.on('log', (event, data) => {
    setLog(data?.logType, data?.msg, 'renderer')
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  action(mainWindow)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadURL(`file://${join(__dirname, '../renderer/index.html')}`)
  }
}

function action(browserWindow) {
  browserWindow.on('ready-to-show', () => {
    browserWindow.show()
    updateConfigToVue()
  })
  browserWindow.on('closed', () => {
    app.quit()
  })
}

export function sendToVue(channel, data) {
  if (!mainWindow) return
  setLog('info', `發送至渲染層：\n${JSON.stringify(data)}`)
  mainWindow.webContents.send(channel, data)
}

export function setLog(logType, msg, folder = 'main') {
  if (!msg) return
  if (!logType) logType = 'info'
  const today = new Date()
  const formattedDate = today.toISOString().substring(0, 10)
  log.transports.file.fileName = `${folder}/${formattedDate}.log`

  switch (logType) {
    case 'info':
      log.info(msg)
      break
    case 'warn':
      log.warn(msg)
      break
    case 'error':
      log.error(msg)
      break
  }
}

function updateConfigToVue() {
  const newConfig = fs.readFileSync(path.join(basePath, 'extraResources', 'config.json'), 'utf-8')
  configFile = JSON.parse(newConfig)
  const sendData = {
    Method: 'updateConfig',
    Data: configFile,
  }
  sendToVue('send_data', sendData)
}
