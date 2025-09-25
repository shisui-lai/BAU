<template>
  <div class="card card-display">
    <div class="card section">
      <!-- 校准类型选择区 -->
      <h5>{{ t('ivCalibration.title') }}</h5>
      <div style="margin-bottom: 1rem">
        <label for="kb-select" class="p-d-block p-mb-2">{{ t('ivCalibration.selectLabel') }}</label>
        <Dropdown
          v-model="selectedKBLabel"
          :options="kbOptions"
          optionLabel="label"
          optionValue="label"
          :placeholder="t('ivCalibration.selectLabel')"
          inputId="kb-select"
          :showClear="false"
        />
      </div>
      <!-- 数据展示区 -->
      <DataTable :value="calibrationDataSet" responsiveLayout="scroll" showGridlines>
        <Column field="type" :header="t('ivCalibration.table.col.type')">
          <template #body="{ data }">
            {{ data.label }}
          </template>
        </Column>

        <Column field="current" :header="t('ivCalibration.table.col.current')">
          <template #body>
            <span class="font-semibold">
              {{
                selectedIp && ivData[selectedIp] && selectedIVKey
                  ? ivData[selectedIp][selectedIVKey]
                  : '-'
              }}
            </span>
          </template>
        </Column>

        <!-- 修改后的实测值输入列 -->
        <Column :header="t('ivCalibration.table.col.measured')">
          <template #body>
            <div class="input-group">
              <!-- 实测值1输入 -->
              <div class="input-item">
                <label>{{ t('ivCalibration.table.measured1') }}</label>
                <InputText v-model="calY1" style="width: 7rem" />
              </div>

              <!-- 实测值2输入 -->
              <div class="input-item">
                <label>{{ t('ivCalibration.table.measured2') }}</label>
                <InputText v-model="calY2" style="width: 7rem" />
              </div>
            </div>
          </template>
        </Column>
        <!-- 新增捕获值显示列 -->
        <Column :header="t('ivCalibration.table.col.displayed')">
          <template #body>
            <div class="captured-values">
              <div class="input-item">
                <label for="storedX1">{{ t('ivCalibration.table.display1') }}</label>
                <InputText v-model="storedX1" disabled style="width: 7rem" />
                <Button
                  @click="captureX1"
                  :disabled="!currentIVValid"
                  v-tooltip="
                    currentIVValid
                      ? t('ivCalibration.tooltips.capture')
                      : t('ivCalibration.tooltips.captureWaiting')
                  "
                  ><strong>{{ t('ivCalibration.table.getValues') }}</strong></Button
                >
              </div>
              <div class="input-item">
                <label for="storedX2">{{ t('ivCalibration.table.display2') }}</label>
                <InputText v-model="storedX2" disabled style="width: 7rem" />
                <Button
                  @click="captureX2"
                  :disabled="!currentIVValid"
                  v-tooltip="
                    currentIVValid
                      ? t('ivCalibration.tooltips.capture')
                      : t('ivCalibration.tooltips.captureWaiting')
                  "
                  ><strong>{{ t('ivCalibration.table.getValues') }}</strong></Button
                >
              </div>
            </div>
          </template>
        </Column>
        <Column :header="t('ivCalibration.table.col.original')">
          <template #body="{ data }">
            <div class="captured-values">
              <div class="input-item">
                <label for="data.k">K：</label>
                <InputText v-model="data.k" disabled style="width: 7rem" />
              </div>
              <div class="input-item">
                <label for="data.k">B：</label>
                <InputText v-model="data.b" disabled style="width: 7rem" />
              </div>
            </div>
          </template>
        </Column>
        <Column :header="t('ivCalibration.table.col.new')">
          <template #body>
            <div style="display: flex; align-items: center">
              <div class="captured-values">
                <div class="input-item">
                  <label for="inputK">K：</label>
                  <InputText v-model="inputK" style="width: 7rem" />
                </div>
                <div class="input-item">
                  <label for="inputB">B：</label>
                  <InputText v-model="inputB" style="width: 7rem" />
                </div>
              </div>
              <Button
                @click="calculateNewKB"
                :label="t('ivCalibration.table.calculateNew')"
                :disabled="!canCalculate"
                class="calculate-btn"
              />
            </div>
          </template>
        </Column>
        <Column :header="t('ivCalibration.table.col.actions')">
          <template #body>
            <Button
              :label="t('ivCalibration.table.send')"
              icon="pi pi-send"
              @click="sendCalibration"
              :disabled="!isValidKB"
            />
          </template>
        </Column>
      </DataTable>
    </div>
    <balance />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import balance from '../control/balance.vue'
import { storeToRefs } from 'pinia'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useToast } from 'primevue/usetoast'
const toast = useToast()
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()
import { useIVCaliStore } from '../../../../../stores/ivCaliStore.js'
const ivCaliStore = useIVCaliStore()
const ipStore = useIpStore()
const { selectedIp } = storeToRefs(ipStore)
const { ivData, kbData } = storeToRefs(ivCaliStore)
const inputK = ref(1) // 默认k值
const inputB = ref(0) // 默认b值
const addressMap = {
  currentChargeSmall: { k: 0x5700, b: 0x5701 },
  currentDischargeSmall: { k: 0x5702, b: 0x5703 },
  currentChargeLarge: { k: 0x5704, b: 0x5705 },
  currentDischargeLarge: { k: 0x5706, b: 0x5707 },
  prechargeVoltage: { k: 0x5708, b: 0x5709 },
  clusterVoltage: { k: 0x570a, b: 0x570b }
}

