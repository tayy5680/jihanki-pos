import * as setting from './setting.json'
import * as machineCmd from './machineCmd.json'
import { sendToVue, setLog, configFile } from './ipcMain.js'
import { easycard, payment } from './uic.js'
const { SerialPort } = require('serialport')
function getSendCmd(header, version, deviceAddress, cmd, data) {
  let cmdHex = `${header}${version}${deviceAddress}${cmd}`
  cmdHex += `${numToHex(Buffer.from(data, 'hex').byteLength, 2)}${data}` //長度需取2 byte
  let crc = numToHex(crc16(Buffer.from(cmdHex, 'hex')), 2)
  return `${cmdHex}${crc}`
}

function numToHex(num, byteLength) {
  return num.toString(16).padStart(byteLength * 2, '0') //1 hex = 4 bits => 1 byte = 2 hex
}
function crc16(buffer) {
  let crc = 0xffff
  let odd
  for (let i = 0; i < buffer.length; i++) {
    crc = crc ^ buffer[i]
    for (let j = 0; j < 8; j++) {
      odd = crc & 0x0001
      crc = crc >> 1
      if (odd) {
        crc = crc ^ 0xa001
      }
    }
  }
  return crc
}
class wm500 {
  constructor() {
    this.serialport = new SerialPort({ path: setting.machine, baudRate: 9600 }) // 初始化物件
    this.res = []
    this.orderNumber = 0
    this.cmdHeaderPos = 'EE' // POS標頭 (16進位制)
    this.cmdHeaderPcb = 'FF' // PCB標頭 (16進位制)
    this.cmdVersion = '01' // 指令版本 (16進位制)
    this.cmdDeviceAddress = '00000000' // 設備位址 (16進位制)
    this.unlockTime = 120 //開鎖時間 ( 秒，其他機型預留 (1 byte ) )
    this.openDoorTime = 120 //開門逾時時間 ( 秒，其他機型預留 ( 2 byte ) )
    this.takeoutTimeout = 120
  }
  async check() {
    try {
      const res = this.serialport.isOpen
      return res
    } catch {
      return false
    }
  }
  async CheckDelivery() {
    // 檢查出貨口
    let cmdHex = Buffer.from(
      getSendCmd(this.cmdHeaderPos, this.cmdVersion, this.cmdDeviceAddress, machineCmd.cmdCheckDeliveryBin, ''),
      'hex',
    )
    const result = await SerialPortFunc(this.serialport, cmdHex)
    console.log('get port data ============> ', result)
    if (result[9] === 0) {
      // 型態為 number 檢查機器結果
      return { Result: true }
    } else {
      return { Result: false }
    }
  }
  async SaleItem(trackNo, orderNo) {
    //移動貨道,訂單編號
    //資料內容:貨道編號（2 byte）+ 訂單流水號（8 byte） EX : EE010000000028000A00A3000000000000005FD845
    let cmdData = `${numToHex(trackNo, 2)}${numToHex(orderNo, 8)}`
    let cmdHex = Buffer.from(
      getSendCmd(this.cmdHeaderPos, this.cmdVersion, this.cmdDeviceAddress, machineCmd.cmdExportProductBin, cmdData),
      'hex',
    )
    const result = await SerialPortFunc(this.serialport, cmdHex)
    machineListen('machine')
    console.log('get port data ============> ', result)
    if (result[17] === 0) {
      return { Result: true, Msg: `0x0${result[17].toString(16)}` }
    } else {
      return { Result: false, Msg: `0x0${result[17].toString(16)}` }
    }
  }
  async ReceiveDoorArm() {
    let cmdData = `${numToHex(0, 1)}${numToHex(1, 1)}`
    let cmdHex = Buffer.from(
      getSendCmd(this.cmdHeaderPos, this.cmdVersion, this.cmdDeviceAddress, machineCmd.cmdliftsBin, cmdData),
      'hex',
    )
    console.log(cmdHex)
    const result = await SerialPortFunc(this.serialport, cmdHex)
    console.log('get port data ============> ', result)
    if (result[9] === 0) {
      return { Result: true, Msg: `0x0${result[9].toString(16)}` }
    } else {
      return { Result: false, Msg: `0x0${result[9].toString(16)}` }
    }
  }
  async OpenDoor() {
    let cmdData = `${numToHex(this.unlockTime, 1)}${numToHex(this.openDoorTime, 2)}${numToHex(this.takeoutTimeout, 2)}`
    let cmdHex = Buffer.from(
      getSendCmd(this.cmdHeaderPos, this.cmdVersion, this.cmdDeviceAddress, machineCmd.cmdOpenDeliveryBin, cmdData),
      'hex',
    )
    setLog('info', cmdHex)
    const result = await SerialPortFunc(this.serialport, cmdHex)
    console.log('get port data ============> ', result)
    if (result[9] === 0) {
      return { Result: true, Msg: `0x0${result[9].toString(16)}` }
    } else {
      return { Result: false, Msg: `0x0${result[9].toString(16)}` }
    }
  }
}
async function SerialPortFunc(port, cmdHex) {
  // port物件 ,輸入指令 , 攔截的機器指令長度
  return new Promise((resolve, reject) => {
    port.write(cmdHex, function (err) {
      if (err) {
        throw new Error('Error on write: ' + err.message)
      }
      console.log('message written')
      //completed = "true"
    })
    port.on('error', function (err) {
      console.log('Error on opening or other events: ', err.message)
    })
    port.drain(err => {
      if (err) return
      console.log('send ok')
    })
    port.on('readable', () => {
      setTimeout(() => {
        port.read()
      }, 1000) // 等待機器碼都讀取完畢
    })
    port.on('data', data => {
      console.log(data)
      resolve(data)
    })
    // port.flush(err=>{ // 清空暫存
    //   if (err) return
    //   console.log('clean ok')
    // })
  })
}
class ScanClass {
  //條碼機
  constructor() {
    this.serialport = new SerialPort({ path: setting.scan, baudRate: 9600 }) // 初始化物件
  }
  async check() {
    try {
      const res = this.serialport.isOpen
      return res
    } catch {
      return false
    }
  }
  async read() {
    return new Promise(async (resolve, reject) => {
      const getHex = await SerialPortFunc(this.serialport, '')
      resolve(getHex.toString())
    })
  }
  isInvoice(string) {
    // 載具
    var regexp = /^\/{1}[0-9A-Z\.+-]{7}$/
    return regexp.test(string)
  }
}
/*全域變數區*/
const scan = new ScanClass()
const machine = new wm500()

