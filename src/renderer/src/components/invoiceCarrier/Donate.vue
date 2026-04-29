<template>
  <div class="view_invoice_donate">
    <div class="donate_item keyboard" @click="showKeyboard(true)">
      <div class="keyboard_icon">?</div>
      <div class="intro"><b>鍵盤</b><br />請輸入</div>
    </div>
    <div class="donate_item" v-for="(item, index) in DONATE_LIST" :key="index" @click="enterAction(item.donateCode)">
      <img :src="getUrl(item.img)" />
      <div class="intro">
        <b>{{ item.donateCode }}</b>
        <br />{{ item.name }}
      </div>
    </div>
  </div>

  <Keyboard
    v-if="isKeyboard"
    :title="'謮輸入捐贈碼'"
    :digit="7"
    :showKeyboard="showKeyboard"
    :enterAction="enterAction"
  />
</template>

<script setup>
  import Keyboard from '@renderer/components/Keyboard.vue'
  import { useRouter } from 'vue-router'
  import { ref, inject } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useProducts } from '@renderer/store/index.js'

  const router = useRouter()
  const productsStore = useProducts()
  const { selectedProduct } = storeToRefs(productsStore)
  const playAudio = inject('playAudio')
  const getUrl = filename => {
    return new URL(`/src/assets/${filename}`, import.meta.url).href
  }
  const props = defineProps({
    nowInvoiceTypeData: {
      type: Object,
      default: () => {},
    },
  })
  const DONATE_LIST = [
    {
      donateCode: 9118595,
      name: '財團法人勵馨社會福利事業基金會',
      img: 'vue.svg',
    },
    {
      donateCode: 8585,
      name: '財團法人台灣兒童暨家庭扶助基金會',
      img: 'vue.svg',
    },
    { donateCode: 5299, name: '台灣導盲犬協會', img: 'vue.svg' },
  ]

  const isKeyboard = ref(false)
  const showKeyboard = bool => {
    playAudio(bool ? 'click' : 'back')
    isKeyboard.value = bool
  }
  const enterAction = id => {
    productsStore.setSelectedProduct({
      ...selectedProduct.value,
      npoban: id.toString(),
      donateMark: 1,
    })
    router.push('/Shipping')
  }
</script>

<style scoped>
  .view_invoice_card img {
    width: 100%;
    height: auto;
  }
  .view_invoice_card p {
    text-align: center;
  }
  .donate_item {
    display: flex;
    margin-bottom: 15px;
    cursor: pointer;
  }
  .donate_item img {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
  }
  .donate_item .intro {
    flex-grow: 1;
    padding-left: 1em;
    color: #666;
    font-size: 1.3em;
  }
  .donate_item > div b {
    color: black;
  }
  .keyboard_icon {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background-color: black;
    color: white;
    font-size: 2.6em;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
