import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import Router from '@renderer/router'
import {
  getGetProducts,
  getProductStock,
  postExceptionNotify,
  postSwitchLight,
  getAlive,
  postBuyProducts,
  postThirdPartyPay,
  getCreditcardBatchNo,
} from '../api/request.js'
import { getIndexedDBImage } from '../utils/indexedDB.js'
import { ElMessage } from 'element-plus'
import { decryptPassword } from '@renderer/utils/crypto.js'
import { useMqtt } from './mqtt.js'
const HEARTBEAT_MIN = 5
const MAX_RECORD = 1000

export const useProducts = defineStore('productsStore', {
  state: () => ({
    selectedProduct: {},
    isServer: true,
    productsRes: [],
    productStockRes: [],
    isThirdPaySuccess: false,
  }),
  getters: {
    productsList: state => {
      let list = state.productStockRes.map(item => {
        const res = state.productsRes.find(el => el.productID === item.productID)
        return res ? { ...item, ...res } : false
      })
      return list.sort((a, b) => a.rackStorageID - b.rackStorageID)
    },
    stockList: state => {
      let list = state.productStockRes.map(item => {
        const res = state.productsRes.find(el => el.productID === item.productID)
        return {
          ...item,
          name: res?.name ?? '-',
          rackStorageMaxQuantity: item ? item.rackStorageMaxQuantity : 0,
          quantity: item ? item.quantity : 0,
        }
      })
      return list.sort((a, b) => a.rackStorageID - b.rackStorageID)
    },
  },
  actions: {
    async setProductsList() {
      try {
        this.productsRes = await getGetProducts()
          .then(res => res.data.data)
          .then(products =>
            Promise.all(
              products.map(async item => {
                if (item?.path) {
                  const dbImgData = await getIndexedDBImage(item.productID, item.path)
                  return { ...item, path: URL.createObjectURL(dbImgData.image) }
                } else {
                  return { ...item, path: '' }
                }
              }),
            ),
          )
        this.productStockRes = await getProductStock()
          .then(res => res.data.data)
          .catch(() => {
            const errorMsg = useErrorMsg()
            errorMsg.setErrorMsg({
              msg: 'machine_id錯誤或資料取得失敗',
              autoClose: false,
            })
          })
      } catch (e) {
        this.productsRes = []
        this.productStockRes = []
        const ipcStore = useIPCData()
        ipcStore.sendIpcRenderer('log', {
          logType: 'error',
          msg: `產品列表錯誤: ${e}`,
        })
      }
    },
    setSelectedProduct(data) {
      this.selectedProduct = data
    },
    setInvoiceDefault() {
      this.selectedProduct = {
        ...this.selectedProduct,
        orderId: '',
        unitPrice: '',
        orderDate: '',
        donateMark: '',
        carrierType: '',
        carrierId1: '',
        npoban: '',
        payWay: '',
        productName: '',
        buyerEmailAddress: '',
        buyerIdentifier: '',
        buyerName: '',
        remark: '',
      }
    },
    setIsServer(data) {
      this.isServer = data
    },
    updateProductsRes(data) {
      this.productsRes = data
      // 更新已選擇的this.selectedProduct
      if (this.selectedProduct?.ProductID) {
        const item = data.find(item => item.ProductID === this.selectedProduct.ProductID)
        if (item) {
          this.setSelectedProduct({
            ...this.selectedProduct,
            ...item,
          })
        }
      }
    },
    updateProductStockRes(data) {
      this.productStockRes = data
      // 更新已選擇的this.selectedProduct
      if (this.selectedProduct?.rackStorageID) {
        const item = data.find(item => item.rackStorageID === this.selectedProduct.rackStorageID)
        if (item) {
          this.setSelectedProduct({
            ...this.selectedProduct,
            ...item,
          })
        }
      }
    },
    paySuccess() {
      // 訂單成功付款之後回call
      postBuyProducts({ batchno: this.selectedProduct.batchno, orderid: this.selectedProduct.orderid })
        .then(res => {
          // 儲存資料
          this.setSelectedProduct({
            ...this.selectedProduct,
            rackStorageID: res.data?.data?.rackStorageID ?? this.selectedProduct.rackStorageID,
          })
        })
        .catch(e => {
          const ipcStore = useIPCData()
          ipcStore.sendIpcRenderer('log', {
            logType: 'error',
            msg: '付款成功後重新取得貨道位置失敗',
          })
          // 對流程沒有影響
        })
    },
    async thirdPartyPay(QRstring) {
      const inputData = {
        shopOrderNo: this.selectedProduct.shoporderno,
        scanCode: QRstring,
        amount: this.selectedProduct.salePrice,
        commodityInfo: this.selectedProduct.name,
      }
      await postThirdPartyPay(inputData)
        .then(res => {
          if (res.data.Status.Code === '0') {
            this.isThirdPaySuccess = true
            this.selectedProduct.payTypeID = res.data.data.PayTypeID
            this.paySuccess()
            Router.push('/InvoiceCarrier')
          } else throw new Error()
        })
        .catch(e => {
          this.isThirdPaySuccess = false
          const ipcStore = useIPCData()
          ipcStore.sendIpcRenderer('log', {
            logType: 'error',
            msg: '第三方支付失敗',
          })
          const errorMsg = useErrorMsg()
          errorMsg.setErrorMsg({ msg: '付款失敗，請重新選擇付款方式' })
          Router.push({ name: 'Payment', query: { isWaiting: false } })
        })
    },
    clearData() {
      this.isThirdPaySuccess = false
    },
  },
})

