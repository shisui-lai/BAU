<script setup>
import AppMenu from './AppMenu.vue'
import { useMqttStore } from '@/stores/communication/mqttStore'
import { inject } from 'vue'

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

    <!-- 底部固定区域 - 包含公司链接和MQTT状态 -->
    <div class="bottom-fixed-area">
      <!-- 公司链接 -->
      <div class="company-link">
        <a href="https://risenstorage.com/" target="_blank">
          <i class="pi pi-external-link"></i>
          <span>东方日升储能</span>
        </a>
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
  background: var(--surface-ground);
}

.company-link {
  padding: 0.75rem 1rem 0.5rem 1rem;
  border-bottom: 1px solid var(--surface-border);

  a {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color-secondary, #6c757d);
    text-decoration: none;
    font-size: 0.8rem;
    padding: 0.5rem;
    transition: color 0.15s ease;
    border-radius: 6px;

    &:hover {
      color: var(--primary-color, #007ad9);
      background-color: var(--surface-hover, #e9ecef);
    }

    i {
      margin-right: 0.5rem;
      font-size: 0.75rem;
      flex-shrink: 0;
    }

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
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
  background: var(--surface-card);
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
    background: var(--green-50);
    color: var(--green-700);
    
    &:hover {
      background: var(--green-100);
    }
  }
  
  &.mqtt-disconnected {
    border-color: var(--red-500);
    background: var(--red-50);
    color: var(--red-700);
    
    &:hover {
      background: var(--red-100);
    }
  }
  
  &.mqtt-connecting {
    border-color: var(--orange-500);
    background: var(--orange-50);
    color: var(--orange-700);
    
    &:hover {
      background: var(--orange-100);
    }
  }
}

.mqtt-status-text {
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
