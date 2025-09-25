<script setup>
import { ref, watch, onMounted, computed, watchEffect, reactive } from 'vue'
import { usePendingValueStore } from '../../../../../stores/controlPendingValue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const confirm = useConfirm()
const toast = useToast()
import didoControl from './didoControl.vue'
import dido from '../DIDO/dido.vue'
import { CORRECT_PASSWORD1 } from './pwd.js'
const store = usePendingValueStore() // 获取 Pinia store 实例
// 当 localPendingValue 变化时，更新 Pinia store 中的值
// 当控件的 pendingValue 发生变化时，更新 Pinia store
import { useIpStore } from '../../../../../stores/ipStore.js'
const ipStore = useIpStore() // 获取 Pinia store
const DEVICE_CONFIG = computed(() => ({
  C000: {
    label: t('deviceControl.C000.label'),
    options: [
      { label: t('deviceControl.C000.options.invalid'), value: 0 },
      { label: t('deviceControl.C000.options.chargeOperation'), value: 1 },
      { label: t('deviceControl.C000.options.dischargeOperation'), value: 2 },
      { label: t('deviceControl.C000.options.disconnectBus'), value: 3 },
      { label: t('deviceControl.C000.options.selfTest'), value: 4 }
    ]
  },
  C002: {
    label: t('deviceControl.C002.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C002.options.startTest'), value: 0x5bb5 },
      { label: t('deviceControl.C002.options.stopTest'), value: 0x1221 }
    ]
  },
  C003: {
    label: t('deviceControl.C003.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C003.options.testMode'), value: 0x5bb5 },
      { label: t('deviceControl.C003.options.normalMode'), value: 0x1221 }
    ]
  },
  C004: {
    label: t('deviceControl.C004.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C004.options.enable'), value: 0x5bb5 },
      { label: t('deviceControl.C004.options.disable'), value: 0x1221 }
    ]
  },
  C00A: {
    label: t('deviceControl.C00A.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C00A.options.clearAllFaults'), value: 0x0000 },
      { label: t('deviceControl.C00A.options.clearChargingFault'), value: 0x0001 },
      { label: t('deviceControl.C00A.options.clearDischargingFault'), value: 0x0002 },
      { label: t('deviceControl.C00A.options.clearInsulationFault'), value: 0x0003 },
      { label: t('deviceControl.C00A.options.clearContactorFault'), value: 0x0004 },
      { label: t('deviceControl.C00A.options.clearPCSCommFault'), value: 0x0005 }
    ]
  },
  C00B: {
    label: t('deviceControl.C00B.label'),
    class1: t('deviceControl.C00B.C00BLabelBasic'),
    class2: t('deviceControl.C00B.C00BLabelFactory'),
    bitwise: true,
    options: [
      { label: t('deviceControl.C00B.options.systemParams'), bit: 0 },
      { label: t('deviceControl.C00B.options.cellCalibration'), bit: 1 },
      { label: t('deviceControl.C00B.options.clusterDiagnosis'), bit: 2 },
      { label: t('deviceControl.C00B.options.packDiagnosis'), bit: 3 },
      { label: t('deviceControl.C00B.options.cellDiagnosis'), bit: 4 },
      { label: t('deviceControl.C00B.options.saveRealTimeData'), bit: 5 },
      { label: t('deviceControl.C00B.options.soxParams'), bit: 6 },
      { label: t('deviceControl.C00B.options.sopMap'), bit: 7 },
      { label: t('deviceControl.C00B.options.factoryCalibration'), bit: 8 },
      { label: t('deviceControl.C00B.options.eventRecordFlag'), bit: 9 },
      { label: t('deviceControl.C00B.options.systemRuntime'), bit: 10 },
      { label: t('deviceControl.C00B.options.configParam'), bit: 11 }
    ]
  },
  C00D: {
    label: t('deviceControl.C00D.label'),
    bitwise: false,
    options: [{ label: t('deviceControl.C00D.options.reset'), value: 0x5bb5 }]
  },
  C00E: {
    label: t('deviceControl.C00E.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C00E.options.start'), value: 0x5bb5 },
      { label: t('deviceControl.C00E.options.stop'), value: 0x1221 }
    ]
  },
  C00F: {
    label: t('deviceControl.C00F.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C00F.options.start'), value: 0x5bb5 },
      { label: t('deviceControl.C00F.options.stop'), value: 0x1221 }
    ]
  },
  C010: {
    label: t('deviceControl.C010.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C010.options.start'), value: 0x5bb5 },
      { label: t('deviceControl.C010.options.stop'), value: 0x1221 }
    ]
  },
  C011: {
    label: t('deviceControl.C011.label'),
    bitwise: false,
    options: [
      { label: t('deviceControl.C011.options.start'), value: 0x5bb5 },
      { label: t('deviceControl.C011.options.stop'), value: 0x1221 }
    ]
  },
  C012: {
    label: t('deviceControl.C012.label'),
    bitwise: false,
    inputType: 'number',
    defaultValue: 0
  },
  C013: {
    label: t('deviceControl.C013.label'),
    bitwise: false,
    inputType: 'number',
    defaultValue: 0
  }
}))
const buildControlArray = (config) => {
  const arr = []
  Object.entries(config).forEach(([addr, conf]) => {
    if (addr === 'C00B') {
      // 拆分bit0~bit7和bit8~bit10
      const firstGroup = conf.options.filter((opt) => opt.bit >= 0 && opt.bit <= 7 && opt.bit !== 5)
      const secondGroup = conf.options.filter((opt) => opt.bit >= 8 || opt.bit === 5)
      arr.push({
        address: `0x${addr.toLowerCase()}`,
        classification: conf.class1,
        element: [
          {
            label: t('deviceControl.C00B.C00BLabelBasic'),
            writeValue: t('deviceControl.C000.options.invalid'),
            pendingValue: [],
            options: firstGroup,
            bitwise: true
          }
        ]
      })
      arr.push({
        address: `0x${addr.toLowerCase()}`,
        classification: conf.class2,
        element: [
          {
            label: t('deviceControl.C00B.C00BLabelFactory'),
            writeValue: t('deviceControl.C000.options.invalid'),
            pendingValue: [],
            options: secondGroup,
            bitwise: true
          }
        ]
      })
    } else {
      // 其它项保持不变
      const defaultValue = conf.bitwise
        ? []
        : (() => {
            switch (addr) {
              case 'C000':
                return conf.options.find(
                  (o) => o.label === t('deviceControl.C000.options.chargeOperation')
                )?.value
              case 'C002':
                return conf.options.find(
                  (o) => o.label === t('deviceControl.C002.options.stopTest')
                )?.value
              case 'C003':
                return conf.options.find(
                  (o) => o.label === t('deviceControl.C003.options.testMode')
                )?.value
              case 'C004':
                return conf.options.find((o) => o.label === t('deviceControl.C004.options.enable'))
                  ?.value
              case 'C00A':
                return conf.options.find(
                  (o) => o.label === t('deviceControl.C00A.options.clearAllFaults')
                )?.value
              case 'C00C':
                return conf.options.find(
                  (o) => o.label === t('deviceControl.C00B.options.systemParams')
                )?.value
              case 'C00D':
                return conf.options.find((o) => o.label === t('deviceControl.C00D.options.reset'))
                  ?.value
              case 'C00E':
                return conf.options.find((o) => o.label === t('deviceControl.C00E.options.start'))
                  ?.value
              case 'C00F':
                return conf.options.find((o) => o.label === t('deviceControl.C00F.options.start'))
                  ?.value
              case 'C010':
                return conf.options.find((o) => o.label === t('deviceControl.C010.options.start'))
                  ?.value
              case 'C011':
                return conf.options.find((o) => o.label === t('deviceControl.C011.options.start'))
                  ?.value
              case 'C012':
                return conf.inputType === 'number' ? conf.defaultValue : 0
              case 'C013':
                return conf.inputType === 'number' ? conf.defaultValue : 0
            }
          })()
      arr.push({
        address: `0x${addr.toLowerCase()}`,
        classification: conf.label,
        element: [
          {
            label: conf.label,
            writeValue: t('deviceControl.C000.options.invalid'),
            pendingValue: defaultValue,
            options: conf.options,
            bitwise: conf.bitwise || false,
            inputType: conf.inputType
          }
        ]
      })
    }
  })
  return arr
}
// 改为响应式引用
const controlArray = ref([])
// 使用 watchEffect 响应语言变化
watchEffect(() => {
  // 每次语言变化或设备配置变化时重建数组
  controlArray.value = buildControlArray(DEVICE_CONFIG.value)
})
const readingParam = async () => {
  try {
    const value = await window.electron.ipcRenderer.invoke('read-control-registers', {
      ip: ipStore.selectedIp
    })
    /* console.log('返回的控制参数', value) */
    const BASE_ADDR = 0xc000
    controlArray.value.forEach((row) => {
      const addrInt = parseInt(row.address, 16)
      const offset = addrInt - BASE_ADDR
      if (offset < 0 || offset >= value.length) return
      const regVal = value[offset]
      const el = row.element[0]
      if (el.bitwise) {
        if (regVal === 0) {
          el.pendingValue = []
        } else {
          const selectedBits = []
          el.options.forEach((opt) => {
            // opt.bit 是一个数字，表示第几位
            if (((regVal >> opt.bit) & 1) === 1) {
              selectedBits.push(opt.bit)
            }
          })
          el.pendingValue = selectedBits
        }
      } else {
        if (el.options) {
          const matchedOption = el.options.find((opt) => opt.value === regVal)

          if (matchedOption) {
            el.pendingValue = regVal
          } else {
            const invalidOpt = el.options.find((opt) => opt.label === '无效')
            if (invalidOpt) {
              el.pendingValue = invalidOpt.value
            } else {
              el.pendingValue = null
            }
          }
        } else {
          // 对于没有选项的输入框类型，直接使用寄存器值
          el.pendingValue = regVal
        }
      }
    })
  } catch (e) {
    console.error(e)
  }
}
// 位运算处理器（
const bitwiseHandler = (selectedOptions) => {
  return selectedOptions.reduce((acc, cur) => acc | (1 << cur), 0)
}
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
  // 2. 并行 invoke 每个 IP
  const results = await Promise.all(
    targets.map(async (ip) => {
      const payload = [{ address, value, ip }]
      try {
        // invoke 会自动管理 listener，返回主进程 handle 的结果
        const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', payload)
        return { ip, ...res }
      } catch (err) {
        return { ip, success: false, error: err.message }
      }
    })
  )

  // 3. 统一处理所有响应
  // 5. 一次性提示“完成” & “失败”
  const okList = results.filter((r) => r.success).map((r) => r.ip)
  const failList = results.filter((r) => !r.success).map((r) => r.ip)

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

