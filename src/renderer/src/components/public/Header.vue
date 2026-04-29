<template>
  <div>
    <div class="top_menu">
      <div class="left">
        <el-row>
          <el-col :span="24">
            <img :src="getUrl('eden_logo.svg')" height="60" />
            <div>伊甸數位 eden Digital Technology</div>
          </el-col>
        </el-row>
        <el-row class="tiny">
          <el-col :span="8">Line : @937loslb</el-col>
          <el-col :span="16">電話：04-22558568</el-col>
        </el-row>
        <el-row class="tiny">
          <el-col :span="8">統編：91044273</el-col>
          <el-col :span="16">地址：台中市西屯區市政北二路 282號 5樓 A3</el-col>
        </el-row>
      </div>
      <div class="right" @click="goServe">
        <div>線上客服</div>
        <img :src="getUrl('Home/eden_service_qr.png')" />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useRouter } from 'vue-router'
  import { ref } from 'vue'

  const times = ref(0)
  const router = useRouter()
  const getUrl = filename => {
    return new URL(`/src/assets/${filename}`, import.meta.url).href
  }
  const goServe = () => {
    if (times.value === 1) {
      setTimeout(() => {
        times.value = 0
      }, 10000)
    }
    if (times.value > 4) {
      router.push('/Login')
      times.value = 0
    }
    times.value += 1
  }
</script>

<style scoped>
  .top_menu {
    background-color: black;
    color: white;
    top: 0;
    border-radius: 0 0 20px 20px;
    padding: 20px 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 10;
    width: 100vw;
    position: fixed;
    transition: all 0.4s ease-out;
    box-shadow: 0px 0px 5px 1px black;
  }
  .top_menu .left .tiny {
    font-size: 0.7em;
    word-break: break-all;
    white-space: nowrap;
  }
  .top_menu .left .tiny > div {
    padding-right: 30px;
  }
  .right {
    cursor: pointer;
    text-align: center;
  }
  .right > div {
    font-size: 0.7em;
    letter-spacing: 0.5em;
  }
</style>