// 根据 kbData 的键（例如 "电流充电小量程校准K值"）进行分组，每组包含 K 值与 B 值
function toKbKey(chinese) {
  // 根据你的实际 groupName 制一个映射，或者硬编码几条：
  const map = {
    电流充电小量程校准: 'currentChargeSmall',
    电流放电小量程校准: 'currentDischargeSmall',
    电流充电大量程校准: 'currentChargeLarge',
    电流放电大量程校准: 'currentDischargeLarge',
    预充电压校准: 'prechargeVoltage',
    组端电压校准: 'clusterVoltage',
    // 英文映射
    'Charge Current (Small)': 'currentChargeSmall',
    'Discharge Current (Small)': 'currentDischargeSmall',
    'Charge Current (Large)': 'currentChargeLarge',
    'Discharge Current (Large)': 'currentDischargeLarge',
    'Precharge Voltage': 'prechargeVoltage',
    'Cluster Voltage': 'clusterVoltage'
  }
  return map[chinese] ?? chinese // 如果未映射，就返回原中文
}

const kbOptions = computed(() => {
  const groups = {}
  const data = kbData.value[selectedIp.value] || {}
  for (const key in data) {
    const match = key.match(/(.+)(K值|B值)$/)
    if (!match) continue
    const groupName = match[1]
    if (!groups[groupName]) groups[groupName] = { raw: groupName, k: null, b: null }
    if (key.endsWith('K值')) groups[groupName].k = data[key]
    else if (key.endsWith('B值')) groups[groupName].b = data[key]
  }
  return Object.values(groups).map(({ raw, k, b }) => {
    // 拿到对应的 i18n key
    const kbKey = toKbKey(raw)
    return {
      label: t(`ivCalibration.kb.${kbKey}`),
      k,
      b,
      raw // 如果你后面还需要用原中文做匹配
    }
  })
})

// 下拉框选中的 kb 类型（默认选择第一个）
const selectedKBLabel = ref(kbOptions.value.length > 0 ? kbOptions.value[0].label : '')

// 根据下拉框选项获得对应的 kb 对象
const selectedKB = computed(() =>
  kbOptions.value.find((option) => option.label === selectedKBLabel.value)
)

// 根据选中的 kb 类型名称，判断需要显示 ivData 中哪一个值
const selectedIVKey = computed(() => {
  if (!selectedKB.value) return null
  const label = selectedKB.value.label
  const kbKey = toKbKey(label) // 使用英文键

  if (kbKey.includes('current')) {
    return 'current'
  } else if (kbKey.includes('cluster')) {
    return 'clusterVltg'
  } else if (kbKey.includes('precharge')) {
    return 'prechargeVltg'
  }
  return null
})
const calibrationDataSet = computed(() => (selectedKB.value ? [{ ...selectedKB.value }] : []))
// 新增响应式变量
const storedX1 = ref(null) // 存储第一个显示值
const storedX2 = ref(null) // 存储第二个显示值
const calY1 = ref(null) // 第一个实测值
const calY2 = ref(null) // 第二个实测值

// 验证KB值有效性
const isValidKB = computed(() => {
  return (
    inputK.value !== null && inputB.value !== null && !isNaN(inputK.value) && !isNaN(inputB.value)
  )
})
// 在watch中添加验证
/* watch([inputK, inputB], ([newK, newB]) => {
  if (isNaN(newK) || isNaN(newB)) {
    toast.add({
      severity: 'warn',
      summary: '提示信息',
      detail: '请输入有效的数字',
      life: 3000
    })
    inputK.value = null
    inputB.value = null
  }
}) */
// 当前实时显示值
const currentIVValue = computed(() => {
  // 先获取当前IP的数据对象
  const ipData = ivData.value[selectedIp.value]
  // 再根据选择的键获取具体值
  return ipData && selectedIVKey.value ? ipData[selectedIVKey.value] : null
})
// 修改后的实时值验证
const currentIVValid = computed(() => {
  const ipData = ivData.value[selectedIp.value]
  const value = ipData && selectedIVKey.value ? ipData[selectedIVKey.value] : null
  return value !== null && !isNaN(value)
})
// 捕获显示值方法
const captureX1 = () => {
  if (currentIVValue.value !== null) {
    storedX1.value = currentIVValue.value
  }
}

const captureX2 = () => {
  if (currentIVValue.value !== null) {
    storedX2.value = currentIVValue.value
  }
}

// 计算允许条件
const canCalculate = computed(() => {
  return [storedX1.value, storedX2.value, calY1.value, calY2.value].every(
    (v) => v !== null && !isNaN(v)
  )
})

