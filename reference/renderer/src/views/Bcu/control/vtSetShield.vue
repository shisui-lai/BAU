<template>
  <Dialog
    v-if="showPwdDialog"
    v-model:visible="showPwdDialog"
    :header="t('password.header')"
    :modal="true"
    :closable="false"
  >
    <div>
      <InputText v-model="inputPwd" type="password" @keyup.enter="checkPwd" autofocus />
      <Button :label="t('password.confirm')" @click="checkPwd" style="margin-left: 0.5rem" />
      <Button
        :label="t('password.cancel')"
        @click="cancelPwd"
        style="margin-left: 0.5rem"
        severity="secondary"
      />
      <div v-if="pwdError" style="color: red; margin-top: 0.5rem">{{ t('password.error') }}</div>
    </div>
  </Dialog>
  <div v-if="cancelled" class="cancelled-tip">
    <i class="pi pi-info-circle" style="font-size: 2rem; color: #b0b0b0; margin-right: 0.5rem"></i>
    <span>{{ t('password.cancelTip') || '已取消操作，未进入设置页面' }}</span>
  </div>
  <div class="card" v-if="!showPwdDialog && !cancelled">
    <div style="display: flex; gap: 1rem">
      <div class="gap">
        <!-- 温度校准部分 -->
        <h5>{{ t('vtSetShield.calibration.temperature') }}</h5>
        <!--        <span>当前 BMU 编号: {{ temperatureBMU }}</span> -->
        <div class="tvSet1">
          <label>{{ t('vtSetShield.calibration.mode') }}</label>
          <Dropdown
            v-model="isTSetAll"
            :options="isTSetAllOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('vtSetShield.calibration.selectMethod')"
          >
          </Dropdown>
          <div>
            <label>{{ t('vtSetShield.calibration.bmuId') }}</label>
            <InputText class="setInput" v-model="temperatureBMU" :disabled="isTSetAll" />
          </div>
          <div>
            <label>{{ t('vtSetShield.calibration.indexTemp') }}</label>
            <InputText class="setInput" v-model="temperatureCell" :disabled="isTSetAll" />
          </div>
          <div>
            <label>{{ t('vtSetShield.calibration.value') }}</label>
            <InputText class="setInput" v-model="temperatureValue" placeholder="℃" />
          </div>
          <Button
            @click="sendTemperatureCalibrationRequest"
            :disabled="
              !isTSetAll
                ? !temperatureBMU || !temperatureCell || !temperatureValue
                : !temperatureValue
            "
          >
            <strong>{{ t('vtSetShield.calibration.set') }}</strong>
          </Button>
          <Button
            @click="writeImportedValues('temperature')"
            :label="t('vtSetShield.calibration.writeImported')"
            :disabled="!hasImported('temperature')"
          />
        </div>
        <!-- 电压校准部分 -->
        <div style="margin-top: 1rem">
          <h5>{{ t('vtSetShield.calibration.voltage') }}</h5>
          <div class="tvSet1">
            <label>{{ t('vtSetShield.calibration.mode') }}</label>
            <Dropdown
              v-model="isVSetAll"
              :options="isVSetAllOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="t('vtSetShield.calibration.selectMethod')"
            >
            </Dropdown>
            <div>
              <label>{{ t('vtSetShield.calibration.bmuId') }}</label>
              <InputText class="setInput" v-model="voltageBMU" :disabled="isVSetAll" />
            </div>
            <div>
              <label>{{ t('vtSetShield.calibration.indexVolt') }}</label>
              <InputText class="setInput" v-model="voltageCell" :disabled="isVSetAll" />
            </div>
            <div>
              <label>{{ t('vtSetShield.calibration.value') }}</label>
              <InputText class="setInput" v-model="voltageValue" placeholder="mV" />
            </div>
            <Button
              @click="sendVoltageCalibrationRequest"
              :disabled="!isVSetAll ? !voltageBMU || !voltageCell || !voltageValue : !voltageValue"
            >
              <strong>{{ t('vtSetShield.calibration.set') }}</strong>
            </Button>
            <Button
              @click="writeImportedValues('voltage')"
              :label="t('vtSetShield.calibration.writeImported')"
              :disabled="!hasImported('voltage')"
            />
          </div>
        </div>
      </div>
      <div class="gap">
        <h5>{{ t('vtSetShield.filter.temperature') }}</h5>
        <div class="tvSet1">
          <label>{{ t('vtSetShield.filter.selectMode') }}</label>
          <Dropdown
            v-model="tempShieldMode"
            :options="shieldModeOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('vtSetShield.filter.selectMode')"
          />

          <div class="vtset">
            <div>
              <label>{{ t('vtSetShield.calibration.bmuId') }}</label>
              <InputText
                v-model="tempShieldBMU"
                class="setInput"
                :disabled="tempShieldMode !== 'partial'"
              />
            </div>
            <div>
              <label>{{ t('vtSetShield.calibration.indexTemp') }}</label>
              <InputText
                v-model="tempShieldCell"
                class="setInput"
                :disabled="tempShieldMode !== 'partial'"
              />
            </div>
          </div>
          <!-- 温度滤波范围设置 -->
          <!--           <div class="range-controls">
            <div style="display: flex; gap: 0.5rem">
              <div>
                <label>起始BMU：</label>
                <InputText
                  v-model="tempRangeStart.bmu"
                  mode="decimal"
                  class="setInput"
                  :disabled="tempShieldMode !== 'range'"
                />
              </div>
              <div>
                <label class="param-label">起始Temp：</label>
                <InputText
                  v-model="tempRangeStart.cell"
                  mode="decimal"
                  class="setInput"
                  :disabled="tempShieldMode !== 'range'"
                />
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem">
              <div>
                <label>终止BMU：</label>
                <InputText
                  v-model="tempRangeEnd.bmu"
                  class="setInput"
                  :disabled="tempShieldMode !== 'range'"
                />
              </div>
              <div>
                <label class="param-label">终止Temp：</label>
                <InputText
                  v-model="tempRangeEnd.cell"
                  class="setInput"
                  :disabled="tempShieldMode !== 'range'"
                />
              </div>
            </div>
          </div> -->
          <div style="display: flex; gap: 1rem">
            <div class="shield-status">
              <label>{{ t('vtSetShield.filter.setValue') }}</label>
              <ToggleButton
                v-model="tempShieldValue"
                onLabel="1"
                offLabel="0"
                style="width: 5rem"
              />
            </div>
            <Button @click="handleShieldOperation('temperature')" :disabled="isTempProcessing">
              <strong>{{
                isTempProcessing
                  ? t('vtSetShield.filter.processing', { progress: tempProgress })
                  : t('vtSetShield.calibration.set')
              }}</strong>
            </Button>
          </div>
        </div>
        <!-- 电压滤波设置 -->
        <div style="margin-top: 1rem">
          <h5>{{ t('vtSetShield.filter.voltage') }}</h5>
          <div class="tvSet1">
            <label>{{ t('vtSetShield.filter.selectMode') }}</label>
            <Dropdown
              v-model="voltShieldMode"
              :options="shieldModeOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="t('vtSetShield.filter.selectMode')"
            />

            <div class="vtset">
              <div>
                <label>{{ t('vtSetShield.calibration.bmuId') }}</label>
                <InputText
                  v-model="voltShieldBMU"
                  class="setInput"
                  :disabled="voltShieldMode !== 'partial'"
                />
              </div>
              <div>
                <label>{{ t('vtSetShield.calibration.indexVolt') }}</label>
                <InputText
                  v-model="voltShieldCell"
                  class="setInput"
                  :disabled="voltShieldMode !== 'partial'"
                />
              </div>
            </div>
            <!--      <div class="range-controls">
              <div style="display: flex; gap: 0.5rem">
                <div>
                  <label>起始BMU：</label>
                  <InputText
                    v-model="voltRangeStart.bmu"
                    class="setInput"
                    :disabled="voltShieldMode !== 'range'"
                  />
                </div>
                <div>
                  <label class="param-label">起始Cell：</label>
                  <InputText
                    v-model="voltRangeStart.cell"
                    class="setInput"
                    :disabled="voltShieldMode !== 'range'"
                  />
                </div>
              </div>

              <div style="display: flex; gap: 0.5rem">
                <div>
                  <label>终止BMU：</label>
                  <InputText
                    v-model="voltRangeEnd.bmu"
                    class="setInput"
                    :disabled="voltShieldMode !== 'range'"
                  />
                </div>
                <div>
                  <label class="param-label">终止Cell：</label>
                  <InputText
                    v-model="voltRangeEnd.cell"
                    class="setInput"
                    :disabled="voltShieldMode !== 'range'"
                  />
                </div>
              </div>
            </div> -->
            <div style="display: flex; gap: 1rem">
              <div class="shield-status">
                <label>{{ t('vtSetShield.filter.setValue') }}</label>
                <ToggleButton
                  v-model="voltShieldValue"
                  onLabel="1"
                  offLabel="0"
                  style="width: 5rem"
                />
              </div>
              <Button @click="handleShieldOperation('voltage')" :disabled="isVoltProcessing">
                <strong>
                  {{
                    isVoltProcessing
                      ? t('vtSetShield.filter.processing', { progress: voltProgress })
                      : t('vtSetShield.calibration.set')
                  }}
                </strong>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div style="display: flex; gap: 1rem">
      <div class="gap">
        <div class="buttonGap">
          <ButtonGroup>
            <!--       <Button
            :label="buttonLabel"
            :severity="isModuleReading ? 'danger' : 'primary'"
            @click="handleClick"
          /> -->
            <Button
              :severity="isTSet ? 'primary' : 'secondary'"
              :label="t('vtSetShield.calibration.temperature')"
              @click="
                () => {
                  isTSet = true
                  isVSet = false
                }
              "
            />
            <Button
              :severity="isVSet ? 'primary' : 'secondary'"
              :label="t('vtSetShield.calibration.voltage')"
              @click="
                () => {
                  isVSet = true
                  isTSet = false
                }
              "
            />
          </ButtonGroup>
          <div style="margin-left: 0.3rem">
            <Dropdown
              v-model="selectedBMU"
              :options="bmuOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="t('vtSetShield.table.selectBmu')"
            />
          </div>
          <ButtonGroup style="display: flex; gap: 0.1rem">
            <Button
              @click="exportAllCalibration('temperature')"
              :label="t('vtSetShield.actions.exportTemp')"
            />
            <Button
              @click="importFile('temperature')"
              :label="t('vtSetShield.actions.importTemp')"
            />
            <input
              ref="fileInputTemp"
              type="file"
              accept=".csv"
              style="display: none"
              @change="handleImport($event, 'temperature')"
            />

            <Button
              @click="exportAllCalibration('voltage')"
              :label="t('vtSetShield.actions.exportVolt')"
            />
            <Button @click="importFile('voltage')" :label="t('vtSetShield.actions.importVolt')" />
            <input
              ref="fileInputVolt"
              type="file"
              accept=".csv"
              style="display: none"
              @change="handleImport($event, 'voltage')"
            />
          </ButtonGroup>
        </div>
        <!-- BMU选择 -->
        <div>
          <!-- 表格显示 -->
          <DataTable :value="[combinedBMUData]" v-show="isTSet" class="my-nohead-table">
            <Column>
              <template #body="slotProps">
                <div class="no-data" v-if="slotProps.data.element.length === 0">无数据</div>
                <div v-else class="dynamic-grid" :style="gridStyle">
                  <div v-for="(item, index) in slotProps.data.element" :key="index" class="cell">
                    <div class="cell-content">
                      <div class="index-label">#{{ index + 1 }}</div>
                      <div class="value-display">
                        <div>{{ item.value }}</div>
                        <div v-if="item.imported !== undefined">
                          → {{ item.imported === '-' ? '-' : item.imported }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </Column>
          </DataTable>
          <DataTable :value="[combinedBMUDataV]" v-show="isVSet" class="my-nohead-table">
            <Column>
              <template #body="slotProps">
                <div class="no-data" v-if="slotProps.data.element.length === 0">无数据</div>
                <div v-else class="dynamic-grid" :style="gridStyleV">
                  <div v-for="(item, index) in slotProps.data.element" :key="index" class="cell">
                    <div class="cell-content">
                      <div class="index-label">#{{ index + 1 }}</div>
                      <div class="value-display">
                        <div>{{ item.value }}</div>
                        <div v-if="item.imported !== undefined">
                          → {{ item.imported === '-' ? '-' : item.imported }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
      <div class="gap">
        <div class="buttonGap">
          <ButtonGroup>
            <Button
              :severity="showTempShield ? 'primary' : 'secondary'"
              :label="t('vtSetShield.filter.temperature')"
              @click="
                () => {
                  showTempShield = true
                  showVoltShield = false
                }
              "
            />
            <Button
              :severity="showVoltShield ? 'primary' : 'secondary'"
              :label="t('vtSetShield.filter.voltage')"
              @click="
                () => {
                  showVoltShield = true
                  showTempShield = false
                }
              "
            />
          </ButtonGroup>
          <Dropdown
            v-model="selectedBMUF"
            :options="bmuOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('vtSetShield.table.selectBmu')"
          />
        </div>
        <div>
          <div>
            <!-- 温度滤波显示 -->
            <DataTable
              :value="[currentShieldTempData]"
              v-show="showTempShield"
              class="my-nohead-table"
            >
              <Column>
                <template #body="{ data }">
                  <div v-if="data.element.length === 0" class="no-data">无数据</div>
                  <div v-else class="dynamic-grid" :style="shieldGridStyleT">
                    <div v-for="(item, index) in data.element" :key="index" class="cell">
                      <div class="cell-content">
                        <div class="cell-index">#{{ index + 1 }}</div>
                        {{ item.value === '-' ? '-' : item.value ? '1' : '0' }}
                      </div>
                    </div>
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
          <div>
            <!-- 电压滤波显示 -->
            <DataTable
              :value="[currentShieldVoltData]"
              v-show="showVoltShield"
              class="my-nohead-table"
            >
              <Column>
                <template #body="{ data }">
                  <div v-if="data.element.length === 0" class="no-data">无数据</div>
                  <div v-else class="dynamic-grid" :style="shieldGridStyleV">
                    <div v-for="(item, index) in data.element" :key="index" class="cell">
                      <div class="cell-content">
                        <div class="cell-index">#{{ index + 1 }}</div>
                        <div class="cell-status">
                          {{ item.value === '-' ? '-' : item.value ? '1' : '0' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed, onMounted } from 'vue'
import Papa from 'papaparse'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useVtSetStore } from '../../../../../stores/vtSetStore.js'
import { CORRECT_PASSWORD } from './pwd.js'
import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { formatFileSuffix } from '../bcuParameter/configData.js'
const toast = useToast()
const ipStore = useIpStore() // 获取 Pinia store
const vtSetStore = useVtSetStore() // 获取 Pinia store
const { moduleReadingStatus, bmuConfig, selectedIp } = storeToRefs(ipStore) // 解构为响应式引用
const {
  isTSetAll,
  isVSetAll,
  temperatureBMU,
  temperatureCell,
  temperatureValue,
  voltageBMU,
  voltageCell,
  voltageValue,
  tempShieldMode,
  tempShieldBMU,
  tempShieldCell,
  tempShieldValue,
  voltShieldMode,
  voltShieldBMU,
  voltShieldCell,
  voltShieldValue,
  tempRangeStart,
  tempRangeEnd,
  voltRangeStart,
  voltRangeEnd
} = storeToRefs(vtSetStore)
const showPwdDialog = ref(true)
const inputPwd = ref('')
const pwdError = ref(false)
const cancelled = ref(false)
const MODULE_NAME = 'VTConfig'
const isModuleReading = computed(() => moduleReadingStatus.value[MODULE_NAME])
let listenerId1 = ref(null)
let listenerId2 = ref(null)
const state = reactive({
  deviceData: {} // 存储各个 IP 对应的数据
})
// 存储导入数据：{ temperature: Map<BMU, Map<Cell, Value>> }
const importedData = reactive({
  temperature: new Map(),
  voltage: new Map()
})
const selectedBMU = ref(1)
const isBMUTWritting = ref(false)
const isBMUVWritting = ref(false)
const fileInputTemp = ref(null)
const fileInputVolt = ref(null)
const initData = [
  {
    classification: '单体温度校准值',
    config: { bmuTotal: 1, afeTotal: 4, cellsPerBMU: 24 },
    element: Array.from({ length: 24 }, () => ({ value: '-', BMU: 1 }))
  },
  {
    classification: '单体电压校准值',
    config: { bmuTotal: 1, afeTotal: 4, cellsPerBMU: 48 },
    element: Array.from({ length: 48 }, () => ({ value: '-', BMU: 1 }))
  }
]
const initDataShield = [
  {
    classification: 'BMU1温度屏蔽',
    config: { bmuTotal: 5, cellsPerBMU: 24 },
    element: Array.from({ length: 24 }, () => ({ value: '-' }))
  },
  {
    classification: 'BMU1电压屏蔽',
    config: { bmuTotal: 5, cellsPerBMU: 48 },
    element: Array.from({ length: 48 }, () => ({ value: '-' }))
  }
]
const vtSetData = ref([])
const vtFilterData = ref([])
const isTSet = ref(true)
const isVSet = ref(false)
const showTempShield = ref(true)
const showVoltShield = ref(false)
// 共用按钮标签
const buttonLabel = computed(() => (isModuleReading.value ? '停止读取' : '开始读取'))
// 共用点击处理
const handleClick = () => {
  if (isModuleReading.value) {
    stopReading()
  } else {
    startReading()
  }
}
const isTSetAllOptions = computed(() => [
  { label: t('vtSetShield.calibration.all'), value: true },
  { label: t('vtSetShield.calibration.single'), value: false }
])

const isVSetAllOptions = computed(() => [
  { label: t('vtSetShield.calibration.all'), value: true },
  { label: t('vtSetShield.calibration.single'), value: false }
])
const shieldModeOptions = computed(() => [
  { label: t('vtSetShield.calibration.all'), value: 'all' },
  { label: t('vtSetShield.calibration.single'), value: 'partial' }
  /*   { label: '批量', value: 'range' } */
])
const totalBMUs = computed(() => {
  return bmuConfig.value[selectedIp.value]?.bmuTotal || 1
})
/* const selectedBMU = ref(1) // 当前选中的 BMU，默认为 BMU 1 */
// 生成符合 Dropdown 需要的数据结构
const bmuOptions = computed(() =>
  Array.from({ length: totalBMUs.value }, (_, index) => ({
    label: `BMU ${index + 1}`,
    value: index + 1
  }))
)
const gridStyle = computed(() => {
  const tempData = vtSetData.value[0] // 温度数据对象
  const cellsPerBMU = tempData.config?.cellsPerBMU || 48 // 动态获取，默认48防止错误
  // 温度视图
  const dynamicColumns = Math.ceil(Math.sqrt(cellsPerBMU))
  const clampedColumns = Math.min(Math.max(4, dynamicColumns), 4)
  return {
    gridTemplateColumns: `repeat(${clampedColumns}, 1fr)`
    // 可以添加其他温度视图专属样式
  }
})
const gridStyleV = computed(() => {
  const vltgData = vtSetData.value[1] // 电压数据对象
  const cellsPerBMU = vltgData.config?.cellsPerBMU || 48 // 动态获取
  // 温度视图
  const dynamicColumns = Math.ceil(Math.sqrt(cellsPerBMU))
  const clampedColumns = Math.min(Math.max(4, dynamicColumns), 4)
  return {
    gridTemplateColumns: `repeat(${clampedColumns}, 1fr)`
    // 可以添加其他温度视图专属样式
  }
})
const selectedBMUF = ref(1)
// 温度滤波状态
const isTempProcessing = ref(false)
const tempProgress = ref(0)

// 电压滤波状态
const isVoltProcessing = ref(false)
const voltProgress = ref(0)

// 常量定义
const TEMP_SHIELD_BASE = 0x2100
const VOLT_SHIELD_BASE = 0x2200
const BITS_PER_REGISTER = 16
// 滤波数据处理
const currentShieldTempData = computed(() => {
  if (!vtFilterData.value.length) return { classification: '', element: [] }

  // 在温度屏蔽数据中查找当前BMU对应的条目 (前5项是温度)
  const target = vtFilterData.value.find(
    (item) => item.classification === `BMU${selectedBMUF.value}温度屏蔽`
  )

  return target || { classification: '', element: [] }
})

const currentShieldVoltData = computed(() => {
  if (!vtFilterData.value.length) return { classification: '', element: [] }

  // 在电压屏蔽数据中查找当前BMU对应的条目 (后5项是电压)
  const target = vtFilterData.value.find(
    (item) => item.classification === `BMU${selectedBMUF.value}电压屏蔽`
  )

  return target || { classification: '', element: [] }
})
// 修改后的gridStyle计算属性
const shieldGridStyleT = computed(() => {
  const type = showTempShield.value ? 'temperature' : 'voltage'
  const config =
    type === 'temperature' ? currentShieldTempData.value.config : currentShieldVoltData.value.config

  const cellsPerBMU = config?.cellsPerBMU || 24

  // 动态计算列数（每行至少4列，最多8列）
  const dynamicColumns = Math.ceil(Math.sqrt(cellsPerBMU))
  const clampedColumns = Math.min(Math.max(4, dynamicColumns), 4)

  return { gridTemplateColumns: `repeat(${clampedColumns}, 1fr)` }
})
const shieldGridStyleV = computed(() => {
  const type = showTempShield.value ? 'temperature' : 'voltage'
  const config =
    type === 'temperature' ? currentShieldTempData.value.config : currentShieldVoltData.value.config

  const cellsPerBMU = config?.cellsPerBMU || 24

  // 动态计算列数（每行至少4列，最多8列）
  const dynamicColumns = Math.ceil(Math.sqrt(cellsPerBMU))
  const clampedColumns = Math.min(Math.max(4, dynamicColumns), 4)

  return { gridTemplateColumns: `repeat(${clampedColumns}, 1fr)` }
})
// 地址计算逻辑 - 连续排布方式
const calculateShieldAddress = (type, bmu, cell) => {
  const base = type === 'temperature' ? TEMP_SHIELD_BASE : VOLT_SHIELD_BASE // 明确base值
  const config =
    type === 'temperature'
      ? currentShieldTempData.value?.config || { cellsPerBMU: 24 }
      : currentShieldVoltData.value?.config || { cellsPerBMU: 24 }
  const cellsPerBMU = Number(config.cellsPerBMU) || 24
  const totalBMUs = Number(config?.bmuTotal) || 5

  // 修正：使用连续bit排布逻辑
  // 计算全局bit位置：(bmu-1) * cellsPerBMU + (cell-1)
  const globalBitPosition = (bmu - 1) * cellsPerBMU + (cell - 1)
  const registerAddr = base + Math.floor(globalBitPosition / 16)
  const bitPosition = globalBitPosition % 16

  // 调试信息
  console.log(`[${type} Shield] calculateShieldAddress:`, {
    bmu,
    cell,
    globalBitPosition,
    registerAddr: `0x${registerAddr.toString(16)}`,
    bitPosition,
    base: `0x${base.toString(16)}`
  })

  return {
    registerAddr,
    bitMask: 1 << bitPosition
  }
}
// 新增寄存器值合并方法
const mergeRegisterValue = (currentValue, bitMask, enable) => {
  return enable
    ? currentValue | bitMask // 置位操作
    : currentValue & ~bitMask // 清除位操作
}
// 生成合并后的请求数据
// 重构生成请求逻辑
const generateShieldRequests = (type) => {
  const config =
    type === 'temperature' ? currentShieldTempData.value.config : currentShieldVoltData.value.config
  const cellsPerBMU = config?.cellsPerBMU || 24
  const registersPerBMU = 8
  /*   const totalBMUs = config?.bmuTotal || 5 */
  const isTemp = type === 'temperature'
  const value = isTemp ? tempShieldValue.value : voltShieldValue.value
  const mode = isTemp ? tempShieldMode.value : voltShieldMode.value
  const base = isTemp ? TEMP_SHIELD_BASE : VOLT_SHIELD_BASE
  const requests = []

  // 根据模式生成请求
  switch (mode) {
    case 'all':
      // 批量模式直接设置全1/全0 - 连续排布方式
      // 修正：按总bit数计算寄存器数量，而不是按BMU分段
      const totalBits = cellsPerBMU * totalBMUs.value
      const totalRegisters = Math.ceil(totalBits / 16)

      // 调试信息：验证前端计算
      console.log(`[${type} Shield] all模式计算:`, {
        cellsPerBMU,
        totalBMUs: totalBMUs.value,
        totalBits,
        totalRegisters,
        base: `0x${base.toString(16)}`
      })

      // 根据bit位分布计算每个寄存器的值
      for (let reg = 0; reg < totalRegisters; reg++) {
        let registerValue = 0x0000

        if (value) {
          // 计算当前寄存器包含的bit范围
          const startBit = reg * 16
          const endBit = Math.min(startBit + 15, totalBits - 1)

          // 设置属于当前寄存器的bit位
          for (let bit = startBit; bit <= endBit; bit++) {
            if (bit < totalBits) {
              registerValue |= 1 << (bit - startBit)
            }
          }
        }

        requests.push({
          address: base + reg,
          value: registerValue,
          shieldStyle: 'all'
        })
      }
      console.log('all requests: ', requests)
      break

    case 'range': {
      const range = isTemp
        ? { start: tempRangeStart.value, end: tempRangeEnd.value }
        : { start: voltRangeStart.value, end: voltRangeEnd.value }
      // 范围模式需要逐寄存器处理
      const registerMap = getRegisterValuesForRange(type, range.start, range.end)
      // 生成最终请求
      registerMap.forEach((val, addr) => {
        requests.push({ address: addr, value: val, shieldStyle: 'range' })
      })
      break
    }

    default: {
      // 单个/部分模式
      const bmu = isTemp ? tempShieldBMU.value : voltShieldBMU.value
      const cell = isTemp ? tempShieldCell.value : voltShieldCell.value
      const { registerAddr, bitMask } = calculateShieldAddress(type, bmu, cell)
      const current = getCurrentRegisterValue(type, registerAddr)
      const newVal = mergeRegisterValue(current, bitMask, value)
      requests.push({
        address: registerAddr,
        value: newVal,
        shieldStyle: 'single'
      })
    }
  }
  /*   console.log(requests) */
  return requests
}
// 新增函数：根据类型、BMU和寄存器地址获取当前寄存器的值 - 连续排布方式
const getCurrentRegisterValue = (type, registerAddr) => {
  let currentValue = 0

  // 修正：使用连续排布逻辑，遍历所有BMU和cell找到属于目标寄存器的bit
  const base = type === 'temperature' ? 0x2100 : 0x2200
  const config =
    type === 'temperature'
      ? currentShieldTempData.value?.config || { cellsPerBMU: 24 }
      : currentShieldVoltData.value?.config || { cellsPerBMU: 24 }
  const cellsPerBMU = Number(config.cellsPerBMU) || 24
  const totalBMUs = Number(config?.bmuTotal) || 5

  // 调试信息
  console.log(`[${type} Shield] getCurrentRegisterValue:`, {
    registerAddr: `0x${registerAddr.toString(16)}`,
    base: `0x${base.toString(16)}`,
    cellsPerBMU,
    totalBMUs
  })

  // 遍历所有BMU和cell，找到属于目标寄存器的bit
  for (let bmu = 1; bmu <= totalBMUs; bmu++) {
    for (let cell = 1; cell <= cellsPerBMU; cell++) {
      const addrInfo = calculateShieldAddress(type, bmu, cell)

      if (addrInfo && addrInfo.registerAddr === registerAddr) {
        // 获取对应分类数据
        const classification = `BMU${bmu}${type === 'temperature' ? '温度' : '电压'}屏蔽`
        const data = vtFilterData.value.find((item) => item.classification === classification)

        if (data && data.element[cell - 1] && data.element[cell - 1].value) {
          currentValue |= addrInfo.bitMask
        }
      }
    }
  }

  return currentValue
}
// 针对单次写入，直接获取当前 BMU 对应的寄存器值
const getCurrentRegisterValueForCell = (type, bmu, cell) => {
  const addrInfo = calculateShieldAddress(type, bmu, cell)
  if (!addrInfo) return 0
  // 假设 vtFilterData 中的数据已分 BMU 存储，可以直接定位对应 BMU 的数据
  const data =
    type === 'temperature'
      ? vtFilterData.value.find((item) => item.classification === `BMU${bmu}温度屏蔽`)
      : vtFilterData.value.find((item) => item.classification === `BMU${bmu}电压屏蔽`)
  if (!data) return 0

  // 遍历该 BMU 内的 cell，只计算目标寄存器地址的值
  let value = 0
  data.element.forEach((cellData, index) => {
    const currentCell = index + 1
    const currentAddr = calculateShieldAddress(type, bmu, currentCell)
    if (currentAddr && currentAddr.registerAddr === addrInfo.registerAddr && cellData.value) {
      value |= currentAddr.bitMask
    }
  })
  return value
}
// 批量写入时，根据输入范围仅遍历需要的 BMU 和 cell
const getRegisterValuesForRange = (type, startRange, endRange) => {
  // 假设 startRange 和 endRange 分别是 { bmu, cell }
  const registerMap = new Map()
  const maxCells = currentMaxCells(type)
  const startBMU = Math.min(startRange.bmu, endRange.bmu)
  const endBMU = Math.max(startRange.bmu, endRange.bmu)

  for (let bmu = startBMU; bmu <= endBMU; bmu++) {
    // 针对每个 BMU，只遍历该 BMU 内需要处理的 cell 范围
    let startCell = bmu === startRange.bmu ? startRange.cell : 1
    let endCell = bmu === endRange.bmu ? Math.min(endRange.cell, maxCells) : maxCells
    for (let cell = startCell; cell <= endCell; cell++) {
      const addrInfo = calculateShieldAddress(type, bmu, cell)
      if (!addrInfo) continue
      const regAddr = addrInfo.registerAddr
      // 只计算当前 BMU 的数据（可直接从该 BMU 的数据中提取）
      const currentVal = registerMap.has(regAddr)
        ? registerMap.get(regAddr)
        : getCurrentRegisterValueForCell(type, bmu, cell)
      const newVal = mergeRegisterValue(
        currentVal,
        addrInfo.bitMask,
        type === 'temperature' ? tempShieldValue.value : voltShieldValue.value
      )
      registerMap.set(regAddr, newVal)
    }
  }
  return registerMap
}

// 动态最大cell计算
const currentMaxCells = (type) => {
  const config =
    type === 'temperature' ? currentShieldTempData.value.config : currentShieldVoltData.value.config
  return config?.cellsPerBMU || 24
}
// 单次发送处理逻辑
const handleShieldOperation = async (type) => {
  const isTemp = type === 'temperature'
  const state = {
    processing: isTemp ? isTempProcessing : isVoltProcessing,
    progress: isTemp ? tempProgress : voltProgress
  }
  // 坐标要下发的目标 IP 列表
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]

  try {
    state.processing.value = true
    state.progress.value = 0

    // 生成不含 IP 的基础请求数组
    const baseRequests = generateShieldRequests(type)

    // 总共要发多少批（用于进度计算）
    let totalChunks = 0
    const perIpChunks = {} // 存放每个 IP 对应的 chunk 数组
    targets.forEach((ip) => {
      const ipReqs = baseRequests.map((req) => ({ ...req, ip }))
      const chunks = chunkArray(ipReqs, 123)
      perIpChunks[ip] = chunks
      totalChunks += chunks.length
    })

    let sent = 0
    // 逐 IP 逐 chunk invoke
    for (const ip of targets) {
      for (const chunk of perIpChunks[ip]) {
        try {
          const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', chunk)
          if (!res.success) {
            console.error(`下发到 ${ip} 时失败: ${res.error}`)
          }
        } catch (err) {
          console.error(`调用 IPC 失败: ${err.message}`)
        }
        sent++
        state.progress.value = Math.round((sent / totalChunks) * 100)
        await new Promise((r) => setTimeout(r, 300))
      }
    }

    toast.add({
      severity: 'success',
      summary: t('vtSetShield.toast.filterAllSetSuccess', {
        type: isTemp ? t('vtSetShield.filter.temperature') : t('vtSetShield.filter.voltage')
      }),
      life: 3000
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('vtSetShield.toast.filterSetError', {
        type: isTemp ? t('vtSetShield.filter.temperature') : t('vtSetShield.filter.voltage'),
        error: err.message
      }),
      life: 5000
    })
  } finally {
    state.processing.value = false
  }
}

// 数组分块工具函数
const chunkArray = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  )
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
watch(
  () => ipStore.selectedIp, // 监听 IP 的变化
  (newIp) => {
    /*     console.log(`切换到 IP: ${newIp}`)
     */ // 这里假设你通过 `state.deviceData` 来存储不同 IP 对应的数据
    vtSetData.value = state.deviceData[newIp]?.['update-FC04VtSetData'] || initData
    vtFilterData.value = state.deviceData[newIp]?.['update-FC04VtFilterData'] || initDataShield
    /* console.log('bmuTotal', vtSetData.value.bmuTotal) */
  },
  { immediate: true } // 初始时就触发一次
)
watch(isTSet, (newVal) => {
  if (newVal) {
    isVSet.value = false
  }
})

