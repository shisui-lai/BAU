<template>
  <div class="card p-4">
    <!-- 头部实时时间 -->
    <div class="time-header mb-4">
      <span class="text-xl font-semibold">时间相关参数：</span>
    </div>
    <div style="display: flex">
      <div class="boot-count-card bg-blue-50 p-4 rounded-lg mb-6">
        <div class="flex items-center">
          <i class="pi pi-history text-blue-500 mr-2"></i>
          <span class="text-lg font-medium">实时系统时间</span>
          <span class="text-blue-600 ml-2 text-xl cursor-pointer">
            {{ currentTime }}
          </span>
          <Button
            label="下设校准时间"
            @click="syncTime"
            class="ml-2 p-button-sm p-button-success"
            icon="pi pi-clock"
          />
        </div>
      </div>
      <!-- 系统当前时间 -->
      <div class="boot-count-card bg-blue-50 p-4 rounded-lg mb-6" v-if="realTime">
        <div class="flex items-center">
          <i class="pi pi-history text-blue-500 mr-2"></i>
          <span class="text-lg font-medium">系统当前时间</span>
          <span class="text-blue-600 ml-2 text-xl cursor-pointer">
            {{ realTime.value }}
          </span>
        </div>
      </div>
      <!-- 系统启动次数 -->
      <div class="boot-count-card bg-blue-50 p-4 rounded-lg mb-6" v-if="bootCount">
        <div class="flex items-center">
          <i class="pi pi-history text-blue-500 mr-2"></i>
          <span class="text-lg font-medium">系统启动次数：</span>
          <span class="text-blue-600 ml-2 text-xl">{{ bootCount.value }}</span>
        </div>
      </div>
    </div>

    <!-- 时间记录分组 -->
    <!-- 合并后的记录渲染（最新的在最前） -->
    <div style="display: flex; flex-wrap: wrap">
      <div
        v-for="(record, index) in sortedRecords"
        :key="index"
        class="group-card mb-5"
        style="flex: 1; min-width: 300px; margin-right: 1rem"
      >
        <h5 class="group-title mb-3">
          <i class="pi pi-clock mr-2"></i>
          第 {{ index + 1 }} 次系统记录
        </h5>
        <DataTable :value="record" class="p-datatable-sm">
          <Column field="label" header="参数" style="width: 200px"></Column>
          <Column field="value" header="数值">
            <template #body="{ data }">
              <span
                :class="{
                  'text-red-500': isInvalidTime(data.value),
                  'text-green-600':
                    (data.label.includes('运行时间') || data.label.includes('堆栈')) &&
                    data.value > 0,
                  'text-gray-400': data.value === 0
                }"
              >
                {{ data.value }}
              </span>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useIpStore } from '../../../../../stores/ipStore.js'
import { useEventStore } from '../../../../../stores/eventStore.js'

const ipStore = useIpStore()
const eventStore = useEventStore()

// 实时时间逻辑
const currentTime = ref('')
let timer = null
const updateTime = () => {
  currentTime.value = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// 数据分类处理
const elementData = computed(() => eventStore.timeData[ipStore.selectedIp]?.element || [])

const realTime = computed(() => elementData.value.find((item) => item.label === '系统当前时间')) // 实时数据
// 系统启动次数
const bootCount = computed(() => elementData.value.find((item) => item.label === '系统启动次数'))

// 时间分组（3次记录）
const timeGroups = computed(() => {
  if (elementData.value.length < 20) return []
  return [
    elementData.value.slice(2, 8),
    elementData.value.slice(8, 14),
    elementData.value.slice(14, 20)
  ]
})
// 根据系统启动次数对记录进行排序（环形缓冲）
// 算法说明：假设总记录数为 total = 3，
// 当前最新记录的槽位为：((bootCount - 1) mod total)
// 然后依次倒推
const sortedRecords = computed(() => {
  const total = 3
  // bootCount 可能为字符串，转换为数字（假设取 item.value 作为数字）
  const bootNum = parseInt(bootCount.value?.value) || 0
  // 如果启动次数不足，则只显示实际记录数（假设初始为0或1时只用第一组数据）
  const validCount = Math.min(total, bootNum)
  const records = []
  for (let i = 0; i < validCount; i++) {
    // 计算记录索引，确保结果为正数
    let idx = (((bootNum - 1 - i) % total) + total) % total
    records.push(timeGroups.value[idx])
  }
  return records
})
// 辅助方法
const isInvalidTime = (value) => typeof value === 'string' && /0000年00月第00周/.test(value)

const formatTimeValue = (value) => {
  if (typeof value === 'number' && value > 0) {
    return `${value} 分钟`
  }
  return value
}
// ISO周计算函数
const getISOWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}
// 在工具函数部分添加BCD编码方法
const toBCD = (number, digits = 2) => {
  let bcd = 0
  for (let i = 0; i < digits; i++) {
    const digit = number % 10
    bcd |= digit << (4 * i)
    number = Math.floor(number / 10)
  }
  return bcd
}

// 时间同步方法
const syncTime = async () => {
  try {
    const now = new Date()
    const baseAddress = 0x5744

    const components = [
      toBCD(now.getFullYear() % 100), // 年（4位BCD，示例：2023→0x23）
      toBCD(now.getMonth() + 1), // 月（2位BCD，示例：12→0x12）
      toBCD(now.getDate()), // 日（2位BCD，示例：31→0x31）
      toBCD(getISOWeek(now)), // 周（2位BCD，示例：52→0x52）
      toBCD(now.getHours()), // 时（2位BCD）
      toBCD(now.getMinutes()), // 分（2位BCD）
      toBCD(now.getSeconds()) // 秒（2位BCD）
    ]

    const writeRequests = components.map((bcdValue, index) => ({
      address: `0x${(baseAddress + index).toString(16).padStart(4, '0')}`,
      value: bcdValue,
      ip: ipStore.selectedIp
    }))

    // 格式化为BCU显示的时间字符串
    const format = (num) => num.toString().padStart(2, '0')
    const timeString =
      `${now.getFullYear()}年${format(now.getMonth() + 1)}月${format(now.getDate())}日` +
      /*  `第${format(getISOWeek(now))}周` + */
      `${format(now.getHours())}时${format(now.getMinutes())}分${format(now.getSeconds())}秒`

    // 发送写请求并更新显示
    window.electron.ipcRenderer.send('write-modbus-registers', writeRequests)
    realTime.value.value = timeString
  } catch (error) {
    console.error('时间同步失败:', error)
    alert(`时间同步失败: ${error.message}`)
  }
}
onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onBeforeUnmount(() => {
  clearInterval(timer)
})
// 新增响应式数据
</script>

<style lang="less" scoped>
.time-header {
  border-bottom: 2px;
}
.boot-count-card {
  border-left: 4px solid #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.group-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .group-title {
    color: #374151;
    font-size: 1.1rem;
    font-weight: 600;
    padding-bottom: 0.5rem;
    border-bottom: 1px dashed #e5e7eb;
  }
}

.stack-card {
  border-radius: 8px;
  padding: 1rem;

  .stack-title {
    font-size: 1.1rem;
    font-weight: 600;
    padding-bottom: 0.5rem;
  }
}

.text-red-500 {
  color: #ef4444;
}
.text-green-600 {
  color: #16a34a;
}
.text-blue-600 {
  color: #2563eb;
}
.text-gray-400 {
  color: #9ca3af;
}
</style>
