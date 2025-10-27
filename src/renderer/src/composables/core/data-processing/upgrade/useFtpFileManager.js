// FTP文件管理功能
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

/**
 * FTP文件管理功能
 * 提供文件上传检测、文件列表管理、文件验证等功能
 */
export function useFtpFileManager() {
  const toast = useToast()
  const { t } = useI18n()
  
  // 文件列表状态
  const files = ref([])
  const isLoading = ref(false)
  const recentUploadedFileNames = ref(new Set()) // 跟踪最近通过FTP上传的文件
  
  // 计算属性
  const uploadedFiles = computed(() => 
    files.value.filter(file => file.fileName)
  )
  
  const validFiles = computed(() => 
    files.value.filter(file => file.isValid)
  )
  
  const invalidFiles = computed(() =>
    files.value.filter(file => !file.isValid)
  )

  const recentUploadedFiles = computed(() =>
    files.value.filter(file => recentUploadedFileNames.value.has(file.fileName))
  )
  
  const totalSize = computed(() => 
    files.value.reduce((sum, file) => sum + (file.size || 0), 0)
  )

  const totalSizeFormatted = computed(() => {
    const bytes = totalSize.value
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  })

  //  监听FTP文件事件
  const setupFileEventListeners = () => {
    // 预清理，避免重复绑定
    window.electron.ipcRenderer.removeAllListeners?.('ftp-file-event')
    window.electron.ipcRenderer.on('ftp-file-event', handleFileEvent)
  }

  //  处理文件事件
  const handleFileEvent = (_, eventData) => {
    const { type, data } = eventData
    
    console.log('[FtpFileManager] 收到文件事件:', type, data)
    
    switch (type) {
      case 'file-uploaded':
        handleFileUploaded(data)
        break
      case 'file-downloaded':
        handleFileDownloaded(data)
        break
      case 'file-deleted':
        handleFileDeleted(data)
        break
      case 'file-renamed':
        handleFileRenamed(data)
        break
      case 'upload-failed':
        handleUploadFailed(data)
        break
      case 'file-ready-for-device':
        handleFileReadyForDevice(data)
        break
    }
  }

  // 🔥 处理文件上传成功
  const handleFileUploaded = (fileInfo) => {
    console.log('[FtpFileManager] 文件上传成功:', fileInfo)

    // 标记为最近上传的文件
    recentUploadedFileNames.value.add(fileInfo.fileName)

    // 更新文件列表
    const existingIndex = files.value.findIndex(f => f.fileName === fileInfo.fileName)
    if (existingIndex >= 0) {
      files.value[existingIndex] = { ...fileInfo, isRecentUpload: true }
    } else {
      files.value.push({ ...fileInfo, isRecentUpload: true })
    }

    // 显示增强的上传成功通知
    toast.add({
      severity: fileInfo.isValid ? 'success' : 'warn',
      summary: t('toast.deviceUpgrade.ftpFileUploadSuccess'),
      detail: t('toast.deviceUpgrade.ftpFileUploadSuccessDetail', { 
        fileName: fileInfo.fileName, 
        size: fileInfo.sizeFormatted, 
        status: fileInfo.isValid ? t('toast.deviceUpgrade.ftpFileUploadSuccessValid') : t('toast.deviceUpgrade.ftpFileUploadSuccessInvalid')
      }),
      life: 8000
    })

    // 如果文件有效，额外显示设备可用性确认
    if (fileInfo.isValid) {
      setTimeout(() => {
        toast.add({
          severity: 'info',
          summary: t('toast.deviceUpgrade.deviceUpgradeReady'),
          detail: t('toast.deviceUpgrade.deviceUpgradeReadyDetail', { fileName: fileInfo.fileName }),
          life: 6000
        })
      }, 1000)
    }
  }

  // 🔥 处理文件下载
  const handleFileDownloaded = (data) => {
    console.log('[FtpFileManager] 文件下载:', data.fileName)
    
    toast.add({
      severity: 'info',
      summary: t('toast.deviceUpgrade.fileDownload'),
      detail: data.fileName,
      life: 3000
    })
  }

  // 🔥 处理文件删除
  const handleFileDeleted = (data) => {
    console.log('[FtpFileManager] 文件删除:', data.fileName)
    
    files.value = files.value.filter(f => f.fileName !== data.fileName)
    
    toast.add({
      severity: 'info',
      summary: '文件已删除',
      detail: data.fileName,
      life: 3000
    })
  }

  // 🔥 处理文件重命名
  const handleFileRenamed = (data) => {
    console.log('[FtpFileManager] 文件重命名:', data.fileName)
    
    // 刷新文件列表以获取最新状态
    refreshFileList()
    
    toast.add({
      severity: 'info',
      summary: '文件已重命名',
      detail: data.fileName,
      life: 3000
    })
  }

  // 🔥 处理上传失败
  const handleUploadFailed = (data) => {
    console.error('[FtpFileManager] 文件上传失败:', data)
    
    toast.add({
      severity: 'error',
      summary: '文件上传失败',
      detail: `${data.fileName}: ${data.error}`,
      life: 6000
    })
  }

  // 🔥 获取文件列表
  const refreshFileList = async () => {
    try {
      isLoading.value = true
      const result = await window.electron.ipcRenderer.invoke('ftp-get-files')
      
      if (result.success) {
        // 标记预存文件（非最近上传）
        files.value = result.files.map(file => ({
          ...file,
          isRecentUpload: recentUploadedFileNames.value.has(file.fileName),
          source: recentUploadedFileNames.value.has(file.fileName) ? 'FTP上传' : '预存文件'
        }))
        console.log('[FtpFileManager] 文件列表刷新成功:', result.files.length, '个文件')
      } else {
        console.error('[FtpFileManager] 获取文件列表失败:', result.message)
        toast.add({
          severity: 'error',
          summary: '获取文件列表失败',
          detail: result.message,
          life: 5000
        })
      }
    } catch (error) {
      console.error('[FtpFileManager] 获取文件列表异常:', error)
      toast.add({
        severity: 'error',
        summary: '获取文件列表失败',
        detail: error.message,
        life: 5000
      })
    } finally {
      isLoading.value = false
    }
  }

  // 🔥 删除文件
  const deleteFile = async (fileName) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('ftp-delete-file', fileName)
      
      if (!result.success) {
        toast.add({
          severity: 'error',
          summary: '删除文件失败',
          detail: result.message,
          life: 5000
        })
      }
      // 成功的话，文件删除事件会自动处理UI更新
    } catch (error) {
      console.error('[FtpFileManager] 删除文件异常:', error)
      toast.add({
        severity: 'error',
        summary: '删除文件失败',
        detail: error.message,
        life: 5000
      })
    }
  }

  // 🔥 验证文件
  const validateFile = async (fileName) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('ftp-validate-file', fileName)
      
      if (result.success) {
        // 更新文件列表中的验证状态
        const fileIndex = files.value.findIndex(f => f.fileName === fileName)
        if (fileIndex >= 0) {
          files.value[fileIndex] = { ...files.value[fileIndex], ...result.fileInfo }
        }
        
        toast.add({
          severity: result.isValid ? 'success' : 'warn',
          summary: '文件验证完成',
          detail: result.message,
          life: 4000
        })
        
        return result.isValid
      } else {
        toast.add({
          severity: 'error',
          summary: '文件验证失败',
          detail: result.message,
          life: 5000
        })
        return false
      }
    } catch (error) {
      console.error('[FtpFileManager] 文件验证异常:', error)
      toast.add({
        severity: 'error',
        summary: '文件验证失败',
        detail: error.message,
        life: 5000
      })
      return false
    }
  }

  // 🔥 获取文件信息
  const getFileInfo = (fileName) => {
    return files.value.find(f => f.fileName === fileName)
  }

  // 🔥 检查文件是否存在
  const fileExists = (fileName) => {
    return files.value.some(f => f.fileName === fileName)
  }

  // 🔥 处理文件就绪事件（设备可下载）
  const handleFileReadyForDevice = (eventData) => {
    console.log('[FtpFileManager] 文件就绪，设备可下载:', eventData)

    toast.add({
      severity: 'success',
          summary: t('toast.deviceUpgrade.deviceUpgradeReady'),
          detail: eventData.message,
      life: 6000
    })
  }

  // 清理事件监听
  const cleanup = () => {
    window.electron.ipcRenderer.removeAllListeners('ftp-file-event')
  }

  return {
    // 状态
    files,
    isLoading,

    // 计算属性
    uploadedFiles,
    validFiles,
    invalidFiles,
    recentUploadedFiles,
    totalSize,
    totalSizeFormatted,

    // 方法
    setupFileEventListeners,
    refreshFileList,
    deleteFile,
    validateFile,
    getFileInfo,
    fileExists,
    cleanup
  }
}
