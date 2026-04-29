<template>
  <div class="view_pos_management">
    <el-row :gutter="25">
      <el-col :span="8" class="left">
        <div class="area machine_test">
          <div class="title">機器測試</div>
          <el-button class="fullbtn" @click="handleArmReset()">手臂復位</el-button>
        </div>
        <div class="area system_control">
          <div class="title">系統控制</div>
          <el-button class="fullbtn" @click="handleCloseWin()">關閉程式</el-button>
        </div>
        <div class="area">
          <div class="title">
            心跳線
            <div class="more" @click="heartbeatDialogVisible = true">
              <el-icon><MoreFilled /></el-icon>
            </div>
          </div>
          <el-button-group class="line_chart_type">
            <el-button
              v-for="item in HEARTBEAT_LINE_CHART_TYPE"
              :key="item.type"
              :class="{ active: nowLineChartType === item.type }"
              :type="nowLineChartType === item.type ? 'success' : 'default'"
              @click="nowLineChartType = item.type"
            >
              {{ item.label }}
            </el-button>
          </el-button-group>
          <canvas ref="heartbeatLine" width="300" height="150"></canvas>
          <el-button class="fullbtn" @click="handleHeartbeatLine()">自我檢查</el-button>
        </div>
      </el-col>
      <el-col :span="16">
        <div class="area">
          <div class="test_msg" ref="scrollRef">
            <div v-for="(item, index) in logRecord" :key="index">
              {{ item }}
              <hr />
            </div>
          </div>

          <div class="btn">
            <el-button @click="ipcStore.clearLogRecord">清除內容</el-button>
            <el-button @click="scrollToTop">查看最新</el-button>
          </div>
        </div>
      </el-col>
    </el-row>
    <el-dialog
      class="heartbeatLineDialog"
      v-model="heartbeatDialogVisible"
      title="歷史紀錄"
      width="70vw"
      align-center
      :before-close="handleClose"
    >
      <div class="scroll">
        <div class="body">
          <el-row v-for="(item, index) in showHistroyData" :key="index" :class="`heartbeatBody ${item.color}`">
            <el-col class="color" :span="2"></el-col>
            <el-col class="time" :span="8">{{ item.totalTime }}</el-col>
            <el-col class="msg" :span="14">
              <div>{{ HEARTBEAT_COLOR_CONFIG[item.color] }}</div>
              <div v-if="item?.errorType">{{ item.errorType }}</div>
              <div v-if="item?.errorMsg">{{ item.errorMsg }}</div>
            </el-col>
          </el-row>
        </div>
      </div>
      <el-button
        class="more_count"
        :class="{ disabled: historyDataCount >= showHistroyData.length }"
        @click="historyDataCount += 20"
        :disabled="historyDataCount >= showHistroyData.length"
        >顯示更多</el-button
      >
    </el-dialog>
  </div>
</template>

<script setup>
  import { nextTick, ref, onMounted, computed, watch } from 'vue'
  import { useIPCData } from '@renderer/store/index.js'
  import { storeToRefs } from 'pinia'
  import dayjs from 'dayjs'
  import Chart from 'chart.js/auto'
  import { MoreFilled } from '@element-plus/icons-vue'

  const ipcStore = useIPCData()
  const { logRecord, heartbeatLineRecord } = storeToRefs(ipcStore)

  const handleCloseWin = () => {
    window.close()
  }
  const handleArmReset = () => {
    ipcStore.sendIpcRenderer('restoreArm', {})
  }

  const scrollRef = ref(null)
  const scrollToTop = () => {
    nextTick(() => {
      scrollRef.value.scrollTop = -1 * scrollRef.value.scrollHeight
    })
  }
  watch(
    logRecord,
    () => {
      scrollToTop()
    },
    { deep: true },
  )
  const handleClose = () => {
    historyDataCount.value = 20
    heartbeatDialogVisible.value = false
  }
  const heartbeatDialogVisible = ref(false)

  const HEARTBEAT_COLOR_CONFIG = {
    red: '機器網路離線',
    yellow: '硬體異常，機器無法維運',
    green: '正常',
  }
  const HEARTBEAT_LINE_CHART_TYPE = [
    { type: 'newest', label: '最新' },
    { type: 'hour', label: '每時' },
  ]

  // 歷史資料
  const historyDataCount = ref(20)
  const showHistroyData = computed(() => heartbeatLineRecord.value.slice(-1 * historyDataCount.value))

  // 折線圖資料
  const heartbeatLine = ref(null)
  const nowLineChartType = ref('newest')
  const lineChartData = computed(() => {
    // 顯示每小時的第一筆資料
    if (nowLineChartType.value === 'hour') {
      return heartbeatLineRecord.value
        .filter((item, index) => {
          return (
            index === 0 || dayjs(item.totalTime).hour() !== dayjs(heartbeatLineRecord.value[index - 1].totalTime).hour()
          )
        })
        .slice(-8)
    }
    return heartbeatLineRecord.value.slice(-8)
  })
  const labels = computed(() => lineChartData.value.map(item => item.time))
  const datas = computed(() => lineChartData.value.map(item => item.color))

  onMounted(() => {
    scrollToTop()
    nextTick(() => {
      const myChart = new Chart(heartbeatLine.value, {
        type: 'line',
        data: {
          labels: labels.value, // 紀錄時間
          datasets: [
            {
              label: '狀態',
              data: datas.value, // 紀錄顏色
              backgroundColor: datas.value,
              borderColor: '#ccc',
            },
          ],
        },
        options: {
          scales: {
            x: {
              display: true,
              title: { display: true, text: '時間' },
            },
            y: {
              type: 'category',
              labels: ['red', 'yellow', 'green'],
              title: { display: true, text: '燈號' },
            },
          },
        },
      })
      // 監聽折線圖變化
      watch(
        datas,
        () => {
          myChart.data.labels = labels.value
          myChart.data.datasets[0].data = datas.value
          myChart.data.datasets[0].backgroundColor = datas.value
          myChart.update()
        },
        { deep: true },
      )
    })
  })

  // 發送心跳線機器測試
  const handleHeartbeatLine = () => {
    ipcStore.sendIpcRenderer('heartbeatLine', {})
  }
