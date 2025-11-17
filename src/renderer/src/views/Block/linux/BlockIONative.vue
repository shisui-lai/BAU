<template>
  <div class="card">
    <div class="io-container">
      <!-- 统一的IO状态卡片 -->
      <div class="native-card io-card">
        <div class="native-card-header">
          <div class="card-header">
            <i class="pi pi-plug card-icon"></i>
            <span class="card-title">{{ t('blockIOStatusPage.title') }}</span>
          </div>
        </div>
        <div class="native-card-content">
          <div class="card-content">
            <div v-if="!hasData" class="no-data">
              <i class="pi pi-info-circle"></i>
              <span>{{ t('blockIOStatusPage.messages.noData') }}</span>
            </div>
            <div v-else class="io-items">
                <!-- 系统DI状态 -->
                <div class="io-section">
                  <div class="section-header">
                    <i class="pi pi-plug section-icon"></i>
                    <span class="section-title">{{ t('blockIOStatusPage.sections.systemDI') }}</span>
                  </div>
                  <div class="section-items">
                    <div v-for="item in systemDI" :key="item.key" class="io-item">
                      <div class="io-info">
                        <span class="io-label">{{ translateParameter(item.label) }}</span>
                        <span class="io-remark">{{ translateRemark(item.remark) }}</span>
                      </div>
                      <div class="io-status-indicator">
                        <span 
                          :class="['native-tag', 'status-tag', `tag-${getIOStatusSeverity(item.value)}`]"
                        >
                          {{ translateIOStatus(item.value) }}
                        </span>
                        <div class="led-indicator" :class="getLEDClass(item.value)"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 系统DO状态 -->
                <div class="io-section">
                  <div class="section-header">
                    <span class="section-title">{{ t('blockIOStatusPage.sections.systemDO') }}</span>
                  </div>
                  <div class="section-items">
                    <div v-for="item in systemDO" :key="item.key" class="io-item">
                      <div class="io-info">
                        <span class="io-label">{{ translateParameter(item.label) }}</span>
                        <span class="io-remark">{{ translateRemark(item.remark) }}</span>
                      </div>
                      <div class="io-status-indicator">
                        <span 
                          :class="['native-tag', 'status-tag', `tag-${getIOStatusSeverity(item.value)}`]"
                        >
                          {{ translateIOStatus(item.value) }}
                        </span>
                        <div class="led-indicator" :class="getLEDClass(item.value)"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- I/O控制板DI状态 -->
                <div class="io-section">
                  <div class="section-header">
                    <i class="pi pi-microchip section-icon"></i>
                    <span class="section-title">{{ t('blockIOStatusPage.sections.ioControlDI') }}</span>
                  </div>
                  <div class="section-items">
                    <div v-for="item in ioControlDI" :key="item.key" class="io-item">
                      <div class="io-info">
                        <span class="io-label">{{ translateParameter(item.label) }}</span>
                        <span class="io-remark">{{ translateRemark(item.remark) }}</span>
                      </div>
                      <div class="io-status-indicator">
                        <span 
                          :class="['native-tag', 'status-tag', `tag-${getIOStatusSeverity(item.value)}`]"
                        >
                          {{ translateIOStatus(item.value) }}
                        </span>
                        <div class="led-indicator" :class="getLEDClass(item.value)"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- I/O控制板DO状态 -->
                <div class="io-section">
                  <div class="section-header">
                    <span class="section-title">{{ t('blockIOStatusPage.sections.ioControlDO') }}</span>
                  </div>
                  <div class="section-items">
                    <div v-for="item in ioControlDO" :key="item.key" class="io-item">
                      <div class="io-info">
                        <span class="io-label">{{ translateParameter(item.label) }}</span>
                        <span class="io-remark">{{ translateRemark(item.remark) }}</span>
                      </div>
                      <div class="io-status-indicator">
                        <span
                          :class="['native-tag', 'status-tag', `tag-${getIOStatusSeverity(item.value)}`]"
                        >
                          {{ translateIOStatus(item.value) }}
                        </span>
                        <div class="led-indicator" :class="getLEDClass(item.value)"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- I/O控制板心跳 -->
                <div class="io-section">
                  <div class="section-header">
                    <span class="section-title">{{ t('blockIOStatusPage.sections.ioHeartbeat') }}</span>
                  </div>
                  <div class="section-items">
                    <div v-for="item in ioHeartbeat" :key="item.key" class="io-item">
                      <div class="io-info">
                        <span class="io-label">{{ translateParameter(item.label) }}</span>
                      </div>
                      <div class="io-status-indicator">
                        <span class="io-value">{{ item.value }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useBlockIO } from '@/composables/core/data-processing/block/useBlockIO'
