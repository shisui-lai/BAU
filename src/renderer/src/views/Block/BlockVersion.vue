<template>
  <div class="card">
    <div class="version-header">
      <h2 class="version-title">堆版本信息</h2>
    </div>
    
    <div class="version-grid">
      <!-- SD卡信息卡片 -->
      <Card class="version-card">
        <template #header>
          <div class="card-header">
            <i class="pi pi-sd-card card-icon"></i>
            <span class="card-title">SD卡信息</span>
          </div>
        </template>
        <template #content>
          <div class="card-content">
            <div class="info-item">
              <span class="info-label">总容量</span>
              <span class="info-value">{{ getVersionValue('SD卡总容量') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">剩余容量</span>
              <span class="info-value">{{ getVersionValue('SD卡剩余容量') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">状态</span>
              <div class="info-value">
                <Tag :value="sdCardStatusText" :severity="getSdCardStatusSeverity()" />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- BAU版本信息卡片 -->
      <Card class="version-card">
        <template #header>
          <div class="card-header">
            <i class="pi pi-cog card-icon"></i>
            <span class="card-title">BAU版本信息</span>
          </div>
        </template>
        <template #content>
          <div class="card-content">
            <div class="info-item">
              <span class="info-label">产品编码</span>
              <span class="info-value">{{ getVersionValue('BAU产品编码') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">硬件版本</span>
              <span class="info-value">{{ getVersionValue('BAU硬件版本号') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">软件版本</span>
              <span class="info-value version-highlight">{{ getVersionValue('BAU软件版本号') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">BOOT版本</span>
              <span class="info-value">{{ getVersionValue('BAU-BOOT版本号') }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- 协议版本信息卡片 -->
      <Card class="version-card">
        <template #header>
          <div class="card-header">
            <i class="pi pi-link card-icon"></i>
            <span class="card-title">协议版本信息</span>
          </div>
        </template>
        <template #content>
          <div class="card-content">
            <div class="info-item">
              <span class="info-label">上位机协议</span>
              <span class="info-value">{{ getVersionValue('BAU-上位机协议版本号') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">BCU协议</span>
              <span class="info-value">{{ getVersionValue('BAU-BCU协议版本号') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">事件记录版本</span>
              <span class="info-value">{{ getVersionValue('BAU事件记录版本号') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">SOX算法版本</span>
              <span class="info-value">{{ getVersionValue('BAU-SOX算法版本号') }}</span>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import { parseBlockVersion, pickBlockVersion } from '@/composables/core/data-processing/block/parseBlockVersion'

// 版本信息字段模板
const FIELD_TEMPLATES = {
  '版本信息': [
    'SD卡总容量',
    'SD卡剩余容量', 
    'SD卡状态',
    'BAU产品编码',
    'BAU硬件版本号',
    'BAU软件版本号',
    'BAU-BOOT版本号',
    'BAU-上位机协议版本号',
    'BAU-BCU协议版本号',
    'BAU事件记录版本号',
    'BAU-SOX算法版本号'
  ]
}

// 获取版本信息数据
const versionData = computed(() => {
  const data = pickBlockVersion('block1', ['版本信息'])
  
  if (data['版本信息'] && data['版本信息'].length > 0) {
    // 有数据时，使用实际数据
    const dataMap = {}
    data['版本信息'].forEach(item => {
      dataMap[item.label] = {
        value: formatValue(item.value, item.scale),
        unit: item.unit || ''
      }
    })
    return dataMap
  } else {
    // 没有数据时，使用占位符
    const placeholderMap = {}
    FIELD_TEMPLATES['版本信息'].forEach(label => {
      placeholderMap[label] = {
        value: '–',
        unit: ''
      }
    })
    return placeholderMap
  }
})

// 获取版本值
const getVersionValue = (label) => {
  const data = versionData.value[label]
  if (!data) return '–'
  
  const value = data.value
  const unit = data.unit
  
  if (value === '–' || value === null || value === undefined) {
    return '–'
  }
  
  // 特殊处理SD卡状态，不添加单位
  if (label === 'SD卡状态') {
    return value.toString()
  }
  
  return unit ? `${value} ${unit}` : value
}

// SD卡状态文本计算属性
const sdCardStatusText = computed(() => {
  const status = getVersionValue('SD卡状态')
  
  // 处理可能的单位后缀
  const cleanStatus = status.replace(/\s*GB$/, '').replace(/\s*MB$/, '').replace(/\s*KB$/, '')
  
  switch (cleanStatus) {
    case '0':
      return 'SD卡路径不存在'
    case '1':
      return '写成功'
    case '2':
      return '写失败'
    case '3':
      return '未知状态'
    default:
      return cleanStatus || '–'
  }
})

// 获取SD卡状态严重程度
const getSdCardStatusSeverity = () => {
  const status = getVersionValue('SD卡状态')
  if (status === '1') return 'success'  // 写成功
  if (status === '2') return 'danger'   // 写失败
  if (status === '0') return 'warning'  // SD卡路径不存在
  return 'info'  // 默认
}

const formatValue = (value, scale) => {
  if (value === null || value === undefined) return ''
  
  if (scale === 1) {
    return value.toString()
  } else {
    const decimalPlaces = Math.log10(scale)
    return (value / scale).toFixed(decimalPlaces)
  }
}

const handleBlockVersionMessage = (event, data) => {
  parseBlockVersion(data)
}

onMounted(() => {
  window.electron.ipcRenderer.on('BLOCK_VER', handleBlockVersionMessage)
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeAllListeners('BLOCK_VER')
})
</script>

<style lang="scss" scoped>
.card {
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 1rem;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.version-header {
  margin-bottom: 1.5rem;
  text-align: center;
  flex-shrink: 0;
  
  .version-title {
    font-size: 1.8rem;
    font-weight: 600;
    color: #2c3e50;
    margin: 0;
  }
}

.version-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 1rem;
}

.version-card {
  border: 1px solid #e3f2fd;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.08);
  transition: all 0.3s ease;
  height: 320px;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(33, 150, 243, 0.15);
  }
  
  :deep(.p-card-header) {
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    color: #ffffff;
    border-radius: 12px 12px 0 0;
    padding: 1.25rem 1.5rem;
    border-bottom: 2px solid #0d47a1;
    position: relative;
  }
  
  :deep(.p-card-content) {
    padding: 1.5rem;
    height: 100%;
    background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .card-icon {
    font-size: 1.4rem;
  }
  
  .card-title {
    font-size: 1.2rem;
    font-weight: 600;
  }
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid #f0f0f0;
    gap: 1rem;
    transition: all 0.2s ease;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:hover {
      background: rgba(0, 0, 0, 0.02);
      border-radius: 6px;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }
    
    .info-label {
      font-weight: 500;
      color: #666;
      font-size: 1rem;
      flex-shrink: 0;
      min-width: 80px;
      position: relative;
      
      &::after {
        content: ':';
        margin-left: 0.25rem;
        color: #999;
      }
    }
    
    .info-value {
      font-weight: 600;
      color: #333;
      font-size: 1rem;
      text-align: right;
      flex: 1;
      word-break: break-word;
      overflow-wrap: break-word;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.03);
      transition: all 0.2s ease;
      
      &.version-highlight {
        color: #1976d2;
        font-weight: 700;
        background: rgba(33, 150, 243, 0.1);
        border: 1px solid rgba(33, 150, 243, 0.2);
      }
    }
  }
}


</style> 