</script>

<style scoped>
  .view_pos_management {
    height: calc(100vh - 340px);
  }
  .view_pos_management > div {
    height: 100%;
  }
  .view_pos_management .area {
    background-color: white;
    border-radius: 25px;
    padding: 30px;
  }
  .view_pos_management .area .title {
    font-weight: bold;
    font-size: 1.2em;
    display: flex;
    justify-content: space-between;
  }

  .view_pos_management .test_msg {
    overflow: scroll;
    height: calc(100vh - 485px);
    font-size: 18px;
    display: flex;
    flex-direction: column-reverse;
  }

  .machine_test button {
    color: white;
    background-color: #00bcd4;
  }

  .system_control button {
    color: white;
    background-color: black;
  }

  .left .area {
    margin-bottom: 25px;
  }
  .left .area button.fullbtn {
    font-size: 1em;
    padding: 30px;
    border-radius: 15px;
    width: 100%;
    margin: 10px 0 0 0;
  }

  .area .btn {
    padding: 0 25px;
    margin: 0 auto;
    text-align: center;
  }

  .area .btn button {
    font-size: 24px;
    color: white;
    background-color: #fa8c45;
    padding: 30px;
    border-radius: 15px;
    margin-top: 20px;
  }
  .area .btn button:first-child {
    background-color: #9e9e9e;
  }

  .more {
    cursor: pointer;
  }

  :deep .heartbeatLineDialog {
    border-radius: 25px;
  }
  :deep .heartbeatLineDialog .el-dialog__header span {
    font-size: 1em;
  }
  :deep .heartbeatLineDialog .el-dialog__body {
    font-size: 1em;
  }
  :deep .heartbeatLineDialog .el-dialog__body .heartbeatBody {
    display: flex;
    margin-bottom: 20px;
    border-radius: 20px;
    border: 1px solid gray;
    overflow: hidden;
  }
  :deep .heartbeatLineDialog .el-dialog__body .heartbeatBody .color {
    width: 30px;
  }
  :deep .heartbeatLineDialog .el-dialog__body .heartbeatBody .time {
    font-weight: bold;
    text-align: center;
    padding: 20px 30px;
    border-right: 1px solid gray;
    background-color: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :deep .heartbeatLineDialog .el-dialog__body .heartbeatBody .msg {
    flex-grow: 1;
    background-color: white;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }
  :deep .heartbeatLineDialog .el-dialog__body .heartbeatBody.red .color {
    background-color: #e74040;
  }
  :deep .heartbeatLineDialog .el-dialog__body .heartbeatBody.yellow .color {
    background-color: #ffd900;
  }
  :deep .heartbeatLineDialog .el-dialog__body .heartbeatBody.green .color {
    background-color: #78c680;
  }
  :deep .heartbeatLineDialog .el-dialog__body .body {
    display: flex;
    flex-direction: column-reverse;
  }
  :deep .heartbeatLineDialog .el-dialog__body button {
    font-size: 1em;
    padding: 40px 30px;
    border-radius: 15px;
    width: 100%;
    margin: 10px 0 0 0;
    color: white;
    background-color: black;
  }
  :deep .heartbeatLineDialog .el-dialog__body button.disabled {
    background-color: #c8c8c8;
  }
  :deep .heartbeatLineDialog .el-dialog__body .scroll {
    max-height: 60vh;
    overflow-y: scroll;
  }
  .line_chart_type {
    padding: 15px 0;
  }
  .line_chart_type button {
    font-size: 1em;
    padding: 20px 20px;
  }
</style>