// 分類並儲存main.js傳遞回來的資料
export const useIPCData = defineStore('IPCStore', {
  state: () => ({
    scanReceiptRes: {},
    scanPaymentRes: {},
    scanEventQRRes: {},
    shippingRes: {},
    loadingRes: {},
    scanThirdQRRes: {},
    pickUpPortRes: {},
    apiKay: '',
    companyId: '',
    logRecord: [],
    heartbeatLineRecord: [],
    extraConfig: {},
    isShippingSuccess: false,
  }),
  actions: {
    setIPCData(ipcData) {
      this.sendIpcRenderer('log', {
        msg: `成功取得主進程資料：\n${JSON.stringify(ipcData)}`,
      })
      // 彈出訊息
      this.logRecord.push({ Name: '接收機器訊息', ...ipcData })
      if (this.extraConfig.debug_mode)
        ElMessage({
          showClose: true,
          message: ipcData,
          center: true,
          duration: 0,
        })

      switch (ipcData.Method) {
        case 'scanReceiptRes':
          this.scanReceiptRes = ipcData.Data
          break
        case 'scanPaymentRes':
          this.scanPaymentRes = ipcData.Data
          if (ipcData.Data?.Result) {
            const productsStore = useProducts()
            productsStore.paySuccess()
            Router.push('/InvoiceCarrier')
          } else {
            const errorMsg = useErrorMsg()
            errorMsg.setErrorMsg({
              msg: ipcData.Data?.Msg ?? '付款失敗，請重新選擇付款方式',
            })
            Router.push({ name: 'Payment', query: { isWaiting: false } })
          }
          break
        case 'scanEventQRRes':
          this.scanEventQRRes = ipcData.Data
          break
        case 'shippingRes':
          this.shippingRes = ipcData.Data
          break
        case 'loadingRes':
          this.loadingRes = ipcData.Data
          break
        case 'scanThirdQRRes':
          const productsStore = useProducts()
          // 避免重複扣款，付款成功後isPaySuccess＝true
          if (productsStore.isThirdPaySuccess) return

          this.scanThirdQRRes = ipcData.Data
          if (ipcData.Data?.Result) {
            this.isThirdPaySuccess = true
            productsStore.thirdPartyPay(ipcData.Data?.Msg)
          } else {
            const errorMsg = useErrorMsg()
            errorMsg.setErrorMsg({
              msg: ipcData.Data?.Msg ?? 'QRcode讀取失敗，請重新選擇付款方式',
            })
            Router.push({ name: 'Payment', query: { isWaiting: false } })
          }
          break
        case 'checkPickUpPortRes':
          this.pickUpPortRes = ipcData.Data
          break
        case 'hardwareStatusRes':
          if (!ipcData.Data.Result) {
            const errorMsg = useErrorMsg()
            errorMsg.setErrorMsg({ msg: '機器檢查異常', autoClose: false })
          }
          break
        case 'postExceptionNotify':
          // 發送信件
          const errorMsg = useErrorMsg()
          errorMsg.sendExceptionNotify(ipcData.Data)
          break
        case 'heartbeatLineRes':
          // 儲存心跳線的資料結果
          this.setHeartbeatLineArray(ipcData.Data)
          break
        case 'updateConfig':
          this.updateExtraConfig(ipcData.Data)
          break
        case 'shippingSuccess':
          this.setShippingSuccess(true)
          break
        case 'settleResult':
          if (ipcData.Data) {
            const errorMsg = useErrorMsg()
            errorMsg.sendExceptionNotify(ipcData.Data)
          }
          break
      }
    },
    setApiKey(data) {
      this.companyId = data.companyId
      this.apiKay = data.apiKey
    },
    clearData() {
      this.scanReceiptRes = {}
      this.scanPaymentRes = {}
      this.scanEventQRRes = {}
      this.shippingRes = {}
      this.loadingRes = {}
      this.scanThirdQRRes = {}
      this.pickUpPortRes = {}
      this.isShippingSuccess = false
      const productsStore = useProducts()
      productsStore.clearData()
    },
    sendIpcRenderer(methodName, data) {
      const msg = {
        Method: methodName,
        Data: data,
      }
      // 彈出訊息
      this.logRecord.push({ Name: '傳送給機器端', ...msg })
      if (this.extraConfig.debug_mode && methodName !== 'log')
        ElMessage({ showClose: true, message: msg, center: true, duration: 0 })
      if (this.logRecord.length > MAX_RECORD) this.logRecord.shift()
      if (window.ipcRenderer) window.ipcRenderer.send('sendData', msg)
    },
    clearLogRecord() {
      this.logRecord = []
    },
    async initHeartbeatLine() {
      // 每HEARTBEAT_MIN分鐘推一次api
      this.setHeartbeatLineArray()
      setInterval(
        () => {
          this.setHeartbeatLineArray()
        },
        1000 * 60 * HEARTBEAT_MIN,
      )
    },
    async setHeartbeatLineArray(data = null) {
      const isYellow = data?.Yellow ?? false
      const newRecord = {
        time: dayjs().format('hh:mm'),
        totalTime: dayjs().format('YYYY-MM-DD hh:mm'),
        errorMsg: data?.Error ?? '',
        errorType: data?.Type ?? '',
      }
      if (this.heartbeatLineRecord.length >= MAX_RECORD) this.heartbeatLineRecord.shift()
      if (!navigator.onLine) return this.heartbeatLineRecord.push({ ...newRecord, color: 'red' })
      try {
        // 'green': 0,   // 一切正常
        // 'yellow': 1,  // 機器檢查異常
        // 'red': 2,     // 無網路連線
        if (data) await postSwitchLight({ status: isYellow ? 1 : 0 })
        // 機器正常回應: HttpStatus 200
        // 機器有錯誤轉黃燈: HttpStatus 503
        const input = {
          eventype: data?.Type ?? '',
          message: data?.Error ?? '',
          eventtime: dayjs().format('YYYY-MM-DD HH:mm:ssZ'),
        }
        await getAlive(isYellow ? input : null)
          .then(res => {
            this.heartbeatLineRecord.push({ ...newRecord, color: 'green' })
          })
          .catch(e => {
            if (e.response.status === 503) this.heartbeatLineRecord.push({ ...newRecord, color: 'yellow' })
          })
      } catch (e) {}
    },
    updateExtraConfig(newConfigData) {
      this.extraConfig = newConfigData

      // 取得apiKey明碼
      const key = import.meta.env.VITE_HASHKEY
      const decryptKey = decryptPassword(this.extraConfig.apiKey, key)
      const data = {
        companyId: this.extraConfig.apiCompanyId,
        apiKey: decryptKey,
      }
      if (decryptKey !== '') this.setApiKey(data)

      // mqtt 連線/重新連線
      const mqttStore = useMqtt()
      mqttStore.ReconnectMqtt()
    },
    setShippingSuccess(bool) {
      this.isShippingSuccess = bool
    },
    async doSettle(machineId) {
      const errorMsg = useErrorMsg()
      errorMsg.setErrorMsg({ msg: `Machine: ${machineId} 開始日結程序` })
      await getCreditcardBatchNo(machineId)
        .then(res => res.data.data)
        .then(res => {
          console.log(res)
          console.log(`取得結帳流水號 ${res.batchno}，即將呼叫機器端結帳程序`)
          this.sendIpcRenderer('settle', res.batchno)
        })
      //this.logRecord.push({ Name: '傳送給機器端', ...msg })
      //this.sendIpcRenderer('shippingSuccess', true)
    },
  },
})

export const useErrorMsg = defineStore('errorMsgStore', {
  state: () => ({
    msg: '',
    backToHome: false,
    autoClose: false,
  }),
  actions: {
    // 黃色的彈出訊息
    setErrorMsg(data) {
      this.msg = data?.msg ?? ''
      this.backToHome = data?.backToHome ?? false
      this.autoClose = data?.autoClose ?? true
    },
    // 發送錯誤信件通知管理者
    async sendExceptionNotify(data) {
      const inputData = {
        EvenType: 'Error',
        Message: JSON.stringify(data),
        EventTime: dayjs().format(),
      }
      // await postExceptionNotify(inputData)
    },
  },
})
