<!--
  BAU地址探测页面

  功能说明：
  - 支持IP1和IP2设备的网络配置查询和设置
  - 支持MQTT配置的查询和设置
  - 提供网卡选择功能，精确控制UDP通信接口
  - 密码保护的设备配置修改操作
  - 设备复位功能（恢复默认配置和重启设备）

  界面布局：
  - 左侧：设备查询结果显示区域（45%宽度）
  - 右侧：设备配置操作区域（剩余宽度，IP1和IP2并排显示）
-->
<script setup>
import { ref, computed, watch } from 'vue'
import { useBauAddressDetection } from '@/composables/device/useBauAddressDetection'
import { useI18n } from 'vue-i18n'

// PrimeVue 组件导入
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'


// 使用 BAU 地址探测 composable - 提供所有业务逻辑和状态管理
const { t } = useI18n()
const {
  // 查询相关 - 独立的查询状态
  ip1Query,
  ip2Query,
  mqttQuery,
  queryIp1Device,
  queryIp2Device,
  queryMqttConfig,

  // 操作相关
  modifyMqttConfig,
  resetToDefault,
  resetDevice,

  // 密码相关
  showPasswordDialog,
  passwordDialog,
  passwordInput,
  confirmPassword,
  cancelPassword,
  showPasswordConfirm,

  // 网卡选择相关
  networkInterfaces,
  selectedInterface,
  isLoadingInterfaces,
  loadNetworkInterfaces,

  // Toast消息函数
  showWarning
} = useBauAddressDetection()

// 本地化网卡选项（以太网/WLAN 等）
const localizedInterfaces = computed(() => {
  const list = networkInterfaces?.value || []
  return list.map(nic => {
    const raw = String(nic?.name || '')
    const lower = raw.toLowerCase()
    let kindKey = 'unknown'
    if (/(^|\b)(以太网|ethernet)($|\b)/i.test(raw)) kindKey = 'ethernet'
    else if (/(^|\b)(wifi|wi-?fi|wlan)($|\b)/i.test(lower)) kindKey = 'wifi'
    const kindText = t(`bauAddressDetectionPage.networkKinds.${kindKey}`)
    const displayName = `${kindText} (${nic.address || '-'})`
    return { ...nic, displayName }
  })
})

// ==================== 本地配置数据管理 ====================
// 这些配置数据用于右侧配置表单，会自动从查询结果中填充

// IP1配置数据 - 默认值和用户输入
const ip1Config = ref({
  ipAddress: '192.168.10.199',    // IP1默认地址
  subnetMask: '255.255.255.0',   // 标准C类子网掩码
  gateway: '192.168.10.1',        // 默认网关
  primaryDns: '8.8.8.8',         // Google DNS
  secondaryDns: '8.8.4.4'        // Google备用DNS
})

// IP2配置数据 - 使用不同网段的默认值
const ip2Config = ref({
  ipAddress: '192.168.11.199',    // IP2默认地址（不同网段）
  subnetMask: '255.255.255.0',   // 标准C类子网掩码
  gateway: '192.168.11.1',        // 对应网段的网关
  primaryDns: '8.8.8.8',         // Google DNS
  secondaryDns: '8.8.4.4'        // Google备用DNS
})

// MQTT配置数据
const mqttConfig = ref({
  serverIp: '192.168.11.200',    // MQTT服务器IP
  port: 1883                     // MQTT标准端口
})

// ==================== 表单验证计算属性 ====================
// 这些计算属性用于控制"应用配置"按钮的启用状态

// IP1配置有效性验证 - 必填字段检查
const isIp1ConfigValid = computed(() => {
  return ip1Config.value.ipAddress &&
         ip1Config.value.subnetMask &&
         ip1Config.value.gateway
})

// IP2配置有效性验证 - 必填字段检查
const isIp2ConfigValid = computed(() => {
  return ip2Config.value.ipAddress &&
         ip2Config.value.subnetMask &&
         ip2Config.value.gateway
})