// 同理，当电压开为 true 时，自动把温度关为 false
watch(isVSet, (newVal) => {
  if (newVal) {
    isTSet.value = false
  }
})
watch(showTempShield, (newVal) => {
  if (newVal) {
    showVoltShield.value = false
  }
})

// 同理，当电压开为 true 时，自动把温度关为 false
watch(showVoltShield, (newVal) => {
  if (newVal) {
    showTempShield.value = false
  }
})
// 事件监听器
const registerListener1 = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04VtSetData')
  listenerId1.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    if (!state.deviceData[deviceIp]) {
      state.deviceData[deviceIp] = {}
    }
    // 存储数据
    state.deviceData[deviceIp][event] = Arg.Arg
    // 如果当前选择的 IP，更新数据
    if (deviceIp === ipStore.selectedIp) {
      vtSetData.value = Arg.Arg
    }
  }
  window.electron.ipcRenderer.on('update-FC04VtSetData', listenerId1.value)
}
const registerListener2 = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04VtFilterData')
  listenerId2.value = (event, Arg) => {
    if (!Arg?.Arg) return
    const deviceIp = Arg.ip
    if (!state.deviceData[deviceIp]) {
      state.deviceData[deviceIp] = {}
    }
    // 存储数据
    state.deviceData[deviceIp][event] = Arg.Arg
    // 如果当前选择的 IP，更新数据
    if (deviceIp === ipStore.selectedIp) {
      vtFilterData.value = Arg.Arg
    }
  }
  window.electron.ipcRenderer.on('update-FC04VtFilterData', listenerId2.value)
}
onBeforeMount(() => {
  startReading()
  registerListener1() // 注册事件监听器
  registerListener2()
})
onMounted(() => {
  if (sessionStorage.getItem('vtSetShieldPassword') === 'ok') {
    showPwdDialog.value = false
  } else {
    showPwdDialog.value = true
  }
})
function checkPwd() {
  if (inputPwd.value === CORRECT_PASSWORD) {
    showPwdDialog.value = false
    pwdError.value = false
    sessionStorage.setItem('vtSetShieldPassword', 'ok')
  } else {
    pwdError.value = true
  }
}
function cancelPwd() {
  showPwdDialog.value = false
  cancelled.value = true
}
onBeforeUnmount(() => {
  // 注销所有事件监听器
  if (listenerId1.value) {
    window.electron.ipcRenderer.removeListener('update-FC04VtSetData', listenerId1.value)
    listenerId1.value = null
    //console.log('已注销事件监听器: update-FC04VtSetData')
  }
  if (listenerId2.value) {
    window.electron.ipcRenderer.removeListener('update-FC04VtFilterData', listenerId2.value)
    listenerId2.value = null
    //console.log('已注销事件监听器: update-FC04VtFilterData')
  }
  stopReading()
})
// 当前选中 BMU 的温度校准数据
// 修改后的计算属性
const currentBMUData = computed(() => {
  if (!vtSetData.value || vtSetData.value.length === 0) {
    return { classification: '无数据', element: [] }
  }

  const tempData = vtSetData.value[0] // 温度数据对象
  const cellsPerBMU = tempData.config?.cellsPerBMU || 48 // 动态获取，默认48防止错误
  const startIndex = (selectedBMU.value - 1) * cellsPerBMU
  const bmuElements = tempData.element.slice(startIndex, startIndex + cellsPerBMU)

  return {
    classification: tempData.classification,
    element: bmuElements
  }
})
// 当前选中 BMU 的温度校准数据
const currentBMUData_Vltg = computed(() => {
  if (!vtSetData.value || vtSetData.value.length < 2) {
    return { classification: '无数据', element: [] }
  }

  const vltgData = vtSetData.value[1] // 电压数据对象
  const cellsPerBMU = vltgData.config?.cellsPerBMU || 48 // 动态获取
  const startIndex = (selectedBMU.value - 1) * cellsPerBMU
  const bmuElements = vltgData.element.slice(startIndex, startIndex + cellsPerBMU)

  return {
    classification: vltgData.classification,
    element: bmuElements
  }
})
// 计算温度寄存器地址 - 连续排布方式
const calculateTemperatureRegisterAddress = () => {
  // 从数据中获取实际配置
  const tempsPerBMU = vtSetData.value[0]?.config?.cellsPerBMU || 48
  const baseAddrTemperature = 0x0100
  // 新的连续排布：每个寄存器代表一个单体温度，连续排布
  const registerAddress =
    baseAddrTemperature +
    (temperatureBMU.value - 1) * tempsPerBMU + // 每个BMU占用连续的tempsPerBMU个寄存器
    (temperatureCell.value - 1) // 单体索引直接对应寄存器偏移
  return registerAddress
}

