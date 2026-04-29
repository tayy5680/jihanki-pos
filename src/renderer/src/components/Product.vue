<template>
  <div class="view_product" v-if="selectedProduct?.productID">
    <div class="back" @click="back">
      <el-icon><ArrowLeftBold /></el-icon>
    </div>

    <div class="image">
      <el-image :src="selectedProduct?.path" fit="cover">
        <template #error>
          <img :src="getUrl('product/default.jpg')" />
        </template>
      </el-image>
    </div>
    <div class="content">
      <div class="number">
        No.<span>{{ selectedProduct.rackStorageID ? selectedProduct.rackStorageID : '-' }}</span>
      </div>

      <div class="main">
        <div class="left">
          <h3>{{ selectedProduct.name }}</h3>
          <div class="sub_title" v-if="selectedProduct?.ad" v-html="selectedProduct.ad"></div>
          <div class="s_title">購買須知：</div>
          <div class="s_text">盲盒商品不保證開出指定品項<br />＊隱藏款為機率配置，不保證本機台必定能獲取</div>
          <div class="s_title">確認購買，選擇發票載具及付款方式</div>
          <el-button v-if="selectedProduct?.quantity" round @click="action">發票及付款</el-button>
          <div v-else class="sold_out">已售罄</div>
        </div>

        <div class="right">
          <div>
            $ <span>{{ selectedProduct.salePrice }}</span>
          </div>
        </div>
      </div>
    </div>
    <Step :activeID="1" />
  </div>
</template>

<script setup>
  import { inject } from 'vue'
  import { ArrowLeftBold } from '@element-plus/icons-vue'
  import { useRouter, useRoute } from 'vue-router'
  import Step from './public/Step.vue'
  import { storeToRefs } from 'pinia'
  import { useProducts } from '@renderer/store/index.js'
  const productsStore = useProducts()
  const { selectedProduct } = storeToRefs(productsStore)

  const router = useRouter()
  const route = useRoute()

  const playAudio = inject('playAudio')
  const getUrl = filename => {
    return new URL(`/src/assets/${filename}`, import.meta.url).href
  }

  const back = () => {
    playAudio('back')
    router.push({
      name: 'Shopping',
      query: {
        floor: route.query?.floor ?? 0,
        isCategoryByFloor: route.query?.isCategoryByFloor ?? 'true',
      },
    })
  }

  const action = () => {
    playAudio('click')
    router.push('/Payment')
  }
  const init = () => {
    if (!selectedProduct.value?.productID) router.push('/Shopping')
  }
  init()
</script>

<style scoped>
  .view_product {
    display: flex;
    flex-direction: column;
  }
  .view_product .image {
    padding-top: 70px;
    text-align: center;
  }
  .view_product .image .el-image,
  .view_product .image .el-image img {
    width: 100%;
    height: auto;
    border-radius: 30px;
    object-fit: cover;
  }

  .view_product .content {
    padding: 0 30px 20px 30px;
    flex-grow: 1;
  }
  .content .number span {
    font-size: 1.4em;
  }

  .content .main {
    display: flex;
  }

  .main .left {
    flex-grow: 1;
  }
  .main .left h3 {
    margin: 0;
    padding: 0;
    font-size: 1.6em;
  }
  .main .left .sub_title {
    color: #777;
  }
  .main .left .s_title {
    font-weight: bold;
    border-left: 2px solid black;
    line-height: 1em;
    padding-left: 10px;
    margin-top: 24px;
  }
  .main .left .s_text {
    color: #777;
    padding-top: 10px;
  }
  .main .left button {
    background-color: black;
    margin-top: 2em;
    border-radius: 50px;
    color: white;
    font-weight: bold;
    font-size: 1.3em;
    padding: 1em;
  }
  .main .left .sold_out {
    color: #ff9804;
    margin-top: 2em;
    padding: 1em;
    background-color: #f9f2e9;
    border-radius: 20px;
  }
  .main .right > div {
    color: #ff9804;
    font-family: 'Oswald';
    font-size: 2em;
    text-align: center;
  }
  .main .right > div span {
    font-size: 2em;
  }
</style>
