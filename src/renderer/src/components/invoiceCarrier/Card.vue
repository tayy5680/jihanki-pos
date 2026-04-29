<template>
  <div class="view_invoice_card">
    <div class="hand">
      <!-- todo 開發使用 刪除getCarrier 因尚未接上掃描器，故先點擊圖片跳至下一步驟 -->
      <img :src="getUrl(imgName)" @click="getCarrier" />
      <p>請將<slot name="handlabel"></slot></p>
    </div>
    <div class="scan">
      <img :src="getUrl('20240301_qr_ani2.gif')" />
      <p>
        面向下方的<br /><span><slot name="scanlabel"></slot></span>內
      </p>
    </div>
  </div>
</template>

<script setup>
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { useProducts, useIPCData } from '@renderer/store/index.js'

  const productsStore = useProducts()
  const { selectedProduct } = storeToRefs(productsStore)
  const ipcStore = useIPCData()
  const { extraConfig } = storeToRefs(ipcStore)

  const props = defineProps({
    imgName: {
      type: String,
      default: 'img_handqr.png',
    },
  })

  const router = useRouter()
  // todo delete 開發使用 因尚未接上掃描器，故先點擊圖片跳至下一步驟
  const getCarrier = () => {
    if (extraConfig.value.debug_mode) {
      productsStore.setSelectedProduct({
        ...selectedProduct.value,
        carrierId1: '/R+NHDU2',
        carrierType: '3J0002',
        donateMark: 0,
      })
      router.push('/Shipping')
    }
  }
  const getUrl = filename => {
    return new URL(`/src/assets/InvoiceCarrier/${filename}`, import.meta.url).href
  }
</script>

<style scoped>
  .view_invoice_card {
    text-align: center;
    display: flex;
    margin: 0 auto;
    align-items: baseline;
  }
  .view_invoice_card p {
    font-size: 1.2em;
  }
  .view_invoice_card p span {
    color: #ff9804;
    font-weight: bold;
  }
  .view_invoice_card .hand {
    padding: 0 30px;
  }
  .view_invoice_card .hand img {
    max-height: 300px;
  }
</style>
