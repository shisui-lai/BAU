<template>
  <div class="ftp-file-manager">
    <div class="content-card">
      <h3>FTP文件状态</h3>
      <div class="card-content">
        <!-- FTP服务器未运行时的提示 -->
        <div v-if="!ftpServerRunning" class="text-center p-4 border-2 border-dashed border-gray-300 rounded">
          <i class="pi pi-info-circle text-2xl text-gray-400 mb-2"></i>
          <p class="text-gray-500 mb-0">请先启动FTP服务器</p>
        </div>
        
        <!-- FTP服务器运行时的文件状态 -->
        <div v-else>
          <!-- 选择的升级文件状态 -->
          <div class="mb-3 p-3 border-1 border-round" :class="selectedFileStatus.exists ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'">
            <div class="flex align-items-center gap-2 mb-2">
              <i :class="selectedFileStatus.exists ? 'pi pi-check-circle text-green-600' : 'pi pi-exclamation-triangle text-orange-600'"></i>
              <span class="font-semibold text-sm">选择的升级文件状态</span>
            </div>
            <p class="text-sm mb-0" :class="selectedFileStatus.exists ? 'text-green-700' : 'text-orange-700'">
              {{ selectedFileStatus.message }}
            </p>
            <div v-if="selectedFileStatus.exists && selectedFileStatus.fileInfo" class="mt-2">
              <Tag
                :value="selectedFileStatus.isValid ? '文件有效' : '文件无效'"
                :severity="selectedFileStatus.isValid ? 'success' : 'warning'"
                class="text-xs"
              />
            </div>
          </div>

          <div class="flex justify-content-between align-items-center mb-3">
            <div class="flex flex-column gap-1">
              <span class="text-sm">可用文件: {{ uploadedFiles.length }} 个</span>
              <span class="text-sm">有效文件: {{ validFiles.length }} 个</span>
              <span class="text-sm">新上传: {{ recentUploadedFiles.length }} 个</span>
              <span class="text-sm">总大小: {{ totalSizeFormatted }}</span>
            </div>
            <Button
              label="刷新"
              icon="pi pi-refresh"
              size="small"
              @click="refreshFileList"
              :loading="isLoadingFiles"
            />
          </div>
          
          <DataTable 
            :value="uploadedFiles" 
            size="small" 
            class="mt-2"
            :emptyMessage="uploadedFiles.length === 0 ? '暂无上传文件' : ''"
            scrollable
            scrollHeight="400px"
          >
            <Column field="fileName" header="文件名">
              <template #body="{ data }">
                <div class="flex align-items-center gap-2">
                  <span class="font-medium text-sm">{{ data.fileName }}</span>
                  <Tag
                    v-if="data.isRecentUpload"
                    value="新上传"
                    severity="info"
                    class="text-xs"
                  />
                </div>
              </template>
            </Column>
            <Column field="sizeFormatted" header="大小" style="width: 80px">
              <template #body="{ data }">
                <span class="text-xs">{{ data.sizeFormatted }}</span>
              </template>
            </Column>
            <Column field="source" header="来源" style="width: 80px">
              <template #body="{ data }">
                <Tag
                  :value="data.source || '预存文件'"
                  :severity="data.isRecentUpload ? 'info' : 'secondary'"
                  class="text-xs"
                />
              </template>
            </Column>
            <Column field="isValid" header="状态" style="width: 60px">
              <template #body="{ data }">
                <Tag 
                  :value="data.isValid ? '有效' : '无效'" 
                  :severity="data.isValid ? 'success' : 'warning'"
                  class="text-xs"
                />
              </template>
            </Column>
            <Column header="操作" style="width: 80px">
              <template #body="{ data }">
                <div class="flex gap-1">
                  <Button 
                    icon="pi pi-check" 
                    size="small" 
                    severity="info"
                    v-tooltip="'验证文件'"
                    @click="validateFile(data.fileName)"
                  />
                  <Button 
                    icon="pi pi-trash" 
                    size="small" 
                    severity="danger" 
                    v-tooltip="'删除文件'"
                    @click="confirmDeleteFile(data.fileName)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useFtpFileManager } from '@/composables/core/data-processing/upgrade/useFtpFileManager'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'

// Props
const props = defineProps({
  ftpServerRunning: {
    type: Boolean,
    default: false
  },
  selectedUpgradeFile: {
    type: String,
    default: ''
  }
})

const toast = useToast()
const confirm = useConfirm()

// 使用FTP文件管理功能
const {
  uploadedFiles,
  validFiles,
  recentUploadedFiles,
  totalSizeFormatted,
  isLoading: isLoadingFiles,
  setupFileEventListeners,
  refreshFileList,
  deleteFile,
  validateFile,
  cleanup
} = useFtpFileManager()

// 文件管理相关方法
const confirmDeleteFile = (fileName) => {
  confirm.require({
    message: `确定要删除文件 "${fileName}" 吗？`,
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: '取消',
    acceptLabel: '删除',
    accept: () => {
      deleteFile(fileName)
    }
  })
}

// 生命周期
onMounted(() => {
  setupFileEventListeners()
  if (props.ftpServerRunning) {
    refreshFileList()
  }
})

onUnmounted(() => {
  cleanup()
})

// 监听FTP服务器状态变化
const ftpServerRunning = computed(() => props.ftpServerRunning)

// 检查选择的升级文件是否在FTP服务器上
const selectedFileStatus = computed(() => {
  if (!props.selectedUpgradeFile) {
    return { exists: false, message: '未选择升级文件' }
  }

  const fileName = props.selectedUpgradeFile.split('\\').pop().split('/').pop() // 获取文件名
  const ftpFile = uploadedFiles.value.find(file => file.fileName === fileName)

  if (!ftpFile) {
    return {
      exists: false,
      message: `文件 "${fileName}" 未上传到FTP服务器`,
      fileName
    }
  }

  return {
    exists: true,
    message: `文件 "${fileName}" 已上传 (${ftpFile.sizeFormatted})`,
    fileName,
    isValid: ftpFile.isValid,
    fileInfo: ftpFile
  }
})
</script>

<style scoped>
.ftp-file-manager {
  height: 100%;
}
</style>
