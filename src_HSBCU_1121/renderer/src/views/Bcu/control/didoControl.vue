<template>
  <div>
    <h5>{{ t('didoControl.test_mode') }}</h5>
    <DataTable :value="didoArray" scrollHeight="500px" showGridlines>
      <Column :header="t('didoControl.device_control')">
        <template #body="{ data }">
          <div v-for="(el, index) in data.element" :key="index" class="row-item">
            <span>{{ el.label }}</span>
            <!-- 动态组件选择（网页3的组件优化） -->
            <MultiSelect
              v-model="el.pendingValue"
              :options="el.options"
              filter
              optionLabel="label"
              :placeholder="t('didoControl.multiSelectplaceholder1')"
              :maxSelectedLabels="0"
              :selectedItemsLabel="t('didoControl.selected_items')"
              style="margin-left: 1rem"
            />
          </div>
        </template>
      </Column>
      <Column :header="t('didoControl.operation')">
        <template #body="{ data }">
          <Button :label="t('didoControl.send')" @click="onSendButtonClick(data)" />
        </template>
      </Column>
    </DataTable>
    <div class="mt-3">
      <DataTable :value="dataControl" showGridlines>
        <Column :header="t('didoControl.columnHeader1')">
          <template #body="{ data }">
            <div v-for="(el, index) in data.element">
              {{
                locale === 'zh'
                  ? el.label
                  : te(`didoControl.table1Parameters.${el.label}`)
                    ? t(`didoControl.table1Parameters.${el.label}`)
                    : el.label
              }}
            </div>
          </template>
        </Column>
        <Column :header="t('didoControl.columnHeader2')">
          <template #body="{ data }">
            <div v-for="(el, index) in data.element">
              {{
                locale === 'zh'
                  ? el.value
                  : te(`didoControl.table1Values.${el.value}`)
                    ? t(`didoControl.table1Values.${el.value}`)
                    : el.value
              }}
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
    <!-- BMU产品编码表格 -->
    <div class="mt-3" v-if="bmuProductCodes && bmuProductCodes.length > 0">
      <h5>{{ t('didoControl.bmu_product_codes') }}</h5>
      <DataTable :value="bmuProductCodes" showGridlines scrollHeight="200px">
        <Column :header="t('didoControl.bmu_number')" field="bmuNumber">
          <template #body="{ data }"> BMU{{ data.bmuNumber }} </template>
        </Column>
        <Column :header="t('didoControl.product_code')" field="productCode">
          <template #body="{ data }">
            <div class="product-code-container">
              <div class="product-code-display" :title="`完整编码: ${data.productCode}`">
                <InputText
                  v-for="(hexValue, index) in parseProductCode(data.productCode)"
                  :key="index"
                  :value="hexValue"
                  readonly
                  class="hex-display-input"
                  :placeholder="'0000'"
                />
              </div>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
<script setup>
import {
  ref,
  reactive,
  watch,
  onMounted,
  computed,
  onBeforeMount,
  onBeforeUnmount,
  watchEffect
} from 'vue'
import { usePendingValueStore } from '../../../../../stores/controlPendingValue'
const MODULE_NAME = 'Control'
import { useToast } from 'primevue/usetoast'
const toast = useToast()
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useI18n } from 'vue-i18n'
const { t, te, locale } = useI18n()
const store = usePendingValueStore() // 引入 Pinia store
const ipStore = useIpStore() // 获取 Pinia store
const dataControl = ref([])
const bmuProductCodes = ref([])