let info = { phoneCode: '', '': '' } // 用來存一些資訊的 obj
const trackTable = new Map([
  [
    'row0',
    new Map([
      ['col1', 105],
      ['col2', 104],
      ['col3', 103],
      ['col4', 102],
      ['col5', 101],
      ['col6', 100],
    ]),
  ],
  [
    'row1',
    new Map([
      ['col1', 115],
      ['col2', 114],
      ['col3', 113],
      ['col4', 112],
      ['col5', 111],
      ['col6', 110],
    ]),
  ],
  [
    'row2',
    new Map([
      ['col1', 125],
      ['col2', 124],
      ['col3', 123],
      ['col4', 122],
      ['col5', 121],
      ['col6', 120],
    ]),
  ],
  [
    'row3',
    new Map([
      ['col1', 135],
      ['col2', 134],
      ['col3', 133],
      ['col4', 132],
      ['col5', 131],
      ['col6', 130],
    ]),
  ],
  [
    'row4',
    new Map([
      ['col1', 145],
      ['col2', 144],
      ['col3', 143],
      ['col4', 142],
      ['col5', 141],
      ['col6', 140],
    ]),
  ],
  [
    'row5',
    new Map([
      ['col1', 155],
      ['col2', 154],
      ['col3', 153],
      ['col4', 152],
      ['col5', 151],
      ['col6', 150],
    ]),
  ],
  [
    'row6',
    new Map([
      ['col1', 165],
      ['col2', 164],
      ['col3', 163],
      ['col4', 162],
      ['col5', 161],
      ['col6', 160],
    ]),
  ],
  [
    'row7',
    new Map([
      ['col1', 175],
      ['col2', 174],
      ['col3', 173],
      ['col4', 172],
      ['col5', 171],
      ['col6', 170],
    ]),
  ],
])
function returnMessage(msg, returnVue) {
  let sendData = {}
  sendData = {
    Method: msg,
    Data: returnVue,
  }
  sendToVue('send_data', sendData)
}
async function machineListen(type) {
  return new Promise(() => {
    let errorListen = machine.serialport
    errorListen.on('readable', () => {
      setTimeout(() => {
        errorListen.read()
      }, 1000) // 等待機器碼都讀取完畢
    })
    errorListen.on('data', data => {
      // setLog('info','machineListen')
      // setLog('info', data)
      try {
        switch (type) {
          case 'machine': // 機器主動回傳
            if (data[0] === 255 && data[6] === 224 && data[17] !== 0) {
              // 監測機器主動回傳的訊息目前用位址判斷
              // returnMessage('heartbeatLineRes',{Yellow:true,Type:"machineError",Error:"機台主動回報錯誤 錯誤代碼為:"+`0x0${data[17].toString(16)}`})
              setLog('info', '機台主動回報錯誤 錯誤代碼為:' + `0x0${data[17].toString(16)}`)
            }
            break
          case 'outdoor': // 出貨口主動回傳
            if (data[0] === 255 && data[6] === 225) {
              // 監測機器主動回傳的訊息目前用位址判斷
              setLog('info', '看看是不是log')
              if (data[17] === 3) {
                returnMessage('shippingSuccess', {})
              }
            }
            break
        }
      } catch {
        setLog('info', '可能不是這個指令')
      }
    })
  })
}
export async function setIpcData(data) {
  // 防錯提示
  if (!data?.Method || !data?.Data) {
    sendToVue('send_data', {
      Method: 'error',
      Data: {
        errorMessage: '資料錯誤，沒有傳遞Method或Data',
      },
    })
    return
  }
  let returnVue = {}
  // 根據Method處理內容
  switch (data.Method) {
    case 'checkHardwareStatus':
    case 'heartbeatLine':
      /*機器管理功能中的「自我檢查」才需要做硬體檢查
      硬體檢查分成
      機器 (主板檢測)
      COM PORT 檢測
      出貨口檢測
      悠遊卡機初始化
      信用卡機初始化 (沒有的話就不用做)
      QR Code Scanner 初始化 (沒有的話就不用做) */
      let scan_check = await scan.check()
      let machine_check = await machine.check()
      let easy_card_check = await easycard({ TXN_PAY: 'EasyCard', TXN_TYPE: 'signon' }, configFile)
      setLog('info', 'easy_card_check:')
      setLog('info', easy_card_check)
      setLog('info', 'scan_check:' + scan_check)
      setLog('info', 'machine_check:' + machine_check)
      if (scan_check && machine_check) {
        returnVue = { Result: true }
      } else {
        returnVue = { Result: false }
      }
      returnMessage('hardwareStatusRes', returnVue)
      if (data.Method == 'heartbeatLine') {
        let check_list = []
        returnVue = await machine.CheckDelivery()
        check_list.push({ Type: 'delivery_check', Result: returnVue.Result, Error: '出貨口有異物' })
        returnVue = await machine.OpenDoor()
        machineListen('machine')
        // machineListen("outdoor")
        check_list.push({ Type: 'opendoor_check', Result: returnVue.Result, Error: '閘門開啟失敗' })
        easy_card_check = await easycard({ TXN_PAY: 'EasyCard', TXN_TYPE: 'signon' }, configFile)
        if (easy_card_check.TXN_RESP_CODE !== '0') {
          returnMessage('postExceptionNotify', { error: '悠遊卡初始化失敗' })
          returnMessage('heartbeatLineRes', { Yellow: true, Type: 'easy_card_check', Error: '悠遊卡初始化失敗' })
          break
        }
        machine_check = await machine.check()
        check_list.push({ Type: 'machine_check', Result: machine_check, Error: '機器通道檢查失敗' })
        scan_check = await scan.check()
        check_list.push({ Type: 'scan_check', Result: scan_check, Error: '掃碼機通道檢查失敗' })
        for (let i = 0; i < check_list.length; i++) {
          if (check_list[i].Result === false) {
            returnMessage('heartbeatLineRes', { Yellow: true, Type: check_list[i].Type, Error: check_list[i].Error })
            break
          }
        }
        returnMessage('heartbeatLineRes', { Yellow: false, Type: null, Error: null })
      }
      break
    case 'scanPayment':
      console.log(data.Data)
      if (data.Data.type == 'credit') {
        const inputInfo = `
      TRADETYPE = ${data.Data.tradetype}\r\n
      SHOPORDERNO = ${data.Data.shoporderno}\r\n
      AMOUNT = ${data.Data.amount}\r\n
      COMMODITYINFO = ${data.Data.commodityinfo}\r\n
      BANK = UB\r\n
      PAYMENTTYPE = Credit\r\n
      BATCHNO = ${data.Data.batchno}\r\n
      ENTRYMODE = Contactless\r\n
      DEVICE = EDC\r\n
      DEVICESN =  ${configFile.credit_devicesn}\r\n
      DEVICEID = ${data.Data.deviceid}\r\n
      SHOPID = ${configFile.shopid}\r\n
      `
        returnVue = {} // 初始化回傳的結果
        const result = await payment(inputInfo, configFile)
        setLog('info', result)
        if (result.RESPONSECODE === 'C000000') {
          returnVue['Result'] = true
          returnVue['Msg'] = 'ok'
        } else {
          returnVue['Result'] = false
          returnVue['Msg'] = null
        }
      } else if (data.Data.type == 'easycard') {
        const inputInfo = {}
        inputInfo['TXN_PAY'] = 'EasyCard'
        inputInfo['TXN_TYPE'] = 'sale'
        inputInfo['TXN_AMOUNT'] = data.Data.amount
        const result = await easycard(inputInfo, configFile)
        setLog('info', result)
        if (result.TXN_RESP_CODE === '0') {
          returnVue['Result'] = true
          returnVue['Msg'] = 'ok'
        } else {
          returnVue['Result'] = false
          returnVue['Msg'] = null
        }
      }
      returnMessage('scanPaymentRes', returnVue)
      break
    case 'scanReceipt':
    case 'scanEventQR':
    case 'scanThirdQR': // 單純掃碼回傳
      returnVue = {} // 初始化
      const serialNumber = await scan.read() //讀取
      const reg = /(.*?)\r/
      returnVue['Result'] = true
      returnVue['Msg'] = serialNumber.match(reg)[1]
      setLog('info', 'scan_get' + returnVue.Msg)
      let method = ''
      if (data.Method == 'scanEventQR') {
        method = 'scanEventQRRes'
      } else if (data.Method == 'scanThirdQR') {
        method = 'scanThirdQRRes'
      } else if (data.Method == 'scanReceipt') {
        method = 'scanReceiptRes'
        if (scan.isInvoice(returnVue.Msg) === true) {
          // 驗證是否為手機載具
          returnVue.Result = true
        } else {
          returnVue.Result = false
          returnVue.Msg = 'not phoneCode'
        }
      }
      returnMessage(method, returnVue)
      break
    case 'shipping':
      returnVue = {} // 初始化
      let sendTrackNO = 0
      let sendorderNo = 0
      try {
        if (data.Data.type === 'payment') {
          sendorderNo = data.Data.shoporderno.split('-')[1]
        } else {
          sendorderNo = data.Data.drawlotRecordID
        }
      } catch {
        returnMessage('shippingRes', { Result: false, Msg: '資料錯誤' })
        break
      }
      try {
        if (data.Data.rackStorageID < 10) {
          sendTrackNO = trackTable.get('row0').get(`col${data.Data.rackStorageID}`)
        } else {
          // console.log(`row${data.Data.rackStorageID/10}`)
          sendTrackNO = trackTable
            .get(`row${Math.floor(data.Data.rackStorageID / 10)}`)
            .get(`col${data.Data.rackStorageID % 10}`)
        }
        returnVue = await machine.SaleItem(sendTrackNO, sendorderNo)
        machineListen('outdoor')
        returnMessage('shippingRes', returnVue)
        if (returnVue.Result == false) {
          returnMessage('postExceptionNotify', { error: '出貨失敗，錯誤代碼為' + returnVue.Msg })
        }
      } catch {
        returnMessage('shippingRes', { Result: false, Msg: '找不到軌道' })
      }
      break
    case 'restoreArm':
      returnVue = await machine.ReceiveDoorArm()
      returnMessage('restoreArmRes', returnVue)
      break
    case 'checkPickUpPort':
      returnVue = await machine.CheckDelivery()
      returnMessage('checkPickUpPortRes', returnVue)
      if (returnVue.Result == false) {
        returnMessage('postExceptionNotify', { error: '出貨口目前有異物' })
      }
      break
    case 'settle':
      var batchno = data.Data
      console.log(`settle data = ${batchno}`)
      setLog('info', '開始執行硬體卡機結帳')
      //#region 信用卡結帳
      const timestamp = DateTime.now().toMillis()
      const timestampInteger = Math.floor(timestamp / 1000)
      const inputInfo = `
        TRADETYPE = CREDITSETTLEMENT\r\n
        SHOPORDERNO = ${timestampInteger}\r\n
        COMMODITYINFO = 自販機結帳\r\n
        AMOUNT = 1\r\n
        BANK = UB\r\n
        PAYMENTTYPE = Credit\r\n
        DEVICE = EDC\r\n
        DEVICESN =  ${configFile.credit_devicesn}\r\n
        DEVICEID = ${configFile.machine_id}\r\n
        BATCHNO = ${batchno}\r\n
      `
      console.log(`信用卡結帳資訊：`)
      console.log(inputInfo)
      returnVue = {} // 初始化回傳的結果
      var result = await payment(inputInfo, configFile)
      // returnMessage('settleRes',returnVue)
      setLog('info', result)
      console.log(`信用卡結帳結果：`)
      console.log(result)
      var msg = ''
      if (result.RESPONSECODE === 'C000000') {
        msg = `【信用卡結帳成功】`
        returnVue['Result'] = true
        returnVue['Msg'] = msg
      } else {
        msg = `【信用卡結帳失敗】，錯誤代碼為:${result.RESPONSECODE}`
        setLog('error', msg)
        returnVue['Result'] = false
        returnVue['Msg'] = msg
      }
      //#endregion

      //#region 悠遊卡結帳
      var easyCardInput = {}
      easyCardInput.TXN_PAY = 'EasyCard'
      easyCardInput.TXN_TYPE = 'settle'
      console.log(`悠遊卡結帳資訊：`)
      console.log(easyCardInput)
      result = await easycard(easyCardInput, configFile)
      console.log(`悠遊卡結帳結果：`)
      console.log(result)
      setLog('info', result)
      if (result.TXN_RESP_CODE === '0') {
        msg += `;【悠遊卡結帳成功】`
        returnVue['Result'] = returnVue['Result'] && true
        returnVue['Msg'] = msg
      } else {
        msg += `;【悠遊卡結帳失敗】，錯誤代碼:${result.TXN_RESP_CODE}; 錯誤訊息: ${result.Msg}`
        setLog('error', msg)
        returnVue['Result'] = false
        returnVue['Msg'] = msg
      }
      //#endregion
      returnMessage('settleResult', returnVue)
      break
  }
}
