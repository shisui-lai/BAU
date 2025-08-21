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
    
    <!-- 连接状态区域 - 固定在底部 -->
    <div class="connection-area">
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

.menu-area { flex: 1; }

.connection-area {
  padding: 1rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-ground);
}

.mqtt-connection-status {
  display: flex;
  justify-content: center;
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