// 解析产品编码，将0x开头的十六进制字符串分解为7个4位十六进制值
const parseProductCode = (productCode) => {
  if (!productCode || !productCode.startsWith('0x')) {
    return ['0000', '0000', '0000', '0000', '0000', '0000', '0000']
  }

  const hexString = productCode.slice(2) // 去掉0x前缀

  // 将十六进制字符串分解为7个4位十六进制值
  const hexCodes = Array.from({ length: 7 }, (_, index) => {
    const start = index * 4
    const end = start + 4
    const hexValue = hexString.slice(start, end) || '0000'
    return hexValue.toUpperCase().padStart(4, '0')
  })

  return hexCodes
}
const DEVICE_CONFIG = computed(() => ({
  C200_CONTACTOR: {
    address: 'C200',
    label: t('didoControl.options.C200_CONTACTOR.label'),
    bitwise: true, // 位操作标记（网页6的位运算思想）
    options: [
      { label: t('didoControl.options.C200_CONTACTOR.0'), bit: 0 },
      { label: t('didoControl.options.C200_CONTACTOR.1'), bit: 1 },
      { label: t('didoControl.options.C200_CONTACTOR.2'), bit: 2 },
      { label: t('didoControl.options.C200_CONTACTOR.3'), bit: 3 },
      { label: t('didoControl.options.C200_CONTACTOR.4'), bit: 4 },
      { label: t('didoControl.options.C200_CONTACTOR.5'), bit: 5 }
    ]
  },
  C201_HIGH_SIDE: {
    label: t('didoControl.options.C201_HIGH_SIDE.label'),
    address: 'C201',
    bitwise: true, // 位操作标记（网页6的位运算思想）
    elements: [
      // 新增elements数组
      {
        label: t('didoControl.options.C201_HIGH_SIDE.label1'),
        options: [
          { label: t('didoControl.options.C201_HIGH_SIDE.high_side_1'), bit: 0 },
          { label: t('didoControl.options.C201_HIGH_SIDE.high_side_2'), bit: 1 },
          { label: t('didoControl.options.C201_HIGH_SIDE.high_side_3'), bit: 2 },
          { label: t('didoControl.options.C201_HIGH_SIDE.high_side_4'), bit: 3 },
          { label: t('didoControl.options.C201_HIGH_SIDE.high_side_5'), bit: 4 },
          { label: t('didoControl.options.C201_HIGH_SIDE.high_side_6'), bit: 5 },
          { label: t('didoControl.options.C201_HIGH_SIDE.high_side_7'), bit: 6 },
          { label: t('didoControl.options.C201_HIGH_SIDE.high_side_8'), bit: 7 }
        ]
      },
      {
        label: t('didoControl.options.C201_HIGH_SIDE.label2'),
        options: [
          { label: t('didoControl.options.C201_HIGH_SIDE.low_side_1'), bit: 12 },
          { label: t('didoControl.options.C201_HIGH_SIDE.low_side_2'), bit: 13 }
        ]
      }
    ]
  },
  C202: {
    label: t('didoControl.options.C202.label'),
    address: 'C202',
    bitwise: true, // 位操作标记（网页6的位运算思想）
    options: [
      { label: t('didoControl.options.C202.0'), bit: 0 },
      { label: t('didoControl.options.C202.1'), bit: 1 },
      { label: t('didoControl.options.C202.2'), bit: 2 }
    ]
  }
}))
const didoArray = ref([])
const buildDidoArray = (config) => {
  return Object.entries(config).map(([addr, config]) => ({
    address: `0x${config.address.toLowerCase()}`,
    classification: config.label,
    element: config.elements // 新增elements处理
      ? config.elements.map((el) => ({
          label: el.label,
          writeValue: '不执行',
          pendingValue: config.bitwise ? [] : null,
          options: el.options,
          bitwise: config.bitwise
        }))
      : [
          {
            label: config.label,
            writeValue: '不执行',
            pendingValue: config.bitwise ? [] : null,
            options: config.options,
            bitwise: config.bitwise
          }
        ]
  }))
}
watchEffect(() => {
  didoArray.value = buildDidoArray(DEVICE_CONFIG.value)
})
// 位运算处理器（
const bitwiseHandler = (selectedOptions) =>
  selectedOptions.reduce((acc, cur) => acc | (1 << cur.bit), 0)
// 发送逻辑统一处理
const sendWriteRequest = async (address, value) => {
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  toast.add({
    severity: 'info',
    summary: t('deviceControl.writeInProgress', { count: targets.length }),
    detail: targets.join('，'),
    life: 5000
  })
  // 并行 invoke 每个 IP
  const results = await Promise.all(
    targets.map(async (ip) => {
      const payload = [{ address, value, ip }]
      try {
        const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', payload)
        return { ip, res }
      } catch (err) {
        return { ip, res: { success: false, error: err.message } }
      }
    })
  )
  console.log(results)
  // 3. 统一处理所有响应
  // 5. 一次性提示“完成” & “失败”
  const okList = results.filter((r) => r.res.success).map((r) => r.ip)
  const failList = results.filter((r) => !r.res.success).map((r) => r.ip)

  if (okList.length) {
    toast.add({
      severity: 'success',
      summary: t('deviceControl.writeComplete'),
      detail: okList.join('，'),
      life: 5000
    })
  }
  if (failList.length) {
    toast.add({
      severity: 'error',
      summary: t('deviceControl.writeFail'),
      detail: failList.join('，'),
      life: 5000
    })
  }
}

