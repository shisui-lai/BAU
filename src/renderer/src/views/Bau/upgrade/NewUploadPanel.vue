<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

const { t } = useI18n()

const isDragging = ref(false)
const selectedFileName = ref('')

const fileInput = ref(null)

function onDragOver(e) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave(e) {
  e.preventDefault()
  isDragging.value = false
}

function onDrop(e) {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    selectedFileName.value = files[0].name
  }
}

function openFilePicker() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) {
    selectedFileName.value = file.name
  }
  e.target.value = ''
}
</script>

<template>
  <div class="upload-panel">
    <div class="upload-header">
      <div class="left">
        <span class="title">{{ t('deviceUpgrade.sections.fileUpload', '文件上传') }}</span>
        <span v-if="selectedFileName" class="file-tag">{{ selectedFileName }}</span>
      </div>
      <div class="right">
        <Button :label="t('deviceUpgrade.buttons.selectFile', '选择文件')" size="small" @click="openFilePicker" />
        <Button :label="t('deviceUpgrade.buttons.upload', '上传')" size="small" severity="primary" disabled />
      </div>
    </div>

    <div
      class="dropzone"
      :class="{ dragging: isDragging }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="openFilePicker"
      role="button"
      tabindex="0"
    >
      <div class="dz-content">
        <i class="pi pi-upload dz-icon"></i>
        <div class="dz-text">
          <span>{{ t('deviceUpgrade.messages.dragOrClickToSelect', '将文件拖拽到此处，或点击上方“选择文件”') }}</span>
        </div>
      </div>
    </div>

    <input ref="fileInput" type="file" class="hidden-file-input" @change="onFileChange" />
  </div>
  
</template>

<style scoped>
.upload-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.upload-header .title {
  font-weight: 600;
  color: var(--text-color);
}

.upload-header .left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-tag {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  color: var(--text-color);
}

.dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  border: 1px dashed var(--surface-border);
  border-radius: 8px;
  background: var(--surface-card);
  cursor: pointer;
  transition: all .2s ease;
}

.dropzone.dragging {
  border-color: var(--primary-color);
  background: var(--surface-hover);
  transform: translateZ(0);
}

.dz-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.dz-icon {
  font-size: 32px;
  color: var(--primary-color);
}

.dz-text span {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.hidden-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  border: 0;
}

@media (max-width: 768px) {
  .dropzone { height: 140px; }
  .dz-icon { font-size: 28px; }
}
</style>
