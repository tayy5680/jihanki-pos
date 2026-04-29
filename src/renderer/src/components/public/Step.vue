<template>
  <div class="step">
    <el-steps :active="activeID" align-center finish-status="process" process-status="wait">
      <el-step v-for="item in STEP_INFO" :key="item.step" :icon="CircleCheckFilled">
        <template v-slot:description>
          <p>
            STEP.<strong>{{ item.step }}</strong>
            {{ item.label }}
          </p>
        </template>
      </el-step>
    </el-steps>
  </div>
</template>

<script setup>
  import { CircleCheckFilled } from '@element-plus/icons-vue'
  const props = defineProps({
    activeID: {
      type: Number,
      default: () => 1,
    },
  })

  const STEP_INFO = [
    { step: 1, label: '選擇商品' },
    { step: 2, label: '付款方式' },
    { step: 3, label: '選擇載具' },
    { step: 4, label: '出貨中' },
  ]
</script>

<style scoped>
  .step {
    padding: 40px 0;
    font-weight: bold;
    width: 100%;
  }
  .step p {
    font-family: 'Oswald';
    margin-bottom: 0;
    font-size: 1em;
  }
  .step strong {
    font-size: 1.4em;
    padding-right: 5px;
    padding-top: 18px;
  }
  :deep .el-step.is-center .el-step__description {
    padding: 0px;
    font-size: inherit;
  }
  :deep .el-step.is-center .el-step__icon .el-step__icon-inner {
    font-size: 45px;
  }
</style>
