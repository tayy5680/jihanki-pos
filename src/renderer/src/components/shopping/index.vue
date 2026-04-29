<template>
  <div class="view_shopping">
    <div class="back" @click="back">
      <el-icon><ArrowLeftBold /></el-icon>
    </div>

    <div class="left">
      <!-- 顯示樓層 -->
      <div v-if="isCategoryByFloor" class="class_floor">
        <div
          :class="{ action: n === floorID, disable: !sortFloorRes?.[n] }"
          v-for="n in 8"
          :key="n"
          @click="switchFloor(n)"
        >
          {{ n }}F
        </div>
      </div>
      <!-- 顯示類型 -->
      <div v-else class="class_type">
        <div
          :class="{
            action: item.id === floorID,
            disable: !sortFloorRes?.[item.id],
          }"
          v-for="item in CLASS_TYPE"
          :key="item.id"
          @click="switchFloor(item.id)"
        >
          {{ item.name }}
        </div>
      </div>

      <button @click="setCategory">分類</button>
      <button @click="openKeyboard">鍵盤</button>
    </div>
    <div class="right">
      <div class="content" v-if="floorID ? sortFloorRes?.[floorID]?.length : productsList?.length">
        <FloorItem
          v-for="item in floorID ? sortFloorRes?.[floorID] : productsList"
          :key="item.productID"
          :itemData="item"
          :action="action"
        />
      </div>
      <div v-else class="no_data">商品已售罄或暫停販售</div>
    </div>
  </div>
</template>

<script setup>
  import { inject, ref, computed } from 'vue'
  import { ArrowLeftBold } from '@element-plus/icons-vue'
  import FloorItem from './FloorItem.vue'
  import { useRoute, useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { useProducts } from '@renderer/store/index.js'
  const productsStore = useProducts()
  const { selectedProduct } = storeToRefs(productsStore)
  const { productsList } = storeToRefs(productsStore)
  const router = useRouter()
  const route = useRoute()
  const isStart = inject('isStart')
  const isKeyboard = inject('isKeyboard')
  const playAudio = inject('playAudio')
  const floorID = ref(0)
  const isCategoryByFloor = ref(true)

  const sortFloorRes = computed(() => {
    return productsList.value.reduce((acc, curr) => {
      const index = isCategoryByFloor.value ? curr?.floor ?? 99 : curr?.productTypeID ?? 99
      if (!acc[index]) acc[index] = []
      acc[index].push(curr)
      return acc
    }, {})
  })

  const setCategory = () => {
    isCategoryByFloor.value = !isCategoryByFloor.value
    floorID.value = 0
    playAudio('click')
  }
  const CLASS_TYPE = [
    { id: 1, name: '限時優惠' },
    { id: 2, name: '新品上架' },
    { id: 3, name: '熱門商品' },
    { id: 4, name: '舒壓專區' },
    { id: 5, name: '醜萌專區' },
    { id: 6, name: '泡泡專區' },
  ]

  const back = () => {
    router.push('/')
    playAudio('back')
  }
  const openKeyboard = () => {
    isKeyboard.value = true
    playAudio('click')
  }
  const switchFloor = index => {
    if (!sortFloorRes.value?.[index]) return
    floorID.value = index
    document.getElementById('app').scrollTop = 0
    playAudio('floor')
  }

  const action = itemData => {
    router.push({
      name: 'Product',
      query: {
        floor: floorID.value,
        isCategoryByFloor: isCategoryByFloor.value,
      },
    })
    playAudio('click')
    productsStore.setSelectedProduct(itemData)
  }

  const init = () => {
    isStart.value = true
    if (productsList.value) productsStore.setProductsList()
    floorID.value = parseInt(route.query?.floor ?? 0)
    isCategoryByFloor.value = (route.query?.isCategoryByFloor ?? 'true') === 'true'
    router.replace(route.path)
  }
  init()
</script>

<style scoped>
  .view_shopping {
    padding: 202px 0 0 0;
    display: flex;
  }
  .left {
    background-color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 0 8px 0;
    box-shadow: 3px 0px 5px 1px #00000024;
    position: fixed;
    height: calc(100vh - 282px);
    width: 100px;
  }
  .left .class_floor {
    flex-grow: 1;
    font-family: 'Oswald';
    display: flex;
    font-size: 1.8em;
    color: black;
    width: 100%;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .left .class_floor > div {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }

  .left .class_type {
    flex-grow: 1;
    font-size: 1em;
    overflow: hidden;
    color: black;
    scroll-behavior: smooth;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .left .class_floor .action,
  .left .class_type .action {
    color: #ff9804;
  }

  .left .class_floor .disable,
  .left .class_type .disable {
    color: rgb(160, 160, 160);
  }

  .left .class_type > div {
    margin-bottom: 5px;
    width: 2em;
    padding: 5px;
    flex-grow: 1;
    display: flex;
    align-items: center;
    border-radius: 10px;
    cursor: pointer;
    font-weight: bold;
  }
  .left button {
    background-color: black;
    color: white;
    padding: 10px;
    border-radius: 10px;
    margin-bottom: 8px;
    min-width: 40px;
    cursor: pointer;
  }

  .left .class_type .el-icon {
    color: black;
    background-color: white;
    width: 40px;
    display: none;
    text-align: center;
    position: absolute;
    cursor: pointer;
  }
  .left .class_type .ArrowDown {
    bottom: 90px;
    box-shadow: 0px -8px 9px 5px white;
  }
  .left .class_type .ArrowUp {
    top: 70px;
    box-shadow: 0px 8px 9px 5px white;
  }

  .left .class_type .ArrowDown.show,
  .left .class_type .ArrowUp.show {
    display: block;
  }

  .right {
    background-color: white;
    flex-grow: 1;
    margin-left: 100px;
  }

  .right .content {
    padding: 1em;
  }
  .right .no_data {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f0f0f0;
  }
</style>
