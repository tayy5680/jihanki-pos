<template>
  <div class="view_invoice_carrier">
    <div v-if="nowInvoiceType" class="back" @click="back">
      <el-icon><ArrowLeftBold /></el-icon>
    </div>
    <div class="view_title">{{ viewTitle }}</div>
    <div class="view_sub_title">{{ viewSubTitle }}</div>
    <div v-if="!nowInvoiceType" class="invoice_menu">
      <div class="invoice_content">
        <div class="item_btn" @click="action('donation')">
          <div class="label">捐贈碼</div>
          <div class="en">Donation code</div>
        </div>
        <div class="item_label">如不用其他載具請選擇捐贈碼</div>
        <div class="item_btn" v-for="item in INVOICE_TYPE" :key="item.id" @click="action(item.id)">
          <div class="label">{{ item.label }}</div>
          <div class="en">{{ item.en }}</div>
        </div>
      </div>
    </div>

    <!-- 選擇了發票載具後 -->
    <div v-else class="invoice_reading_area">
      <Donate v-if="nowInvoiceType === 'donation'" />
      <Card v-else :imgName="'img_handqr.png'">
        <template v-slot:handlabel>{{ nowInvoiceTypeData.label }}</template>
        <template v-slot:scanlabel>{{ nowInvoiceTypeData.label }}掃描區</template>
      </Card>
    </div>

    <Step v-if="isStep" :activeID="3" />
  </div>
</template>

<script setup>
  import { ArrowLeftBold } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import Step from '@renderer/components/public/Step.vue'
  import Card from './Card.vue'
  import Donate from './Donate.vue'
  import { ref, computed, inject, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useProducts, useIPCData, useErrorMsg } from '@renderer/store/index.js'
  const errorMsg = useErrorMsg()
  const productsStore = useProducts()
  const { selectedProduct } = storeToRefs(productsStore)
  const ipcStore = useIPCData()
  const { scanReceiptRes } = storeToRefs(ipcStore)
  const router = useRouter()
  const nowInvoiceType = ref('')
  const playAudio = inject('playAudio')
  const nowInvoiceTypeData = computed(() => {
    return INVOICE_TYPE.find(item => item.id === nowInvoiceType.value)
  })
  const isStep = ref(true)
  const viewTitle = computed(() => {
    if (nowInvoiceType.value === '') return '請選擇發票載具'
    if (nowInvoiceType.value === 'donation') return '請選擇捐贈碼'
    return '讀取器啟動'
  })

  const viewSubTitle = computed(() => {
    if (nowInvoiceType.value === '') return '如無載具，請點選捐贈碼繼續購物'

    const list = {
      donation: '請輸入捐贈碼或系統預設捐贈碼',
      phone: '請將手機條碼移至讀取區',
      easyCard: '請將悠遊卡移至讀取區',
      credit: '請將信用卡移至讀取區',
    }
    return list[nowInvoiceType.value] ?? ''
  })

  const back = () => {
    playAudio('back')
    if (nowInvoiceType.value) {
      nowInvoiceType.value = ''
      isStep.value = true
    }
  }

  const INVOICE_TYPE = [
    { id: 'phone', type: 'btn', label: '手機條碼', en: 'Phone barcode' },
    // { id: 'easyCard', type: 'btn', label: '悠遊卡載具', en: 'EasyCard Carrier' },
    // { id: 'credit', type: 'btn', label: '信用卡載具', en: 'Credit card Carrier' },
  ]
  const action = id => {
    playAudio('click')
    nowInvoiceType.value = id
    if (id === 'donation') isStep.value = false
    else {
      // 告知機器：開啟掃描畫面
      ipcStore.sendIpcRenderer('scanReceipt', {})
    }
  }

  // 接收到回傳訊息時，直接跳出貨畫面
  watch(scanReceiptRes, val => {
    if (Object.keys(val).length !== 0) {
      if (val.Result && val.Msg) {
        productsStore.setSelectedProduct({
          ...selectedProduct.value,
          carrierId1: val.Msg,
          carrierType: '3J0002',
          donateMark: 0,
        })
        router.push('/Shipping')
      } else {
        errorMsg.setErrorMsg({ msg: val?.Msg ?? '掃描失敗，請再試一次' })
      }
    }
  })
</script>

<style scoped>
  .view_invoice_carrier {
    display: flex;
    flex-direction: column;
  }
  .invoice_menu {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }
  .invoice_content,
  .invoice_reading_area {
    padding: 0 30px 80px 30px;
    flex-grow: 1;
    display: flex;
    justify-content: flex-start;
    flex-direction: column;
  }
  .invoice_reading_area {
    justify-content: center;
    min-width: 60vw;
  }
  .invoice_content > div {
    border-radius: 5000px;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .invoice_content .item_btn {
    background-color: black;
    color: white;
    margin-top: 1em;
    flex-grow: 1;
    border: 3px solid #999;
    transition: all 0.1s ease-out;
    cursor: pointer;
    max-height: 7.5em;
    min-width: 60vw;
  }
  .invoice_content .item_label {
    color: #666;
    text-align: center;
    flex-basis: content;
    padding-top: 0.5em;
  }
  .invoice_content .item_btn .label {
    font-weight: bold;
    font-size: 1.2em;
  }
  .invoice_content .item_btn .en {
    font-size: 1em;
  }

  .invoice_content .item_btn:hover {
    scale: 0.97;
  }
</style>
