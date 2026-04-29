<template>
  <div class="view_home">
    <div class="bg" @click="showMenu()">
      <video :src="pos" autoplay loop muted></video>
      <div class="title">
        <el-icon size="60px"><Pointer /></el-icon>
        <div class="tw">點擊螢幕開始購物</div>
        <div class="en">Please click on the screen to shop</div>
      </div>
    </div>

    <div class="bottom_menu" :style="`bottom: ${isStart ? '0' : '-600px'}`">
      <h1>START<br />SHOPPING</h1>
      <div class="main_btn">
        <div class="main_btn_item active" v-for="item in MAIN_BTN" key="item" :span="8" @click="showDemo(item.id)">
          <el-icon><component :is="item.icon" /></el-icon>
          <div class="en">{{ item.en }}</div>
          <div class="tw">{{ item.tw }}</div>
        </div>
      </div>
      <Step :activeID="1" />
    </div>
  </div>
</template>

<script setup>
  import { inject, onMounted, ref } from 'vue'
  import { Menu, Pointer, StarFilled, Goods, GoodsFilled } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import Step from './public/Step.vue'
  import pos from '@renderer/assets/Home/POS.mp4'
  import { useIPCData } from '@renderer/store/index.js'
  import { useProducts } from '@renderer/store/index.js'

  const productsStore = useProducts()
  productsStore.setIsServer(true)

  const ipcStore = useIPCData()
  const router = useRouter()

  const isStart = inject('isStart')
  const isKeyboard = inject('isKeyboard')
  const playAudio = inject('playAudio')
  const showMenu = () => {
    isStart.value = true
  }
  const MAIN_BTN = [
    { id: 'keyboard', en: 'KeyBOARD', tw: '鍵盤', icon: Menu },
    { id: 'shopping_floor', en: 'SHOPPING', tw: '購物', icon: Goods },
    {
      id: 'shopping_type',
      en: 'CATEGORIES',
      tw: '商品分類',
      icon: GoodsFilled,
    },
    { id: 'event', en: 'EVENT', tw: '活動', icon: StarFilled },
    // {id: 'hardwaretest',en:'HARDWARETEST', tw:'硬體測試',icon:Menu}
  ]
  const showDemo = id => {
    playAudio('click')
    switch (id) {
      case 'keyboard':
        isKeyboard.value = true
        break
      case 'shopping_floor':
        router.push({ name: 'Shopping', query: { isCategoryByFloor: true } })
        break
      case 'shopping_type':
        router.push({ name: 'Shopping', query: { isCategoryByFloor: false } })
        break
      case 'event':
        router.push('/RedeemPrizes')
        break
      // case 'hardwaretest':
      //   router.push('/h_test')
      //   break
    }
  }

  const init = () => {
    //region 在 config 載入後才處理的 script 可放在這裡
    ipcStore.clearData()
    productsStore.setProductsList()
    // 卡機結帳
    var machineId = ipcStore.extraConfig.machine_id
    ipcStore.doSettle(machineId)
    //endregion
  }
  init()

  onMounted(() => {
    isStart.value = false
  })
</script>

<style scoped>
  .view_home {
    padding: 0;
    background-color: black;
  }
  .bg {
    width: 100vw;
    height: calc(100vh - 200px);
    background-position: center;
    background-size: cover;
    position: absolute;
    bottom: 0;
    left: 0;
  }
  .bg video {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .bg .title {
    position: fixed;
    width: 100vw;
    text-align: center;
    bottom: 0;
    padding-bottom: 40px;
    color: white;
    text-shadow: 0.1em 0.1em 0.2em black;
    animation-name: pulse;
    animation-iteration-count: infinite;
    animation-duration: 1.3s;
    animation-delay: 0.5s;
  }
  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
    }
  }
  .bg .title .tw {
    font-size: 1.6em;
    letter-spacing: 6px;
  }
  .top_menu,
  .bottom_menu {
    width: 100vw;
    position: fixed;
    transition: all 0.4s ease-out;
  }
  .top_menu {
    background-color: black;
    color: white;
    top: 0;
    border-radius: 0 0 20px 20px;
    padding: 30px 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
  .bottom_menu {
    background-color: white;
    color: black;
    bottom: 0;
    border-radius: 20px 20px 0 0;
    padding-top: 30px;
    text-align: center;
  }
  .top_menu .left {
    width: 250px;
  }
  .top_menu .left .tiny {
    font-size: 8px;
  }
  .bottom_menu h1 {
    font-size: 80px;
    font-family: 'Oswald';
    padding: 0;
    margin: 0;
    margin-top: 14px;
  }
  .bottom_menu .main_btn {
    padding-top: 30px;
    display: flex;
    justify-content: center;
  }
  .bottom_menu .main_btn_item {
    background-color: #bbbbbb;
    border: 2px solid #ababab;
    border-radius: 30px;
    color: white;
    max-width: 170px;
    max-height: 170px;
    margin: 0 2vw;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: default;
    width: 18vw;
    height: 18vw;
  }
  .bottom_menu .active {
    background-color: black;
    animation-name: pulse_btn;
    animation-iteration-count: infinite;
    animation-duration: 0.9s;
    animation-delay: 0.5s;
    box-shadow: inset 0px 0px 20px 0px #6d6d6d;
    cursor: pointer;
  }
  @keyframes pulse_btn {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
  .bottom_menu .main_btn_item i {
    font-size: 45px;
  }
  .bottom_menu .main_btn_item .en {
    font-family: 'Oswald';
  }
  .bottom_menu .main_btn_item .tw {
    letter-spacing: 2px;
    white-space: nowrap;
  }
  @media screen and (max-width: 500px) {
    .bottom_menu .main_btn_item {
      min-width: 110px;
      min-height: 110px;
    }
    .bottom_menu .main_btn_item i {
      font-size: 40px;
    }
  }

  /*  demo_video */
  .demo_video {
    display: flex;
    flex-direction: column;
  }
  .demo_video > div {
    background-color: black;
    border: 2px solid #ababab;
    border-radius: 30px;
    color: white;
    flex-grow: 1;
    cursor: pointer;
    animation-name: pulse_btn;
    animation-iteration-count: infinite;
    animation-duration: 0.9s;
    animation-delay: 0.5s;
    box-shadow: inset 0px 0px 20px 0px #6d6d6d;
    padding: 0 30px;
    display: flex;
    align-items: center;
  }
</style>