// 计算电压寄存器地址 - 连续排布方式
const calculateVoltageRegisterAddress = () => {
  const cellsPerBMU = vtSetData.value[1]?.config?.cellsPerBMU || 48
  const baseAddrVoltage = 0x1100
  // 新的连续排布：每个寄存器代表一个单体电压，连续排布
  const registerAddress =
    baseAddrVoltage +
    (voltageBMU.value - 1) * cellsPerBMU + // 每个BMU占用连续的cellsPerBMU个寄存器
    (voltageCell.value - 1) // 单体索引直接对应寄存器偏移
  return registerAddress
}

// 发送温度校准请求
const sendTemperatureCalibrationRequest = async () => {
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  // 一次性弹出「正在写入」
  toast.add({
    severity: 'info',
    summary: t('vtSetShield.toast.writingDevicesCount', { count: targets.length }),
    detail: targets.join('，'),
    life: 7000
  })
  // 动态获取配置
  const config = vtSetData.value[0]?.config || { cellsPerBMU: 48 }
  const { bmuTotal, cellsPerBMU } = config
  isBMUTWritting.value = true
  // 2. 并行对每个 IP 执行写入，不论是 全部 还是 单个
  const results = await Promise.all(
    targets.map(async (ip) => {
      if (isTSetAll.value) {
        // 全部 BMU 批量写 - 连续排布方式
        await processBMUForIp(
          bmuTotal,
          (bmu) =>
            Array.from({ length: cellsPerBMU }, (_, cell) => ({
              address: 0x0100 + (bmu - 1) * cellsPerBMU + cell,
              value: temperatureValue.value * 10
            })),
          '温度',
          ip
        )
        return { ip, success: true }
      } else {
        // 单寄存器写入
        const addr = calculateTemperatureRegisterAddress()
        if (addr != null) {
          const { success } = await window.electron.ipcRenderer.invoke('write-modbus-registers', [
            { address: addr, value: temperatureValue.value * 10, ip }
          ])
          return { ip, success }
        }
        return { ip, success: false }
      }
    })
  )

  // 3. 一次性弹出「完成」提示
  const successIps = results.filter((r) => r.success).map((r) => r.ip)
  const failIps = results.filter((r) => !r.success).map((r) => r.ip)

  if (successIps.length) {
    toast.add({
      severity: 'success',
      summary: t('vtSetShield.toast.calibrationTempComplete', {
        devices: successIps.join('，')
      }),
      detail: successIps.join('，'),
      life: 7000
    })
  }
  if (failIps.length) {
    toast.add({
      severity: 'error',
      summary: t('vtSetShield.toast.writeFailDevices', {
        devices: failIps.join('，')
      }),
      life: 7000
    })
  }

  isBMUTWritting.value = false
}

