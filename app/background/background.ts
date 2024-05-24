import path from 'path'
import { app, ipcMain, Menu, shell } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { createMonitoring } from '@esmj/monitor';
import Store from 'electron-store'
import si from 'systeminformation'
import {machineIdSync} from 'node-machine-id'
import { findByDeviceId, getPing, getVersionApp, myWorker, saveInfoOrbit, updateNodeInfo, updateSystemInfo } from '../renderer/api/orbitdb';
import * as tf from "@tensorflow/tfjs";
import process from 'process'

const isProd = process.env.NODE_ENV === 'production'
const isMac = process.platform === 'darwin'
if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}
;(async () => {
  await app.whenReady()

  const mainWindow = createWindow('main', {
    width: 1275,
    height: 770,
    webPreferences: {
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
    mainWindow.webContents.openDevTools()
  }
})()

app.on('window-all-closed', async() => {
  app.quit()
})

let metrics = [];

const {monitor, metricsHistory } = new createMonitoring();
let unsubscribeMonitor = undefined;

const template = [

  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  },

  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: "Edit",
    submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]
  },
  {
    label: 'Menu ',
    submenu: [

      { label: 'Delete Store', click: () => {
        storeAddressRnode.clear();
        }
      },
    ]
  },

]

const menu = Menu.buildFromTemplate(template as any)
Menu.setApplicationMenu(menu)

type StoreAddress = {
  address: string
  isSaveAddress: boolean
}
type StoreDeviceId = {
  deviceId: string
}
type StoreStorage = {
  sizeSSDShared: number,
  sizeHDDShared: number,
  storageType: string
}
type StoreIsValidateNode = {
  isValidateNode: boolean
}
type StoreIsTour = {
  isTour: boolean
}
async function benchmark(){
  const numRows = 700;
  const numCols = 700;
  const matrix1 = tf.randomUniform([numRows, numCols]);
  const matrix2 = tf.randomUniform([numRows, numCols]);
  let count = 0;
  let result;
  const startTime = new Date().getTime();
  while ( new Date().getTime( ) - startTime < 1000){
    result = tf.matMul(matrix1, matrix2);
    count ++;
  }
  const taskPerminute = count * 60;
  return taskPerminute;
  
}

const storeAddressRnode = new Store<StoreAddress>();
const storeDeviceId = new Store<StoreDeviceId>();
const storeStorage = new Store<StoreStorage>();
const storeIsValidateNode = new Store<StoreIsValidateNode>();
const storeIsTour = new Store<StoreIsTour>();

ipcMain.on('update-is-tour', (_event, arg) => {
  storeIsTour.set('is-tour', arg);
})

ipcMain.on('get-is-tour', (event) => {
  event.reply('is-tour', storeIsTour.get('is-tour'));
})


ipcMain.on('update-is-validate-node', (_event, arg) => {
  storeIsValidateNode.set('is-validate-node', arg)
})

ipcMain.on('get-is-validate-node', (event) => {
  event.reply('is-validate-node', storeIsValidateNode.get('is-validate-node') || {})
})

ipcMain.on('add-info-address', (_event, arg) => {
  storeAddressRnode.set('info-address-rnode', arg)
})

ipcMain.on('get-info-address', (event) => {
  event.reply('info-address', storeAddressRnode.get('info-address-rnode') || {})
})

ipcMain.on('add-size-shared', (_event, arg) => {
  storeStorage.set('size-storage-shared', arg)
})

ipcMain.on('get-size-shared', (event) => {
  event.reply('size-shared', storeStorage.get('size-storage-shared') || {})
})

ipcMain.on('get-benchmark', async (event) => {
  event.reply('benchmark', await benchmark());
})

ipcMain.on("subscribe", () => {

  const { unsubscribe } = monitor.subscribe((metric: any) => {
    metrics.push(metric);
  });
  unsubscribeMonitor = unsubscribe
})

ipcMain.on("unsubscribe", () => {

  if(unsubscribeMonitor) {
    unsubscribeMonitor();
  }
})


monitor.start();
ipcMain.on('get-performance', (event) => {

  event.reply('performance', JSON.stringify({

    cpuUsage: {
      percent :metricsHistory.percentile('cpuUsage.percent', 80),
      user :metricsHistory.percentile('cpuUsage.user', 80),
      system: metricsHistory.percentile('cpuUsage.system', 80)
    },
    memoryUsage: {
      percent: metricsHistory.percentile('memoryUsage.percent', 80),
      rss: metricsHistory.percentile('memoryUsage.rss', 80),
      heapTotal: metricsHistory.percentile('memoryUsage.heapTotal', 80),
      heapUsed: metricsHistory.percentile('memoryUsage.heapUsed', 80)
    },
    eventLoopDelay: {
      min: metricsHistory.percentile('eventLoopDelay.min', 80),
      max: metricsHistory.percentile('eventLoopDelay.max', 80),
      mean: metricsHistory.percentile('eventLoopDelay.mean', 80)
    },
    eventLoopUtilization: {
      idle: metricsHistory.percentile('eventLoopUtilization.idle', 80),
      active: metricsHistory.percentile('eventLoopUtilization.active', 80),
      utilization: metricsHistory.percentile('eventLoopUtilization.utilization', 80)
    },
    process: {
      pid: metricsHistory.percentile('process.pid', 80),
      ppid: metricsHistory.percentile('process.ppid', 80),
      platform: metricsHistory.percentile('process.platform', 80),
      uptime: metricsHistory.percentile('process.uptime', 80),
      version: metricsHistory.percentile('process.version', 80)
    }
   })
  
    ||  "ERROR");
})