// 修改后的计算逻辑
const calculateNewKB = () => {
  const y1 = storedX1.value
  const y2 = storedX2.value
  const x1 = calY1.value
  const x2 = calY2.value

  // 输入验证
  if ([x1, x2, y1, y2].some((v) => isNaN(v))) {
    toast.add({
      severity: 'warn',
      summary: t('ivCalibration.errors.incompleteData'),
      life: 3000
    })
    /*   alert('请填写完整的校准点数据') */
    return
  }

  try {
    // 检查分母有效性
    if (Math.abs(y1 - y2) < 0.001) {
      throw new Error('实测值差异不足（|Y1-Y2| < 0.001），请调整输入值')
    }

    // 直接根据校准策略计算
    const k2 = (x1 - x2) / (y1 - y2)
    const b2 = x1 - k2 * y1

    // 精度转换和四舍五入（保持原有逻辑）
    inputK.value = k2.toFixed(3)
    inputB.value = b2.toFixed(3) // 保留一位小数
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: error.message,
      life: 3000
    })
    /*  alert(error.message) */
    /*  resetCalculation() */
  }
}

// 辅助验证方法
/* const validateDivision = (numerator, denominator, context) => {
  if (Math.abs(denominator) < 0.001) {
    throw new Error(${context}：除数过小（K值异常）)
  }
  return numerator / denominator
} */

// 重置计算状态
/* const resetCalculation = () => {
  storedX1.value = null
  storedX2.value = null
  calY1.value = null
  calY2.value = null
  inputK.value = null
  inputB.value = null
} */

// 发送时增加二次确认
const sendCalibration = async () => {
  try {
    if (!isValidKB.value) {
      throw new Error('无效的校准参数')
    }

    // 确认对话框
    /*     if (!confirm(确认写入以下参数？\nK: ${inputK.value}\nB: ${inputB.value})) return */

    const writeData = []
    const { label } = selectedKB.value
    const kbKey = toKbKey(label) // 使用英文键
    console.log(kbKey, label)
    //中文：currentChargeSmall 电流充电小量程校准
    //英文：Charge Current (Small) Charge Current (Small)
    const { k: kAddr, b: bAddr } = addressMap[kbKey] || {}
    // K值处理（16位有符号整数）
    const kValue = Number(inputK.value)
    if (isNaN(kValue) || kValue < -32768 || kValue > 32767) {
      throw new Error('K值超出有效范围(-32768~32767)')
    }
    writeData.push({
      address: kAddr,
      value: kValue,
      ip: selectedIp.value,
      type: 'int16' // 指定数据类型
    })

    // B值处理（根据校准类型调整精度）
    const bValue = Number(inputB.value)
    let bType = 'int16'
    let maxB = 32767
    let minB = -32768

    // 电压校准需要更高精度
    if (label.includes('电压')) {
      bType = 'int32'
      maxB = 2147483647
      minB = -2147483648
    }

    if (isNaN(bValue) || bValue < minB || bValue > maxB) {
      throw new Error(`B值超出有效范围(${minB}~${maxB})`)
    }
    writeData.push({
      address: bAddr,
      value: bValue,
      ip: selectedIp.value,
      type: bType
    })

    // 调试输出
    console.log('发送校准数据：', writeData)
    // 2. 确定所有目标 IP
    const targets = ipStore.selectedIpsForWrite.length
      ? ipStore.selectedIpsForWrite
      : [selectedIp.value]
    toast.add({
      severity: 'info',
      summary: t('ivCalibration.toasts.writingDevices', { count: targets.length }),
      detail: targets.join('，'),
      life: 5000
    })
    // 3. 对每个 IP 分别发送
    // 并行向每个 IP 发 invoke
    const results = await Promise.all(
      targets.map(async (ip) => {
        const payload = writeData.map((item) => ({
          ...item,
          ip // 把 ip 加进去
        }))
        try {
          const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', payload)
          return { ip, ...res }
        } catch (err) {
          return { ip, success: false, error: err.message }
        }
      })
    )

    // 5. 一次性提示“完成” & “失败”
    const okList = results.filter((r) => r.success).map((r) => r.ip)
    const failList = results.filter((r) => !r.success).map((r) => r.ip)

    if (okList.length) {
      toast.add({
        severity: 'success',
        summary: t('ivCalibration.toasts.writeSuccess', { devices: okList.join('，') }),
        life: 5000
      })
    }
    if (failList.length) {
      toast.add({
        severity: 'error',
        summary: t('ivCalibration.toasts.writeFail', { devices: failList.join('，') }),
        life: 5000
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'error',
      detail: error.message,
      life: 3000
    })
    console.error('发送校准参数失败：', error)
  }
}
watch(locale, () => {
  if (!kbOptions.value.some((option) => option.label === selectedKBLabel.value)) {
    selectedKBLabel.value = kbOptions.value.length > 0 ? kbOptions.value[0].label : ''
  }
})
</script>

<style lang="less" scoped>
.section {
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(245, 238, 238);
}
/* 深度选择器穿透PrimeVue组件 */
.captured-values {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4rem;
  justify-content: flex-start;
}

.input-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.capture-btn {
  min-width: 2.5rem;
}

.calculate-btn {
  margin-left: 0.5rem;
}
.card-display {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
