<template>
  <div class="view_payment_processing" v-loading="loadingRes?.Result">
    <div class="back" @click="back">
      <el-icon><ArrowLeftBold /></el-icon>
    </div>
    <div class="view_title">{{ payTypeItem.name }}</div>
    <div class="content">
      <h3>{{ `請在 ${time > 0 ? time : 0} 秒內完成支付` }}</h3>
      <img class="product_img" :src="getUrl('InvoiceCarrier/scan_guide.png')" />
      <div>
        <div class="view_title">讀取器啟動</div>
        <div class="sub">請將{{ payTypeItem.name }}移至讀取區</div>
      </div>
      <Card :imgName="payTypeItem.imgName">
        <template v-slot:handlabel>{{ payTypeItem.name }}</template>
        <template v-slot:scanlabel>{{ payTypeItem.name }}掃描區</template>
      </Card>
      <Step :activeID="2" />
    </div>
  </div>
</template>

<script setup>
  import { ArrowLeftBold } from '@element-plus/icons-vue'
  import { useRouter, useRoute } from 'vue-router'
  import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue'
  import { PAYMENT_LIST } from '@renderer/configs/index.js'
  import Card from '@renderer/components/invoiceCarrier/Card.vue'
  import Step from '@renderer/components/public/Step.vue'
  import { storeToRefs } from 'pinia'
  import { useProducts, useIPCData, useErrorMsg } from '@renderer/store/index.js'
  import { postCreateOrder } from '@renderer/api/request.js'
  import dayjs from 'dayjs'
  const errorMsg = useErrorMsg()
  const productsStore = useProducts()
  const { selectedProduct } = storeToRefs(productsStore)
  const ipcStore = useIPCData()
  const { loadingRes, extraConfig } = storeToRefs(ipcStore)
  const router = useRouter()
  const route = useRoute()
  const playAudio = inject('playAudio')
  const payType = computed(() => route.params?.payID ?? '')
  const time = ref(10)

  const timer = ref(null)

  const payTypeItem = computed(() => PAYMENT_LIST.find(item => item.id === payType.value) ?? '')

  const getUrl = filename => {
    return new URL(`/src/assets/${filename}`, import.meta.url).href
  }

  const back = () => {
    playAudio('back')
    router.push({ name: 'Payment', query: { isWaiting: true } })
  }

  const init = async () => {
    productsStore.setInvoiceDefault()
    // 建立訂單
    const inputData = {
      productID: selectedProduct.value.productID,
      rackStorageID: selectedProduct.value.rackStorageID,
      quantity: 1,
      amount: selectedProduct.value.salePrice,
    }
    try {
      // 檢查是否建立過訂單
      if (!selectedProduct.value?.shoporderno) {
        const res = await postCreateOrder(inputData)
        const today = dayjs().format('YYYY-MM-DD')
        // 儲存資料
        productsStore.setSelectedProduct({
          ...selectedProduct.value,
          shoporderno: res.data.data.shoporderno,
          batchno: res.data.data.batchno,
          orderid: res.data.data.orderid,
          payWay: payTypeItem.value.wayId,
          orderDate: today,
          payTypeID: payTypeItem.value.payTypeID,
        })
      }
      // 啟用掃描
      if (payTypeItem.value.type === 'third') {
        // 第三方支付：
        ipcStore.sendIpcRenderer('scanThirdQR', {})
      } else {
        ipcStore.sendIpcRenderer('scanPayment', {
          type: payTypeItem.value.type,
          tradetype: 'CREDITSALE',
          shoporderno: selectedProduct.value.shoporderno,
          amount: selectedProduct.value.salePrice,
          commodityinfo: selectedProduct.value.name,
          batchno: selectedProduct.value.batchno,
          deviceid: extraConfig.value.machine_id,
        })
      }
    } catch {
      ipcStore.sendIpcRenderer('log', { logType: 'error', msg: '訂單建立失敗' })
      // 訂單建立失敗，再試一次，並返回首頁
      errorMsg.setErrorMsg({
        msg: '訂單建立失敗，請再試一次',
        backToHome: true,
      })
    }

    if (payType.value === 'third') time.value = 30
    timer.value = setInterval(() => {
      if (time.value === 0) {
        clearInterval(timer.value)
        if (payType.value === 'third') {
          errorMsg.setErrorMsg({ msg: '等待時間過長，請重新選擇付款方式' })
          router.push({ name: 'Payment', query: { isWaiting: false } })
        }
      }
      time.value -= 1
    }, 1000)
  }
  init()

  onMounted(() => {
    if (!payType.value) back()
  })

  onBeforeUnmount(() => {
    clearTimeout(timer.value)
    ipcStore.setIPCData({ Method: 'loadingRes', Data: null })
  })

  // 信用卡/悠遊卡支付監聽結果判定：scanPaymentRes 位於 pinia useIPCData
  // 第三方支付監聽結果判定：scanThirdQRRes 位於 pinia useIPCData
</script>

<style scoped>
  .view_payment_processing {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    margin: 0 auto;
  }
  .content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: center;
    justify-content: space-between;
  }
  .view_payment_processing h3 {
    text-align: center;
    color: #666;
    font-weight: normal;
    margin: 10px 0;
  }
  .view_payment_processing .help {
    width: 100%;
    height: auto;
    max-width: 440px;
  }
  .product_img {
    width: 80vw;
  }
  .product_info {
    display: flex;
    width: 80%;
    justify-content: space-between;
    align-items: flex-end;
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
</style>
