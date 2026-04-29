<template>
  <div class="back" @click="back">
    <el-icon><ArrowLeftBold /></el-icon>
  </div>
  <div class="hello">安安這是硬體除錯頁面</div>
  <button @click="test({ Method: 'demoTest', Data: { str: '測試傳遞資料' } })">硬體測試</button><br />
  <button @click="test({ Method: 'scanTest', Data: { str: '測試傳遞資料' } })">條碼機硬體測試</button><br />
  <!-- <button @click="test({Method: 'JunDemo',Data: {trackNo:3,orderNo:12345678}})">1月硬體對接流程</button><br/> -->
  <button @click="test({ Method: 'easyCardSale', Data: { dollar: 1 } })">悠遊卡刷卡</button><br />
  <button @click="test({ Method: 'credit', Data: {} })">信用卡複測</button><br />
  <button @click="test({ Method: 'easyCardRefund', Data: { dollar: 1 } })">悠遊卡退卡</button><br />
  <button @click="test({ Method: 'phone', Data: { str: '' } })">手機條碼複測</button><br />
  <button @click="test({ Method: 'scanEventQR', Data: { str: '' } })">活動條碼測試</button><br />
  <input type="text" v-model="inputNumber" placeholder="軌道號碼" /><button
    @click="
      test({ Method: 'shipping', Data: { type: 'payment', shoporderno: 'edenqa-122', rackStorageID: inputNumber } })
    "
  >
    出貨測試</button
  ><br />
</template>

<script setup>
  import { ArrowLeftBold } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import { useIPCData } from '@renderer/store/index.js'
  const router = useRouter()
  const ipcStore = useIPCData()
  const back = () => {
    router.push('/')
  }
  let inputNumber = 0
  function test(dataTest) {
    console.log('執行')
    dataTest.Data.rackStorageID = parseInt(dataTest.Data.rackStorageID)
    console.log(dataTest)
    ipcStore.sendIpcRenderer('sendData', dataTest)
    // window.ipcRenderer.send('returnVueMessage')
    // window.ipcRenderer.send('returnVueMessage')
    // window.ipcRenderer.receive('CheckDelivery', (data) => {
    //   console.log('data:=======>'+data)
    //   mainRes.value = data
    // })
  }
  // onMounted(() => {

  // })
</script>

<style scoped>
  .hello {
    color: #fff;
  }

  button {
    margin-bottom: 0.5em;
    background-color: #d0d0d0;
  }
</style>
