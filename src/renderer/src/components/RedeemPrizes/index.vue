<template>
  <div class="view_redeem_prizes">
    <div v-if="!isPickUpPortSuccess" class="check_pickup_port">
      <div class="back" @click="back">
        <el-icon><ArrowLeftBold /></el-icon>
      </div>
      <el-icon class="icon" :size="50"><Loading /></el-icon>
      <p>檢查出貨口</p>
    </div>
    <div v-else>
      <div class="scan_code" v-if="!drawlotResult">
        <div class="back" @click="back">
          <el-icon><ArrowLeftBold /></el-icon>
        </div>
        <div class="view_title">
          <span>掃碼參加抽獎</span>
          <div class="alert">
            <el-icon><Warning /></el-icon>
            <div>僅限活動範圍之憑證符合抽獎範圍</div>
          </div>
        </div>
        <div></div>
        <img class="eventImg" :src="getUrl('event.png')" />
        <div class="invoice_scan" :class="{ opacity40: scanErrorMsg }">
          <div class="view_title">讀取器啟動</div>
          <div class="sub">請將銷貨明細移至讀取區</div>
          <Card :imgName="'img_handqr.png'">
            <template v-slot:handlabel>銷貨明細</template>
            <template v-slot:scanlabel>QRcode掃描區</template>
          </Card>
        </div>
        <div class="progress" :class="{ opacity0: scanErrorMsg || !isLoading }">
          <p>資料處理中 ...</p>
          <el-progress :percentage="100" color="black" :show-text="false" :indeterminate="true" :duration="2" />
        </div>
        <!-- Error -->
        <div v-if="scanErrorMsg" class="scan_error">
          <img :src="getUrl('img_404.png')" />
          <p>{{ scanErrorMsg }}，{{ errSec }} 秒後將自動返回首頁 ...</p>
        </div>
      </div>
      <viewRedeemPrizes :drawlotResult="drawlotResult" />
    </div>
  </div>
</template>

<script setup>
  import { Loading } from '@element-plus/icons-vue'
  import { onMounted, ref, watch, onUnmounted } from 'vue'
  import { Warning, ArrowLeftBold } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import viewRedeemPrizes from './RedeemPrizes.vue'
  import Card from '../invoiceCarrier/Card.vue'
  import { storeToRefs } from 'pinia'
  import { useIPCData, useErrorMsg } from '@renderer/store/index.js'
  import { postDrawlot } from '@renderer/api/request.js'

  const ipcStore = useIPCData()
  const { scanEventQRRes, pickUpPortRes } = storeToRefs(ipcStore)
  const errorMsg = useErrorMsg()

  const router = useRouter()

  const getUrl = filename => {
    return new URL(`/src/assets/redeemPrizes/${filename}`, import.meta.url).href
  }
  const back = () => {
    router.push('/')
  }

  const scanErrorMsg = ref('')
  const errSec = ref(5)
  const secondInterval = ref(null)
  const isLoading = ref(false)
  watch(scanErrorMsg, val => {
    clearInterval(secondInterval.value)
    if (val) {
      // 倒數
      secondInterval.value = setInterval(() => {
        if (errSec.value <= 0) {
          clearInterval(secondInterval.value) // 停止計時器
          router.push('/')
        }
        errSec.value--
      }, 1000)
    }
  })

  const isPickUpPortSuccess = ref(false)

  // 1. 檢查出貨口
  onMounted(() => {
    ipcStore.sendIpcRenderer('checkPickUpPort', {})
  })

  // 出貨正常再開啟掃描
  watch(pickUpPortRes, val => {
    if (Object.keys(val).length !== 0) {
      if (val.Result) {
        isPickUpPortSuccess.value = true
        ipcStore.sendIpcRenderer('scanEventQR', {})
      } else {
        errorMsg.setErrorMsg({
          msg: '出貨口異常，請檢查是否有物品未拿取，或洽服務人員處理。',
          autoClose: false,
        })
        router.push('/')
      }
    }
  })

  // 2. 接收到掃描結果的回應
  const isCallApi = ref(true)
  const callApiTimer = ref(null)
  watch(scanEventQRRes, val => {
    if (Object.keys(val).length !== 0 && !drawlotResult.value) {
      if (val.Result && val.Msg && isCallApi.value) {
        const inputData = {
          SerialNumber: val.Msg.replace(/[\r\n]/g, ''),
          ActivityID: import.meta.env.VITE_ACTIVITYID,
        }
        // 取得抽獎結果
        getDrawlotResult(inputData)
      }
      // 三秒內不重複呼叫api
      isCallApi.value = false
      callApiTimer.value = setTimeout(() => (isCallApi.value = true), 3000)
    }
  })

  // 3. 取得抽獎結果
  const drawlotResult = ref(null)
  const getDrawlotResult = async inputData => {
    isLoading.value = true
    await postDrawlot(inputData)
      .then(res => {
        isLoading.value = false
        if (res.data.data) {
          clearInterval(secondInterval.value)
          // 顯示抽獎結果
          drawlotResult.value = res.data.data
        } else {
          // 號碼失效等錯誤
          drawlotResult.value = null
          const errCode = {
            1001: '序號或發票號碼已被使用',
            1004: 'QR Code 無法使用',
          }
          scanErrorMsg.value = errCode?.[res.data.Status.Code] ?? '未找到對應號碼'
        }
      })
      .catch(e => {
        ipcStore.sendIpcRenderer('log', { logType: 'error', msg: '抽獎失敗' })
        isLoading.value = false
        drawlotResult.value = null
        scanErrorMsg.value = '未找到對應號碼'
        errorMsg.setErrorMsg({ msg: `抽獎程式發生錯誤，${e}` })
      })
  }

  onUnmounted(() => {
    clearInterval(secondInterval.value)
    clearInterval(callApiTimer.value)
  })
