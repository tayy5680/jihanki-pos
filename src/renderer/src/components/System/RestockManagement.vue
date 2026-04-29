<template>
  <div class="view_products_management">
    <div class="left">
      <!-- 顯示樓層 -->
      <div class="class_floor">
        <div
          :class="{ action: n === floorID, disable: !sortFloorRes?.[n] }"
          v-for="n in 8"
          :key="n"
          @click="switchFloor(n)"
        >
          {{ n }}F
        </div>
      </div>
    </div>
    <div class="right">
      <div class="title">商品列表</div>
      <div class="right_content" v-if="floorID ? sortFloorRes?.[floorID]?.length : stockList?.length">
        <el-table
          class="restock_table"
          height="100%"
          :data="floorID ? sortFloorRes?.[floorID] : stockList"
          :row-style="{ height: '100px' }"
        >
          <el-table-column fixed prop="name" label="項目名稱" />
          <el-table-column fixed prop="rackStorageID" label="貨道" width="150" align="center" />
          <el-table-column label="庫存量/上限" width="180" align="center">
            <template #default="scope">
              {{ `${scope.row.quantity} / ${scope.row.rackStorageMaxQuantity}` }}
            </template>
          </el-table-column>
          <el-table-column label="庫存異動" width="300" align="center">
            <template #default="scope">
              <el-button
                v-if="scope.row.rackStorageMaxQuantity"
                size="large"
                type="primary"
                round
                @click="handleStock(scope.row, 'add')"
              >
                +
              </el-button>
              <el-button
                v-if="scope.row.rackStorageMaxQuantity"
                size="large"
                type="danger"
                round
                @click="handleStock(scope.row, 'subtract')"
              >
                -
              </el-button>
              <el-button
                v-if="scope.row.rackStorageMaxQuantity"
                size="large"
                type="info"
                round
                @click="handleStock(scope.row, 'full')"
              >
                補滿
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="restock_submit">
        <el-button @click="handleFatch()">
          <el-icon><Refresh /></el-icon>&ensp;重取資料
        </el-button>
        <el-button @click="handleSubmit()">
          <el-icon><Refresh /></el-icon>&ensp;確定更新
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { Refresh } from '@element-plus/icons-vue'
  import { inject, ref, computed, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useProducts, useErrorMsg } from '@renderer/store/index.js'
  import { updateStock } from '@renderer/api/request.js'
  import { clearIndexedDBStore } from '@renderer/utils/indexedDB.js'

  const errorMsg = useErrorMsg()
  const productsStore = useProducts()
  const { stockList } = storeToRefs(productsStore)
  const playAudio = inject('playAudio')
  const floorID = ref(0)
  const stocksList = ref([])
  let originQuantity = 0

  const sortFloorRes = computed(() => {
    return stockList.value.reduce((acc, curr) => {
      const index = curr?.floor ?? 99
      if (!acc[index]) acc[index] = []
      acc[index].push(curr)
      return acc
    }, {})
  })

  const switchFloor = index => {
    productsStore.setProductsList()
    productsStore.value = []
    if (!sortFloorRes.value?.[index]) return
    floorID.value = index
    playAudio('floor')
  }

  watch(
    () => floorID.value,
    (n, o) => {
      stocksList.value = []
    },
  )

  const handleStock = (row, action) => {
    const index = stocksList.value.findIndex(e => {
      return e.productStockID === row.productStockID
    })
    if (index < 0) originQuantity = row.quantity

    switch (action) {
      case 'add':
        if (row.quantity >= row.rackStorageMaxQuantity) return
        row.quantity += 1
        break
      case 'subtract':
        if (row.quantity <= 0) return
        row.quantity -= 1
        break
      case 'full':
        row.quantity = row.rackStorageMaxQuantity
        break
    }

    if (index === -1) {
      stocksList.value.push({
        productStockID: row.productStockID,
        quantity: row.quantity - originQuantity,
      })
    }

    if (index > -1) {
      const res = stocksList.value[index]
      res.quantity = row.quantity - originQuantity
      return
    }
  }

  const handleSubmit = () => {
    if (!stocksList.value.length) {
      errorMsg.setErrorMsg({ msg: '尚無數量異動' })
      return
    }
    const data = {
      productStocks: stocksList.value,
    }
    try {
      updateStock(data).then(res => {
        if (res.data.Status.Code === '0') {
          errorMsg.setErrorMsg({ msg: '異動成功' })
          stocksList.value = []
          return
        }
        errorMsg.setErrorMsg({ msg: res.data.Status.Code.Message })
      })
    } catch {
      errorMsg.setErrorMsg({ msg: '異動發生錯誤，請稍後再試' })
    }
  }

  const handleFatch = async () => {
    // 清除indexedDB資料，再次更新產品資料
    await clearIndexedDBStore()
    await productsStore.setProductsList()
    stocksList.value = []
  }
</script>

<style scoped>
  .left {
    background-color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: fixed;
    width: 130px;
    border-radius: 25px;
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
    padding: 0.5em 0;
  }
  .left .class_floor > div {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    padding: 0.5em;
  }

  .left .class_floor .action {
    color: #fa8c45;
  }

  .right {
    background-color: white;
    margin-left: 155px;
    border-radius: 25px;
    padding: 30px 0;
    height: calc(100vh - 400px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .right .title {
    padding: 0 30px;
    font-weight: bold;
    font-size: 1.2em;
  }

  .right .right_content {
    padding: 1em 0;
    overflow: hidden;
    flex-grow: 1;
  }

  .right .no_data {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f0f0f0;
  }

  .restock_table {
    width: 100%;
    font-size: 24px;
  }

  .restock_table button {
    font-size: 15px;
  }

  .restock_submit {
    padding: 0 25px;
    margin: 0 auto;
  }

  .restock_submit button {
    font-size: 24px;
    color: white;
    background-color: #fa8c45;
    padding: 30px;
    border-radius: 15px;
  }
  .restock_submit button:first-child {
    background-color: #00bcd4;
  }

  .tool {
    display: flex;
    flex: 1;
    flex-direction: column;
  }

  :deep .el-table .cell {
    padding: 0 24px;
  }
</style>