// MQTT配置有效性验证 - IP和端口范围检查
const isMqttConfigValid = computed(() => {
  return mqttConfig.value.serverIp &&
         mqttConfig.value.port > 0 &&
         mqttConfig.value.port <= 65535
})

// ==================== 数据同步监听器 ====================
// 监听查询结果变化，自动将查询到的设备配置填充到配置表单中
// 这样用户可以基于当前配置进行修改，而不需要重新输入所有参数

// 监听IP1查询结果，自动填充IP1配置表单
watch(ip1Query, () => {
  if (ip1Query.value.result && ip1Query.value.result.data) {
    const data = ip1Query.value.result.data
    // 使用查询结果更新配置，如果查询结果为空则保持原有默认值
    ip1Config.value = {
      ipAddress: data.ipAddress || ip1Config.value.ipAddress,
      subnetMask: data.subnetMask || ip1Config.value.subnetMask,
      gateway: data.gateway || ip1Config.value.gateway,
      primaryDns: data.primaryDns || ip1Config.value.primaryDns,
      secondaryDns: data.secondaryDns || ip1Config.value.secondaryDns
    }
  }
}, { deep: true })

// 监听IP2查询结果，自动填充IP2配置表单
watch(ip2Query, () => {
  if (ip2Query.value.result && ip2Query.value.result.data) {
    const data = ip2Query.value.result.data
    // 使用查询结果更新配置，如果查询结果为空则保持原有默认值
    ip2Config.value = {
      ipAddress: data.ipAddress || ip2Config.value.ipAddress,
      subnetMask: data.subnetMask || ip2Config.value.subnetMask,
      gateway: data.gateway || ip2Config.value.gateway,
      primaryDns: data.primaryDns || ip2Config.value.primaryDns,
      secondaryDns: data.secondaryDns || ip2Config.value.secondaryDns
    }
  }
}, { deep: true })

// 监听MQTT查询结果，自动填充MQTT配置表单
watch(mqttQuery, () => {
  if (mqttQuery.value.result && mqttQuery.value.result.data) {
    const data = mqttQuery.value.result.data
    // 使用查询结果更新配置，如果查询结果为空则保持原有默认值
    mqttConfig.value = {
      serverIp: data.serverIp || mqttConfig.value.serverIp,
      port: data.port || mqttConfig.value.port
    }
  }
}, { deep: true })

// ==================== 配置应用操作函数 ====================
// 这些函数处理用户点击"应用配置"按钮的操作
// 包括表单验证、密码确认、设备配置下发等流程

/**
 * 应用IP1配置
 * 验证表单数据后，触发IP1设备的配置设置操作
 */
function applyIp1Config() {
  // 表单验证：检查必填字段
  if (!isIp1ConfigValid.value) {
    showWarning(t('bauAddressDetectionPage.messages.fillIp1'))
    return
  }

  // 调用配置设置函数，使用0xA002功能码
  modifyIpConfigWithType(ip1Config.value, 'IP1')
}

/**
 * 应用IP2配置
 * 验证表单数据后，触发IP2设备的配置设置操作
 */
function applyIp2Config() {
  // 表单验证：检查必填字段
  if (!isIp2ConfigValid.value) {
    showWarning(t('bauAddressDetectionPage.messages.fillIp2'))
    return
  }

  // 调用配置设置函数，使用0xA004功能码
  modifyIpConfigWithType(ip2Config.value, 'IP2')
}

/**
 * 通用IP配置设置函数
 * 支持明确指定设备类型（IP1或IP2），不依赖查询结果自动判断
 * @param {Object} configData - 配置数据对象
 * @param {string} deviceType - 设备类型（'IP1'或'IP2'）
 */
function modifyIpConfigWithType(configData, deviceType) {
  // 直接调用密码确认对话框，传递设备类型和配置数据
  showPasswordConfirm(t('bauAddressDetectionPage.dialogs.setIpTitle', [deviceType]), 'modifyIpConfig', {
    deviceType,
    configData
  })
}

/**
 * 应用MQTT配置
 * 验证表单数据后，触发MQTT配置设置操作
 */