import { useBlockSelect } from '@/composables/core/device-selection/useBlockSelect'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

// 国际化
const { t, te } = useI18n()

// 堆选择功能
const { selectedBlock } = useBlockSelect()

const {
  systemDI,
  systemDO,
  ioControlDI,
  ioControlDO,
  ioHeartbeat,
  getIOStatusText,
  getIOStatusSeverity
} = useBlockIO(selectedBlock)

// 添加调试日志
// console.log('[BlockIO.vue] 组件初始化，systemDI:', systemDI.value)
// console.log('[BlockIO.vue] ioControlDI:', ioControlDI.value)
// console.log('[BlockIO.vue] ioControlDO:', ioControlDO.value)

// 检查是否有数据
const hasData = computed(() => {
  return systemDI.value.length > 0 || systemDO.value.length > 0 ||
         ioControlDI.value.length > 0 || ioControlDO.value.length > 0 ||
         ioHeartbeat.value.length > 0
})

// 获取LED指示器样式类
const getLEDClass = (value) => {
  if (value === 1 || value === true) return 'led-active'
  if (value === 0 || value === false) return 'led-inactive'
  return 'led-unknown'
}

// 翻译函数
const translateParameter = (label) => {
  const translationKey = `blockIOStatusPage.parameters.${label}`
  // 先检查翻译键是否存在，如果不存在就直接返回原始 label，避免警告
  if (te(translationKey)) {
    return t(translationKey)
  }
  return label
}

const translateRemark = (remark) => {
  if (!remark) return ''
  const translationKey = `blockIOStatusPage.remarks.${remark}`
  // 先检查翻译键是否存在，如果不存在就直接返回原始 remark，避免警告
  if (te(translationKey)) {
    return t(translationKey)
  }
  return remark
}

const translateIOStatus = (value) => {
  if (value === 1 || value === true) return t('blockIOStatusPage.status.activated')
  if (value === 0 || value === false) return t('blockIOStatusPage.status.inactivated')
  return t('blockIOStatusPage.status.unknown')
}
</script>

<style lang="scss" scoped>
.card {
  background: var(--surface-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.io-container {
  flex: 1;
}

.native-card.io-card {
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  overflow: hidden;

  .native-card-header {
    background: var(--primary-color);
    color: var(--primary-color-text);
    border-radius: 12px 12px 0 0;
    padding: 1.25rem 1.5rem;
    border-bottom: 2px solid var(--primary-color);
    position: relative;
    flex-shrink: 0;
  }
  
  .native-card-content {
    padding: 1rem;
    flex: 1;
    overflow-y: auto;
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
  min-height: 0;
  
  .no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--text-color-secondary);
    gap: 0.5rem;

    i {
      font-size: 2rem;
      color: var(--text-color-secondary);
    }

    span {
      font-size: 1rem;
    }
  }
  

  
  .io-items {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-right: 0.75rem;
  }
}

.io-section {
  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--surface-section);
    border-radius: 8px;
    margin-bottom: 0.75rem;
    border-left: 4px solid var(--primary-color);

    .section-icon {
      font-size: 1.1rem;
      color: var(--primary-color);
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-color);
    }
  }
  
  .section-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-left: 0.5rem;
  }
}

.io-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-card);
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--primary-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .io-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;

    .io-label {
      font-weight: 600;
      color: var(--text-color);
      font-size: 0.9rem;
    }

    .io-remark {
      font-size: 0.75rem;
      color: var(--text-color-secondary);
      font-style: italic;
    }

    .io-value {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--primary-color);
      font-family: 'Courier New', monospace;
    }
  }
  
  .io-status-indicator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    .status-tag {
      min-width: 60px;
      text-align: center;
    }
    
    .led-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--surface-border);
      transition: all 0.3s ease;

      &.led-active {
        background: var(--green-500);
        border-color: var(--green-500);
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
      }

      &.led-inactive {
        background: var(--surface-400);
        border-color: var(--surface-400);
      }

      &.led-unknown {
        background: var(--orange-500);
        border-color: var(--orange-500);
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
      }
    }
  }
}

/* 原生标签样式 */
.native-tag {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  display: inline-block;
  white-space: nowrap;
}

.native-tag.status-tag {
  min-width: 60px;
  text-align: center;
}

.native-tag.tag-success {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #34d399;
}

.native-tag.tag-danger {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #f87171;
}

.native-tag.tag-warning {
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #fbbf24;
}

.native-tag.tag-info {
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #60a5fa;
}
</style> 