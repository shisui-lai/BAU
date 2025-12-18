<script setup>
import AppMenu from './AppMenu.vue'
import { useMqttStore } from '@/stores/communication/mqttStore'
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 显示版本号
const version = 'test-v0.3.8 12.15'

// 获取MQTT store
const mqttStore = useMqttStore()

// 从AppLayout注入的方法
const handleStatusClick = inject('handleStatusClick')
const handleDisconnect = inject('handleDisconnect')
const getStatusIcon = inject('getStatusIcon')
const getStatusText = inject('getStatusText')

// MQTT状态点击处理
function onMqttStatusClick() {
  if (handleStatusClick) {
    handleStatusClick()
  }
}
</script>

<template>
  <div class="sidebar-container">
    <!-- 菜单区域 -->
    <div class="menu-area">
      <app-menu></app-menu>
    </div>

    <!-- 底部固定区域 - 显示版本号与MQTT状态 -->
    <div class="bottom-fixed-area">
      <!-- 版本号显示 -->
      <div class="sidebar-version">
        <i class="pi pi-info-circle"></i>
        <span>{{ version }}</span>
      </div>

      <!-- MQTT连接状态 -->
      <div class="mqtt-connection-status">
        <button
          class="mqtt-status-button"
          :class="{
            'mqtt-connected': mqttStore?.isConnected,
            'mqtt-disconnected': !mqttStore?.isConnected && mqttStore?.status !== 'connecting' && mqttStore?.status !== 'reconnecting',
            'mqtt-connecting': mqttStore?.status === 'connecting' || mqttStore?.status === 'reconnecting'
          }"
          @click="onMqttStatusClick"
        >
          <i :class="getStatusIcon && getStatusIcon()"></i>
          <span class="mqtt-status-text">{{ getStatusText && getStatusText() }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.menu-area {
  flex: 1;
  overflow: hidden; /* 确保菜单区域不会溢出 */
}

.bottom-fixed-area {
  border-top: 1px solid var(--surface-border);
  background: transparent; /* 使用透明背景，继承侧边栏背景 */
}

.sidebar-version {
  padding: 0.75rem 1rem 0.5rem 1rem;
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary, #6c757d);
  font-size: 0.8rem;
  gap: 0.5rem;

  i {
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  span {
    font-size: 1rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
}

.mqtt-connection-status {
  display: flex;
  justify-content: center;
  padding: 0.75rem 1rem 1rem 1rem;
}

.mqtt-status-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: transparent; /* 使用透明背景，融入侧边栏 */
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  justify-content: center;

  &:hover {
    background: var(--surface-hover);
  }
  
  &.mqtt-connected {
    border-color: var(--green-500);
    background: rgba(34, 197, 94, 0.1); /* 半透明绿色背景 */
    color: var(--green-600);

    &:hover {
      background: rgba(34, 197, 94, 0.15);
    }
  }

  &.mqtt-disconnected {
    border-color: var(--red-500);
    background: rgba(239, 68, 68, 0.1); /* 半透明红色背景 */
    color: var(--red-600);

    &:hover {
      background: rgba(239, 68, 68, 0.15);
    }
  }

  &.mqtt-connecting {
    border-color: var(--orange-500);
    background: rgba(249, 115, 22, 0.1); /* 半透明橙色背景 */
    color: var(--orange-600);

    &:hover {
      background: rgba(249, 115, 22, 0.15);
    }
  }
}

.mqtt-status-text {
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
