# MQTT连接状态实时检测需求方案

## 🔍 核心问题分析

### 当前问题现状
**问题描述**：上位机与MQTT服务器连接后显示"已连接"，但当MQTT服务器被关闭时，上位机无法检测到服务器掉线状态，仍然显示"已连接"。

**具体场景**：
1. 上位机成功连接MQTT服务器 → 显示"已连接" ✅
2. 手动关闭MQTT服务器 → 上位机仍显示"已连接" ❌
3. 期望：上位机应该检测到"服务器掉线"并显示相应状态 ❌

### 问题根本原因
**缺乏实时连接状态检测机制**：
- 只在初次连接时设置状态
- 没有持续监控MQTT服务器的连接状态
- 没有监听mqtt.js的连接状态变化事件

## 🎯 解决方案目标

### 主要目标
**实现MQTT服务器连接状态的实时检测，确保上位机能够立即感知服务器的掉线状态。**

### 具体目标
1. **实时状态检测**：持续监控上位机与MQTT服务器之间的连接状态
2. **即时掉线感知**：服务器关闭时立即检测到掉线状态
3. **状态准确显示**：根据真实连接状态更新UI显示
4. **问题类型区分**：通过连接状态区分服务器问题和设备问题

### 问题区分逻辑
```
连接状态检测结果：
├── 上位机 ↔ 服务器：已连接 + 无数据 → 设备端问题
└── 上位机 ↔ 服务器：掉线状态 + 无数据 → 服务器端问题
```

## 🏗️ 技术实现方案

### 1. MQTT连接状态事件监听

#### 在子进程中监听mqtt.js事件
```javascript
// src/main/mqtt.js
client.on('connect', () => {
  console.log('[MQTT Child] 连接成功')
  // 通知主进程连接状态
  process.send({
    type: 'mqtt-status-change',
    status: 'connected',
    timestamp: Date.now()
  })
})

client.on('disconnect', () => {
  console.log('[MQTT Child] 连接断开')
  // 通知主进程断开状态
  process.send({
    type: 'mqtt-status-change',
    status: 'disconnected',
    timestamp: Date.now()
  })
})

client.on('offline', () => {
  console.log('[MQTT Child] 客户端离线')
  // 通知主进程离线状态
  process.send({
    type: 'mqtt-status-change',
    status: 'offline',
    timestamp: Date.now()
  })
})

client.on('error', (error) => {
  console.log('[MQTT Child] 连接错误:', error)
  // 通知主进程错误状态
  process.send({
    type: 'mqtt-status-change',
    status: 'error',
    error: error.message,
    timestamp: Date.now()
  })
})
```

### 2. 主进程状态管理

#### IPC消息处理
```javascript
// src/main/index.js
// 监听MQTT子进程的状态变化消息
mqttTask.on('message', (message) => {
  if (message.type === 'mqtt-status-change') {
    // 转发状态变化到渲染进程
    mainWindow.webContents.send('mqtt-status-update', {
      status: message.status,
      error: message.error,
      timestamp: message.timestamp
    })
  }
})
```

### 3. 前端状态同步

#### 状态管理Store更新
```javascript
// src/renderer/src/stores/communication/mqttStore.js
// 监听来自主进程的状态更新
window.electronAPI.ipc.on('mqtt-status-update', (event, data) => {
  // 更新store状态
  this.status = data.status
  this.lastStatusChange = data.timestamp
  
  // 根据状态触发相应操作
  if (data.status === 'disconnected' || data.status === 'offline') {
    this.handleServerDisconnection()
  }
})

// 处理服务器断开连接
handleServerDisconnection() {
  console.log('[MQTT Store] 检测到服务器断开连接')
  
  // 可以在这里添加自动重连逻辑
  this.attemptReconnection()
}
```

### 4. 状态显示更新

#### UI状态映射
```javascript
// 状态显示逻辑
statusText: (state) => {
  switch (state.status) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    case 'disconnected': return '服务器掉线'
    case 'offline': return '服务器掉线'
    case 'error': return '连接错误'
    case 'reconnecting': return '重连中...'
    default: return '未知状态'
  }
}
```

## 🔧 实现步骤

### 步骤1：修改MQTT子进程
**文件**：`src/main/mqtt.js`
- 添加所有MQTT连接状态事件监听
- 通过IPC向主进程发送状态变化消息

### 步骤2：更新主进程IPC处理
**文件**：`src/main/index.js`
- 监听子进程的状态变化消息
- 转发状态更新到渲染进程

### 步骤3：修改前端状态管理
**文件**：`src/renderer/src/stores/communication/mqttStore.js`
- 监听来自主进程的状态更新
- 实时同步连接状态
- 添加自动重连逻辑

### 步骤4：更新UI显示
**文件**：`src/renderer/src/layout/AppSidebar.vue`、`AppTopbar.vue`
- 根据新的状态显示相应文本
- 区分服务器问题和设备问题

