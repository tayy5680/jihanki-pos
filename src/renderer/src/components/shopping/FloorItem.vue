<template>
  <div class="floor_item" @click="action(itemData)">
    <div class="image">
      <el-image :src="itemData?.path" fit="cover">
        <template #error>
          <img :src="getUrl('product/default.jpg')" />
        </template>
      </el-image>
    </div>
    <div class="content">
      <div class="left">
        <div class="rackStorage">
          {{ `No.${itemData.rackStorageID ? itemData.rackStorageID : '-'}` }}
        </div>
        <div>
          <b>{{ itemData.name }}</b>
        </div>
      </div>
      <div class="right">
        <div v-if="itemData?.quantity">
          $ <strong>{{ itemData.salePrice }}</strong>
        </div>
        <div v-else>已售罄</div>
      </div>
    </div>
  </div>
</template>
<script setup>
  import { inject } from 'vue'
  import { useRouter } from 'vue-router'
  const props = defineProps({
    itemData: {
      type: Object,
      default: () => {
        id: 0
      },
    },
    action: {
      type: Function,
    },
  })
  const router = useRouter()
  const playAudio = inject('playAudio')
  const getUrl = name => {
    return new URL(`/src/assets/${name}`, import.meta.url).href
  }
</script>

<style scoped>
  .floor_item {
    box-shadow: 0px 0px 5px 2px #00000040;
    border-radius: 30px;
    margin-bottom: 1em;
    cursor: pointer;
  }
  .floor_item .image {
    width: 100%;
    height: 44vw;
    border-radius: 30px;
  }
  .floor_item .image :deep .el-image,
  .floor_item .image :deep .el-image img {
    width: 100%;
    height: 100%;
    border-radius: 30px;
    object-fit: cover;
  }

  .content {
    padding: 10px 35px;
    font-size: 1.2em;
    display: flex;
    align-items: center;
  }
  .content .left p {
    font-size: 0.8em;
    color: #a8a8a8;
    margin: 3px 0;
  }
  .content .left {
    flex-grow: 1;
  }
  .content .right {
    color: #ff9804;
    font-family: 'Oswald';
    font-size: 1.2em;
  }
  .content .right strong {
    font-size: 1.6em;
  }

  .left {
    display: flex;
    align-items: center;
  }

  .rackStorage {
    font-size: 0.8em;
    padding-right: 10px;
  }
</style>