function applyMqttConfig() {
  // 表单验证：检查IP地址和端口范围
  if (!isMqttConfigValid.value) {
    showWarning(t('bauAddressDetectionPage.messages.fillMqtt'))
    return
  }

  // 调用composable中的MQTT配置设置函数，使用0xA006功能码
  modifyMqttConfig(mqttConfig.value)
}


</script>

<template>
  <div class="card">
    <!-- Toast组件已移至AppLayout.vue，避免重复声明 -->

    <!-- 页面两列布局：左列（查询和结果），右列（配置操作） -->
    <div class="two-col">
      <div class="left-col">



        <!-- BAU设备查询结果总览 -->
        <div class="table-container order-like-card basic-card">
          <h2 class="table-title">{{ t('bauAddressDetectionPage.sections.queryResults') }}</h2>
          <div class="table-content">

            <!-- 网卡选择 -->
            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">{{ t('bauAddressDetectionPage.sections.networkInterface') }}</h3>
              </div>
              <div class="network-selector-content">
                <div class="network-selector-wrapper">
                  <i class="pi pi-wifi network-icon"></i>
                  <Dropdown
                    v-model="selectedInterface"
                    :options="localizedInterfaces"
                    optionLabel="displayName"
                    :placeholder="t('bauAddressDetectionPage.placeholders.selectNetworkInterface')"
                    class="network-dropdown"
                    :loading="isLoadingInterfaces"
                  />
                  <i class="pi pi-refresh refresh-icon"
                     @click="loadNetworkInterfaces"
                     v-tooltip="t('bauAddressDetectionPage.tooltips.refreshInterfaces')"></i>
                </div>
              </div>
            </div>

            <!-- IP1设备查询 -->
            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">{{ t('bauAddressDetectionPage.sections.ip1Query') }}</h3>
                <div class="header-controls">
                  <Button
                    :label="t('bauAddressDetectionPage.buttons.query')"
                    :loading="ip1Query.isQuerying"
                    @click="queryIp1Device"
                    size="small"
                    severity="secondary"
                    class="query-button"
                  />
                </div>
              </div>
              <div class="query-info-grid">
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.ipAddress') }}</label>
                  <div class="info-input">{{ ip1Query.result?.data?.ipAddress || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.subnetMask') }}</label>
                  <div class="info-input">{{ ip1Query.result?.data?.subnetMask || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.gateway') }}</label>
                  <div class="info-input">{{ ip1Query.result?.data?.gateway || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.primaryDns') }}</label>
                  <div class="info-input">{{ ip1Query.result?.data?.primaryDns || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.secondaryDns') }}</label>
                  <div class="info-input">{{ ip1Query.result?.data?.secondaryDns || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.macAddress') }}</label>
                  <div class="info-input">{{ ip1Query.result?.data?.macAddress || '-' }}</div>
                </div>
              </div>
            </div>

            <!-- IP2设备查询 -->
            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">{{ t('bauAddressDetectionPage.sections.ip2Query') }}</h3>
                <div class="header-controls">

                  <Button
                    :label="t('bauAddressDetectionPage.buttons.query')"
                    :loading="ip2Query.isQuerying"
                    @click="queryIp2Device"
                    size="small"
                    severity="secondary"
                    class="query-button"
                  />
                </div>
              </div>
              <div class="query-info-grid">
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.ipAddress') }}</label>
                  <div class="info-input">{{ ip2Query.result?.data?.ipAddress || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.subnetMask') }}</label>
                  <div class="info-input">{{ ip2Query.result?.data?.subnetMask || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.gateway') }}</label>
                  <div class="info-input">{{ ip2Query.result?.data?.gateway || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.primaryDns') }}</label>
                  <div class="info-input">{{ ip2Query.result?.data?.primaryDns || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.secondaryDns') }}</label>
                  <div class="info-input">{{ ip2Query.result?.data?.secondaryDns || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.macAddress') }}</label>
                  <div class="info-input">{{ ip2Query.result?.data?.macAddress || '-' }}</div>
                </div>
              </div>
            </div>

            <!-- MQTT配置查询 -->
            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">{{ t('bauAddressDetectionPage.sections.mqttQuery') }}</h3>
                <div class="header-controls">
                  <Button
                    :label="t('bauAddressDetectionPage.buttons.query')"
                    :loading="mqttQuery.isQuerying"
                    @click="queryMqttConfig"
                    size="small"
                    severity="secondary"
                    class="query-button"
                  />
                </div>
              </div>
              <div class="query-info-grid">
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.mqttServer') }}</label>
                  <div class="info-input">{{ mqttQuery.result?.data?.serverIp || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.mqttPort') }}</label>
                  <div class="info-input">{{ mqttQuery.result?.data?.port || '-' }}</div>
                </div>
                <div class="info-field">
                  <label>{{ t('bauAddressDetectionPage.labels.macAddress') }}</label>
                  <div class="info-input">{{ mqttQuery.result?.data?.macAddress || '-' }}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- 右列：配置操作 -->
      <div class="right-col">
        <div class="table-container order-like-card config-card">
          <h2 class="table-title">{{ t('bauAddressDetectionPage.sections.deviceConfigOps') }}</h2>
          <div class="table-content">

            <!-- IP网络配置 - 并排布局 -->
            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">{{ t('bauAddressDetectionPage.sections.ipNetworkConfig') }}</h3>
              </div>
              <div class="ip-config-container">
                <!-- IP1配置 -->
                <div class="ip-config-item">
                  <div class="ip-config-header">
                    <h4 class="ip-config-title">{{ t('bauAddressDetectionPage.sections.ip1Config') }}</h4>
                  </div>
                  <div class="form-grid">
                    <div class="form-row">
                      <label>{{ t('bauAddressDetectionPage.labels.ipAddress') }}</label>
                      <InputText
                        v-model="ip1Config.ipAddress"
                        :placeholder="t('bauAddressDetectionPage.placeholders.ip')"
                        class="w-full"
                      />
                    </div>
                    <div class="form-row">
                      <label>{{ t('bauAddressDetectionPage.labels.subnetMask') }}</label>
                      <InputText
                        v-model="ip1Config.subnetMask"
                        :placeholder="t('bauAddressDetectionPage.placeholders.subnet')"
                        class="w-full"
                      />
                    </div>
                    <div class="form-row">
                      <label>{{ t('bauAddressDetectionPage.labels.gateway') }}</label>
                      <InputText
                        v-model="ip1Config.gateway"
                        :placeholder="t('bauAddressDetectionPage.placeholders.gateway')"
                        class="w-full"
                      />
                    </div>
                    <div class="form-row">
                      <label>{{ t('bauAddressDetectionPage.labels.primaryDns') }}</label>
                      <InputText
                        v-model="ip1Config.primaryDns"
                        :placeholder="t('bauAddressDetectionPage.placeholders.dns1')"
                        class="w-full"
                      />
                    </div>
                    <div class="form-row">
                      <label>{{ t('bauAddressDetectionPage.labels.secondaryDns') }}</label>
                      <InputText
                        v-model="ip1Config.secondaryDns"
                        :placeholder="t('bauAddressDetectionPage.placeholders.dns2')"
                        class="w-full"
                      />
                    </div>
                  </div>
                  <div class="button-row">
                    <Button
                      :label="t('bauAddressDetectionPage.buttons.applyIp1Config')"
                      icon="pi pi-check"
                      severity="primary"
                      :disabled="!isIp1ConfigValid"
                      @click="applyIp1Config"
                      class="config-btn"
                    />
                  </div>
                </div>

                <!-- IP2配置 -->
                <div class="ip-config-item">
                  <div class="ip-config-header">
                    <h4 class="ip-config-title">{{ t('bauAddressDetectionPage.sections.ip2Config') }}</h4>
                  </div>
                  <div class="form-grid">
                    <div class="form-row">
                      <label>{{ t('bauAddressDetectionPage.labels.ipAddress') }}</label>
                      <InputText
                        v-model="ip2Config.ipAddress"
                        :placeholder="t('bauAddressDetectionPage.placeholders.ip')"
                        class="w-full"
                      />
                    </div>
                    <div class="form-row">
                      <label>{{ t('bauAddressDetectionPage.labels.subnetMask') }}</label>
                      <InputText
                        v-model="ip2Config.subnetMask"
                        :placeholder="t('bauAddressDetectionPage.placeholders.subnet')"
                        class="w-full"
                      />
                    </div>
                    <div class="form-row">
                      <label>{{ t('bauAddressDetectionPage.labels.gateway') }}</label>
                      <InputText
                        v-model="ip2Config.gateway"
                        :placeholder="t('bauAddressDetectionPage.placeholders.gateway')"
                        class="w-full"
                      />
                    </div>
                    <div class="form-row">
                      <label>{{ t('bauAddressDetectionPage.labels.primaryDns') }}</label>
                      <InputText
                        v-model="ip2Config.primaryDns"
                        :placeholder="t('bauAddressDetectionPage.placeholders.dns1')"
                        class="w-full"
                      />
                    </div>
                    <div class="form-row">
                      <label>{{ t('bauAddressDetectionPage.labels.secondaryDns') }}</label>
                      <InputText
                        v-model="ip2Config.secondaryDns"
                        :placeholder="t('bauAddressDetectionPage.placeholders.dns2')"
                        class="w-full"
                      />
                    </div>
                  </div>
                  <div class="button-row">
                    <Button
                      :label="t('bauAddressDetectionPage.buttons.applyIp2Config')"
                      icon="pi pi-check"
                      severity="primary"
                      :disabled="!isIp2ConfigValid"
                      @click="applyIp2Config"
                      class="config-btn"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- MQTT配置修改 -->
            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">{{ t('bauAddressDetectionPage.sections.mqttServerConfig') }}</h3>
              </div>
              <div class="form-grid">
                <div class="form-row">
                  <label>{{ t('bauAddressDetectionPage.labels.mqttServer') }}</label>
                  <InputText
                    v-model="mqttConfig.serverIp"
                    :placeholder="t('bauAddressDetectionPage.placeholders.mqttIp')"
                    class="w-full"
                  />
                </div>
                <div class="form-row">
                  <label>{{ t('bauAddressDetectionPage.labels.mqttPort') }}</label>
                  <InputNumber
                    v-model="mqttConfig.port"
                    :min="1"
                    :max="65535"
                    :placeholder="t('bauAddressDetectionPage.placeholders.mqttPort')"
                    class="w-full"
                  />
                </div>
              </div>
              <div class="button-row">
                <Button
                  :label="t('bauAddressDetectionPage.buttons.applyMqttConfig')"
                  icon="pi pi-check"
                  severity="primary"
                  :disabled="!isMqttConfigValid"
                  @click="applyMqttConfig"
                  class="config-btn"
                />
              </div>
            </div>

            <!-- 设备复位操作 -->
            <div class="config-section">
              <h3 class="section-title">{{ t('bauAddressDetectionPage.sections.deviceResetOps') }}</h3>
              <div class="reset-buttons">
                <Button
                  :label="t('bauAddressDetectionPage.buttons.resetParams')"
                  icon="pi pi-refresh"
                  severity="warning"
                  @click="resetToDefault"
                  class="reset-btn"
                />
                <Button
                  :label="t('bauAddressDetectionPage.buttons.rebootDevice')"
                  icon="pi pi-power-off"
                  severity="danger"
                  @click="resetDevice"
                  class="reset-btn"
                />
              </div>
            </div>

            <!-- 填充空间，确保与左侧card高度一致 -->
            <div class="spacer"></div>

          </div>
        </div>
      </div>
    </div>


    <!-- 密码确认对话框 -->
    <Dialog
      v-model:visible="showPasswordDialog"
      :header="passwordDialog.title"
      :modal="false"
      :closable="true"
      @hide="cancelPassword"
      class="password-dialog"
      :style="{ width: '400px' }"
    >
      <div class="password-form">
        <p class="mb-4">{{ passwordDialog.message }}</p>
        <div class="field">
          <label for="password">{{ t('bauAddressDetectionPage.labels.password') }}</label>
          <Password
            id="password"
            v-model="passwordInput"
            :feedback="false"
            toggle-mask
            class="w-full"
            :placeholder="t('bauAddressDetectionPage.placeholders.password')"
            @keyup.enter="confirmPassword"
          />
        </div>
      </div>
      <template #footer>
        <Button
          :label="t('bauAddressDetectionPage.buttons.cancel')"
          icon="pi pi-times"
          severity="danger"
          class="cancel-large"
          outlined
          @click="cancelPassword"
        />
        <Button
          :label="t('bauAddressDetectionPage.buttons.confirm')"
          icon="pi pi-check"
          @click="confirmPassword"
        />
      </template>
    </Dialog>
  </div>
</template>


<style scoped>
/* 页面容器样式 */

.two-col {
  display: flex;
  gap: 1.25rem;
  align-items: stretch;
}

.left-col {
  flex: 0 0 45%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.right-col {
  flex: 1;
  min-width: 500px;
  display: flex;
  flex-direction: column;
}

/* 高分辨率优化 */
@media (min-resolution: 144dpi) {
  .two-col {
    gap: 1.5rem;
  }

  .right-col {
    flex: 1;
    min-width: 550px;
  }


}

.table-container {
  background: var(--surface-card);
  border-radius: 12px;
  border: 1px solid var(--surface-border);
  margin-bottom: 0.75rem;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.table-title {
  background: linear-gradient(135deg, #007ad9 0%, #0056b3 100%);
  color: #ffffff;
  margin: 0;
  padding: 12px 16px;
  font-size: 1.1rem;
  font-weight: 600;
  border-bottom: 1px solid var(--surface-border);
  box-shadow: 0 2px 8px rgba(0, 122, 217, 0.2);
}

.cancel-large {
  font-size: 0.95rem;
  padding: 0.6rem 1rem;
}

.table-content {
  padding: 0.75rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 右侧配置卡片内容紧凑化 */
.right-col .table-content {
  gap: 1rem;
}

.right-col .config-section {
  margin-bottom: 0.75rem;
}

.right-col .config-section:last-child {
  margin-bottom: 0;
}



.form-grid {
  display: grid;
  gap: 1rem;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.form-row label {
  flex: 0 0 120px;
  font-weight: 500;
  color: var(--text-color);
  text-align: right;
}



.form-row .w-full {
  flex: 1;
}

/* 高分辨率表单优化 */
@media (min-resolution: 144dpi) {
  .form-grid {
    gap: 1.2rem;
  }

  .form-row {
    gap: 1.2rem;
  }

  .form-row label {
    flex: 0 0 140px;
    font-size: 1rem;
  }
}





/* 查询信息网格布局 - 两列显示 */
.query-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

/* 信息字段样式 - 模仿输入框外观 */
.info-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.info-field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-color);
}

.info-input {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-ground);
  color: var(--text-color);
  font-size: 0.8rem;
  min-height: 1.2rem;
  display: flex;
  align-items: center;
  font-family: inherit;
  line-height: 1.2;
}

/* 配置区域间距 */
.config-section {
  margin-bottom: 1.5rem;
}

/* 区域标题样式 */
.section-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;
}

/* 左侧查询区域的标题样式（有查询按钮的） */
.left-col .section-header {
  margin-bottom: 0.75rem;
  position: relative;
}

.header-controls {
  position: absolute;
  right: 0;
  bottom: 0.125rem;
  background: var(--surface-card);
  padding: 0 0.25rem;
}

/* 填充空间，确保card高度一致 */
.spacer {
  flex: 1;
  min-height: 2rem;
}



/* 查询按钮样式 */
.query-button {
  padding: 0.25rem 0.75rem !important;
  font-size: 0.8rem !important;
  height: auto !important;
  min-height: 1.75rem;
  flex-shrink: 0;
}



/* 高分辨率优化 - 150%及以上缩放 */
@media (min-resolution: 144dpi) {
  .query-info-grid {
    gap: 0.6rem 1rem;
  }





  .query-button {
    padding: 0.3rem 0.6rem !important;
    font-size: 0.8rem !important;
    min-height: 2rem;
  }
}







/* 响应式调整 */
@media (max-width: 1200px) {
  .query-results-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }


}

@media (max-width: 768px) {
  .query-info-grid {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .query-button {
    align-self: flex-end;
  }


}

@media (max-width: 768px) {
  .query-results-grid {
    grid-template-columns: 1fr;
  }

  .query-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .info-row .label {
    flex: none;
  }

  .info-row .value {
    text-align: left;
  }
}



/* 网卡选择样式 */
.network-selector-content {
  padding: 0.5rem 0;
}

.network-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
  border: 1px solid var(--surface-200);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.network-selector-wrapper:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.network-icon {
  font-size: 1.2rem;
  color: var(--primary-color);
  flex-shrink: 0;
}

.network-dropdown {
  flex: 1;
  min-width: 200px;
}

.refresh-icon {
  font-size: 1.1rem;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.refresh-icon:hover {
  color: var(--primary-color);
  background: var(--surface-100);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .network-selector-wrapper {
    flex-direction: column;
    gap: 0.75rem;
  }

  .network-dropdown {
    min-width: auto;
    width: 100%;
  }
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 0.5rem;
  flex: 1;
}

.button-row {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.2rem;
  flex-wrap: wrap;
}

/* 右侧配置卡片按钮间距优化 */
.right-col .button-row {
  margin-top: 1rem;
}

/* 高分辨率按钮优化 */
@media (min-resolution: 144dpi) {
  .button-row {
    gap: 1rem;
    margin-top: 1.8rem;
  }

  .query-btn {
    min-width: 160px;
  }
}

.config-btn {
  flex: 1;
  min-width: 140px;
}

.reset-buttons {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

/* 右侧配置卡片复位按钮间距优化 */
.right-col .reset-buttons {
  margin-top: 1.5rem;
}

.reset-btn {
  flex: 1;
  font-weight: 500;
}

/* IP配置并排布局样式 */
.ip-config-container {
  display: flex;
  gap: 1.5rem;
  align-items: stretch;
}

.ip-config-item {
  flex: 1;
  min-width: 0;
  background: var(--surface-50);
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  padding: 1rem;
}

.ip-config-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--surface-300);
}

.ip-config-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-color);
  text-align: center;
}

/* IP配置项内部表单样式调整 */
.ip-config-item .form-grid {
  gap: 0.75rem;
}

.ip-config-item .form-row {
  gap: 0.75rem;
}

.ip-config-item .form-row label {
  flex: 0 0 80px;
  font-size: 0.85rem;
}

.ip-config-item .button-row {
  margin-top: 1rem;
}

.ip-config-item .config-btn {
  width: 100%;
  font-size: 0.85rem;
}



.result-content {
  padding: 0.5rem 0;
}

.success-result,
.error-result {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 6px;
  font-weight: 500;
}

.success-result {
  background: var(--green-50);
  border: 1px solid var(--green-200);
  color: var(--green-800);
}

.error-result {
  background: var(--red-50);
  border: 1px solid var(--red-200);
  color: var(--red-800);
}

.password-form {
  padding: 1rem 0;
}

.password-dialog .field {
  margin-bottom: 1rem;
}

.password-dialog label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .two-col {
    flex-direction: column;
  }

  .right-col {
    flex: 1;
    min-width: 0;
  }
}

@media (max-width: 768px) {


  .query-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .form-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .form-row label {
    flex: none;
    text-align: left;
  }

  .button-row,
  .reset-buttons {
    flex-direction: column;
  }

  /* IP配置在小屏幕上垂直堆叠 */
  .ip-config-container {
    flex-direction: column;
    gap: 1rem;
  }

  .ip-config-item .form-row label {
    flex: none;
    text-align: left;
  }
}
</style>
