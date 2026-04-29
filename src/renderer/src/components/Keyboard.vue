<template>
  <div class="view_keyboard">
    <div class="back" @click="showKeyboard(false)">
      <el-icon><ArrowLeftBold /></el-icon>
    </div>
    <div class="view_title">
      <span>{{ title }}</span>
    </div>
    <div class="input_area">
      <div v-for="index in digit" key="index">
        {{ inputNumber[index - 1] ?? '' }}
      </div>
    </div>
    <div class="numbers">
      <el-row>
        <el-col :span="8" v-for="item in keyboardItems" key="item" @click="selectNumber(item)">
          <div v-if="item.type === 'number'">{{ item.num }}</div>
          <el-icon v-else><component :is="item.icon" /></el-icon>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
  import { inject, ref } from 'vue'
  import { ArrowLeftBold, Select, CloseBold } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { useProducts, useErrorMsg } from '@renderer/store/index.js'
  const productsStore = useProducts()
  const { productsList } = storeToRefs(productsStore)
  const errorMsg = useErrorMsg()
  const router = useRouter()

  const props = defineProps({
    digit: {
      type: Number,
      default: 2,
    },
    title: {
      type: String,
      default: '請輸入欲購買的商品編號',
    },
    showKeyboard: {
      type: Function,
    },
  })
  const playAudio = inject('playAudio')

  const inputNumber = ref([])
  const keyboardItems = [
    { id: 0, type: 'number', num: 7, icon: '' },
    { id: 1, type: 'number', num: 8, icon: '' },
    { id: 2, type: 'number', num: 9, icon: '' },
    { id: 3, type: 'number', num: 4, icon: '' },
    { id: 4, type: 'number', num: 5, icon: '' },
    { id: 5, type: 'number', num: 6, icon: '' },
    { id: 6, type: 'number', num: 1, icon: '' },
    { id: 7, type: 'number', num: 2, icon: '' },
    { id: 8, type: 'number', num: 3, icon: '' },
    { id: 9, type: 'back', num: 0, icon: CloseBold },
    { id: 9, type: 'number', num: 0, icon: '' },
    { id: 9, type: 'enter', num: 0, icon: Select },
  ]

  const selectNumber = item => {
    playAudio('keyboard')
    switch (item.type) {
      case 'number':
        if (inputNumber.value.length < props.digit) inputNumber.value.push(item.num)
        break
      case 'back':
        if (inputNumber.value.length !== 0) inputNumber.value.pop()
        break
      case 'enter':
        if (!inputNumber.value.length) return
        // 取得資料並跳轉至當頁
        const num = parseInt(inputNumber.value.join(''))
        const products = productsList.value.find(item => item?.rackStorageID === num)
        if (num && products && products?.quantity) {
          productsStore.setSelectedProduct(products)
          router.push('/Product')
          props.showKeyboard(false)
        } else {
          errorMsg.setErrorMsg({
            msg: `很抱歉，${num}號商品已售罄或停止販售。`,
          })
        }
        break
    }
  }
</script>

<style scoped>
  .view_keyboard {
    position: fixed;
    z-index: 9;
    inset: 0;
    background-color: white;
    padding-top: 222px;
    display: flex;
    flex-direction: column;
  }
  .input_area {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-bottom: 30px;
    flex-grow: 1;
  }
  .input_area > div {
    font-size: 7em;
    font-family: 'Oswald';
    margin: 0 0.1em;
    border-bottom: 7px solid black;
    text-align: center;
    min-height: 260px;
    width: 0.8em;
  }
  .numbers {
    background-color: #f3f3f3;
    flex-grow: 1;
    border-radius: 20px 20px 0 0;
    padding: 10px;
  }
  .numbers .el-row {
    height: 100%;
    font-size: 3.4em;
    font-family: 'Oswald';
  }
  .numbers .el-row .el-col {
    height: 25%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 25px;
  }
  .numbers .el-row .el-col:hover {
    background-color: #e1e1e1;
  }
</style>
