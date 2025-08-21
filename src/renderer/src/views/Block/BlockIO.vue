<template>
  <div class="card">
    <div class="io-container">
      <!-- 统一的IO状态卡片 -->
      <Card class="io-card">
        <template #header>
          <div class="card-header">
            <i class="pi pi-plug card-icon"></i>
            <span class="card-title">堆IO状态</span>
          </div>
        </template>
        <template #content>
          <div class="card-content">
            <div v-if="!hasData" class="no-data">
              <i class="pi pi-info-circle"></i>
              <span>暂无数据</span>
            </div>
                         <div v-else class="io-scroll-container">
               <div class="io-items">
                <!-- 系统DI状态 -->
                <div class="io-section">
                  <div class="section-header">
                    <i class="pi pi-plug section-icon"></i>
                    <span class="section-title">系统DI输入状态</span>
                  </div>
                  <div class="section-items">
                    <div v-for="item in systemDI" :key="item.key" class="io-item">
                      <div class="io-info">
                        <span class="io-label">{{ item.label }}</span>
                        <span class="io-remark">{{ item.remark }}</span>
                      </div>
                      <div class="io-status-indicator">
                        <Tag 
                          :value="getIOStatusText(item.value)" 
                          :severity="getIOStatusSeverity(item.value)"
                          class="status-tag"
                        />
                        <div class="led-indicator" :class="getLEDClass(item.value)"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 系统DO状态 -->
                <div class="io-section">
                  <div class="section-header">
                    <span class="section-title">系统DO输出状态</span>
                  </div>
                  <div class="section-items">
                    <div v-for="item in systemDO" :key="item.key" class="io-item">
                      <div class="io-info">
                        <span class="io-label">{{ item.label }}</span>
                        <span class="io-remark">{{ item.remark }}</span>
                      </div>
                      <div class="io-status-indicator">
                        <Tag 
                          :value="getIOStatusText(item.value)" 
                          :severity="getIOStatusSeverity(item.value)"
                          class="status-tag"
                        />
                        <div class="led-indicator" :class="getLEDClass(item.value)"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- I/O控制板DI状态 -->
                <div class="io-section">
                  <div class="section-header">
                    <i class="pi pi-microchip section-icon"></i>
                    <span class="section-title">I/O控制板-DI状态</span>
                  </div>
                  <div class="section-items">
                    <div v-for="item in ioControlDI" :key="item.key" class="io-item">
                      <div class="io-info">
                        <span class="io-label">{{ item.label }}</span>
                        <span class="io-remark">{{ item.remark }}</span>
                      </div>
                      <div class="io-status-indicator">
                        <Tag 
                          :value="getIOStatusText(item.value)" 
                          :severity="getIOStatusSeverity(item.value)"
                          class="status-tag"
                        />
                        <div class="led-indicator" :class="getLEDClass(item.value)"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- I/O控制板DO状态 -->
                <div class="io-section">
                  <div class="section-header">
                    <span class="section-title">I/O控制板-DO状态</span>
                  </div>
                  <div class="section-items">
                    <div v-for="item in ioControlDO" :key="item.key" class="io-item">
                      <div class="io-info">
                        <span class="io-label">{{ item.label }}</span>
                        <span class="io-remark">{{ item.remark }}</span>
                      </div>
                      <div class="io-status-indicator">
                        <Tag 
                          :value="getIOStatusText(item.value)" 
                          :severity="getIOStatusSeverity(item.value)"
                          class="status-tag"
                        />
                        <div class="led-indicator" :class="getLEDClass(item.value)"></div>
                      </div>
                    </div>
                  </div>
                                 </div>
               </div>
             </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { useBlockIO } from '@/composables/core/data-processing/block/useBlockIO'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import { computed } from 'vue'

const {
  systemDI,
  systemDO,
  ioControlDI,
  ioControlDO,
  getIOStatusText,
  getIOStatusSeverity
} = useBlockIO()

// 添加调试日志
// console.log('[BlockIO.vue] 组件初始化，systemDI:', systemDI.value)
// console.log('[BlockIO.vue] ioControlDI:', ioControlDI.value)
// console.log('[BlockIO.vue] ioControlDO:', ioControlDO.value)

// 检查是否有数据
const hasData = computed(() => {
  return systemDI.value.length > 0 || systemDO.value.length > 0 || 
         ioControlDI.value.length > 0 || ioControlDO.value.length > 0
})

// 获取LED指示器样式类
const getLEDClass = (value) => {
  if (value === 1 || value === true) return 'led-active'
  if (value === 0 || value === false) return 'led-inactive'
  return 'led-unknown'
}
</script>

<style lang="scss" scoped>
.card {
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 1rem;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.io-container {
  flex: 1;
  height: 100%;
}

.io-card {
  border: 1px solid #e3f2fd;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.08);
  transition: all 0.3s ease;
  height: 100%;
  overflow: hidden;
  

  
  :deep(.p-card-header) {
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    color: #ffffff;
    border-radius: 12px 12px 0 0;
    padding: 1.25rem 1.5rem;
    border-bottom: 2px solid #0d47a1;
    position: relative;
  }
  
  :deep(.p-card-content) {
    padding: 1rem;
    height: 100%;
    background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
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
  height: 100%;
  min-height: 0;
  
  .no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
    gap: 0.5rem;
    
    i {
      font-size: 2rem;
      color: #ccc;
    }
    
    span {
      font-size: 1rem;
    }
  }
  
  .io-scroll-container {
    height: calc(100vh - 200px);
    overflow-y: auto;
    
    /* 自定义滚动条样式 - 参考配置参数页面 */
    &::-webkit-scrollbar {
      width: 8px;
    }
    
    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
      /* 强制设置滚动条高度为固定值 */
      height: 30px !important;
      min-height: 30px !important;
      max-height: 30px !important;
    }
    
    &::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
    
    /* Firefox 滚动条样式 */
    scrollbar-width: thin;
    scrollbar-color: #c1c1c1 #f1f1f1;
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
    background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    border-radius: 8px;
    margin-bottom: 0.75rem;
    border-left: 4px solid #1976d2;
    
    .section-icon {
      font-size: 1.1rem;
      color: #1976d2;
    }
    
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: #333;
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
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: white;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #1976d2;
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
  }
  
  .io-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    
    .io-label {
      font-weight: 600;
      color: #333;
      font-size: 0.9rem;
    }
    
    .io-remark {
      font-size: 0.75rem;
      color: #666;
      font-style: italic;
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
      border: 2px solid #ddd;
      transition: all 0.3s ease;
      
      &.led-active {
        background: #4caf50;
        border-color: #4caf50;
        box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
      }
      
      &.led-inactive {
        background: #9e9e9e;
        border-color: #9e9e9e;
      }
      
      &.led-unknown {
        background: #ff9800;
        border-color: #ff9800;
        box-shadow: 0 0 8px rgba(255, 152, 0, 0.5);
      }
    }
  }
}
</style> 