const showPwdDialog = ref(false)
const inputPwd = ref('')
const pwdError = ref(false)
const pendingSendRow = ref(null)
const cancelled = ref(false)
function cancelPwd() {
  showPwdDialog.value = false
  cancelled.value = true
}

function checkPwdAndSend() {
  if (inputPwd.value === CORRECT_PASSWORD1) {
    showPwdDialog.value = false
    pwdError.value = false
    sessionStorage.setItem('fetPagePassword', 'ok')
    if (pendingSendRow.value) {
      actuallySendRow(pendingSendRow.value)
      pendingSendRow.value = null
    }
  } else {
    pwdError.value = true
  }
}
let isConfirmDialogActive = ref(false)
function actuallySendRow(row) {
  if (isConfirmDialogActive.value) return // 防止多次弹窗
  isConfirmDialogActive.value = true
  confirm.require({
    message: t('deviceControl.confirmMessage', { name: row.classification }),
    header: t('deviceControl.confirmHeader'),
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      row.element.forEach((el) => {
        if (el.pendingValue === null || el.pendingValue === undefined) return
        const value = el.bitwise ? bitwiseHandler(el.pendingValue) : el.pendingValue
        sendWriteRequest(row.address, value)
      })
      isConfirmDialogActive.value = false
    },
    reject: () => {
      isConfirmDialogActive.value = false
    },
    acceptLabel: t('password.confirm') || '确认', // 确保这里有合适的文本
    rejectLabel: t('password.cancel') || '取消', // 确保这里有合适的文本
    onHide: () => {
      isConfirmDialogActive.value = false
    }
  })
}
const onSendButtonClick = (row) => {
  // 对C00A、C00B、C011、C012加密码校验
  if (
    (row.address === '0xc00a' ||
      row.address === '0xc00b' ||
      row.address === '0xc012' ||
      row.address === '0xc013') &&
    sessionStorage.getItem('fetPagePassword') !== 'ok'
  ) {
    showPwdDialog.value = true
    inputPwd.value = ''
    pwdError.value = false
    pendingSendRow.value = row
    return
  }
  actuallySendRow(row)
}
// 状态持久化
const pendingStates = computed(() =>
  controlArray.value.flatMap((row) =>
    row.element.map((el) => ({
      classification: row.classification,
      label: el.label,
      value: el.pendingValue
    }))
  )
)
watch(pendingStates, (newVal) => {
  newVal.forEach(({ classification, label, value }) => {
    if (value) store.setPendingValue(classification, label, value)
  })
})
// 独立执行下拉选项，computed以响应语言变化
const indepOptions = computed(() => [
  { label: t('deviceControl.indepOptions.invalid'), value: 0b00 },
  { label: t('deviceControl.indepOptions.disconnect'), value: 0b01 },
  { label: t('deviceControl.indepOptions.connect'), value: 0b10 }
])

