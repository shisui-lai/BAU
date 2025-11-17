<template>
  <!-- 柯诺威水冷机特殊渲染逻辑 -->
  <!-- 左侧基本信息表格 -->
  <div class="card">
    <div class="flex align-items-center gap-3 mb-3">
      <label class="font-medium">{{ t('peripherals.refrigeration.selectLabel') }}：</label>
      <Dropdown
        v-model="selectedCoolType"
        :options="coolTypeOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('peripherals.refrigeration.selectLabel')"
        class="w-20rem"
      />
    </div>
    <div v-if="displayData[0]?.coolTypeRaw == 1">
      <h5>{{ translateCoolType(displayData[0]?.coolType) }}</h5>
      <div class="container">
        <div class="table-container">
          <DataTable :value="basicData" showGridlines>
            <Column :header="t('eventTime.tableTile1')" headerStyle="width: 300px">
              <template #body="slotProps">
                {{ translateLabel(slotProps.data.label, slotProps.data.labelKey) }}
              </template>
            </Column>
            <Column :header="t('eventTime.tableTile2')">
              <template #body="slotProps">
                {{ translateValue(slotProps.data.value) }}
              </template>
            </Column>
          </DataTable>
        </div>
        <!-- 故障码1表格 -->
        <div class="table-container">
          <DataTable :value="faultCode1" showGridlines>
            <Column :header="t('eventTime.tableTile1')" headerStyle="width: 300px">
              <template #body="slotProps">
                {{ translateFault(slotProps.data.label) }}
              </template>
            </Column>
            <Column :header="t('eventTime.tableTile2')">
              <template #body="slotProps">
                <span :class="{ 'fault-active': slotProps.data.value === '故障' }">
                  {{ translateValue(slotProps.data.value) }}
                </span>
              </template>
            </Column>
          </DataTable>
        </div>
        <!-- 故障码2表格 -->
        <div class="table-container">
          <DataTable :value="faultCode2" showGridlines>
            <Column :header="t('eventTime.tableTile1')" headerStyle="width: 300px">
              <template #body="slotProps">
                {{ translateFault(slotProps.data.label) }}
              </template>
            </Column>
            <Column :header="t('eventTime.tableTile2')">
              <template #body="slotProps">
                <span :class="{ 'fault-active': slotProps.data.value === '故障' }">
                  {{ translateValue(slotProps.data.value) }}
                </span>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>
    <!-- 右侧故障信息表格 -->
    <!-- 其他型号默认渲染逻辑 -->
    <div v-else>
      <h5>{{ translateCoolType(displayData[0]?.coolType) }}</h5>
      <DataTable :value="displayData[0]?.element || []" showGridlines>
        <Column :header="t('eventTime.tableTile1')" headerStyle="width: 300px">
          <template #body="slotProps">
            {{ translateLabel(slotProps.data.label, slotProps.data.labelKey) }}
          </template>
        </Column>
        <Column :header="t('eventTime.tableTile2')">
          <template #body="slotProps">
            {{ translateValue(slotProps.data.value) }}
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeMount, onBeforeUnmount, reactive, watch, computed } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useI18n } from 'vue-i18n'
const { t, te, locale } = useI18n()
const ipStore = useIpStore()
const refrData = ref([]) //存储每个ipPCS数据
const state = reactive({
  deviceData: {}
})
const selectedCoolType = ref(null) // 用户选择的制冷机型号
const realTimeCoolType = ref(null) // 实时读到的制冷机型号
const hasUserSelection = ref(false) // 用户是否进行了手动选择
const coolTypeOptions = ref([
  {
    label: t('config.dropdown.refrigerationType.kenuowei'),
    value: 1
  },
  {
    label: t('config.dropdown.refrigerationType.envicool'),
    value: 2
  },
  {
    label: t('config.dropdown.refrigerationType.essent'),
    value: 3
  },
  {
    label: t('config.dropdown.refrigerationType.none'),
    value: 65535
  }
])
const getInitDataByType = (coolType) => {
  switch (coolType) {
    case 1:
      return initRefrDataKnv
    case 2:
      return initRefrDataEvk
    case 3:
      return initRefDataEssent
    default:
      return initRefrDataKnv
  }
}
const displayData = computed(() => {
  // 如果用户没有进行手动选择，或者用户选择的型号与实时型号相同，显示实时数据
  if (!hasUserSelection.value || selectedCoolType.value === realTimeCoolType.value) {
    return refrData.value
  } else {
    // 用户手动选择了与实时型号不同的型号，显示初始数据
    return getInitDataByType(selectedCoolType.value)
  }
})
const initRefrDataKnv = [
  {
    classification: '制冷机数据',
    coolType: '柯诺威水冷机',
    coolTypeRaw: 1,
    element: [
      {
        label: '模式',
        value: '自循环',
        labelKey: 'knwLabel1'
      },
      {
        label: '设定温度(℃)',
        value: -40,
        labelKey: 'knwLabel2'
      },
      {
        label: '进水温度(℃)',
        value: -40,
        labelKey: 'knwLabel3'
      },
      {
        label: '出水温度(℃)',
        value: -40,
        labelKey: 'knwLabel4'
      },
      {
        label: '环境温度(℃)',
        value: -40,
        labelKey: 'knwLabel5'
      },
      {
        label: '排气温度(℃)',
        value: -40,
        labelKey: 'knwLabel6'
      },
      {
        label: '进水压力(Bar)',
        value: '0.0',
        labelKey: 'knwLabel7'
      },
      {
        label: '出水压力(Bar)',
        value: '0.0',
        labelKey: 'knwLabel8'
      },
      {
        label: '吸气压力(Bar)',
        value: '0.0',
        labelKey: 'knwLabel9'
      },
      {
        label: '排气压力(Bar)',
        value: '0.0',
        labelKey: 'knwLabel10'
      },
      {
        label: '水泵转速(%)',
        value: '0.00',
        labelKey: 'knwLabel11'
      },
      {
        label: '风机转速(%)',
        value: '0.00',
        labelKey: 'knwLabel12'
      },
      {
        label: '压缩机转速',
        value: 0,
        labelKey: 'knwLabel13'
      },
      {
        label: '心跳',
        value: 0,
        labelKey: 'knwLabel14'
      },
      {
        label: '软件版本',
        value: 0,
        labelKey: 'knwLabel15'
      },
      {
        label: '故障等级',
        value: '无故障',
        labelKey: 'knwLabel16'
      },
      {
        label: '故障码1',
        value: 0,
        labelKey: 'knwLabel17'
      },
      {
        label: '故障码2',
        value: 0,
        labelKey: 'knwLabel18'
      },
      {
        label: 'CRC16',
        value: 13824,
        labelKey: 'knwLabel19'
      }
    ]
  }
]
const initRefDataEssent = [
  {
    classification: '制冷机数据',
    coolType: '埃森特交流空调',
    coolTypeRaw: 3,
    element: [
      {
        label: '机组运行状态',
        value: '停止',
        labelKey: 'EssentLabel1'
      },
      {
        label: '自检状态',
        value: '停止',
        labelKey: 'EssentLabel2'
      },
      {
        label: '制冷运行状态',
        value: '停止',
        labelKey: 'EssentLabel3'
      },
      {
        label: '制热运行状态',
        value: '停止',
        labelKey: 'EssentLabel4'
      },
      {
        label: '内风机运行状态',
        value: '停止',
        labelKey: 'EssentLabel5'
      },
      {
        label: '外风机运行状态',
        value: '停止',
        labelKey: 'EssentLabel6'
      },
      {
        label: '除湿状态',
        value: '停止',
        labelKey: 'EssentLabel7'
      },
      {
        label: '排氢运行状态',
        value: '停止',
        labelKey: 'EssentLabel8'
      },
      {
        label: '预留',
        value: '停止',
        labelKey: 'EssentLabel9'
      },
      {
        label: '干接点告警输出状态',
        value: '停止',
        labelKey: 'EssentLabel10'
      },
      {
        label: '预留',
        value: '停止',
        labelKey: 'EssentLabel11'
      },
      {
        label: '预留',
        value: '停止',
        labelKey: 'EssentLabel12'
      },
      {
        label: '预留',
        value: '停止',
        labelKey: 'EssentLabel13'
      },
      {
        label: '预留',
        value: '停止',
        labelKey: 'EssentLabel14'
      },
      {
        label: '预留',
        value: '停止',
        labelKey: 'EssentLabel15'
      },
      {
        label: '预留',
        value: '停止',
        labelKey: 'EssentLabel16'
      },
      {
        label: '回风温度传感器故障',
        value: '无告警',
        labelKey: 'EssentLabel17'
      },
      {
        label: '冷凝盘管温度传感器故障',
        value: '无告警',
        labelKey: 'EssentLabel18'
      },
      {
        label: '柜外温度传感器故障',
        value: '无告警',
        labelKey: 'EssentLabel19'
      },
      {
        label: '湿度传感器故障',
        value: '无告警',
        labelKey: 'EssentLabel20'
      },
      {
        label: '压缩机欠流告警',
        value: '无告警',
        labelKey: 'EssentLabel21'
      },
      {
        label: '压缩机过流告警',
        value: '无告警',
        labelKey: 'EssentLabel22'
      },
      {
        label: '加热器欠流告警',
        value: '无告警',
        labelKey: 'EssentLabel23'
      },
      {
        label: '加热器过流告警',
        value: '无告警',
        labelKey: 'EssentLabel24'
      },
      {
        label: '内风机告警',
        value: '无告警',
        labelKey: 'EssentLabel25'
      },
      {
        label: '外风机告警',
        value: '无告警',
        labelKey: 'EssentLabel26'
      },
      {
        label: '高压力告警',
        value: '无告警',
        labelKey: 'EssentLabel27'
      },
      {
        label: '低压力告警',
        value: '无告警',
        labelKey: 'EssentLabel28'
      },
      {
        label: '柜内高温告警',
        value: '无告警',
        labelKey: 'EssentLabel29'
      },
      {
        label: '柜内低温告警',
        value: '无告警',
        labelKey: 'EssentLabel30'
      },
      {
        label: '柜外高温告警',
        value: '无告警',
        labelKey: 'EssentLabel31'
      },
      {
        label: '柜外低温告警',
        value: '无告警',
        labelKey: 'EssentLabel32'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel33'
      },
      {
        label: '外部输入告警',
        value: '无告警',
        labelKey: 'EssentLabel34'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel35'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel36'
      },
      {
        label: '蒸发盘管温度传感器故障',
        value: '无告警',
        labelKey: 'EssentLabel37'
      },
      {
        label: '高湿告警',
        value: '无告警',
        labelKey: 'EssentLabel38'
      },
      {
        label: '低电压告警',
        value: '无告警',
        labelKey: 'EssentLabel39'
      },
      {
        label: '高电压告警',
        value: '无告警',
        labelKey: 'EssentLabel40'
      },
      {
        label: '变频压缩机故障',
        value: '无告警',
        labelKey: 'EssentLabel41'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel42'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel43'
      },
      {
        label: '蒸发器冻结告警',
        value: '无告警',
        labelKey: 'EssentLabel44'
      },
      {
        label: '高压力频繁告警',
        value: '无告警',
        labelKey: 'EssentLabel45'
      },
      {
        label: '低压力频繁告警',
        value: '无告警',
        labelKey: 'EssentLabel46'
      },
      {
        label: '冷凝高温告警',
        value: '无告警',
        labelKey: 'EssentLabel47'
      },
      {
        label: '制冷剂泄漏告警',
        value: '无告警',
        labelKey: 'EssentLabel48'
      },
      {
        label: '变频压缩机通信故障',
        value: '无告警',
        labelKey: 'EssentLabel49'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel50'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel51'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel52'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel53'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel54'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel55'
      },
      {
        label: '预留',
        value: '无告警',
        labelKey: 'EssentLabel56'
      },
      {
        label: '回风温度(℃)',
        value: '0.0',
        labelKey: 'EssentLabel57'
      },
      {
        label: '冷凝盘管温度(℃)',
        value: '0.0',
        labelKey: 'EssentLabel58'
      },
      {
        label: '压缩机/加热器电流(A)',
        value: '0.0',
        labelKey: 'EssentLabel59'
      },
      {
        label: '内风机电流(A)',
        value: '0.0',
        labelKey: 'EssentLabel60'
      },
      {
        label: '外风机电流(A)',
        value: '0.0',
        labelKey: 'EssentLabel61'
      },
      {
        label: '电源电压(V)',
        value: '0.0',
        labelKey: 'EssentLabel62'
      },
      {
        label: '柜外环境温度(℃)',
        value: '0.0',
        labelKey: 'EssentLabel63'
      },
      {
        label: '柜内湿度(%)',
        value: '0.0',
        labelKey: 'EssentLabel64'
      },
      {
        label: '蒸发盘管温度(℃)',
        value: '0.0',
        labelKey: 'EssentLabel65'
      },
      {
        label: '内风机转速(RPM)',
        value: 0,
        labelKey: 'EssentLabel66'
      },
      {
        label: '外风机转速(RPM)',
        value: 0,
        labelKey: 'EssentLabel67'
      },
      {
        label: '变频压缩机转速(RPM)',
        value: 0,
        labelKey: 'EssentLabel68'
      },
      {
        label: '制冷设定温度(℃)',
        value: '0.0',
        labelKey: 'EssentLabel69'
      },
      {
        label: '制冷回差温度(℃)',
        value: '0.0',
        labelKey: 'EssentLabel70'
      },
      {
        label: '制热启动温度(℃)',
        value: '0.0',
        labelKey: 'EssentLabel71'
      },
      {
        label: '制热停止回差值(℃)',
        value: '0.0',
        labelKey: 'EssentLabel72'
      },
      {
        label: '高温告警温度值(℃)',
        value: '0.0',
        labelKey: 'EssentLabel73'
      },
      {
        label: '低温告警温度值(℃)',
        value: '0.0',
        labelKey: 'EssentLabel74'
      },
      {
        label: '除湿开启湿度值(%)',
        value: '0.0',
        labelKey: 'EssentLabel75'
      },
      {
        label: '除湿停止回差(%)',
        value: '0.0',
        labelKey: 'EssentLabel76'
      },
      {
        label: ' 高湿告警值(%)',
        value: '0.0',
        labelKey: 'EssentLabel77'
      },
      {
        label: '除湿使能',
        value: '0.0',
        labelKey: 'EssentLabel78'
      },
      {
        label: '待机模式内风机状态',
        value: '停止',
        labelKey: 'EssentLabel79'
      },
      {
        label: '通信波特率',
        value: '4800',
        labelKey: 'EssentLabel80'
      },
      {
        label: '外部告警选项',
        value: 0,
        labelKey: 'EssentLabel81'
      },
      {
        label: '排氢间隔时间',
        value: 0,
        labelKey: 'EssentLabel82'
      },
      {
        label: '排氢工作时间',
        value: 0,
        labelKey: 'EssentLabel83'
      },
      {
        label: '电压告警高限 (可选)',
        value: '0.0',
        labelKey: 'EssentLabel84'
      },
      {
        label: '电压告警低限 (可选)',
        value: '-',
        labelKey: 'EssentLabel85'
      },
      {
        label: '设备通信地址',
        labelKey: 'EssentLabel86'
      }
    ]
  }
]
const initRefrDataEvk = [
  {
    classification: '制冷机数据',
    coolType: '英维克水冷机',
    coolTypeRaw: 2,
    element: [
      {
        label: '电芯最大温度(℃)',
        value: '0.0',
        labelKey: 'evkLabel1'
      },
      {
        label: '电芯最小温度(℃)',
        value: '0.0',
        labelKey: 'evkLabel2'
      },
      {
        label: '电芯平均温度(℃)',
        value: '0.0',
        labelKey: 'evkLabel3'
      },
      {
        label: '制冷点(℃)',
        value: '0.0',
        labelKey: 'evkLabel4'
      },
      {
        label: '加热点(℃)',
        value: '0.0',
        labelKey: 'evkLabel5'
      },
      {
        label: '制冷回差(℃)',
        value: '0.0',
        labelKey: 'evkLabel6'
      },
      {
        label: '加热回差(℃)',
        value: '0.0',
        labelKey: 'evkLabel7'
      },
      {
        label: '出水温度(℃)',
        value: '0.0',
        labelKey: 'evkLabel8'
      },
      {
        label: '回水温度(℃)',
        value: '0.0',
        labelKey: 'evkLabel9'
      },
      {
        label: '排气温度(℃)',
        value: '0.0',
        labelKey: 'evkLabel10'
      },
      {
        label: '环境温度(℃)',
        value: '0.0',
        labelKey: 'evkLabel11'
      },
      {
        label: '进水压力(Bar)',
        value: '0.00',
        labelKey: 'evkLabel12'
      },
      {
        label: '出水压力(Bar)',
        value: '0.00',
        labelKey: 'evkLabel13'
      },
      {
        label: '出水高温',
        value: '正常',
        labelKey: 'evkLabel14'
      },
      {
        label: '出水低温',
        value: '正常',
        labelKey: 'evkLabel15'
      },
      {
        label: '出水温感故障',
        value: '正常',
        labelKey: 'evkLabel16'
      },
      {
        label: '回水温感故障',
        value: '正常',
        labelKey: 'evkLabel17'
      },
      {
        label: '变频器通讯故障',
        value: '正常',
        labelKey: 'evkLabel18'
      },
      {
        label: '系统高压锁定',
        value: '正常',
        labelKey: 'evkLabel19'
      },
      {
        label: '系统低压锁定',
        value: '正常',
        labelKey: 'evkLabel20'
      },
      {
        label: '排气温度过高锁定',
        value: '正常',
        labelKey: 'evkLabel21'
      },
      {
        label: '变频器过流锁定',
        value: '正常',
        labelKey: 'evkLabel22'
      },
      {
        label: '变频器过温锁定',
        value: '正常',
        labelKey: 'evkLabel23'
      },
      {
        label: '变频器过压锁定',
        value: '正常',
        labelKey: 'evkLabel24'
      },
      {
        label: '变频器欠压锁定',
        value: '正常',
        labelKey: 'evkLabel25'
      },
      {
        label: '变频器缺相锁定',
        value: '正常',
        labelKey: 'evkLabel26'
      },
      {
        label: '变频器其他故障锁定',
        value: '正常',
        labelKey: 'evkLabel27'
      },
      {
        label: '补水告警',
        value: '正常',
        labelKey: 'evkLabel28'
      },
      {
        label: '系统压力过高告警',
        value: '正常',
        labelKey: 'evkLabel29'
      },
      {
        label: '出水压力过高告警',
        value: '正常',
        labelKey: 'evkLabel30'
      },
      {
        label: '水泵当前转速(%)',
        value: '0.0',
        labelKey: 'evkLabel31'
      },
      {
        label: '水泵状态',
        value: '关闭',
        labelKey: 'evkLabel32'
      },
      {
        label: '心跳',
        value: 0,
        labelKey: 'evkLabel33'
      },
      {
        label: '压缩机状态',
        value: '关闭',
        labelKey: 'evkLabel34'
      },
      {
        label: '当前系统模式',
        value: '停止',
        labelKey: 'evkLabel35'
      },
      {
        label: '系统开关机',
        value: '关机',
        labelKey: 'evkLabel36'
      }
    ]
  }
]
const MODULE_NAME = 'refrigeration'
// 启停读取
function startReading() {
  window.electron.ipcRenderer.send('start-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, true)
}
function stopReading() {
  window.electron.ipcRenderer.send('stop-reading-data-params', { module: MODULE_NAME })
  ipStore.setModuleReadingStatus(MODULE_NAME, false)
}
// 使用索引常量定义故障码位置
const FAULT_CODE_1_INDEX = 16 // 故障码1在element数组中的索引
const FAULT_CODE_2_INDEX = 17 // 故障码2在element数组中的索引

// 计算属性：基本数据（排除故障码）
const basicData = computed(() => {
  if (!displayData.value[0]?.element) return []
  if (displayData.value[0]?.coolTypeRaw !== 1) return displayData.value[0].element
  return displayData.value[0].element.filter(
    (_, index) => index !== FAULT_CODE_1_INDEX && index !== FAULT_CODE_2_INDEX
  )
})

// 修改故障码1计算属性，添加型号判断
const faultCode1 = computed(() => {
  if (!displayData.value[0]?.element) return []
  if (displayData.value[0]?.coolTypeRaw !== 1) return []
  const faultCode = displayData.value[0].element[FAULT_CODE_1_INDEX]
  return faultCode?.value || []
})

// 修改故障码2计算属性，添加型号判断
const faultCode2 = computed(() => {
  if (!displayData.value[0]?.element) return []
  if (displayData.value[0]?.coolTypeRaw !== 1) return []
  const faultCode = displayData.value[0].element[FAULT_CODE_2_INDEX]
  const value = faultCode?.value
  // 检查value是否为数组
  if (Array.isArray(value)) {
    return value.filter((item) => item.label) || []
  }
  // 如果不是数组，返回空数组
  return []
})
const handleRefrData = (event, Arg) => {
  //console.log(Arg)
  if (!Arg?.Arg) return
  const deviceIp = Arg.ip
  if (!state.deviceData[deviceIp]) {
    state.deviceData[deviceIp] = {}
  }
  state.deviceData[deviceIp][event] = Arg.Arg
  // 以事件名和IP为key存储
  const storageKey = `refrData-${deviceIp}`
  sessionStorage.setItem(storageKey, JSON.stringify(Arg.Arg))
  if (deviceIp === ipStore.selectedIp) {
    refrData.value = Arg.Arg
    if (refrData.value && refrData.value[0]) {
      const newRealTimeType = refrData.value[0].coolTypeRaw
      realTimeCoolType.value = newRealTimeType
      // 如果用户没有进行手动选择，自动跟随实时型号
      if (!hasUserSelection.value) {
        selectedCoolType.value = newRealTimeType
      }
    }
  }
  //console.log(refrData.value)
}
const translateCoolType = (coolType) => {
  return locale.value === 'zh'
    ? coolType
    : te(`peripherals.refrigeration.${coolType}`)
      ? t(`peripherals.refrigeration.${coolType}`)
      : coolType
}
const translateLabel = (label, labelKey) => {
  return locale.value === 'zh'
    ? label
    : te(`peripherals.refrigeration.labels.${labelKey}`)
      ? t(`peripherals.refrigeration.labels.${labelKey}`)
      : label // 默认值
}
const translateFault = (value) => {
  return locale.value === 'zh'
    ? value
    : te(`peripherals.refrigeration.labels.${value}`)
      ? t(`peripherals.refrigeration.labels.${value}`)
      : value // 默认值
}
const translateValue = (value) => {
  return locale.value === 'zh'
    ? value
    : te(`peripherals.refrigeration.values.${value}`)
      ? t(`peripherals.refrigeration.values.${value}`)
      : value // 默认值
}
const registerListener = () => {
  window.electron.ipcRenderer.removeAllListeners('update-FC04RefrigerationData')
  window.electron.ipcRenderer.on('update-FC04RefrigerationData', handleRefrData)
}
onBeforeMount(() => {
  const storageKey = `refrData-${ipStore.selectedIp}`
  const cache = sessionStorage.getItem(storageKey)
  if (cache) {
    refrData.value = JSON.parse(cache)
    if (refrData.value && refrData.value[0]) {
      realTimeCoolType.value = refrData.value[0].coolTypeRaw
      // 页面加载时，强制重置为实时型号，并清除用户选择标记
      selectedCoolType.value = realTimeCoolType.value
      hasUserSelection.value = false
    }
  } else {
    refrData.value = initRefrDataKnv
    realTimeCoolType.value = 1
    // 页面加载时，强制重置为实时型号，并清除用户选择标记
    selectedCoolType.value = 1
    hasUserSelection.value = false
  }
  startReading()
  registerListener()
})
onBeforeUnmount(() => {
  stopReading()
  window.electron.ipcRenderer.removeListener('update-FC04RefrigerationData', handleRefrData)
})
watch(
  () => ipStore.selectedIp,
  (newIp) => {
    const storageKey = `refrData-${newIp}`
    const cache = sessionStorage.getItem(storageKey)
    if (cache) {
      refrData.value = JSON.parse(cache)
      if (refrData.value && refrData.value[0]) {
        realTimeCoolType.value = refrData.value[0].coolTypeRaw
        // IP切换时，强制重置为实时型号，并清除用户选择标记
        selectedCoolType.value = realTimeCoolType.value
        hasUserSelection.value = false
      }
    } else {
      refrData.value = state.deviceData[newIp]?.['update-FC04RefrigerationData'] || initRefrDataKnv
      realTimeCoolType.value = refrData.value[0]?.coolTypeRaw || 1
      // IP切换时，强制重置为实时型号，并清除用户选择标记
      selectedCoolType.value = realTimeCoolType.value
      hasUserSelection.value = false
    }
  },
  { immediate: true }
)

// 监听用户手动选择制冷机型号
watch(selectedCoolType, (newValue, oldValue) => {
  // 如果用户手动选择了不同的型号，标记为用户选择
  if (newValue !== oldValue && oldValue !== null) {
    hasUserSelection.value = true
  }
})
</script>

<style lang="less" scoped>
.container {
  display: flex;
  gap: 1rem;
  width: 100%;
  flex-wrap: wrap; /* 允许表格换行 */
}
.table-container {
  flex-grow: 1; /* 让表格自动扩展，占满剩余空间 */
  min-width: 30%; /* 保证每个表格至少占用30%的宽度 */
}
.fault-active {
  color: #ff4d4f;
  font-weight: bold;
}
</style>
