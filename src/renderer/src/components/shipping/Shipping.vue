<template>
  <div class="view_shipping">
    <!-- // todo delete -->
    <div v-if="isShowBackButton" class="back" @click="back">
      <el-icon><ArrowLeftBold /></el-icon>
    </div>
    <div class="content">
      <h3>
        {{ shippingRes?.Result ? '出貨成功！' : '購買成功！出貨中 ... ' }}
      </h3>
      <div :class="['invoice_state', 'invoice_state_' + state.state]">
        發票狀態：
        <span>{{ state.message }}</span>
      </div>
      <img :src="getUrl('complete.png')" width="40px" />
      <el-image class="product_img" :src="selectedProduct?.path" fit="cover">
        <template #error>
          <img :src="getUrl('product/default.jpg')" />
        </template>
      </el-image>
      <div class="product_info">
        <div class="name">{{ selectedProduct?.name }}</div>
        <div class="price">
          $<span>{{ selectedProduct?.salePrice }}</span>
        </div>
      </div>
    </div>
    <Step :activeID="4" />
  </div>
</template>

<script setup>
  import { ArrowLeftBold } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import { ref, onMounted, inject, watch, onUnmounted } from 'vue'
  import Step from '@renderer/components/public/Step.vue'
  import { storeToRefs } from 'pinia'
  import { useProducts, useIPCData, useErrorMsg } from '@renderer/store/index.js'
  import { postInvoice } from '@renderer/api/request.js'
  const errorMsg = useErrorMsg()
  const productsStore = useProducts()
  const { selectedProduct } = storeToRefs(productsStore)
  const ipcStore = useIPCData()
  const { shippingRes, isShippingSuccess } = storeToRefs(ipcStore)
  const router = useRouter()
  const playAudio = inject('playAudio')
  const isTimeOutToHome = inject('isTimeOutToHome')
  const orderResult = ref(null)
  const errTimer = ref(null)
  const isShowBackButton = ref(false)

  const invoiceState = [
    { state: 'loading', message: '開立發票中...' },
    { state: 'success', message: '開立成功！' },
    { state: 'error', message: '開立失敗，請聯繫客服！' },
  ]

  const state = ref(invoiceState[0])

  const back = () => {
    playAudio('back')
    router.push('/home')
  }

  const getUrl = filename => {
    return new URL(`/src/assets/${filename}`, import.meta.url).href
  }

  // todo 串接發票API
  const init = () => {
    // 發票開立
    postInvoice(selectedProduct.value)
      .then(res => {
        // 儲存資料
        state.value = invoiceState[1]
        orderResult.value = res.data
      })
      .catch(e => {
        ipcStore.sendIpcRenderer('log', {
          logType: 'error',
          msg: '發票開立失敗',
        })
        state.value = invoiceState[2]
        // 發信件通知
        errorMsg.sendExceptionNotify({
          error: '發票開立失敗',
          productData: selectedProduct.value,
          catch: e.toString(),
        })
      })
  }
  init()

  onMounted(() => {
    // 初始化參數
    ipcStore.setShippingSuccess(false)
    // 傳遞出貨內容
    ipcStore.sendIpcRenderer('shipping', {
      type: 'payment',
      rackStorageID: selectedProduct.value.rackStorageID,
      shoporderno: selectedProduct.value.shoporderno,
    })
    // 關閉超過時間自動跳回首頁的功能
    isTimeOutToHome.value = false

    // 三分鐘內沒有收到shippingRes，出現錯誤訊息
    errTimer.value = setTimeout(
      () => {
        errorMsg.setErrorMsg({
          msg: '出貨異常，請洽服務人員',
          autoClose: false,
        })
        isShowBackButton.value = true
        // 發信件通知
        errorMsg.sendExceptionNotify({
          error: '三分鐘內沒有收到機器的出貨確認回傳，機器已停止',
          productData: selectedProduct.value,
        })
      },
      1000 * 60 * 3,
    )
  })

  // 開始出貨的訊號
  watch(shippingRes, val => {
    if (Object.keys(val).length !== 0) {
      clearTimeout(errTimer.value)
      if (!val.Result) {
        isShowBackButton.value = true
        errorMsg.setErrorMsg({
          msg: `出貨發生錯誤，請洽客服人員，錯誤代碼：${val.Msg}`,
          autoClose: false,
        })
      }
    }
  })
  // 取貨完成的訊號
  watch(isShippingSuccess, val => {
    if (val) {
      // 兩秒後跳回首頁
      setTimeout(() => router.push('/home'), 2000)
    }
  })

  onUnmounted(() => {
    clearTimeout(errTimer.value)
    isTimeOutToHome.value = true
  })
</script>

<style scoped>
  .view_shipping {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    margin: 0 auto;
  }
  .content {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
    justify-content: center;
  }
  .view_payment_processing h3 {
    text-align: center;
    color: #666;
    font-weight: normal;
    margin: 10px 0;
  }
  .view_payment_processing img {
    width: 100%;
    height: auto;
    max-width: 840px;
    margin: 1em 0;
  }
  .view_payment_processing .help {
    width: 100%;
    height: auto;
    max-width: 440px;
  }
  :deep .product_img {
    text-align: center;
  }
  :deep .product_img img {
    border-radius: 30px;
    width: 100%;
    height: auto;
  }
  .product_info {
    display: flex;
    width: 80%;
    justify-content: space-between;
    align-items: flex-end;
    margin: 0 auto;
    flex-grow: 1;
  }
  .product_info .name {
    display: flex;
    font-size: 1.6em;
    font-weight: bold;
    padding-bottom: 15px;
  }
  .product_info .price {
    color: #ff9804;
    font-family: 'Oswald';
    font-size: 2em;
    text-align: center;
    padding-left: 10px;
  }
  .product_info .price span {
    font-size: 2em;
    padding-left: 5px;
  }

  .invoice_state {
    font-size: 1.1em;
    font-weight: 700;
    margin-bottom: 20px;
  }

  .invoice_state_error {
    color: red;
  }
  .invoice_state_success {
    color: green;
  }
</style>