## 🎯 预期效果

### 正常流程
1. 上位机连接MQTT服务器 → 显示"已连接"
2. 持续监控连接状态 → 保持"已连接"
3. 接收设备数据 → 显示数据传输状态

### 服务器问题流程
1. MQTT服务器关闭 → mqtt.js触发`disconnect`事件
2. 子进程检测到断开 → 通过IPC通知主进程
3. 主进程转发状态 → 渲染进程更新状态
4. UI显示更新 → 显示"服务器掉线"
5. 自动重连机制 → 尝试重新连接

### 设备问题流程
1. 设备停止发送数据 → MQTT连接仍然保持
2. 上位机状态 → 仍显示"已连接"
3. 数据接收状态 → 显示无数据接收
4. 问题定位 → 确定为设备端问题

## 🔍 关键技术点

### 1. MQTT事件监听
- 利用mqtt.js内置的连接状态事件
- 确保能够及时感知服务器状态变化

### 2. IPC通信机制
- 子进程 → 主进程：状态变化通知
- 主进程 → 渲染进程：状态同步

### 3. 状态管理同步
- 确保前端状态与实际连接状态一致
- 避免状态延迟或不同步问题

### 4. 自动重连策略
- 检测到断开时自动尝试重连
- 合理的重连间隔和次数限制

## � 当前代码分析

### 问题根源分析

通过对现有代码的详细分析，发现了为什么无法检测到服务器掉线状态的根本原因：

#### 1. 子进程事件监听（✅ 已存在）
```javascript
// src/main/mqtt.js - 这些事件监听已经存在且正常工作
client.on('connect', () => {
  isConnected = true
  process.send({ type: 'mqtt-connected', data: { clientId: config.clientId, host: config.host } })
})

client.on('close', () => {
  if (isConnected) {
    isConnected = false
    process.send({ type: 'mqtt-disconnected', data: {} })  // ✅ 已发送断开消息
  }
})

client.on('offline', () => {
  process.send({ type: 'mqtt-offline', data: {} })  // ✅ 已发送离线消息
})

client.on('error', (error) => {
  isConnected = false
  process.send({ type: 'mqtt-error', data: { error: error.message } })  // ✅ 已发送错误消息
})
```

#### 2. 主进程事件处理（❌ 缺失关键部分）
```javascript
// src/main/index.js - 主进程没有转发状态变化事件
mqttTask.on('message', (message) => {
  // 只处理了数据消息和连接成功消息
  if (message.type === 'mqtt-connected') {
    // 没有转发到渲染进程 ❌
  }
  if (message.type === 'mqtt-disconnected') {
    // 完全没有处理 ❌
  }
  if (message.type === 'mqtt-offline') {
    // 完全没有处理 ❌
  }
  if (message.type === 'mqtt-error') {
    // 完全没有处理 ❌
  }
})
```

#### 3. 前端状态监听（❌ 完全缺失）
```javascript
// src/renderer/src/stores/communication/mqttStore.js
// 没有监听来自主进程的状态变化事件
// 状态只能通过手动调用connect()和disconnect()改变
```

### 状态变化流程分析

#### 当前流程（连接成功）
```
子进程: client.on('connect') → 发送 mqtt-connected
主进程: 接收消息 → 不转发
前端: 手动调用 setConnected() → 显示"已连接"
```

#### 当前流程（服务器关闭）
```
子进程: client.on('close') → 发送 mqtt-disconnected
主进程: 接收消息 → 不处理 ❌
前端: 没有收到通知 → 仍显示"已连接" ❌
```

#### 期望流程（服务器关闭）
```
子进程: client.on('close') → 发送 mqtt-disconnected
主进程: 接收消息 → 转发到渲染进程 ✅
前端: 监听状态变化 → 自动更新为"服务器掉线" ✅
```

### 解决方案确认

**是的，通过主进程转发消息并在前端监听状态变化事件即可完成需求！**

具体需要：
1. **主进程添加事件转发**：监听子进程的状态变化消息并转发到渲染进程
2. **前端添加状态监听**：监听来自主进程的状态变化事件并自动更新store状态
3. **状态映射优化**：根据不同的断开原因显示相应的状态文本

这个方案的优势：
- ✅ **最小改动**：利用现有的事件监听机制
- ✅ **实时性强**：mqtt.js事件触发即时响应
- ✅ **准确性高**：直接反映MQTT客户端的真实状态
- ✅ **维护简单**：不需要额外的定时检测或ping机制

## 📝 总结

通过分析发现，子进程已经在正确监听和发送MQTT状态变化事件，问题出在主进程没有转发这些事件到前端，前端也没有监听这些状态变化。解决方案非常明确：**补全事件转发和监听机制**即可实现MQTT连接状态的实时检测，确保上位机能够准确反映与MQTT服务器之间的真实连接状态。