ipcMain.on("get-verified" , () => {
  shell.openExternal('https://rivalz.ai/dashboard/node-validate')
})
ipcMain.on("get-link-twitter" , () => {
  shell.openExternal('https://twitter.com/Rivalz_AI')
})
ipcMain.on("get-link-discord" , () => {
  shell.openExternal('https://discord.com/invite/rivalzai')
})
ipcMain.on('get-link-telegram', () => {
  shell.openExternal('https://t.me/RivalzAI_Ann')
})
ipcMain.on('get-link-update', () => {
  shell.openExternal('https://rivalz.ai/download')
})
ipcMain.on("get-data-diskLayout" , async (event) => {
  try {
    const diskLayout = await si.diskLayout();
    event.reply('diskLayout', diskLayout)
  } catch (error) {
    console.log(error);
  }
})

ipcMain.on("get-blockDevices" , async (event) => {
  event.reply('blockDevices', await si.blockDevices());
})

ipcMain.on('get-fsSize' , async (event) => {
  event.reply('fsSize', await si.fsSize());
})

ipcMain.on('get-data-saveInfoOrbitDB', async (event, dataInfo) => {
  const dataCpu = await si.cpu()
  const dataRam: any = await si.memLayout()
  const totalRamSize = dataRam[0].size/1073741824
  const internet: any = await si.networkInterfaces('default') //speed Mbit/s
  try {
    storeDeviceId.set('deviceNodeId', machineIdSync())
    event.reply("saveInfoOrbitDB-success", await saveInfoOrbit(
      dataInfo.address,dataInfo.multiAddress,dataInfo.ipfsDbAddress,dataInfo.peerId,machineIdSync(),
      dataInfo.cpuUsage,dataInfo.storageUsage, dataInfo.ramUsage,
      dataCpu.cores, dataCpu.speed, dataCpu.speedMax, totalRamSize, dataRam[0].clockSpeed, internet.speed,
      dataInfo.storageType
    ))

  } catch (error) {
    console.log(error)
    const match  = /dup key: (.+)/.exec(error?.response?.data?.message);
    if (match) {
        try {
          storeDeviceId.set('deviceNodeId', machineIdSync())
          event.reply('update-node-info', await updateNodeInfo(
            dataInfo.peerId, dataInfo.multiAddress, dataInfo.ipfsDbAddress,machineIdSync(),
            dataInfo.cpuUsage,dataInfo.storageUsage, dataInfo.ramUsage,
          ))
          event.reply('update-system-info', await updateSystemInfo(machineIdSync(), dataInfo.cpuUsage, dataInfo.storageUsage,
          dataInfo.ramUsage, dataCpu.cores,dataCpu.speed, dataCpu.speedMax, totalRamSize, dataRam[0].clockSpeed, internet.speed,
          dataInfo.storageType
        ))
        } catch (error) {
          console.log("error-update",error)
        }
    }
    else{
      event.reply('saveInfoOrbitDB-error', error.response?.data)
    }
  }
})
ipcMain.on("get-ping", async(event) => {
  event.reply('ping', await getPing(machineIdSync()) )
})

ipcMain.on('get-osInfo', async(event) => {
  event.reply('osInfo', await si.osInfo())
})

ipcMain.on('get-my-worker', async(event) => {
  event.reply('my-worker', await myWorker(machineIdSync()));
})
// var previousUsage = process.cpuUsage();
let previousUsage = process.cpuUsage();
const start = Date.now()
ipcMain.on('get-percent-cpuUsage', (event) => {
   previousUsage = process.cpuUsage(previousUsage);
  // const usage = process.cpuUsage(previousUsage);
  const usageUser = previousUsage.user
  const usageSystem = previousUsage.system
  const percent = 100 * (usageUser + usageSystem) / ((Date.now() - start) * 1000)
  if (percent >= 100) {
    event.reply('percent-cpuUsage', {usageUser: usageUser, usageSystem: usageSystem, percent: 100})
  }
  else {
    event.reply('percent-cpuUsage', {usageUser: usageUser, usageSystem: usageSystem, percent: percent})
  }

})

ipcMain.on('get-data-version', async(event) => {
  try {
    const newVersion = await getVersionApp();
    if (app.getVersion() < newVersion) {
      event.reply('notification-update-version', newVersion)
    }
    if (!newVersion) {
      return;
    }
  } catch (error) {
    console.log(error)
  }

})
ipcMain.on('get-update-system-info', async (event, systemInfo) => {
  try {
    const dataCpu = await si.cpu()
    const dataRam: any = await si.memLayout()
    const totalRamSize = dataRam[0].size/1073741824
    const internet: any = await si.networkInterfaces('default') //speed Mbit/s
    event.reply('update-data-system-info', await updateSystemInfo(machineIdSync(), systemInfo.cpuUsage, systemInfo.storageUsage,
    systemInfo.ramUsage, dataCpu.cores,dataCpu.speed, dataCpu.speedMax, totalRamSize, dataRam[0].clockSpeed, internet.speed,
    systemInfo.storageType
    ))
  } catch (error) {
    console.log(error)
  }

})

ipcMain.on('get-exit', () => {
  app.quit();
})
console.log("version",app.getVersion())

findByDeviceId(machineIdSync()).then((data) => {
  console.log("data",data);
   storeAddressRnode.set('info-address-rnode', {address: data.walletAddress,isSaveAddress: true})
}
).catch((error) => console.log("er",error) )