// 发送电压校准请求
const sendVoltageCalibrationRequest = async () => {
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]
  const { bmuTotal, cellsPerBMU } = vtSetData.value[1]?.config || { bmuTotal: 1, cellsPerBMU: 48 }
  toast.add({
    severity: 'info',
    summary: t('vtSetShield.toast.writingDevicesCount', { count: targets.length }),
    detail: targets.join('，'),
    life: 7000
  })
  isBMUVWritting.value = true

  const results = await Promise.all(
    targets.map(async (ip) => {
      if (isVSetAll.value) {
        // 全部 BMU 批量写 - 连续排布方式
        await processBMUForIp(
          bmuTotal,
          (bmu) =>
            Array.from({ length: cellsPerBMU }, (_, cell) => ({
              address: 0x1100 + (bmu - 1) * cellsPerBMU + cell,
              value: voltageValue.value
            })),
          '电压',
          ip
        )
        return { ip, success: true }
      } else {
        const addr = calculateVoltageRegisterAddress()
        if (addr != null) {
          const { success } = await window.electron.ipcRenderer.invoke('write-modbus-registers', [
            { address: addr, value: voltageValue.value, ip }
          ])
          return { ip, success }
        }
        return { ip, success: false }
      }
    })
  )

  const successIps = results.filter((r) => r.success).map((r) => r.ip)
  const failIps = results.filter((r) => !r.success).map((r) => r.ip)

  if (successIps.length) {
    toast.add({
      severity: 'success',
      summary: t('vtSetShield.toast.calibrationVoltComplete', {
        devices: successIps.join('，')
      }),
      life: 7000
    })
  }
  if (failIps.length) {
    toast.add({
      severity: 'error',
      summary: t('vtSetShield.toast.writeFailDevices', {
        devices: failIps.join('，')
      }),
      life: 7000
    })
  }

  isBMUVWritting.value = false
}
// 改造BMU循环逻辑（遇到错误继续后续BMU）
const processBMUForIp = async (bmuTotal, generateRequests, type, ip) => {
  for (let bmu = 1; bmu <= bmuTotal; bmu++) {
    for (let bmu = 1; bmu <= bmuTotal; bmu++) {
      const requests = generateRequests(bmu).map((r) => ({ ...r, ip }))
      try {
        await batchWriteRegisters(requests)
      } catch {
        // 某个 BMU 写入失败，仍然继续后续 BMU
      }
    }
    // 简化：我们认为跑完 for 即视为该 IP 写入完成
    return true
  }
}
// 增强版批量写入函数（带重试机制）
// 修改后的批量写入函数（去除回调依赖）
const batchWriteRegisters = async (requests, options = {}) => {
  const {
    batchSize = 123,
    retries = 2, // 降低重试次数
    delayBetweenBatches = 2, // 批次间隔时间
    timeout = 100 // 延长单次超时时间
  } = options
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize)
    let ok = false

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await window.electron.ipcRenderer.invoke('write-modbus-registers', batch)
        if (res.success) {
          ok = true
          break
        } else throw new Error(res.error || '批次写入失败')
      } catch (err) {
        console.warn(`批次 ${i / batchSize + 1} 第${attempt}次重试:`, err.message)
        await new Promise((r) => setTimeout(r, retryDelay))
      }
    }

    if (!ok) {
      console.error(`批次 ${i / batchSize + 1} 最终失败`)
    }
    await new Promise((r) => setTimeout(r, delayBetweenBatches))
  }
}
// 触发文件选择
function importFile(type) {
  if (type === 'temperature') fileInputTemp.value.click()
  else fileInputVolt.value.click()
}

