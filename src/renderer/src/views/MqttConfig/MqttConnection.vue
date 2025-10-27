<!-- MQTT连接配置组件 -->
<template>
  <div class="mqtt-connection">
    <div class="config-header">
      <h4>{{ t('mqtt.title') }}</h4>
      <div class="status-indicator">
        <Badge 
          :value="t(mqttStore.statusText)" 
          :severity="getStatusSeverity(mqttStore.status)"
        />
        <Button 
          v-if="mqttStore.isConnected"
          :label="t('mqtt.actions.disconnect')" 
          severity="secondary" 
          size="small"
          @click="handleDisconnect"
        />
      </div>
    </div>

    <!-- 连接状态信息 -->
    <div v-if="mqttStore.isConnected" class="connection-info">
      <Message severity="success" :closable="false">
        <div class="flex justify-content-between align-items-center">
          <div>
            <strong>{{ t('mqtt.connection.connectedTo') }}</strong> {{ mqttStore.config.host }}:{{ mqttStore.config.port }}
            <br>
            <small>{{ t('mqtt.connection.clientId') }} {{ mqttStore.config.clientId }}</small>
          </div>
        </div>
      </Message>
    </div>

    <!-- 错误信息 -->
    <div v-if="mqttStore.hasError" class="error-info">
      <Message severity="error" :closable="false">
        {{ mqttStore.error }}
        <template v-if="mqttStore.isReconnecting">
          <br>
          <small>{{ t('mqtt.connection.reconnecting') }}</small>
          <br>
          <Button
            :label="t('mqtt.connection.cancelReconnect')"
            severity="secondary"
            size="small"
            outlined
            @click="cancelReconnect"
            style="margin-top: 0.5rem;"
          />
        </template>
      </Message>
    </div>

    <!-- 历史配置快速连接 -->
    <div v-if="mqttStore.savedConfigs.length > 0" class="saved-configs">
      <h5>{{ t('mqtt.history.title') }}</h5>
      <div class="config-list">
        <div 
          v-for="(config, index) in mqttStore.savedConfigs" 
          :key="index"
          class="config-item"
        >
          <div class="config-details">
            <strong>{{ config.name }}</strong>
            <br>
            <small>{{ config.host }}:{{ config.port }} ({{ config.username }})</small>
            <br>
            <small class="text-muted">{{ t('mqtt.history.savedAt') }} {{ formatDate(config.savedAt) }}</small>
          </div>
          <div class="config-actions">
            <Button 
              :label="t('mqtt.history.connect')" 
              size="small" 
              severity="info"
              :disabled="mqttStore.isConnecting || mqttStore.isReconnecting"
              @click="quickConnect(config)"
            />
            <Button 
              icon="pi pi-trash" 
              size="small" 
              severity="danger"
              text
              @click="deleteConfig(index)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 连接配置表单 -->
    <div class="connection-form">
      <h5>{{ t('mqtt.form.title') }}</h5>
      <div class="form-grid">
        <!-- 服务器地址 -->
        <div class="field">
          <label for="host">{{ t('mqtt.form.host') }} *</label>
          <InputText 
            id="host"
            v-model="formData.host"
            :placeholder="t('mqtt.form.hostPlaceholder')"
            :class="{ 'p-invalid': !formData.host }"
          />
        </div>

        <!-- 端口 -->
        <div class="field">
          <label for="port">{{ t('mqtt.form.port') }}</label>
          <InputNumber 
            id="port"
            v-model="formData.port"
            :min="1"
            :max="65535"
            placeholder="1883"
          />
        </div>

        <!-- 用户名 -->
        <div class="field">
          <label for="username">{{ t('mqtt.form.username') }}</label>
          <InputText 
            id="username"
            v-model="formData.username"
            :placeholder="t('mqtt.form.usernamePlaceholder')"
          />
        </div>

        <!-- 密码 -->
        <div class="field">
          <label for="password">{{ t('mqtt.form.password') }}</label>
          <Password 
            id="password"
            v-model="formData.password"
            :placeholder="t('mqtt.form.passwordPlaceholder')"
            :feedback="false"
            toggleMask
          />
        </div>

        <!-- 客户端ID -->
        <div class="field">
          <label for="clientId">{{ t('mqtt.form.clientId') }}</label>
          <div class="client-id-group">
            <InputText 
              id="clientId"
              v-model="formData.clientId"
              readonly
            />
            <Button 
              icon="pi pi-refresh" 
              severity="secondary"
              outlined
              @click="generateNewClientId"
              v-tooltip="t('mqtt.form.generateClientId')"
            />
          </div>
        </div>

        <!-- Keep Alive -->
        <div class="field">
          <label for="keepalive">{{ t('mqtt.form.keepalive') }}</label>
          <InputNumber 
            id="keepalive"
            v-model="formData.keepalive"
            :min="10"
            :max="300"
            placeholder="60"
          />
        </div>
      </div>

      <!-- 高级选项 -->
      <div class="advanced-options">
        <h6>
          <i class="pi pi-cog"></i>
          {{ t('mqtt.form.advancedOptions') }}
        </h6>
        <div class="field">
          <label for="topics">{{ t('mqtt.form.subscribeTopics') }}</label>
          <Chip 
            v-for="topic in formData.subscribeTopics" 
            :key="topic"
            :label="topic"
            class="topic-chip"
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <Button 
          :label="t('mqtt.actions.testConnection')" 
          severity="secondary"
          outlined
          :loading="testingConnection"
          :disabled="!formData.host || mqttStore.isConnecting"
          @click="testConnection"
        />
        <Button 
          :label="t('mqtt.actions.saveAndConnect')" 
          severity="success"
          :loading="mqttStore.isConnecting || mqttStore.isReconnecting"
          :disabled="!formData.host"
          @click="saveAndConnect"
        />
        <Button 
          :label="t('mqtt.actions.saveOnly')" 
          severity="info"
          outlined
          :disabled="!formData.host"
          @click="saveConfig"
        />
      </div>
    </div>

    <!-- 连接统计信息 -->
    <div v-if="mqttStore.stats.reconnectCount > 0" class="stats-info">
      <h6>{{ t('mqtt.stats.title') }}</h6>
      <div class="stats-grid">
        <div class="stat-item">
          <label>{{ t('mqtt.stats.reconnectCount') }}</label>
          <span>{{ mqttStore.stats.reconnectCount }}</span>
        </div>
        <div v-if="mqttStore.stats.connectedAt" class="stat-item">
          <label>{{ t('mqtt.stats.connectedAt') }}</label>
          <span>{{ formatDate(mqttStore.stats.connectedAt) }}</span>
        </div>
        <div v-if="mqttStore.stats.lastError" class="stat-item">
          <label>{{ t('mqtt.stats.lastError') }}</label>
          <span class="error-text">{{ mqttStore.stats.lastError.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useMqttStore } from '../../stores/communication/mqttStore'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

const mqttStore = useMqttStore()
const toast = useToast()
const { t } = useI18n()

// 表单数据
const formData = reactive({
  host: '',
  port: 1883,
  username: 'admin1',
  password: 'public',
  clientId: '',
  keepalive: 60,
  subscribeTopics: ['bms/bau/d2s/+/+/#']
})

// 测试连接状态
const testingConnection = ref(false)

// 监听store配置变化，同步到表单
watch(() => mqttStore.config, (newConfig) => {
  Object.assign(formData, newConfig)
}, { immediate: true, deep: true })

// 获取状态严重程度
function getStatusSeverity(status) {
  switch (status) {
    case 'connected': return 'success'
    case 'connecting': 
    case 'reconnecting': return 'warn'
    case 'error': return 'danger'
    case 'disconnected': return 'secondary'
    default: return 'secondary'
  }
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

// 生成新的客户端ID
function generateNewClientId() {
  mqttStore.generateNewClientId()
}

// 测试连接
async function testConnection() {
  if (!formData.host) {
    toast.add({
      severity: 'warn',
      summary: t('login.language'),
      detail: t('mqtt.form.hostRequired'),
      life: 3000
    })
    return
  }

  testingConnection.value = true
  
  try {
    const result = await mqttStore.testConnection(formData)
    
    if (result.success) {
      toast.add({
        severity: 'success',
        summary: t('mqtt.messages.testSuccess'),
        detail: t('mqtt.messages.testSuccessDetail'),
        life: 3000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: t('mqtt.messages.testFailed'),
        detail: result.error || t('mqtt.messages.testFailedDetail'),
        life: 5000
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: t('mqtt.messages.testFailed'),
      detail: error.message,
      life: 5000
    })
  } finally {
    testingConnection.value = false
  }
}

// 保存并连接
async function saveAndConnect() {
  // 更新store配置
  mqttStore.updateConfig(formData)
  
  // 发起连接
  const success = await mqttStore.connect()
  
  if (success) {
    toast.add({
      severity: 'success',
      summary: t('mqtt.messages.connectSuccess'),
      detail: t('mqtt.messages.connectSuccessDetail', { 
        host: mqttStore.config.host, 
        port: mqttStore.config.port, 
        clientId: mqttStore.config.clientId 
      }),
      life: 5000
    })
    
    // 触发父组件事件，可以关闭弹窗
    emit('connected')
  } else {
    toast.add({
      severity: 'error',
      summary: t('mqtt.messages.connectFailed'),
      detail: mqttStore.error || t('mqtt.messages.connectFailedDetail'),
      life: 8000
    })
  }
}

// 仅保存配置
function saveConfig() {
  mqttStore.updateConfig(formData)
  
  const configName = prompt(t('mqtt.messages.configNamePrompt'), t('mqtt.messages.defaultConfigName', { 
    host: formData.host, 
    port: formData.port 
  }))
  if (configName) {
    mqttStore.saveConfig(configName)
    toast.add({
      severity: 'success',
      summary: t('mqtt.messages.saveSuccess'),
      detail: t('mqtt.messages.saveSuccessDetail'),
      life: 3000
    })
  }
}

// 快速连接
async function quickConnect(config) {
  mqttStore.loadConfig(config)
  const success = await mqttStore.connect()
  
  if (success) {
    toast.add({
      severity: 'success',
      summary: t('mqtt.messages.connectSuccess'),
      detail: t('mqtt.messages.connectSuccessDetail', { 
        host: mqttStore.config.host, 
        port: mqttStore.config.port, 
        clientId: mqttStore.config.clientId 
      }),
      life: 3000
    })
    emit('connected')
  }
}

// 删除配置
function deleteConfig(index) {
  mqttStore.deleteConfig(index)
  toast.add({
    severity: 'info',
    summary: t('mqtt.messages.configDeleted'),
    detail: t('mqtt.messages.configDeletedDetail'),
    life: 3000
  })
}

// 断开连接
async function handleDisconnect() {
  await mqttStore.disconnect()
  toast.add({
    severity: 'info',
    summary: t('mqtt.messages.disconnected'),
    detail: t('mqtt.messages.disconnectedDetail'),
    life: 3000
  })
}

// 取消重连
function cancelReconnect() {
  mqttStore.disconnect()
  toast.add({
    severity: 'info',
    summary: t('mqtt.messages.reconnectCancelled'),
    detail: t('mqtt.messages.reconnectCancelledDetail'),
    life: 3000
  })
}

// 组件事件
const emit = defineEmits(['connected', 'disconnected'])

onMounted(() => {
  // 初始化时生成客户端ID（如果没有的话）
  if (!mqttStore.config.clientId) {
    mqttStore.generateNewClientId()
  }
})
</script>

<style scoped>
.mqtt-connection {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.config-header h4 {
  margin: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-info,
.error-info {
  margin-bottom: 1rem;
}

.saved-configs {
  margin-bottom: 2rem;
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-50);
}

.config-details {
  flex: 1;
}

.config-actions {
  display: flex;
  gap: 0.5rem;
}

.connection-form {
  background: var(--surface-0);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-weight: 600;
  color: var(--text-color);
}

.client-id-group {
  display: flex;
  gap: 0.5rem;
}

.client-id-group .p-inputtext {
  flex: 1;
}

.advanced-options {
  margin-bottom: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--surface-border);
}

.advanced-options h6 {
  margin: 0 0 1rem 0;
  color: var(--text-color-secondary);
}

.topic-chip {
  margin-right: 0.5rem;
  margin-bottom: 0.25rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stats-info {
  margin-top: 2rem;
  padding: 1rem;
  background: var(--surface-50);
  border-radius: 6px;
}

.stats-info h6 {
  margin: 0 0 1rem 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-item label {
  font-weight: 600;
}

.error-text {
  color: var(--red-500);
  font-size: 0.875rem;
}

.text-muted {
  color: var(--text-color-secondary);
  font-size: 0.75rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .config-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .config-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .config-actions {
    align-self: stretch;
    justify-content: space-between;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style> 