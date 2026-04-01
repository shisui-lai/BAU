<template>
  <div class="card">
    <div class="version-header">
      <!-- <h2 class="version-title">堆版本信息</h2> -->
    </div>

    <div class="version-grid">
      <!-- SD卡信息卡片 -->
      <Card class="version-card">
        <template #header>
          <div class="card-header">
            <i class="pi pi-sd-card card-icon"></i>
            <span class="card-title">{{ t('blockVersionPage.cards.sdCardInfo') }}</span>
          </div>
        </template>
        <template #content>
          <div class="card-content">
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.totalCapacity') }}</span>
              <span class="info-value">{{ getVersionValue('SD卡总容量') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.remainingCapacity') }}</span>
              <span class="info-value">{{ getVersionValue('SD卡剩余容量') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.status') }}</span>
              <div class="info-value">
                <Tag :value="sdCardStatusText" :severity="getSdCardStatusSeverity()" />
              </div>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.writeFailReason') }}</span>
              <div class="info-value">
                <Tag :value="sdCardWriteFailReasonText" :severity="getSdCardWriteFailSeverity()" />
              </div>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.configurableDefaultParamRemainingCount') }}</span>
              <span class="info-value">{{ getVersionValue('可配置默认参数剩余次数') }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- BAU版本信息卡片 -->
      <Card class="version-card">
        <template #header>
          <div class="card-header">
            <i class="pi pi-cog card-icon"></i>
            <span class="card-title">{{ t('blockVersionPage.cards.bauVersionInfo') }}</span>
          </div>
        </template>
        <template #content>
          <div class="card-content">
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.productCode') }}</span>
              <span class="info-value">{{ getVersionValue('BAU产品编码') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.hardwareVersion') }}</span>
              <span class="info-value">{{ getVersionValue('BAU硬件版本号') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.softwareVersion') }}</span>
              <span class="info-value version-highlight">{{
                getVersionValue('BAU软件版本号')
              }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.bootVersion') }}</span>
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
            <span class="card-title">{{ t('blockVersionPage.cards.protocolVersionInfo') }}</span>
          </div>
        </template>
        <template #content>
          <div class="card-content">
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.hostProtocol') }}</span>
              <span class="info-value">{{ getVersionValue('BAU-上位机协议版本号') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.bcuProtocol') }}</span>
              <span class="info-value">{{ getVersionValue('BAU-BCU协议版本号') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.eventRecordVersion') }}</span>
              <span class="info-value">{{ getVersionValue('BAU事件记录版本号') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.soxAlgorithmVersion') }}</span>
              <span class="info-value">{{ getVersionValue('BAU-SOX算法版本号') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{
                t('blockVersionPage.labels.mergeSplitAlgorithmVersion')
              }}</span>
              <span class="info-value">{{ getVersionValue('BAU-退并簇算法版本号') }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('blockVersionPage.labels.configurableDefaultParamVersion') }}</span>
              <span class="info-value">{{ getVersionValue('BAU-可配置默认参数版本号') }}</span>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import {
  parseBlockVersion,
  pickBlockVersion
} from '@/composables/core/data-processing/block/parseBlockVersion'

const { t } = useI18n()

// 版本信息字段模板 - 使用原始的中文label
const FIELD_TEMPLATES = {
  版本信息: [
    'SD卡总容量',
    'SD卡剩余容量',
    'SD卡状态',
    'SD卡写失败原因',
    '可配置默认参数剩余次数',
    'BAU产品编码',
    'BAU硬件版本号',
    'BAU软件版本号',
    'BAU-BOOT版本号',
    'BAU-上位机协议版本号',
    'BAU-BCU协议版本号',
    'BAU事件记录版本号',
    'BAU-SOX算法版本号',
    'BAU-退并簇算法版本号',
    'BAU-可配置默认参数版本号'
  ]
}

// 获取版本信息数据
const versionData = computed(() => {
  const data = pickBlockVersion('block1', ['版本信息'])

  if (data['版本信息'] && data['版本信息'].length > 0) {
    // 有数据时，使用实际数据
    const dataMap = {}
    data['版本信息'].forEach((item) => {
      // 使用原始的label作为键，因为数据存储时使用的是原始label
      dataMap[item.label] = {
        value: formatValue(item.value, item.scale),
        unit: item.unit || ''
      }
    })
    return dataMap
  } else {
    // 没有数据时，使用占位符
    const placeholderMap = {}
    FIELD_TEMPLATES['版本信息'].forEach((label) => {
      placeholderMap[label] = {
        value: '–',
        unit: ''
      }
    })
    return placeholderMap
  }
})

// 获取版本值 - 直接使用原始label
const getVersionValue = (originalLabel) => {
  const data = versionData.value[originalLabel]
  if (!data) return '–'

  const value = data.value
  const unit = data.unit

  if (value === '–' || value === null || value === undefined) {
    return '–'
  }

  // 特殊处理SD卡状态，不添加单位
  if (originalLabel === 'SD卡状态') {
    return value.toString()
  }

  return unit ? `${value} ${unit}` : value
}

// SD卡状态文本计算属性
const sdCardStatusText = computed(() => {
  const status = getVersionValue('SD卡状态')

  // 处理可能的单位后缀
  const cleanStatus = status
    .replace(/\s*GB$/, '')
    .replace(/\s*MB$/, '')
    .replace(/\s*KB$/, '')

  // 根据状态值返回翻译后的文本
  switch (cleanStatus) {
    case '0':
      return t('blockVersionPage.status.sdCardPathNotExists')
    case '1':
      return t('blockVersionPage.status.writeSuccess')
    case '2':
      return t('blockVersionPage.status.writeFailed')
    case '3':
      return t('blockVersionPage.status.unknownStatus')
    default:
      return cleanStatus || '–'
  }
})

// 获取SD卡状态严重程度
const getSdCardStatusSeverity = () => {
  const status = getVersionValue('SD卡状态')
  if (status === '1') return 'success' // 写成功
  if (status === '2') return 'danger' // 写失败
  if (status === '0') return 'warning' // SD卡路径不存在
  return 'info' // 默认
}

// SD卡写失败原因文本
const sdCardWriteFailReasonText = computed(() => {
  const reason = getVersionValue('SD卡写失败原因')
  const clean = reason
    .replace(/\s*GB$/, '')
    .replace(/\s*MB$/, '')
    .replace(/\s*KB$/, '')
  switch (clean) {
    case '0':
      return t('blockVersionPage.failReason.noError')
    case '1':
      return t('blockVersionPage.failReason.cmd13Error')
    case '2':
      return t('blockVersionPage.failReason.cmd8Error')
    case '3':
      return t('blockVersionPage.failReason.heartbeatTimeout')
    case '4':
      return t('blockVersionPage.failReason.writeDataError')
    default:
      return clean || '–'
  }
})

// SD卡写失败原因严重程度
const getSdCardWriteFailSeverity = () => {
  const text = sdCardWriteFailReasonText.value
  if (!text || text === '–') return 'info'
  if (text === t('blockVersionPage.failReason.noError')) return 'success'
  return 'danger'
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
  background: var(--surface-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 0.5rem; /* 减少内边距 */
  height: auto; /* 改为自适应高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.version-header {
  margin-bottom: 0.5rem; /* 减少下边距 */
  text-align: center;
  flex-shrink: 0;

  .version-title {
    font-size: 1.8rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
  }
}

.version-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1rem; /* 减少卡片间距 */
  flex: 1;
  overflow-y: auto;
  padding-bottom: 0.5rem; /* 减少底部内边距 */
}

.version-card {
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  :deep(.p-card-header) {
    background: var(--primary-color);
    color: var(--primary-color-text);
    border-radius: 12px 12px 0 0;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--primary-color);
  }

  :deep(.p-card-content) {
    padding: 1rem;
    background: var(--surface-card);
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

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid var(--surface-border);
    gap: 1rem;
    transition: all 0.2s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--surface-hover);
      border-radius: 6px;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }

    .info-label {
      font-weight: 500;
      color: var(--text-color-secondary);
      font-size: 1rem;
      flex-shrink: 0;
      min-width: 80px;
      position: relative;

      &::after {
        content: ':';
        margin-left: 0.25rem;
        color: var(--text-color-secondary);
      }
    }

    .info-value {
      font-weight: 600;
      color: var(--text-color);
      font-size: 1rem;
      text-align: right;
      flex: 1;
      word-break: break-word;
      overflow-wrap: break-word;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: var(--surface-ground); /* 使用地面背景色与卡片主体区分 */
      transition: all 0.2s ease;

      &.version-highlight {
        color: var(--primary-color);
        font-weight: 700;
        background: var(--surface-hover);
        border: 1px solid var(--primary-color);
      }
    }
  }
}
</style>
