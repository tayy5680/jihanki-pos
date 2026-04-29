<template>
  <div class="view_restock">
    <div class="back" @click="back">
      <el-icon><ArrowLeftBold /></el-icon>
    </div>
    <div class="navbar">
      <div
        v-for="(item, index) in TAG_LIST"
        :key="index"
        :label="item.label"
        :name="item.name"
        :class="{ active: activeName === item.name }"
        @click="activeName = item.name"
      >
        {{ item.label }}
      </div>
    </div>
    <div class="content">
      <viewRestockManagement v-if="activeName === 'restock'" />
      <viewPosManagement v-if="activeName === 'pos'" />
    </div>
  </div>
</template>

<script setup>
  import { inject, ref } from 'vue'
  import { ArrowLeftBold } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import viewRestockManagement from './RestockManagement.vue'
  import viewPosManagement from './PosManagement.vue'
  import { storeToRefs } from 'pinia'
  import { useProducts } from '@renderer/store/index.js'
  const productsStore = useProducts()
  const { stockList } = storeToRefs(productsStore)

  const router = useRouter()
  const playAudio = inject('playAudio')
  const back = () => {
    router.push('/')
    playAudio('back')
  }

  const TAG_LIST = [
    { label: '商品管理', name: 'restock' },
    { label: '機器管理', name: 'pos' },
  ]
  const activeName = ref('restock')

  const init = () => {
    if (stockList.value) productsStore.setProductsList()
  }
  init()
</script>

<style scoped>
  .view_restock {
    background-color: rgb(240, 237, 235);
    display: flex;
    flex-direction: column;
  }
  .navbar {
    width: 100%;
    height: 100px;
    background-color: #efedeb;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.2em;
  }
  .navbar > div {
    padding: 0 1.5em;
    cursor: pointer;
  }
  .navbar > div.active {
    background-color: #fa8c45;
    color: white;
    padding: 0.3em 1.5em;
    border-radius: 15px;
  }
  .content {
    flex-grow: 1;
  }
</style>
