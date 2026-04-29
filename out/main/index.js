"use strict";
const electron = require("electron");
const utils = require("@electron-toolkit/utils");
const path$1 = require("path");
const icon = path$1.join(__dirname, "../../resources/icon.png");
const machine$1 = "com3";
const scan$1 = "com4";
const cmdCheckDeliveryBin = "64";
const cmdOpenDeliveryBin = "65";
const cmdliftsBin = "24";
const cmdExportProductBin = "28";
const { exec } = require("child_process");
const util = require("util");
const fs$1 = require("fs");
async function easycard(data, configFile2) {
  await fs$1.writeFile(configFile2.easycard.input, JSON.stringify(data), (err) => {
    if (err) {
      console.error("error:", err);
      return;
    }
    console.log("success write easycard input file");
  });
  const execPromise = util.promisify(exec);
  try {
    const { stdout, stderr } = await execPromise(configFile2.easycard.commend);
    return new Promise(async (resolve, reject) => {
      await fs$1.readFile(configFile2.easycard.output, (err, data2) => {
        if (err) {
          console.error("error:", err);
          return;
        }
        resolve(JSON.parse(data2));
      });
    });
  } catch {
    return { TXN_RESP_CODE: false, Msg: "卡機程式啟動失敗" };
  }
}
async function payment(info, configFile2) {
  await fs$1.writeFile(configFile2.payment.input, info, (err) => {
    if (err) {
      console.error("error:", err);
      return;
    }
    console.log("success");
  });
  const execPromise = util.promisify(exec);
  try {
    const { stdout, stderr } = await execPromise(configFile2.payment.commend);
    return new Promise(async (resolve, reject) => {
      await fs$1.readFile(configFile2.payment.output, (err, data) => {
        if (err) {
          console.error("error:", err);
          return;
        }
        const obj = {};
        const lines = data.toString().split("\r\n");
        lines.forEach((line) => {
          const [key, value] = line.split("=");
          const variable = key.trim();
          obj[key] = value;
        });
        resolve(obj);
      });
    });
  } catch {
    return { RESPONSECODE: false, Msg: "卡機程式啟動失敗" };
  }
}
const { SerialPort } = require("serialport");
function getSendCmd(header, version, deviceAddress, cmd, data) {
  let cmdHex = `${header}${version}${deviceAddress}${cmd}`;
  cmdHex += `${numToHex(Buffer.from(data, "hex").byteLength, 2)}${data}`;
  let crc = numToHex(crc16(Buffer.from(cmdHex, "hex")), 2);
  return `${cmdHex}${crc}`;
}
function numToHex(num, byteLength) {
  return num.toString(16).padStart(byteLength * 2, "0");
}
function crc16(buffer) {
  let crc = 65535;
  let odd;
  for (let i = 0; i < buffer.length; i++) {
    crc = crc ^ buffer[i];
    for (let j = 0; j < 8; j++) {
      odd = crc & 1;
      crc = crc >> 1;
      if (odd) {
        crc = crc ^ 40961;
      }
    }
  }
  return crc;
}
class wm500 {
  constructor() {
    this.serialport = new SerialPort({ path: machine$1, baudRate: 9600 });
    this.res = [];
    this.orderNumber = 0;
    this.cmdHeaderPos = "EE";
    this.cmdHeaderPcb = "FF";
    this.cmdVersion = "01";
    this.cmdDeviceAddress = "00000000";
    this.unlockTime = 120;
    this.openDoorTime = 120;
    this.takeoutTimeout = 120;
  }
  async check() {
    try {
      const res = this.serialport.isOpen;
      return res;
    } catch {
      return false;
    }
  }
  async CheckDelivery() {
    let cmdHex = Buffer.from(
      getSendCmd(this.cmdHeaderPos, this.cmdVersion, this.cmdDeviceAddress, cmdCheckDeliveryBin, ""),
      "hex"
    );
    const result = await SerialPortFunc(this.serialport, cmdHex);
    console.log("get port data ============> ", result);
    if (result[9] === 0) {
      return { Result: true };
    } else {
      return { Result: false };
    }
  }
  async SaleItem(trackNo, orderNo) {
    let cmdData = `${numToHex(trackNo, 2)}${numToHex(orderNo, 8)}`;
    let cmdHex = Buffer.from(
      getSendCmd(this.cmdHeaderPos, this.cmdVersion, this.cmdDeviceAddress, cmdExportProductBin, cmdData),
      "hex"
    );
    const result = await SerialPortFunc(this.serialport, cmdHex);
    machineListen("machine");
    console.log("get port data ============> ", result);
    if (result[17] === 0) {
      return { Result: true, Msg: `0x0${result[17].toString(16)}` };
    } else {
      return { Result: false, Msg: `0x0${result[17].toString(16)}` };
    }
  }
  async ReceiveDoorArm() {
    let cmdData = `${numToHex(0, 1)}${numToHex(1, 1)}`;
    let cmdHex = Buffer.from(
      getSendCmd(this.cmdHeaderPos, this.cmdVersion, this.cmdDeviceAddress, cmdliftsBin, cmdData),
      "hex"
    );
    console.log(cmdHex);
    const result = await SerialPortFunc(this.serialport, cmdHex);
    console.log("get port data ============> ", result);
    if (result[9] === 0) {
      return { Result: true, Msg: `0x0${result[9].toString(16)}` };
    } else {
      return { Result: false, Msg: `0x0${result[9].toString(16)}` };
    }
  }
  async OpenDoor() {
    let cmdData = `${numToHex(this.unlockTime, 1)}${numToHex(this.openDoorTime, 2)}${numToHex(this.takeoutTimeout, 2)}`;
    let cmdHex = Buffer.from(
      getSendCmd(this.cmdHeaderPos, this.cmdVersion, this.cmdDeviceAddress, cmdOpenDeliveryBin, cmdData),
      "hex"
    );
    setLog("info", cmdHex);
    const result = await SerialPortFunc(this.serialport, cmdHex);
    console.log("get port data ============> ", result);
    if (result[9] === 0) {
      return { Result: true, Msg: `0x0${result[9].toString(16)}` };
    } else {
      return { Result: false, Msg: `0x0${result[9].toString(16)}` };
    }
  }
}
async function SerialPortFunc(port, cmdHex) {
  return new Promise((resolve, reject) => {
    port.write(cmdHex, function(err) {
      if (err) {
        throw new Error("Error on write: " + err.message);
      }
      console.log("message written");
    });
    port.on("error", function(err) {
      console.log("Error on opening or other events: ", err.message);
    });
    port.drain((err) => {
      if (err)
        return;
      console.log("send ok");
    });
    port.on("readable", () => {
      setTimeout(() => {
        port.read();
      }, 1e3);
    });
    port.on("data", (data) => {
      console.log(data);
      resolve(data);
    });
  });
}
class ScanClass {
  //條碼機
  constructor() {
    this.serialport = new SerialPort({ path: scan$1, baudRate: 9600 });
  }
  async check() {
    try {
      const res = this.serialport.isOpen;
      return res;
    } catch {
      return false;
    }
  }
  async read() {
    return new Promise(async (resolve, reject) => {
      const getHex = await SerialPortFunc(this.serialport, "");
      resolve(getHex.toString());
    });
  }
  isInvoice(string) {
    var regexp = /^\/{1}[0-9A-Z\.+-]{7}$/;
    return regexp.test(string);
  }
}
const scan = new ScanClass();
const machine = new wm500();
const trackTable = /* @__PURE__ */ new Map([
  [
    "row0",
    /* @__PURE__ */ new Map([
      ["col1", 105],
      ["col2", 104],
      ["col3", 103],
      ["col4", 102],
      ["col5", 101],
      ["col6", 100]
    ])
  ],
  [
    "row1",
    /* @__PURE__ */ new Map([
      ["col1", 115],
      ["col2", 114],
      ["col3", 113],
      ["col4", 112],
      ["col5", 111],
      ["col6", 110]
    ])
  ],
  [
    "row2",
    /* @__PURE__ */ new Map([
      ["col1", 125],
      ["col2", 124],
      ["col3", 123],
      ["col4", 122],
      ["col5", 121],
      ["col6", 120]
    ])
  ],
  [
    "row3",
    /* @__PURE__ */ new Map([
      ["col1", 135],
      ["col2", 134],
      ["col3", 133],
      ["col4", 132],
      ["col5", 131],
      ["col6", 130]
    ])
  ],
  [
    "row4",
    /* @__PURE__ */ new Map([
      ["col1", 145],
      ["col2", 144],
      ["col3", 143],
      ["col4", 142],
      ["col5", 141],
      ["col6", 140]
    ])
  ],
  [
    "row5",
    /* @__PURE__ */ new Map([
      ["col1", 155],
      ["col2", 154],
      ["col3", 153],
      ["col4", 152],
      ["col5", 151],
      ["col6", 150]
    ])
  ],
  [
    "row6",
    /* @__PURE__ */ new Map([
      ["col1", 165],
      ["col2", 164],
      ["col3", 163],
      ["col4", 162],
      ["col5", 161],
      ["col6", 160]
    ])
  ],
  [
    "row7",
    /* @__PURE__ */ new Map([
      ["col1", 175],
      ["col2", 174],
      ["col3", 173],
      ["col4", 172],
      ["col5", 171],
      ["col6", 170]
    ])
  ]
]);
function returnMessage(msg, returnVue) {
  let sendData = {};
  sendData = {
    Method: msg,
    Data: returnVue
  };
  sendToVue("send_data", sendData);
}
async function machineListen(type) {
  return new Promise(() => {
    let errorListen = machine.serialport;
    errorListen.on("readable", () => {
      setTimeout(() => {
        errorListen.read();
      }, 1e3);
    });
    errorListen.on("data", (data) => {
      try {
        switch (type) {
          case "machine":
            if (data[0] === 255 && data[6] === 224 && data[17] !== 0) {
              setLog("info", `機台主動回報錯誤 錯誤代碼為:0x0${data[17].toString(16)}`);
            }
            break;
          case "outdoor":
            if (data[0] === 255 && data[6] === 225) {
              setLog("info", "看看是不是log");
              if (data[17] === 3) {
                returnMessage("shippingSuccess", {});
              }
            }
            break;
        }
      } catch {
        setLog("info", "可能不是這個指令");
      }
    });
  });
}
async function setIpcData(data) {
  if (!data?.Method || !data?.Data) {
    sendToVue("send_data", {
      Method: "error",
      Data: {
        errorMessage: "資料錯誤，沒有傳遞Method或Data"
      }
    });
    return;
  }
  let returnVue = {};
  switch (data.Method) {
    case "checkHardwareStatus":
    case "heartbeatLine":
      let scan_check = await scan.check();
      let machine_check = await machine.check();
      let easy_card_check = await easycard({ TXN_PAY: "EasyCard", TXN_TYPE: "signon" }, configFile);
      setLog("info", "easy_card_check:");
      setLog("info", easy_card_check);
      setLog("info", "scan_check:" + scan_check);
      setLog("info", "machine_check:" + machine_check);
      if (scan_check && machine_check) {
        returnVue = { Result: true };
      } else {
        returnVue = { Result: false };
      }
      returnMessage("hardwareStatusRes", returnVue);
      if (data.Method == "heartbeatLine") {
        let check_list = [];
        returnVue = await machine.CheckDelivery();
        check_list.push({ Type: "delivery_check", Result: returnVue.Result, Error: "出貨口有異物" });
        returnVue = await machine.OpenDoor();
        machineListen("machine");
        check_list.push({ Type: "opendoor_check", Result: returnVue.Result, Error: "閘門開啟失敗" });
        easy_card_check = await easycard({ TXN_PAY: "EasyCard", TXN_TYPE: "signon" }, configFile);
        if (easy_card_check.TXN_RESP_CODE !== "0") {
          returnMessage("postExceptionNotify", { error: "悠遊卡初始化失敗" });
          returnMessage("heartbeatLineRes", { Yellow: true, Type: "easy_card_check", Error: "悠遊卡初始化失敗" });
          break;
        }
        machine_check = await machine.check();
        check_list.push({ Type: "machine_check", Result: machine_check, Error: "機器通道檢查失敗" });
        scan_check = await scan.check();
        check_list.push({ Type: "scan_check", Result: scan_check, Error: "掃碼機通道檢查失敗" });
        for (let i = 0; i < check_list.length; i++) {
          if (check_list[i].Result === false) {
            returnMessage("heartbeatLineRes", { Yellow: true, Type: check_list[i].Type, Error: check_list[i].Error });
            break;
          }
        }
        returnMessage("heartbeatLineRes", { Yellow: false, Type: null, Error: null });
      }
      break;
    case "scanPayment":
      console.log(data.Data);
      if (data.Data.type == "credit") {
        const inputInfo2 = `
      TRADETYPE = ${data.Data.tradetype}\r

      SHOPORDERNO = ${data.Data.shoporderno}\r

      AMOUNT = ${data.Data.amount}\r

      COMMODITYINFO = ${data.Data.commodityinfo}\r

      BANK = UB\r

      PAYMENTTYPE = Credit\r

      BATCHNO = ${data.Data.batchno}\r

      ENTRYMODE = Contactless\r

      DEVICE = EDC\r

      DEVICESN =  ${configFile.credit_devicesn}\r

      DEVICEID = ${data.Data.deviceid}\r

      SHOPID = ${configFile.shopid}\r

      `;
        returnVue = {};
        const result2 = await payment(inputInfo2, configFile);
        setLog("info", result2);
        if (result2.RESPONSECODE === "C000000") {
          returnVue["Result"] = true;
          returnVue["Msg"] = "ok";
        } else {
          returnVue["Result"] = false;
          returnVue["Msg"] = null;
        }
      } else if (data.Data.type == "easycard") {
        const inputInfo2 = {};
        inputInfo2["TXN_PAY"] = "EasyCard";
        inputInfo2["TXN_TYPE"] = "sale";
        inputInfo2["TXN_AMOUNT"] = data.Data.amount;
        const result2 = await easycard(inputInfo2, configFile);
        setLog("info", result2);
        if (result2.TXN_RESP_CODE === "0") {
          returnVue["Result"] = true;
          returnVue["Msg"] = "ok";
        } else {
          returnVue["Result"] = false;
          returnVue["Msg"] = null;
        }
      }
      returnMessage("scanPaymentRes", returnVue);
      break;
    case "scanReceipt":
    case "scanEventQR":
    case "scanThirdQR":
      returnVue = {};
      const serialNumber = await scan.read();
      const reg = /(.*?)\r/;
      returnVue["Result"] = true;
      returnVue["Msg"] = serialNumber.match(reg)[1];
      setLog("info", "scan_get" + returnVue.Msg);
      let method = "";
      if (data.Method == "scanEventQR") {
        method = "scanEventQRRes";
      } else if (data.Method == "scanThirdQR") {
        method = "scanThirdQRRes";
      } else if (data.Method == "scanReceipt") {
        method = "scanReceiptRes";
        if (scan.isInvoice(returnVue.Msg) === true) {
          returnVue.Result = true;
        } else {
          returnVue.Result = false;
          returnVue.Msg = "not phoneCode";
        }
      }
      returnMessage(method, returnVue);
      break;
    case "shipping":
      returnVue = {};
      let sendTrackNO = 0;
      let sendorderNo = 0;
      try {
        if (data.Data.type === "payment") {
          sendorderNo = data.Data.shoporderno.split("-")[1];
        } else {
          sendorderNo = data.Data.drawlotRecordID;
        }
      } catch {
        returnMessage("shippingRes", { Result: false, Msg: "資料錯誤" });
        break;
      }
      try {
        if (data.Data.rackStorageID < 10) {
          sendTrackNO = trackTable.get("row0").get(`col${data.Data.rackStorageID}`);
        } else {
          sendTrackNO = trackTable.get(`row${Math.floor(data.Data.rackStorageID / 10)}`).get(`col${data.Data.rackStorageID % 10}`);
        }
        returnVue = await machine.SaleItem(sendTrackNO, sendorderNo);
        machineListen("outdoor");
        returnMessage("shippingRes", returnVue);
        if (returnVue.Result == false) {
          returnMessage("postExceptionNotify", { error: "出貨失敗，錯誤代碼為" + returnVue.Msg });
        }
      } catch {
        returnMessage("shippingRes", { Result: false, Msg: "找不到軌道" });
      }
      break;
    case "restoreArm":
      returnVue = await machine.ReceiveDoorArm();
      returnMessage("restoreArmRes", returnVue);
      break;
    case "checkPickUpPort":
      returnVue = await machine.CheckDelivery();
      returnMessage("checkPickUpPortRes", returnVue);
      if (returnVue.Result == false) {
        returnMessage("postExceptionNotify", { error: "出貨口目前有異物" });
      }
      break;
    case "settle":
      var batchno = data.Data;
      console.log(`settle data = ${batchno}`);
      setLog("info", "開始執行硬體卡機結帳");
      const timestamp = DateTime.now().toMillis();
      const timestampInteger = Math.floor(timestamp / 1e3);
      const inputInfo = `
        TRADETYPE = CREDITSETTLEMENT\r

        SHOPORDERNO = ${timestampInteger}\r

        COMMODITYINFO = 自販機結帳\r

        AMOUNT = 1\r

        BANK = UB\r

        PAYMENTTYPE = Credit\r

        DEVICE = EDC\r

        DEVICESN =  ${configFile.credit_devicesn}\r

        DEVICEID = ${configFile.machine_id}\r

        BATCHNO = ${batchno}\r

      `;
      console.log(`信用卡結帳資訊：`);
      console.log(inputInfo);
      returnVue = {};
      var result = await payment(inputInfo, configFile);
      setLog("info", result);
      console.log(`信用卡結帳結果：`);
      console.log(result);
      var msg = "";
      if (result.RESPONSECODE === "C000000") {
        msg = `【信用卡結帳成功】`;
        returnVue["Result"] = true;
        returnVue["Msg"] = msg;
      } else {
        msg = `【信用卡結帳失敗】，錯誤代碼為:${result.RESPONSECODE}`;
        setLog("error", msg);
        returnVue["Result"] = false;
        returnVue["Msg"] = msg;
      }
      var easyCardInput = {};
      easyCardInput.TXN_PAY = "EasyCard";
      easyCardInput.TXN_TYPE = "settle";
      console.log(`悠遊卡結帳資訊：`);
      console.log(easyCardInput);
      result = await easycard(easyCardInput, configFile);
      console.log(`悠遊卡結帳結果：`);
      console.log(result);
      setLog("info", result);
      if (result.TXN_RESP_CODE === "0") {
        msg += `;【悠遊卡結帳成功】`;
        returnVue["Result"] = returnVue["Result"] && true;
        returnVue["Msg"] = msg;
      } else {
        msg += `;【悠遊卡結帳失敗】，錯誤代碼:${result.TXN_RESP_CODE}; 錯誤訊息: ${result.Msg}`;
        setLog("error", msg);
        returnVue["Result"] = false;
        returnVue["Msg"] = msg;
      }
      returnMessage("settleResult", returnVue);
      break;
  }
}
const fs = require("fs");
const path = require("path");
let mainWindow = null;
const basePath = electron.app.isPackaged ? process.resourcesPath : electron.app.getAppPath();
let configFile = require(path$1.join(basePath, "extraResources", "config.json"));
const configFilePath = path$1.join(basePath, "extraResources", "config.json");
const log = require("electron-log");
fs.watch(configFilePath, (eventType, filename) => {
  if (eventType === "change")
    updateConfigToVue();
});
function createWindow() {
  const displays = electron.screen.getAllDisplays();
  const mainScreen = displays[0];
  displays[1] ?? displays[0];
  mainWindow = new electron.BrowserWindow({
    x: mainScreen.bounds.x,
    y: mainScreen.bounds.y,
    width: 900,
    height: 670,
    show: false,
    fullscreen: false,
    frame: true,
    autoHideMenuBar: false,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path$1.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    s
  });
  if (configFile.debug_mode)
    mainWindow.webContents.openDevTools();
  electron.ipcMain.on("sendData", (event, data) => {
    setLog("info", `成功取得渲染層資料：
${JSON.stringify(data)}`);
    setIpcData(data);
  });
  electron.ipcMain.on("log", (event, data) => {
    setLog(data?.logType, data?.msg, "renderer");
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  action(mainWindow);
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadURL(`file://${path$1.join(__dirname, "../renderer/index.html")}`);
  }
}
function action(browserWindow) {
  browserWindow.on("ready-to-show", () => {
    browserWindow.show();
    updateConfigToVue();
  });
  browserWindow.on("closed", () => {
    electron.app.quit();
  });
}
function sendToVue(channel, data) {
  if (!mainWindow)
    return;
  setLog("info", `發送至渲染層：
${JSON.stringify(data)}`);
  mainWindow.webContents.send(channel, data);
}
function setLog(logType, msg, folder = "main") {
  if (!msg)
    return;
  if (!logType)
    logType = "info";
  const today = /* @__PURE__ */ new Date();
  const formattedDate = today.toISOString().substring(0, 10);
  log.transports.file.fileName = `${folder}/${formattedDate}.log`;
  switch (logType) {
    case "info":
      log.info(msg);
      break;
    case "warn":
      log.warn(msg);
      break;
    case "error":
      log.error(msg);
      break;
  }
}
function updateConfigToVue() {
  const newConfig = fs.readFileSync(path.join(basePath, "extraResources", "config.json"), "utf-8");
  configFile = JSON.parse(newConfig);
  const sendData = {
    Method: "updateConfig",
    Data: configFile
  };
  sendToVue("send_data", sendData);
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.commandLine.appendSwitch("touch-events", "enabled");
