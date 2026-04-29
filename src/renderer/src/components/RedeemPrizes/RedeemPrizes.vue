<template>
  <div class="view_redeem" v-if="drawlotResult">
    <div class="back" v-if="isShowResultText && (isShipSuccess || drawlotResult?.productID === 0)" @click="back">
      <el-icon><ArrowLeftBold /></el-icon>
    </div>
    <div class="content">
      <div class="slot_machine">
        <div ref="lottieElement"></div>
      </div>
    </div>
    <div class="bottom">
      <div v-if="isShowResultText">
        <div class="progress" v-if="!isShipSuccess && drawlotResult?.productID !== 0">
          <div class="txt">出貨中，請稍候 ...</div>
          <el-progress :percentage="100" color="black" :show-text="false" :indeterminate="true" :duration="2" />
        </div>
        <div class="btn" v-else>
          <div class="active" @click="back">回到首頁</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, nextTick, watch, inject, onUnmounted } from 'vue'
  import lottie from 'lottie-web'
  import { ArrowLeftBold } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { useIPCData, useErrorMsg } from '@renderer/store/index.js'
  import winLottie from '@renderer/assets/lottie/eden_win.json'
  import waitLottie from '@renderer/assets/lottie/eden_wait.json'
  import lostLottie from '@renderer/assets/lottie/eden_lost.json'

  const ipcStore = useIPCData()
  const { shippingRes } = storeToRefs(ipcStore)
  const errorMsg = useErrorMsg()

  const router = useRouter()
  const lottieElement = ref(null)
  const isShowResultText = ref(false)
  const playAudio = inject('playAudio')
  const isTimeOutToHome = inject('isTimeOutToHome')

  const props = defineProps({
    drawlotResult: {
      type: Object,
      default: () => null,
    },
  })

  watch(
    () => props.drawlotResult,
    val => {
      if (val) {
        actionAnim(val?.productID !== 0 ? 'win' : 'lost')
      }
    },
  )

  const errTimer = ref(null)
  const actionAnim = async type => {
    nextTick(async () => {
      lottie.destroy('lottieAnim')
      const anim = lottie.loadAnimation({
        name: 'lottieAnim',
        container: lottieElement.value,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        animationData: waitLottie,
      })
      anim.addEventListener(
        'complete',
        () => {
          anim.removeEventListener('complete', this)

          lottie.destroy('lottieAnim')
          const winlostAnim = lottie.loadAnimation({
            name: 'lottieAnim',
            container: lottieElement.value,
            renderer: 'svg',
            loop: false,
            autoplay: true,
            animationData: type === 'win' ? winLottie : lostLottie,
          })
          winlostAnim.addEventListener('complete', () => {
            isShowResultText.value = true
            winlostAnim.removeEventListener('complete', this)
          })
          // 出貨
          if (type === 'win') {
            // 傳遞出貨內容
            ipcStore.sendIpcRenderer('shipping', {
              type: 'event',
              rackStorageID: props.drawlotResult.rackStorageID,
              drawlotRecordID: props.drawlotResult.drawlotRecordID,
            })

            isTimeOutToHome.value = false
            // 開始計時
            errTimer.value = setTimeout(
              () => {
                errorMsg.setErrorMsg({
                  msg: '出貨異常，請洽服務人員',
                  autoClose: false,
                })
                isShipSuccess.value = true
              },
              1000 * 60 * 3,
            )
          }
        },
        { once: true },
      )
    })
  }
  const back = () => {
    playAudio('back')
    router.push('/')
  }

  // 出貨完畢的訊號
  const isShipSuccess = ref(false)
  watch(shippingRes, val => {
    if (Object.keys(val).length !== 0) {
      clearTimeout(errTimer.value)
      if (!val.Result) {
        errorMsg.setErrorMsg({
          msg: `出貨發生錯誤，請洽客服人員，錯誤代碼：${val.Msg}`,
          autoClose: false,
        })
        isShipSuccess.value = true
      } else {
        isTimeOutToHome.value = true
        isShipSuccess.value = true
      }
    }
  })
  onUnmounted(() => {
    isTimeOutToHome.value = true
    clearTimeout(errTimer.value)
  })
</script>

<style scoped>
  .view_redeem {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .view_redeem .btn {
    text-align: center;
  }
  .view_redeem .btn div {
    color: white;
    background-color: black;
    border-radius: 3em;
    width: 324px;
    margin: 0 auto;
    line-height: 96px;
    font-size: 1.4em;
    opacity: 0.4;
    cursor: no-drop;
    border: 5px solid #fff;
    animation-name: pulse;
    animation-iteration-count: infinite;
    animation-duration: 1.5s;
    animation-delay: 0.5s;
  }
  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(0.92);
    }
    100% {
      transform: scale(1);
    }
  }
  .view_redeem .bottom {
    padding-bottom: 5vh;
    height: 200px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    position: relative;
  }
  .view_redeem .bottom .btn .active {
    cursor: pointer;
    opacity: 1;
  }

  .slot_machine {
    width: 100vw;
    overflow: hidden;
  }
  .slot_machine > div {
    background-color: black;
    position: fixed;
    width: 100vw;
    bottom: 0;
    right: 0;
    overflow: hidden;
    height: auto;
  }
  .result {
    font-weight: bold;
    font-size: 3em;
  }
  .title img {
    max-width: 547px;
    width: 100%;
  }
  .sub img {
    max-width: 629px;
    width: 100%;
  }
  .view_redeem .bottom .error_msg {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    border-bottom: 0.2em solid #ff6683;
  }
  .view_redeem .bottom .error_msg img {
    width: 20vw;
    margin: 30px 0;
  }
  .view_redeem .bottom .error_msg .label {
    color: #ff6683;
    font-size: 1.2em;
    padding-bottom: 0.4em;
  }
  :deep(.el-loading-spinner) {
    scale: 3;
  }
  :deep(.el-loading-spinner) .path {
    stroke: black;
  }
  .close_app {
    position: absolute;
    inset: 0;
    z-index: 99;
  }
  .progress {
    width: 80vw;
    text-align: center;
    background-color: black;
    border-radius: 10px;
    padding: 1em 2em 2em 2em;
    color: white;
  }
  .progress .txt {
    padding: 0.5em 0 1em 0;
  }
</style>