// 独立执行控制项，computed以响应语言变化
const independentControls = computed(() => [
  { key: 'mainPos', label: t('deviceControl.mainPos'), shift: 0 },
  { key: 'preCharge', label: t('deviceControl.preCharge'), shift: 2 },
  { key: 'mainNeg', label: t('deviceControl.mainNeg'), shift: 4 },
  { key: 'tripCoil', label: t('deviceControl.tripCoil'), shift: 6 },
  { key: 'fan', label: t('deviceControl.fan'), shift: 8 },
  { key: 'dcKM', label: t('deviceControl.dcKM'), shift: 10 }
])

// pending值单独管理，key为控制项key
const indepPending = reactive({
  mainPos: 0,
  preCharge: 0,
  mainNeg: 0,
  tripCoil: 0,
  fan: 0,
  dcKM: 0
})

// 3. 点击“执行”时，遍历所有 pending，合并成一个寄存器值并下发
const onExecuteIndependent = async () => {
  let value = 0
  independentControls.value.forEach((item) => {
    value |= indepPending[item.key] << item.shift
  })
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  const payload = targets.flatMap((ip) => [
    { address: '0xC000', value: 0, ip },
    { address: '0xC001', value, ip }
  ])
  try {
    console.log(payload)
    const result = await window.electron.ipcRenderer.invoke('write-modbus-registers', payload)
    if (result.success || (Array.isArray(result) && result.every((r) => r.success))) {
      toast.add({
        severity: 'success',
        summary: t('deviceControl.independentCommandSuccess'),
        detail: targets.join('，'),
        life: 3000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: t('deviceControl.independentCommandFail'),
        detail: targets.join('，'),
        life: 3000
      })
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('deviceControl.independentCommandFail'),
      detail: err.message,
      life: 3000
    })
  }
}
onMounted(() => {
  watchEffect(() => {
    controlArray.value.forEach((row) => {
      row.element.forEach(async (el) => {
        const savedPendingValue = await store.getPendingValue(row.classification, el.label)
        if (savedPendingValue !== null) {
          el.pendingValue = savedPendingValue
        }
      })
    })
  })
})
const indepTableData = computed(() =>
  independentControls.value.map((ctrl) => ({
    key: ctrl.key,
    label: ctrl.label,
    value: indepPending[ctrl.key]
  }))
)
</script>

