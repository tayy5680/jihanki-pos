<template>
  <Header />
  <router-view class="view_page"></router-view>
  <Keyboard v-if="isKeyboard" :showKeyboard="showKeyboard" />
  <audio loop autoplay>
    <source :src="getUrl('assets/audio/bgm.mp3')" type="audio/mp3" />
  </audio>
  <audio v-for="item in AUDIO_SOUND_LIST" :key="item.id" :ref="setAudioElement" :src="getUrl(item.url)"></audio>

  <div v-if="alertControl.isShow" :class="alertControl.isShow ? 'msg_alert action' : 'msg_alert'">
    <div>
      {{ alertControl.msg }}
      <el-icon @click="closeAlert"><Close /></el-icon>
    </div>
  </div>
</template>

<script setup>
  import { ref, provide, watch, onMounted } from 'vue'
  import { Close } from '@element-plus/icons-vue'
  import Header from './components/public/Header.vue'
  import Keyboard from './components/Keyboard.vue'
  import { storeToRefs } from 'pinia'
  import { useIPCData, useErrorMsg } from '@renderer/store/index.js'
  import { useRouter, useRoute } from 'vue-router'
  import { TIME_OUT } from './configs/index.js'
  import { useMqtt } from './store/mqtt.js'

  const router = useRouter()
  const route = useRoute()
  const ipcStore = useIPCData()
  const mqttStore = useMqtt()
  const errorMsg = useErrorMsg()
  const { msg, backToHome, autoClose } = storeToRefs(errorMsg)
  const alertControl = ref({
    isShow: false,
    msg: '',
    autoClose: true,
  })
  watch(alertControl, val => {
    if (val.isShow) {
      val.isShow = true
      // 出貨畫面不自動關閉錯誤訊息
      if (val.autoClose) {
        setTimeout(() => {
          val.isShow = false
        }, 7000)
      }
    }
  })
  watch(msg, val => {
    if (!val) return
    if (backToHome.value) router.push('/')
    alertControl.value = {
      isShow: true,
      msg: val,
      autoClose: autoClose.value,
    }
    errorMsg.setErrorMsg({})
  })
  const closeAlert = () => {
    alertControl.value.isShow = false
  }

  const isStart = ref(true)
  provide('isStart', isStart)

  const isKeyboard = ref(false)
  provide('isKeyboard', isKeyboard)

  const showKeyboard = bool => {
    playAudio('back')
    isKeyboard.value = bool
  }

  // 音效
  const AUDIO_SOUND_LIST = [
    { id: 'back', url: 'assets/audio/back.mp3' },
    { id: 'complete', url: 'assets/audio/complete.mp3' },
    { id: 'packaging', url: 'assets/audio/packaging.mp3' },
    { id: 'click', url: 'assets/audio/click.mp3' },
    { id: 'floor', url: 'assets/audio/floor.mp3' },
    { id: 'keyboard', url: 'assets/audio/keyboard.mp3' },
  ]
  const getUrl = filename => {
    return new URL(`/src/${filename}`, import.meta.url).href
  }
  const audioRef = ref([])
  const setAudioElement = el => {
    audioRef.value.push(el)
  }
  const playAudio = id => {
    const index = AUDIO_SOUND_LIST.findIndex(item => item.id === id)
    audioRef.value[index].currentTime = 0
    audioRef.value[index].play()
  }
  provide('playAudio', playAudio)

  // 首頁及出貨、活動以外，超過時間沒有點按螢幕則跳回首頁
  // isTimeOutToHame：是否跳回首頁
  const isTimeOutToHome = ref(true)
  provide('isTimeOutToHome', isTimeOutToHome)
  const timer = ref(null)
  const resetTimer = () => {
    clearTimeout(timer.value)
    if (route.name !== 'Home' || isTimeOutToHome.value) {
      timer.value = setTimeout(() => {
        router.push('/')
      }, TIME_OUT)
    }
  }
  // 觸發
  onMounted(() => {
    if (window.ipcRenderer) {
      // 檢查硬體狀態
      ipcStore.sendIpcRenderer('checkHardwareStatus', {})
      window.ipcRenderer.receive('send_data', data => {
        ipcStore.setIPCData(data)
      })
    }
    // 監聽用戶活動，超過十五分鐘無操作即返回首頁
    window.addEventListener('touchstart', resetTimer)
    window.addEventListener('mousedown', resetTimer)
    ipcStore.initHeartbeatLine()
  })
</script>
<style>
  .view_page {
    background-color: white;
    min-height: calc(100vh - 222px);
    padding: 222px 20px 0 20px;
  }
  .msg_alert {
    position: absolute;
    z-index: 999999;
    width: 100%;
    text-align: center;
    opacity: 0;
    transition: opacity 0.2s;
    bottom: 10vh;
  }
  .msg_alert > div {
    padding: 1em 1em 1em 1.5em;
    border-radius: 10px;
    background-color: #ffc314;
    max-width: 50vw;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .msg_alert i {
    padding-left: 0.5em;
    cursor: pointer;
  }
  .msg_alert.action {
    opacity: 1;
  }
</style>
