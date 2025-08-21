<!-- MQTT连接配置组件 -->
<template>
  <div class="mqtt-connection">
    <div class="config-header">
      <h4>MQTT服务器连接配置</h4>
      <div class="status-indicator">
        <Badge 
          :value="mqttStore.statusText" 
          :severity="getStatusSeverity(mqttStore.status)"
        />
        <Button 
          v-if="mqttStore.isConnected"
          label="断开连接" 
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
            <strong>已连接到:</strong> {{ mqttStore.config.host }}:{{ mqttStore.config.port }}
            <br>
            <small>客户端ID: {{ mqttStore.config.clientId }}</small>
          </div>
        </div>
      </Message>
    </div>

    <!-- 错误信息 -->
    <div v-if="mqttStore.hasError" class="error-info">
      <Message severity="error" :closable="false">
        {{ mqttStore.error }}
        <template v-if="mqttStore.reconnect.isEnabled && mqttStore.isReconnecting">
          <br>
          <small>正在尝试重连... ({{ mqttStore.reconnect.currentAttempt }}/{{ mqttStore.reconnect.maxAttempts }})</small>
          <br>
          <Button 
            label="取消重连" 
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
      <h5>历史连接配置</h5>
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
            <small class="text-muted">保存于: {{ formatDate(config.savedAt) }}</small>
          </div>
          <div class="config-actions">
            <Button 
              label="连接" 
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
      <h5>连接配置</h5>
      <div class="form-grid">
        <!-- 服务器地址 -->
        <div class="field">
          <label for="host">服务器地址 *</label>
          <InputText 
            id="host"
            v-model="formData.host"
            placeholder="例如: 192.168.1.199"
            :class="{ 'p-invalid': !formData.host }"
          />
        </div>

        <!-- 端口 -->
        <div class="field">
          <label for="port">端口</label>
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
          <label for="username">用户名</label>
          <InputText 
            id="username"
            v-model="formData.username"
            placeholder="admin1"
          />
        </div>

        <!-- 密码 -->
        <div class="field">
          <label for="password">密码</label>
          <Password 
            id="password"
            v-model="formData.password"
            placeholder="public"
            :feedback="false"
            toggleMask
          />
        </div>

        <!-- 客户端ID -->
        <div class="field">
          <label for="clientId">客户端ID</label>
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
              v-tooltip="'生成新的客户端ID'"
            />
          </div>
        </div>

        <!-- Keep Alive -->
        <div class="field">
          <label for="keepalive">Keep Alive (秒)</label>
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
          高级选项
        </h6>
        <div class="field">
          <label for="topics">订阅主题</label>
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
          label="测试连接" 
          severity="secondary"
          outlined
          :loading="testingConnection"
          :disabled="!formData.host || mqttStore.isConnecting"
          @click="testConnection"
        />
        <Button 
          label="保存并连接" 
          severity="success"
          :loading="mqttStore.isConnecting || mqttStore.isReconnecting"
          :disabled="!formData.host"
          @click="saveAndConnect"
        />
        <Button 
          label="仅保存配置" 
          severity="info"
          outlined
          :disabled="!formData.host"
          @click="saveConfig"
        />
      </div>
    </div>

    <!-- 连接统计信息 -->
    <div v-if="mqttStore.stats.reconnectCount > 0" class="stats-info">
      <h6>连接统计</h6>
      <div class="stats-grid">
        <div class="stat-item">
          <label>重连次数:</label>
          <span>{{ mqttStore.stats.reconnectCount }}</span>
        </div>
        <div v-if="mqttStore.stats.connectedAt" class="stat-item">
          <label>连接时间:</label>
          <span>{{ formatDate(mqttStore.stats.connectedAt) }}</span>
        </div>
        <div v-if="mqttStore.stats.lastError" class="stat-item">
          <label>最后错误:</label>
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

const mqttStore = useMqttStore()
const toast = useToast()

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
      summary: '提示',
      detail: '请填写服务器地址',
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
        summary: '测试成功',
        detail: '服务器连接正常',
        life: 3000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: '测试失败',
        detail: result.error || '连接测试失败',
        life: 5000
      })
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '测试失败',
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
      summary: '连接成功',
      detail: `已连接到 ${formData.host}:${formData.port}，客户端ID: ${formData.clientId}`,
      life: 5000
    })
    
    // 触发父组件事件，可以关闭弹窗
    emit('connected')
  } else {
    toast.add({
      severity: 'error',
      summary: '连接失败',
      detail: mqttStore.error || '连接超时或服务器无响应，请检查网络和服务器配置',
      life: 8000
    })
  }
}

// 仅保存配置
function saveConfig() {
  mqttStore.updateConfig(formData)
  
  const configName = prompt('请输入配置名称:', `${formData.host}:${formData.port}`)
  if (configName) {
    mqttStore.saveConfig(configName)
    toast.add({
      severity: 'success',
      summary: '保存成功',
      detail: '配置已保存到历史记录',
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
      summary: '连接成功',
      detail: `已连接到 ${config.host}:${config.port}`,
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
    summary: '已删除',
    detail: '配置已从历史记录中删除',
    life: 3000
  })
}

// 断开连接
async function handleDisconnect() {
  await mqttStore.disconnect()
  toast.add({
    severity: 'info',
    summary: '已断开',
    detail: 'MQTT连接已断开',
    life: 3000
  })
}

// 取消重连
function cancelReconnect() {
  mqttStore.stopReconnect()
  toast.add({
    severity: 'info',
    summary: '已取消',
    detail: 'MQTT重连已取消',
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