<template>
  <Dialog
    v-if="showPwdDialog"
    v-model:visible="showPwdDialog"
    :header="t('password.header') || '请输入密码'"
    :modal="true"
    :closable="false"
  >
    <div>
      <InputText v-model="inputPwd" type="password" @keyup.enter="checkPwdAndSend" autofocus />
      <Button
        :label="t('password.confirm') || '确定'"
        @click="checkPwdAndSend"
        style="margin-left: 0.5rem"
      />
      <Button
        :label="t('password.cancel') || '取消'"
        @click="cancelPwd"
        style="margin-left: 0.5rem"
        severity="secondary"
      />
      <div v-if="pwdError" style="color: red">{{ t('password.error') || '密码错误' }}</div>
    </div>
  </Dialog>
  <div class="card control">
    <div class="section control-main">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <h5>{{ t('deviceControl.controlInfo') }}</h5>
        <Button :label="t('deviceControl.paramRead')" @click="readingParam()" />
      </div>

      <DataTable :value="controlArray" showGridlines>
        <Column :header="t('deviceControl.deviceControl')">
          <template #body="{ data }">
            <div v-for="(el, index) in data.element" :key="index" class="row-item">
              <span>{{ el.label }}</span>
              <!-- 动态组件选择（网页3的组件优化） -->
              <MultiSelect
                v-if="el.bitwise"
                v-model="el.pendingValue"
                :options="el.options"
                optionLabel="label"
                optionValue="bit"
                filter
                :placeholder="t('deviceControl.selectReset')"
                :maxSelectedLabels="0"
                selectedItemsLabel="Selected {0} items"
                style="margin-left: 1rem"
              />
              <Dropdown
                v-else-if="el.options"
                v-model="el.pendingValue"
                :options="el.options"
                optionLabel="label"
                optionValue="value"
                :placeholder="t('deviceControl.selectAction')"
                style="margin-left: 1rem"
              />
              <InputNumber
                v-else
                v-model="el.pendingValue"
                :placeholder="t('deviceControl.inputValue')"
                style="margin-left: 1rem"
                :min="0"
                :max="65535"
              />
            </div>
          </template>
        </Column>
        <Column :header="t('deviceControl.operation')">
          <template #body="{ data }">
            <Button
              :label="t('deviceControl.send')"
              @click="onSendButtonClick(data)"
              :disabled="
                !data.element.some((el) =>
                  el.bitwise
                    ? el.pendingValue?.length > 0
                    : el.options
                      ? el.pendingValue !== null
                      : el.pendingValue !== null && el.pendingValue !== undefined
                )
              "
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <div class="section dido-control">
      <didoControl />
    </div>
    <!-- 新增：接触器独立执行 -->

    <div class="section indep-control">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <h5>{{ t('deviceControl.indepOptions.title') }}</h5>
        <Button
          :label="t('deviceControl.indepOptions.execute')"
          icon="pi pi-play"
          @click="onExecuteIndependent"
        />
      </div>
      <DataTable :value="indepTableData" showGridlines>
        <Column field="label" :header="t('deviceControl.indepOptions.contactor')" />
        <Column :header="t('deviceControl.indepOptions.action')">
          <template #body="{ data }">
            <Dropdown
              v-model="indepPending[data.key]"
              :options="indepOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="请选择"
              class="indep-dropdown"
            />
          </template>
        </Column>
      </DataTable>
    </div>
    <!-- <div class="section dido-status"><dido /></div> -->
  </div>
</template>

<style lang="less" scoped>
.control {
  display: grid;
  grid-template-columns: 1.6fr 1.2fr 1.2fr;
  grid-template-rows: auto auto;
  gap: 0.5rem;
  padding: 1rem;
}
.section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(245, 238, 238);
}
.dido-status {
  grid-column: 1 / 4;
  grid-row: 2;
}
.indep-control h5 {
  margin-bottom: 0.5rem;
}
.indep-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.indep-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: space-between;
}
.indep-label {
  flex: 1 0 80px;
  text-align: left;
}
.indep-dropdown {
  width: 90px;
}
@media (max-width: 1200px) {
  .control {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, auto);
  }
  .indep-control {
    max-width: 100%;
    min-width: 0;
  }
}
</style>
