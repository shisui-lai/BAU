//状态管理、ipc调用
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'

/**
 * BAU地址探测功能 Composable
 */
export function useBauAddressDetection() {
  const { t } = useI18n()
  const toastService = useToast()
  // 响应式数据
  // 分别为每种查询类型创建独立的状态
  const ip1Query = ref({
    isQuerying: false,
    hasSearched: false,
    result: null
  })

  const ip2Query = ref({
    isQuerying: false,
    hasSearched: false,
    result: null
  })

  const mqttQuery = ref({
    isQuerying: false,
    hasSearched: false,
    result: null
  })

  const operationResult = ref(null) //存储操作结果（如复位设备）

  // 网卡选择功能状态
  const networkInterfaces = ref([]) // 网络接口列表
  const selectedInterface = ref(null) // 当前选中的网络接口
  const isLoadingInterfaces = ref(false) // 是否正在加载网络接口

  // 密码确认对话框
  const showPasswordDialog = ref(false)
  const passwordDialog = reactive({
    title: '',
    message: '',
    operation: null,
    params: null
  })
  const passwordInput = ref('')

  // 常量
  const ADMIN_PASSWORD = '0574'
  const FUNCTION_CODES = {
    QUERY_IP1: 0xa001,
    SET_IP1: 0xa002,
    QUERY_IP2: 0xa003,
    SET_IP2: 0xa004,
    QUERY_MQTT: 0xa005,
    SET_MQTT: 0xa006,
    FORCE_UPGRADE: 0xaffd,
    RESET_DEFAULT: 0xaffe,
    RESET_DEVICE: 0xafff
  }

  // 全局查询互斥标志位
  const isAnyQueryActive = ref(false)

  // ==================== 设备查询函数 ====================

  /**
   * 查询IP1设备配置
   * 发送IP1查询命令到BAU设备，获取当前IP1网络配置
   */
  async function queryIp1Device() {
    await performQuery(FUNCTION_CODES.QUERY_IP1, 'IP1', ip1Query)
  }

  /**
   * 查询IP2设备配置
   * 发送IP2查询命令到BAU设备，获取当前IP2网络配置
   */
  async function queryIp2Device() {
    await performQuery(FUNCTION_CODES.QUERY_IP2, 'IP2', ip2Query)
  }

  /**
   * 查询MQTT配置
   * 发送MQTT查询命令到BAU设备，获取当前MQTT服务器配置
   */
  async function queryMqttConfig() {
    await performQuery(FUNCTION_CODES.QUERY_MQTT, 'MQTT', mqttQuery)
  }

  // ==================== 网卡选择功能 ====================

  /**
   * 加载系统网络接口列表
   *
   * 功能说明：
   * 1. 通过IPC调用主进程获取系统可用的网络接口
   * 2. 过滤出IPv4非内部接口，供用户选择
   * 3. 自动选择第一个可用网卡作为默认选项
   * 4. 更新响应式状态，触发UI更新
   */
  async function loadNetworkInterfaces() {
    try {
      // 设置加载状态，显示加载指示器
      isLoadingInterfaces.value = true

      // IPC调用：向主进程请求网络接口列表
      // 主进程会调用Node.js os.networkInterfaces()获取系统接口
      const interfaces = await window.electronAPI.ipc.invoke('get-network-interfaces')

      // 更新响应式数据，Vue会自动更新相关UI组件
      networkInterfaces.value = interfaces

      // 智能默认选择：如果用户还没有选择网卡且有可用接口，自动选择第一个
      // 这样用户打开页面就可以直接进行操作，无需手动选择网卡
      if (!selectedInterface.value && interfaces.length > 0) {
        selectedInterface.value = interfaces[0]
      }
      // 如果已有选择的网卡，保持不变
      // 如果没有可用接口，selectedInterface.value保持null
    } catch (error) {
      // 错误处理：网络接口获取失败时的用户提示
      console.error('[BAU] 加载网络接口失败:', error)
      showError('toast.bauAddressDetection.loadNetworkInterfacesFailed')
    } finally {
      // 无论成功失败，都要清除加载状态
      isLoadingInterfaces.value = false
    }
  }

  /**
   * 选择网络接口
   */
  function selectNetworkInterface(interfaceInfo) {
    selectedInterface.value = interfaceInfo
    console.log('[BAU] 选择网络接口:', interfaceInfo)
  }

  // ==================== 核心查询函数 ====================
  // 统一的BAU设备查询函数，所有查询操作都通过选中的网卡进行
  /**
   * 统一的BAU设备查询函数
   *
   * 查询流程说明：
   * 1. 检查是否有其他查询在进行，如果有则阻止执行
   * 2. 设置查询状态，显示加载指示器
   * 3. 注册IPC监听器，等待主进程响应
   * 4. 调用主进程UDP通信函数
   * 5. 处理响应结果，更新UI状态
   * 6. 清理监听器，避免内存泄漏
   *
   * @param {number} functionCode - 功能码(QUERY_IP1/QUERY_IP2/QUERY_MQTT)
   * @param {string} deviceType - 设备类型名称，用于用户提示
   * @param {Ref} queryState - 对应的查询状态对象
   */
  async function performQuery(functionCode, deviceType, queryState) {
    // 第1步：检查是否有其他查询在进行
    if (isAnyQueryActive.value) {
      showWarning('toast.bauAddressDetection.waitForCurrentQuery')
      return
    }

    try {
      // 第2步：设置全局查询标志位和查询状态
      isAnyQueryActive.value = true // 设置全局互斥标志位
      queryState.value.isQuerying = true // 显示加载指示器
      queryState.value.result = null // 清空之前的结果
      queryState.value.hasSearched = true // 标记已执行过查询

      // 第3步：注册IPC监听器，监听主进程的UDP响应结果
      // 使用监听器模式是因为UDP通信是异步的，需要等待设备响应
      const listenerId = window.electronAPI.ipc.registerListener(
        'bau-operation-result',
        (event, result) => {
          try {
            // 第5步：处理主进程返回的UDP通信结果
            queryState.value.isQuerying = false // 隐藏加载指示器

            if (result.success && result.devices && result.devices.length > 0) {
              // 查询成功：解析设备响应数据
              const device = result.devices[0]
              const deviceData = device.parsedData || {}

              if (deviceData && deviceData.success === true) {
                // 数据解析成功：更新查询结果状态
                queryState.value.result = {
                  deviceType: deviceType,
                  data: deviceData,
                  functionCode: functionCode
                }
                showSuccess('toast.bauAddressDetection.deviceQuerySuccess', [deviceType])
              } else {
                // 数据解析失败：显示错误信息
                showError(deviceData?.error || 'toast.bauAddressDetection.deviceQueryFailed', [
                  deviceType
                ])
              }
            } else {
              // 查询失败：未找到设备或通信失败
              showWarning('toast.bauAddressDetection.deviceNotFound', [deviceType])
            }
          } finally {
            // 第6步：确保清理工作总是执行
            isAnyQueryActive.value = false // 重置全局互斥标志位
            window.electronAPI.ipc.unregisterListener(listenerId) // 清理监听器
          }
        }
      )

      try {
        // 第3步：调用主进程UDP通信函数
        // 根据功能码选择对应的IPC方法：
        // - MQTT查询使用专用的MQTT处理器
        // - IP查询使用通用的IP处理器
        const invokeMethod =
          functionCode === FUNCTION_CODES.QUERY_MQTT
            ? 'bau-query-mqtt-with-interface'
            : 'bau-query-ip-with-interface'
        const params = {
          functionCode: functionCode,
          interfaceAddress: selectedInterface.value?.address || '0.0.0.0' // 使用选中网卡的IP地址
        }

        console.log(
          `[BAU] 使用指定网卡查询: ${selectedInterface.value?.displayName || '未选择网卡'}`
        )
        // IPC异步调用：触发主进程的UDP通信
        await window.electronAPI.ipc.invoke(invokeMethod, params)
      } catch (error) {
        // 异常处理：IPC调用失败或网络错误
        console.error(`${deviceType}设备查询失败:`, error)
        showError(`${deviceType}设备查询失败，请检查网络连接`)

        // 发生异常时的清理工作
        queryState.value.isQuerying = false
        isAnyQueryActive.value = false // 重置全局互斥标志位
        window.electronAPI.ipc.unregisterListener(listenerId)
      }
    } catch (outerError) {
      // 外层异常处理：确保标志位总是被重置
      console.error(`${deviceType}查询外层异常:`, outerError)
      isAnyQueryActive.value = false
      queryState.value.isQuerying = false
    }
  }

  // ==================== 设备配置修改函数 ====================

  /**
   * 修改BAU设备的IP配置
   *
   * 功能说明：
   * 1. 支持两种模式：基于查询结果修改 或 直接设置新配置
   * 2. 自动识别设备类型（IP1或IP2）
   * 3. 密码确认后执行设置操作
   * 4. 通过选中的网卡发送设置命令
   *
   * @param {Object|null} configData - 配置数据，null时使用查询结果
   */
  function modifyIpConfig(configData = null) {
    // 数据验证：确保有可用的配置数据
    if (!configData && !ip1Query.value.result && !ip2Query.value.result) {
      showError('toast.bauAddressDetection.queryIpConfigFirst')
      return
    }

    // 设备类型识别：优先使用IP1结果，如果没有则使用IP2结果
    const queryResult = ip1Query.value.result || ip2Query.value.result
    const deviceType = queryResult ? queryResult.deviceType : 'IP1'

    // 操作模式判断：
    if (configData) {
      // 直接设置模式：使用传入的配置数据
      showPasswordConfirm(
        t('bauAddressDetectionPage.dialogs.setIpTitle', [deviceType]),
        'modifyIpConfig',
        {
          deviceType,
          configData
        }
      )
    } else {
      // 修改模式：基于查询结果进行修改
      showPasswordConfirm(
        t('bauAddressDetectionPage.dialogs.setIpTitle', [deviceType]),
        'modifyIpConfig',
        { deviceType }
      )
    }
  }

  /**
   * 修改BAU设备的MQTT配置
   *
   * 功能说明：
   * 1. 支持两种模式：基于查询结果修改 或 直接设置新配置
   * 2. 密码确认后执行设置操作
   * 3. 通过选中的网卡发送设置命令
   *
   * @param {Object|null} configData - MQTT配置数据，包含serverIp和port
   */
  function modifyMqttConfig(configData = null) {
    // 操作模式判断：
    if (configData) {
      // 直接设置模式：使用传入的MQTT配置数据
      showPasswordConfirm(t('bauAddressDetectionPage.dialogs.setMqttTitle'), 'modifyMqttConfig', {
        configData
      })
    } else {
      // 修改模式：基于查询结果进行修改
      if (!mqttQuery.value.result) {
        showError('toast.bauAddressDetection.queryMqttConfigFirst')
        return
      }
      showPasswordConfirm(t('bauAddressDetectionPage.dialogs.setMqttTitle'), 'modifyMqttConfig', {})
    }
  }

  // ==================== 设备复位函数 ====================

  /**
   * 复位BAU设备到默认参数
   * 恢复出厂网络配置，但不重启设备
   */
  function resetToDefault() {
    showPasswordConfirm(
      t('bauAddressDetectionPage.dialogs.resetDefaultTitle'),
      'resetToDefault',
      {}
    )
  }

  /**
   * 重启BAU设备
   * 设备将重新启动，应用当前配置
   */
  function resetDevice() {
    showPasswordConfirm(t('bauAddressDetectionPage.dialogs.resetDeviceTitle'), 'resetDevice', {})
  }

  /**
   * 强制升级BAU设备
   * 触发BAU设备的强制升级流程
   */
  function forceUpgrade() {
    showPasswordConfirm(t('bauAddressDetectionPage.dialogs.forceUpgradeTitle'), 'forceUpgrade', {})
  }

  // ==================== 密码确认机制 ====================

  /**
   * 显示密码确认对话框
   *
   * 安全机制：所有设置和复位操作都需要管理员密码确认
   * 防止误操作导致设备配置丢失或网络中断
   *
   * @param {string} title - 对话框标题
   * @param {string} operation - 操作类型标识
   * @param {Object} params - 操作参数
   */
  function showPasswordConfirm(title, operation, params) {
    passwordDialog.title = title
    passwordDialog.message = t('bauAddressDetectionPage.messages.passwordDialogMessage')
    passwordDialog.operation = operation
    passwordDialog.params = params
    passwordInput.value = '' // 清空密码输入框
    showPasswordDialog.value = true // 显示密码对话框
  }

  async function confirmPassword() {
    if (passwordInput.value !== ADMIN_PASSWORD) {
      showError('toast.bauAddressDetection.passwordError')
      passwordInput.value = ''
      return
    }

    showPasswordDialog.value = false
    const { operation, params } = passwordDialog

    // 执行对应的操作
    switch (operation) {
      case 'modifyIpConfig':
        if (params.configData) {
          // 直接设置IP配置
          const functionCode =
            params.deviceType === 'IP2' ? FUNCTION_CODES.SET_IP2 : FUNCTION_CODES.SET_IP1
          console.log('confirmPassword: 准备调用executeSetOperation')
          try {
            await executeSetOperation(
              functionCode,
              params.configData,
              t(`toast.bauAddressDetection.${params.deviceType.toLowerCase()}Config`)
            )
            console.log('confirmPassword: executeSetOperation完成')
          } catch (error) {
            console.error('confirmPassword: executeSetOperation失败:', error)
          }
        } else {
          // TODO: 实现IP配置对话框
          showError('IP配置对话框功能待实现')
        }
        break
      case 'modifyMqttConfig':
        if (params.configData) {
          // 直接设置MQTT配置
          console.log('confirmPassword: 准备调用executeSetOperation (MQTT)')
          try {
            await executeSetOperation(
              FUNCTION_CODES.SET_MQTT,
              params.configData,
              t('toast.bauAddressDetection.setMqttConfig', '设置MQTT配置')
            )
            console.log('confirmPassword: executeSetOperation (MQTT)完成')
          } catch (error) {
            console.error('confirmPassword: executeSetOperation (MQTT)失败:', error)
          }
        } else {
          // TODO: 实现MQTT配置对话框
          showError('MQTT配置对话框功能待实现')
        }
        break
      case 'resetToDefault':
        executeResetOperation(
          FUNCTION_CODES.RESET_DEFAULT,
          t('toast.bauAddressDetection.resetDefaultParams', '复位默认参数')
        )
        break
      case 'resetDevice':
        executeResetOperation(
          FUNCTION_CODES.RESET_DEVICE,
          t('toast.bauAddressDetection.resetDevice', '复位设备')
        )
        break
      case 'forceUpgrade':
        executeResetOperation(
          FUNCTION_CODES.FORCE_UPGRADE,
          t('toast.bauAddressDetection.forceUpgrade', '强制升级')
        )
        break
    }
  }

  function cancelPassword() {
    showPasswordDialog.value = false
    passwordInput.value = ''
  }
  // 执行复位操作
  function executeResetOperation(functionCode, operationName) {
    const listenerId = window.electronAPI.ipc.registerListener(
      'bau-operation-result',
      (event, result) => {
        if (result.success) {
          operationResult.value = {
            type: 'success',
            message: t('toast.bauAddressDetection.deviceResetSuccess')
          }
          showSuccess('toast.bauAddressDetection.deviceResetSuccess')

          // 如果是设备复位，清空所有查询结果
          if (functionCode === FUNCTION_CODES.RESET_DEVICE) {
            setTimeout(() => {
              ip1Query.value.result = null
              ip2Query.value.result = null
              mqttQuery.value.result = null
            }, 1000)
          }
        } else {
          showError(result.error || 'toast.bauAddressDetection.deviceResetFailed')
        }
        window.electronAPI.ipc.unregisterListener(listenerId)
      }
    )

    // 统一使用网卡选择方法进行复位/升级操作
    let invokeMethod
    if (functionCode === FUNCTION_CODES.RESET_DEFAULT) {
      invokeMethod = 'bau-reset-default-with-interface'
    } else if (functionCode === FUNCTION_CODES.RESET_DEVICE) {
      invokeMethod = 'bau-reset-device-with-interface'
    } else if (functionCode === FUNCTION_CODES.FORCE_UPGRADE) {
      invokeMethod = 'bau-force-upgrade-with-interface'
    }

    window.electronAPI.ipc
      .invoke(invokeMethod, {
        functionCode: functionCode,
        interfaceAddress: selectedInterface.value?.address || '0.0.0.0'
      })
      .catch((error) => {
        console.error(`${operationName}失败:`, error)
        showError('toast.bauAddressDetection.deviceResetFailed')
        window.electronAPI.ipc.unregisterListener(listenerId)
      })
  }

  // 执行设置操作
  async function executeSetOperation(functionCode, data, operationName) {
    // 调试日志（调试时启用）
    console.log('=== executeSetOperation 调试信息 ===')
    console.log('operationName:', operationName)
    console.log('functionCode:', functionCode, '(0x' + functionCode.toString(16) + ')')
    console.log('data:', data)
    console.log('data type:', typeof data)
    console.log('data constructor:', data?.constructor?.name)
    console.log('data keys:', Object.keys(data || {}))
    console.log('data values:', Object.values(data || {}))

    // 序列化测试（调试时启用）
    try {
      const testSerialization = JSON.stringify(data)
      console.log('JSON序列化测试: 成功')
      console.log('序列化长度:', testSerialization.length)
    } catch (error) {
      console.error('JSON序列化测试: 失败', error)
    }

    // Vue响应式对象检查（调试时启用）
    if (data && typeof data === 'object') {
      console.log('是否是Proxy:', data.constructor.name === 'Object' ? '可能不是' : '可能是')
      console.log('对象描述符:', Object.getOwnPropertyDescriptors(data))
    }
    console.log('=== 调试信息结束 ===')

    const listenerId = window.electronAPI.ipc.registerListener(
      'bau-operation-result',
      (event, result) => {
        if (result.success && result.devices && result.devices.length > 0) {
          const device = result.devices[0]
          if (device.parsedData && device.parsedData.success) {
            operationResult.value = {
              type: 'success',
              message: `${operationName}成功`
            }
            showSuccess('toast.bauAddressDetection.deviceConfigSuccess', [operationName])
          } else {
            showError(device.parsedData?.error || 'toast.bauAddressDetection.deviceConfigFailed', [
              operationName
            ])
          }
        } else {
          showError(result.error || 'toast.bauAddressDetection.deviceResetFailed')
        }
        window.electronAPI.ipc.unregisterListener(listenerId)
      }
    )

    // 统一使用网卡选择方法进行设置操作
    const invokeMethod =
      functionCode === FUNCTION_CODES.SET_MQTT
        ? 'bau-set-mqtt-with-interface'
        : 'bau-set-ip-with-interface'

    // 清理Vue响应式Proxy对象，避免IPC序列化失败
    const cleanData = JSON.parse(JSON.stringify(data))

    console.log('准备调用IPC方法:', invokeMethod)
    console.log('IPC参数:', {
      functionCode,
      data: cleanData,
      interfaceAddress: selectedInterface.value?.address
    })

    try {
      console.log('开始IPC调用...')
      const result = await window.electronAPI.ipc.invoke(invokeMethod, {
        functionCode: functionCode,
        data: cleanData,
        interfaceAddress: selectedInterface.value?.address || '0.0.0.0'
      })
      console.log('IPC调用成功，结果:', result)
    } catch (error) {
      console.error('IPC调用失败:', error)
      console.error('错误详情:', error.message, error.stack)
      showError('toast.bauAddressDetection.deviceResetFailed')
      window.electronAPI.ipc.unregisterListener(listenerId)
    }
  }

  // 消息提示
  function showSuccess(messageKey, params = []) {
    const message =
      typeof messageKey === 'string' && messageKey.startsWith('toast.')
        ? t(messageKey, params)
        : messageKey
    toastService.add({
      severity: 'success',
      summary: t('toast.bauAddressDetection.success'),
      detail: message,
      life: 3000
    })
  }

  function showError(messageKey, params = []) {
    const message =
      typeof messageKey === 'string' && messageKey.startsWith('toast.')
        ? t(messageKey, params)
        : messageKey
    toastService.add({
      severity: 'error',
      summary: t('toast.bauAddressDetection.error'),
      detail: message,
      life: 5000
    })
  }

  function showWarning(messageKey, params = []) {
    const message =
      typeof messageKey === 'string' && messageKey.startsWith('toast.')
        ? t(messageKey, params)
        : messageKey
    toastService.add({
      severity: 'warn',
      summary: t('toast.bauAddressDetection.warning'),
      detail: message,
      life: 4000
    })
  }

  function showInfo(messageKey, params = []) {
    const message =
      typeof messageKey === 'string' && messageKey.startsWith('toast.')
        ? t(messageKey, params)
        : messageKey
    toastService.add({
      severity: 'info',
      summary: t('toast.bauAddressDetection.info'),
      detail: message,
      life: 3000
    })
  }

  // 生命周期
  onMounted(() => {
    // 加载网络接口列表
    loadNetworkInterfaces()
  })

  onUnmounted(() => {
    // 清空所有查询结果
    ip1Query.value.result = null
    ip2Query.value.result = null
    mqttQuery.value.result = null
    operationResult.value = null
  })

  // 返回接口
  return {
    // 查询相关 - 分别返回每种查询的独立状态
    ip1Query,
    ip2Query,
    mqttQuery,
    queryIp1Device,
    queryIp2Device,
    queryMqttConfig,

    // 操作相关
    modifyIpConfig,
    modifyMqttConfig,
    resetToDefault,
    resetDevice,
    forceUpgrade,

    // 结果相关
    operationResult,

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
    selectNetworkInterface,

    // 查询互斥相关
    isAnyQueryActive,

    // Toast消息函数
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}
