# 故障显示页面内存泄露修复方案

## 问题分析

你的基于MQTT的上位机故障显示页面存在内存泄露问题，主要原因包括：

### 1. 重复的MQTT监听器注册
- 多个组件同时监听相同的MQTT频道
- 监听器注册和清理不完整
- 组件卸载时监听器未正确移除

### 2. 数据累积问题
- `rawFaultData` 全局Map不断累积数据
- 缺乏数据清理机制
- 频繁的数据转换和排序操作

### 3. 内存管理不当
- 缺乏内存监控和诊断工具
- 没有定期清理过期数据
- 大量临时对象创建

## 解决方案

### 1. MQTT监听器管理器 (`mqttListenerManager.ts`)

**功能：**
- 统一管理所有MQTT监听器
- 防止重复注册
- 引用计数机制
- 自动清理无引用的监听器

**使用方式：**
```typescript
import { useMQTTListener } from '../../composables/mqttListenerManager'

const { registerMultiple, unregisterMultiple } = useMQTTListener()

onMounted(() => {
  registerMultiple(FAULT_CHANNELS, onFaultMsg)
})

onBeforeUnmount(() => {
  unregisterMultiple(FAULT_CHANNELS)
})
```

### 2. 内存监控工具 (`memoryMonitor.ts`)

**功能：**
- 实时监控内存使用情况
- 内存快照和趋势分析
- 内存泄露检测
- 开发模式下的垃圾回收

**使用方式：**
```typescript
import { useMemoryMonitor } from '../../composables/memoryMonitor'

const { startMonitoring, takeSnapshot, analyzeMemoryGrowth } = useMemoryMonitor()

// 开始监控
startMonitoring(10000) // 每10秒监控一次

// 创建快照
takeSnapshot('关键节点')

// 分析内存增长
analyzeMemoryGrowth()
```

### 3. 优化故障数据处理 (`parseFault.ts`)

**改进：**
- 添加定期数据清理机制（24小时过期）
- 优化数据转换算法
- 及时清理空集群
- 减少不必要的对象创建

**关键特性：**
```typescript
// 定期清理过期数据
const MAX_FAULT_AGE = 24 * 60 * 60 * 1000 // 24小时
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5分钟清理一次

// 优化数据转换
const arr: (FaultRecord & { cluster: string })[] = []
for (const [cluster, faultMap] of rawFaultData.entries()) {
  for (const record of faultMap.values()) {
    arr.push({ ...record, cluster })
  }
}
```

### 4. 优化故障页面 (`Fault.vue`)

**改进：**
- 使用监听器管理器
- 添加内存监控
- 优化分页计算
- 完善生命周期管理

## 使用建议

### 1. 开发模式监控
在开发模式下，系统会自动：
- 启动内存监控（每10秒）
- 记录关键节点的内存快照
- 分析内存增长趋势
- 检测潜在的内存泄露

### 2. 生产模式优化
在生产模式下：
- 关闭详细的内存监控
- 保留数据清理机制
- 优化性能关键路径

### 3. 调试命令
在浏览器控制台中可以使用：
```javascript
// 查看监听器状态
window.mqttListenerManager.getStatus()

// 手动触发垃圾回收
window.memoryMonitor.forceGC()

// 分析内存增长
window.memoryMonitor.analyzeMemoryGrowth()
```

## 预期效果

实施这些修复后，你应该看到：

1. **内存使用稳定**：不再出现持续增长的内存使用
2. **监听器管理清晰**：避免重复监听和内存泄露
3. **数据清理及时**：过期数据自动清理
4. **性能提升**：减少不必要的计算和内存分配
5. **调试便利**：提供详细的内存监控和诊断信息

## 监控指标

关注以下指标来验证修复效果：

- 内存使用增长率 < 100KB/s
- 监听器引用计数正确
- 数据清理日志正常
- 页面切换时内存释放

如果仍然发现内存问题，可以使用内存监控工具进行进一步诊断。 