</script>

<style scoped>
  .view_redeem_prizes {
    display: flex;
    justify-content: center;
  }
  .scan_code {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    height: 100%;
  }
  .view_title {
    height: auto;
  }

  .view_title > span {
    line-height: 60px;
  }

  .scan_code .alert {
    display: flex;
    align-items: center;
    border: 1px solid #e84848;
    color: #e84848;
    line-height: normal;
    font-size: 0.8em;
    text-align: left;
    inline-size: fit-content;
    margin: 0.8em auto 0 auto;
    padding: 0.8em;
    border-radius: 10px;
  }
  .scan_code .alert i {
    padding-right: 8px;
  }
  .scan_code .invoice_scan {
    text-align: center;
  }
  .scan_code .invoice_scan .sub {
    color: gray;
  }
  .scan_code .invoice_scan .image {
    display: flex;
    justify-content: space-evenly;
    padding-top: 20px;
    color: gray;
  }
  .scan_code .invoice_scan .image img {
    width: 140px;
  }
  .scan_code .invoice_scan .image span {
    color: orange;
  }
  .scan_code .progress {
    padding-bottom: 3em;
    width: 80vw;
    margin: 0 auto;
    text-align: center;
  }

  .scan_code .opacity40 {
    opacity: 0.4;
  }
  .scan_code .opacity0 {
    opacity: 0;
  }

  .scan_error {
    color: #e84848;
    text-align: center;
    padding-bottom: 3em;
    position: absolute;
    bottom: 0;
  }
  .scan_error p {
    padding: 1em 0 5px 0;
    border-bottom: 4px solid;
  }

  .demo button {
    font-size: 1em;
    padding: 1em;
  }

  .eventImg {
    width: 80vw;
  }

  .check_pickup_port {
    position: fixed;
    background-color: white;
    width: 100vw;
    height: calc(100% - 200px);
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  }
  :deep .check_pickup_port .icon {
    animation: rotate 3s linear infinite;
  }
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