// 导出全部 BMU 的校准值
async function exportAllCalibration(type) {
  const ip = ipStore.selectedIp
  const dataArr = []
  const config = type === 'temperature' ? vtSetData.value[0].config : vtSetData.value[1].config
  const cells = config.cellsPerBMU || 0
  const total = config.bmuTotal || 0

  // 根据类型定义列标题
  const isTemperature = type === 'temperature'
  const relativeIndexKey = isTemperature ? 'Temp_RelativeIndex' : 'Cell_RelativeIndex'
  const absoluteIndexKey = isTemperature ? 'Temp_AbsoluteIndex' : 'Cell_AbsoluteIndex'

  for (let bmu = 1; bmu <= total; bmu++) {
    for (let cell = 1; cell <= cells; cell++) {
      const base = type === 'temperature' ? vtSetData.value[0] : vtSetData.value[1]
      const elem = base.element[(bmu - 1) * cells + (cell - 1)]
      // 计算绝对索引：(BMU-1) * 每BMU单体数 + 当前单体索引
      const absoluteIndex = (bmu - 1) * cells + cell

      const rowData = {
        BMU_Index: bmu
      }
      rowData[relativeIndexKey] = cell
      rowData[absoluteIndexKey] = absoluteIndex
      rowData.Value = elem?.value ?? ''

      dataArr.push(rowData)
    }
  }
  const csv = Papa.unparse(dataArr, { header: true })
  const fileName1 = type === 'temperature' ? 'Temp_Calibration' : 'Voltage_Calibration'
  const fileName = `${fileName1}_${ip}_${formatFileSuffix(new Date())}.csv`
  try {
    const savedPath = await window.electron.ipcRenderer.invoke('exportParam-csv-ivCail', {
      csv: csv,
      fileName
    })
    toast.add({
      severity: 'success',
      summary: t('powerMap.toast.exportSuccessSummary'),
      detail: t('powerMap.toast.exportSuccessDetail', { path: savedPath }),
      life: 5000
    })
  } catch (err) {
    if (err.message.includes('用户取消导出')) {
      toast.add({
        severity: 'info',
        summary: t('powerMap.toast.exportCanceled'),
        life: 3000
      })
    } else {
      // 其它错误只给英文 key 或本地化 key，不显示 err.message
      toast.add({
        severity: 'error',
        summary: t('powerMap.toast.exportError', { error: err.message }),
        life: 5000
      })
    }
  }
  /*   const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${type}-all-calibration.csv`
  a.click()
  URL.revokeObjectURL(url) */
}
// 处理导入文件
async function handleImport(e, type) {
  const file = e.target.files[0]
  if (!file) return
  const text = await file.text()
  const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true })
  if (errors.length) {
    toast.add({
      severity: 'error',
      summary: t('vtSetShield.toast.parseError', { error: errors[0].message }),
      life: 3000
    })
    return
  }
  // 清空原有
  importedData[type].clear()

  // 定义新旧格式的列名映射
  const isTemperature = type === 'temperature'
  const relativeIndexKey = isTemperature ? 'Temp_RelativeIndex' : 'Cell_RelativeIndex'

  data.forEach((row) => {
    const b = +row.BMU_Index
    let c, v

    // 兼容新旧格式
    if (row[relativeIndexKey] !== undefined) {
      // 新格式：使用对应的相对索引列
      c = +row[relativeIndexKey]
    } else if (row.Cell_Index !== undefined) {
      // 旧格式：使用Cell_Index
      c = +row.Cell_Index
    } else if (row.Cell !== undefined) {
      // 更老的格式：使用Cell
      c = +row.Cell
    } else {
      console.warn('导入数据格式错误：找不到相对索引列', row)
      return
    }

    v = row.Value === '' ? '-' : row.Value

    if (!importedData[type].has(b)) importedData[type].set(b, new Map())
    importedData[type].get(b).set(c, v)
  })
  toast.add({ severity: 'success', summary: t('vtSetShield.toast.importComplete'), life: 3000 })
  e.target.value = ''
}
// 合并实时值和导入值，用于渲染
const combinedBMUData = computed(() => {
  const base = vtSetData.value[0]
  const cells = base.config.cellsPerBMU
  const elems = base.element.slice((selectedBMU.value - 1) * cells, selectedBMU.value * cells)
  return {
    ...base,
    element: elems.map((item, idx) => {
      const imp = importedData.temperature.get(selectedBMU.value)?.get(idx + 1)
      return imp === undefined ? { ...item } : { ...item, imported: imp }
    })
  }
})
// 合并实时值和导入值，用于渲染
const combinedBMUDataV = computed(() => {
  const base = vtSetData.value[1]
  const cells = base.config.cellsPerBMU
  const elems = base.element.slice((selectedBMU.value - 1) * cells, selectedBMU.value * cells)
  return {
    ...base,
    element: elems.map((item, idx) => {
      const imp = importedData.voltage.get(selectedBMU.value)?.get(idx + 1)
      return imp === undefined ? { ...item } : { ...item, imported: imp }
    })
  }
})
// 判断是否有导入值
function hasImported(type) {
  return importedData[type].size > 0
}
// 写入导入值
// 写入导入值（按 BMU 分批下发）
async function writeImportedValues(type) {
  const map = importedData[type]
  if (!map.size) return

  // IP 列表
  const targets = ipStore.selectedIpsForWrite.length
    ? ipStore.selectedIpsForWrite
    : [ipStore.selectedIp]

  // 根据 type 决定基地址和单位转换
  const baseAddr = type === 'temperature' ? 0x0100 : 0x1100
  const scale = type === 'temperature' ? 10 : 1

  // 逐 IP 下发
  for (const ip of targets) {
    for (const [bmu, cellMap] of map.entries()) {
      // 为当前 BMU 构建请求数组
      const requests = []
      for (const [cell, rawValue] of cellMap.entries()) {
        const value = type === 'temperature' ? rawValue * scale : +rawValue
        // 新的连续排布方式：每个BMU占用连续的寄存器空间
        const config =
          type === 'temperature' ? vtSetData.value[0]?.config : vtSetData.value[1]?.config
        const cellsPerBMU = config?.cellsPerBMU || 48
        const addr = baseAddr + (bmu - 1) * cellsPerBMU + (cell - 1)
        requests.push({ address: addr, value, ip })
      }
      // 按 batchSize 分批、并带重试机制写寄存器
      await batchWriteRegisters(requests, {
        batchSize: 123,
        retries: 2,
        delayBetweenBatches: 2
      })
    }
  }

  toast.add({
    severity: 'success',
    summary: t('vtSetShield.toast.writeImportedComplete', {
      type:
        type === 'temperature'
          ? t('vtSetShield.calibration.temperature')
          : t('vtSetShield.calibration.voltage')
    }),
    life: 3000
  })
  importedData[type].clear()
}
</script>
<style>
.my-nohead-table .p-datatable-thead {
  display: none;
}
.gap {
  flex: 1;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid #bdbdbd;
  padding: 1rem;
  height: fit-content;
  border-radius: 0.5rem;
  min-width: 0;
  overflow: hidden;
}
.buttonGap {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: 1rem;
}
.dynamic-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(8, 1fr);
  text-align: center;
}
.cell {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 5px;
  transition: transform 0.2s;
}
.cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.no-data {
  padding: 2rem;
  text-align: center;
}
.vtShow {
  padding: 1rem;
  margin-top: 1rem;
}
.vtset {
  display: flex;
  gap: 1rem;
}
.setInput {
  width: 5rem;
}
.tvSet1 {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.shield-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.buttonSelect {
  display: flex;
  margin-top: 1rem;
  margin-left: 1rem;
}
.select {
  width: 70px;
  height: fit-content;
  margin-left: 1rem;
  /* background-color: #f1f5f9; */
}
.card-vtSet {
  margin-left: 3rem;
}
.form-group {
  display: grid;
  grid-template-columns: 100px 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 1rem;
}
.cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.index-label {
  font-size: 0.8rem;
  margin-bottom: 2px;
}

.value-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.container {
  display: flex;
  flex-direction: column; /* 垂直排列 */
  gap: 1rem; /* 子元素间距 */
}
.cell-index {
  font-size: 0.8em;
  margin-bottom: 2px;
}
.cancelled-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
  color: #888;
  font-size: 1.2rem;
  letter-spacing: 1px;
}