// 按钮点击处理
const onSendButtonClick = (row) => {
  // 合并当前行所有element的值
  const combinedValue = row.element.reduce((acc, el) => {
    if (!el.pendingValue?.length) return acc
    return acc | bitwiseHandler(el.pendingValue)
  }, 0)
  sendWriteRequest(row.address, combinedValue)
  /*   if (combinedValue !== 0) {
      sendWriteRequest(row.address, combinedValue)
    } */
}
// 状态持久化
const pendingStates = computed(() =>
  didoArray.value.flatMap((row) =>
    row.element.map((el) => ({
      classification: row.classification,
      address: el.address,
      label: el.label,
      value: el.pendingValue
    }))
  )
)
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
const initDataControl = [
  {
    classification: '控制信息执行结果',
    element: [{ label: '接触器执行策略结果', value: '-' }]
  },
  {
    classification: '控制信息执行结果',
    element: [{ label: '绝缘电阻检测执行结果', value: '-' }]
  }
]
let listenerId = ref(null)
watch(
  () => ipStore.selectedIp, //监听ip的变化
  (newIp) => {
    const controlData = state.deviceData[newIp]?.['update-FC04Control']
    if (controlData) {
      // 只提取数组部分，排除bmuProductCodes属性
      const { bmuProductCodes: codes, ...controlArray } = controlData
      dataControl.value = Object.values(controlArray)
      // 提取BMU产品编码数据
      bmuProductCodes.value = codes || []
      console.log('接收到的BMU产品编码数据:', codes)
    }
  },
  { immediate: true }
)
const registerListerner = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04Control')
  listenerId.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    if (!state.deviceData[deviceIp]) {
      state.deviceData[deviceIp] = {}
    }
    state.deviceData[deviceIp][event] = Arg.Arg
    if (deviceIp === ipStore.selectedIp) {
      // 只提取数组部分，排除bmuProductCodes属性
      const { bmuProductCodes: codes, ...controlArray } = Arg.Arg
      dataControl.value = Object.values(controlArray)
      // 提取BMU产品编码数据
      bmuProductCodes.value = codes || []
    }
  }
  window.electron.ipcRenderer.on('update-FC04Control', listenerId.value)
}
watch(pendingStates, (newVal) => {
  newVal.forEach(({ classification, label, value }) => {
    if (value) store.setPendingValue(classification, label, value)
  })
})
const startReading = () => {
  window.electron.ipcRenderer.send('start-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}

const stopReading = () => {
  window.electron.ipcRenderer.send('stop-reading-data-params', {
    module: MODULE_NAME
  })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}
onBeforeMount(() => {
  registerListerner()
  startReading()
})
onMounted(() => {
  didoArray.value.forEach((row) => {
    row.element.forEach((el) => {
      const savedPendingValue = store.getPendingValue(row.classification, el.label)
      if (savedPendingValue !== null) {
        el.pendingValue = savedPendingValue
      } else {
        el.pendingValue = null
      }
    })
  })
})
// 暴露数据给父组件
defineExpose({
  bmuProductCodes
})

onBeforeUnmount(() => {
  stopReading()
  // 注销所有事件监听器
  if (listenerId.value) {
    window.electron.ipcRenderer.removeListener('update-FC04Control', listenerId.value)
    listenerId.value = null
    //console.log('已注销事件监听器: update-FC04Control')
  }
})
</script>

<style scoped>
.didoControl {
  margin-left: 3rem;
}
:deep(.p-multiselect) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
.row-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: space-between;
}

/* 产品编码显示样式 */
.product-code-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-start;
}

.product-code-display {
  display: flex;
  gap: 0.125rem;
  align-items: center;
  flex-wrap: nowrap;
  max-width: 100%;
}

.hex-display-input {
  width: 45px !important;
  text-align: center;
  cursor: default;
}
/* 适配不同屏幕尺寸 */
@media (max-width: 768px) {
  .product-code-display {
    gap: 0.1rem;
  }

  .hex-display-input {
    width: 36px !important;
    font-size: 0.75rem;
  }

  .product-code-label {
    font-size: 0.6rem;
  }
}
</style>
