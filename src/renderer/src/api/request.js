import axios from 'axios'
import { useIPCData, useErrorMsg, useProducts } from '@renderer/store/index.js'
import { storeToRefs } from 'pinia'
import { convertSign } from '@renderer/utils/crypto.js'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API,
  timeout: 10000,
})

const instance_invoice = axios.create({
  baseURL: import.meta.env.VITE_INVOICE_API,
  timeout: 10000,
})

// 建立抽獎
export const postDrawlot = data => {
  const ipcStore = useIPCData()
  const inputData = {
    serialNumber: data.SerialNumber,
    activityID: data.ActivityID,
    machineID: ipcStore.extraConfig.machine_id,
  }
  return instance.post('/Activity/Drawlot', inputData)
}

// 取得產品列表
export const getGetProducts = params => {
  return instance.get('/Product/GetProducts', { params })
}

// 取得產品資料
export const getProductStock = () => {
  const ipcStore = useIPCData()
  const params = {
    machineID: ipcStore.extraConfig.machine_id,
    optional: 0,
  }
  return instance.get('/Product/GetProductStock', { params })
}

// 建立訂單
export const postCreateOrder = data => {
  const ipcStore = useIPCData()
  const inputData = {
    machineID: ipcStore.extraConfig.machine_id,
    productID: data.productID,
    rackStorageID: data.rackStorageID,
    quantity: data.quantity,
    amount: data.amount,
  }
  return instance.post('/Product/CreateOrder', inputData)
}

// 訂單成功付款之後回call
export const postBuyProducts = data => {
  const inputData = {
    //batchno: data.batchno,
    orderid: data.orderid,
  }
  return instance.post('/Product/BuyProducts', inputData)
}

// 開立發票
export const postInvoice = data => {
  const inputData = {
    orderId: data.shoporderno.split('-')[1],
    unitPrice: data.salePrice,
    orderDate: data.orderDate,
    donateMark: data.donateMark,
    carrierType: data.carrierType,
    carrierId1: data.carrierId1,
    npoban: data.npoban,
    payWay: data.payWay,
    productName: data.name,
    buyerEmailAddress: '',
    buyerIdentifier: '',
    buyerName: '',
    remark: '',
    payTypeID: data?.PayTypeID ?? '',
  }
  return instance_invoice.post('/invoice/open', inputData)
}

// 登入後台
export const postLogin = data => {
  const inputData = {
    name: data.name,
    password: data.password,
  }
  return instance.post('/Manage/Login', inputData)
}

// 登入後台
// productStocks = 異動後庫存數-目前庫存數
export const updateStock = data => {
  const ipcStore = useIPCData()
  const inputData = {
    machineID: ipcStore.extraConfig.machine_id,
    productStocks: data.productStocks,
  }
  return instance.post('/Manage/Product/ProductStockUpdate', inputData)
}

// 付款: 第三方支付
export const postThirdPartyPay = data => {
  const ipcStore = useIPCData()
  const inputData = {
    shopOrderNo: data.shopOrderNo,
    scanCode: data.scanCode,
    amount: data.amount,
    commodityInfo: data.commodityInfo,
    deviceID: ipcStore.extraConfig.machine_id,
    shopID: ipcStore.extraConfig.shopid,
    hashKey: ipcStore.extraConfig.hash_key,
  }
  return instance_invoice.post('/Pay/ThirdPartyPay', inputData)
}

// 機器異常時通知管理人員
export const postExceptionNotify = data => {
  const ipcStore = useIPCData()
  const inputData = {
    machineID: ipcStore.extraConfig.machine_id,
    evenType: data.EvenType,
    message: data.Message,
    eventTime: data.EventTime,
  }
  return instance.post('/Log/ExceptionNotify', inputData)
}

// 心跳線燈號轉換
export const postSwitchLight = data => {
  const ipcStore = useIPCData()
  const params = {
    machineID: ipcStore.extraConfig.machine_id,
    status: data.status,
  }
  return instance.post('/Manage/SwitchLight', { params })
}

export const getCreditcardBatchNo = data => {
  const ipcStore = useIPCData()
  const params = {
    machineID: ipcStore.extraConfig.machine_id,
  }
  return instance.get('/Product/GetCreditcardBatchNo', { params })
}

// 心跳線狀態取得
// 機器正常回應: HttpStatus 200
// 機器有錯誤轉黃燈: HttpStatus 503
export const getAlive = data => {
  const ipcStore = useIPCData()
  let params = {
    machineID: ipcStore.extraConfig.machine_id,
  }
  if (data) {
    params = {
      ...params,
      eventype: data.error,
      message: data.message,
      eventtime: data.eventtime,
    }
  }
  return instance.get('/alive', { params })
}

// 加入攔截器 寫入log
const handleResponse = (res, isSuccess = true) => {
  if (isSuccess && res?.data && res.data.Status.Code !== '0') isSuccess = false
  const productsStore = useProducts()
  const { isServer } = storeToRefs(productsStore)
  const str = `
    Request URL: ${res.request.responseURL}\n
    Status Code: ${res.request.status} ${res.request.statusText}\n
    Method:  ${res.config.method}\n
    Preload: ${res.config.data}\n
    Response: ${res.request.response}\n
  `
  const ipcStore = useIPCData()
  ipcStore.sendIpcRenderer('log', {
    logType: isSuccess ? 'info' : 'error',
    msg: `API${isSuccess ? '成功' : '失敗'}: ${str}`,
  })

  if (!isSuccess) {
    const errorMsg = useErrorMsg()
    if (res.code === 'ERR_NETWORK') {
      errorMsg.setErrorMsg({
        msg: '網路連線異常，請洽客服人員，或稍後再試',
        backToHome: true,
      })
    } else if (!res.request) {
      let msg = isServer.value ? '，請洽客服人員，或稍後再試' : '，補貨功能暫停'
      if (res.config.url.includes('Login')) msg = '，請使用預設帳密進行登入'
      errorMsg.setErrorMsg({
        msg: `發生異常${msg}`,
        backToHome: isServer.value,
      })
    }
  }
  return isSuccess ? res : Promise.reject(res)
}
const addCrypto = instance => {
  instance.interceptors.request.use(config => {
    const ipcStore = useIPCData()
    const { companyId, apiKay } = storeToRefs(ipcStore)
    if (config.method === 'get') {
      config.params = config.params ?? {}
      config.params.companyID = companyId.value
      config.params = convertSign(config.params, apiKay.value)
    }
    if (config.method === 'post') {
      config.data = config.data ?? []
      config.data.companyID = companyId.value
      config.data = convertSign(config.data, apiKay.value)
    }
    return config
  })
}
const addInterceptors = instance => {
  instance.interceptors.response.use(
    response => handleResponse(response),
    error => handleResponse(error, false),
  )
}
addInterceptors(instance)
addInterceptors(instance_invoice)
addCrypto(instance)
addCrypto(instance_invoice)
