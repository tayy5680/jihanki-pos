<template>
  <div class="view_payment">
    <div class="back" @click="back">
      <el-icon><ArrowLeftBold /></el-icon>
    </div>
    <div class="view_title">請選擇付款方式</div>

    <div v-if="!isLoading" class="payment_content">
      <div class="item_btn" v-for="item in PAYMENT_LIST" :key="item.id" @click="action(item)">
        <div class="label">{{ item.name }}</div>
        <div class="en" v-html="item.subLabel"></div>
      </div>
    </div>
    <div v-else class="payment_content flex-center">
      <div class="check_pickup_port">
        <el-icon :size="50"><Loading /></el-icon>
        <p v-if="route.query.isWaiting !== undefined">請稍候... {{ timeSec }}</p>
        <p v-else>檢查出貨口...</p>
      </div>
    </div>
    <Step :activeID="2" />
  </div>
</template>

<script setup>
  import { ArrowLeftBold, Loading } from '@element-plus/icons-vue'
  import { useRouter, useRoute } from 'vue-router'
  import Step from '@renderer/components/public/Step.vue'
  import { ref, watch, inject, onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useIPCData, useErrorMsg } from '@renderer/store/index.js'
  import { PAYMENT_LIST } from '@renderer/configs/index.js'
  const router = useRouter()
  const route = useRoute()
  const playAudio = inject('playAudio')

  const back = () => {
    playAudio('back')
    router.push('/Product')
  }

  const action = item => {
    playAudio('click')
    router.push({ name: 'PaymentProcessing', params: { payID: item.id } })
  }

  const errorMsg = useErrorMsg()
  const ipcStore = useIPCData()
  const { pickUpPortRes } = storeToRefs(ipcStore)
  const isLoading = ref(true)
  // 檢查出貨口
  const handlePickUpPort = () => {
    ipcStore.sendIpcRenderer('checkPickUpPort', {})
  }
  // 出貨正常再進行下一步
  watch(pickUpPortRes, val => {
    if (Object.keys(val).length !== 0) {
      if (val.Result) isLoading.value = false
      else {
        errorMsg.setErrorMsg({
          msg: '出貨口異常，請檢查是否有物品未拿取，或洽服務人員處理。',
        })
        router.push('/')
      }
    }
  })

  const timer = ref(null)
  const timeSec = ref(10)
  onMounted(() => {
    if (route.query.isWaiting !== undefined) {
      // 持續顯示loading，等待機器回應
      isLoading.value = Boolean(route.query.isWaiting === 'true')
      // 10秒後機器沒有回傳內容就關閉等待畫面
      if (Boolean(route.query.isWaiting === 'true')) {
        timer.value = setInterval(() => {
          if (timeSec.value === 0) {
            clearInterval(timer.value)
            isLoading.value = false
          }
          timeSec.value -= 1
        }, 1000)
      }
    } else {
      // 從商品頁進來 => 檢查出貨口
      handlePickUpPort()
    }
  })

  onUnmounted(() => {
    clearTimeout(timer.value)
  })
</script>

<style scoped>
  .view_payment {
    display: flex;
    flex-direction: column;
  }

  .payment_content {
    padding: 0 30px 10px 30px;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    text-align: center;
  }
  .payment_content .item_btn {
    background-color: black;
    color: white;
    margin-top: 1em;
    flex-grow: 1;
    border: 3px solid #999;
    transition: all 0.1s ease-out;
    cursor: pointer;
    max-height: 7.5em;
    min-width: 60vw;
    text-align: center;
    border-radius: 5000px;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .payment_content .item_btn .label {
    font-weight: bold;
    font-size: 1.2em;
  }
  .payment_content .item_btn .en {
    font-size: 1em;
  }

  .payment_content .item_btn:hover {
    scale: 0.97;
  }

  .flex-center {
    align-items: center;
    justify-content: center;
  }
  :deep .check_pickup_port .el-icon {
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