/* ========== 响应式优化（不修改原有样式）========== */
/* 针对按钮和下拉框添加自适应换行支持 */
.buttonGap {
  flex-wrap: wrap;
}

/* 确保按钮文字不换行 */
.buttonGap :deep(.p-button) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 下拉框最小宽度保证内容可见 */
.buttonGap :deep(.p-dropdown) {
  min-width: fit-content;
}

/* 控制面板支持换行 */
.tvSet1 {
  flex-wrap: wrap;
}

/* 标签文字不换行 */
.tvSet1 label,
.shield-status label {
  white-space: nowrap;
}

/* 输入框最小宽度 */
.setInput {
  min-width: 4rem;
}

/* vtset 支持换行 */
.vtset {
  flex-wrap: wrap;
}

/* 表格容器防止溢出 */
.my-nohead-table {
  overflow-x: auto;
  max-width: 100%;
}

.my-nohead-table :deep(.p-datatable-wrapper) {
  overflow-x: auto;
}

/* 网格自适应 - 在高缩放比例下减少列数 */
@media (max-width: 1600px), (min-resolution: 125dpi) {
  .dynamic-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (max-width: 1400px), (min-resolution: 150dpi) {
  .dynamic-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  
  /* 减小单元格内容以适应小空间 */
  .cell-content {
    font-size: 0.9em;
  }
  
  .index-label,
  .cell-index {
    font-size: 0.75rem;
  }
  
  .value-display {
    font-size: 0.85em;
  }
}

@media (max-width: 1200px), (min-resolution: 175dpi) {
  .dynamic-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  /* 进一步缩小间距 */
  .buttonGap {
    gap: 0.5rem;
    margin-left: 0.5rem;
  }
  
  .tvSet1 {
    gap: 0.35rem;
  }
  
  .gap {
    padding: 0.75rem;
  }
}

/* 防止文字溢出 */
.cell-content {
  overflow: hidden;
  min-width: 0;
}

.value-display {
  overflow: hidden;
  min-width: 0;
}

/* 确保长文本能够显示 */
.index-label,
.cell-index {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ButtonGroup 内的按钮不换行 */
.buttonGap :deep(.p-buttongroup) {
  flex-shrink: 0;
}

/* Dialog 内的控件优化 */
:deep(.p-dialog) {
  max-width: 95vw;
}

:deep(.p-dialog .p-inputtext) {
  min-width: 3rem;
}

/* 高DPI屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 1.5), (min-resolution: 144dpi) {
  /* 调整边框使其在高DPI下更清晰 */
  .cell {
    border-width: 0.5px;
  }
  
  .gap {
    border-width: 0.5px;
  }
}

/* 超大缩放比例优化（200%+）*/
@media (min-resolution: 192dpi) {
  .dynamic-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .cell {
    padding: 3px;
  }
  
  .buttonGap :deep(.p-button) {
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
  }
  
  .tvSet1 label,
  .shield-status label {
    font-size: 0.85rem;
  }
}
</style>
