<template>
  <div class="about-container">
    <!-- <div class="about-header">
      <h2 class="about-title">{{ t('about.title') || '关于本软件' }}</h2>
    </div> -->
    <div class="about-content">
      <div class="about-row">
        <span class="about-label">{{ t('about.version') }}：</span>
        <span class="about-value version">v{{ version }}</span>
      </div>
      <div class="about-row">
        <span class="about-label">{{ t('about.companyLabel') }}：</span>
        <span class="about-value company">{{ t('about.company') }}</span>
      </div>
      <div class="about-row">
        <span class="about-label">{{ t('about.addressLabel') }}：</span>
        <span class="about-value address">{{ t('about.addressName') }}</span>
      </div>
      <div class="about-row">
        <span class="about-label">{{ t('about.website') }}：</span>
        <a :href="companyUrl" target="_blank" class="about-link">{{ companyUrl }}</a>
      </div>
      <div class="about-row">
        <span class="about-label">{{ t('about.phone') }}：</span>
        <span class="about-value phone">{{ phone }}</span>
      </div>
      <div class="about-row">
        <span class="about-label">{{ t('about.Email') }}：</span>
        <span class="about-value email">{{ Email }}</span>
      </div>
    </div>
    <!-- <div class="about-footer">
      <button class="about-btn" @click="closeDialog">{{ t('about.close') || '关闭' }}</button>
    </div> -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const version = ref('')
const companyUrl = 'https://risenstorage.com/'
const phone = '+86 400-101-8585'
const Email = 'essmkt@risenstorage.com'
function closeDialog() {
  // 让父组件关闭Dialog
  // 可通过emit或v-model控制弹窗显示
  // 这里留空，按实际集成方式补充
}

onMounted(async () => {
  const v = await window.electron.ipcRenderer.invoke('get-app-version')
  version.value = v
})
</script>

<style scoped>
.about-container {
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  min-width: 350px;
  max-width: 430px;
  margin: 0 auto;
  border-radius: 22px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.3s;
}
.about-header {
  text-align: center;
  margin-bottom: 2.1rem;
}
.about-logo {
  width: 68px;
  height: 68px;
  margin-bottom: 0.9rem;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 255, 255, 0.13);
  background: #fff1;
  border: 1.5px solid #00eaff44;
}
.about-title {
  font-size: 2.1rem;
  font-weight: 800;
  margin: 0.2em 0 0.5em 0;
  color: #00eaff;
  letter-spacing: 1.5px;
  text-shadow: 0 2px 8px #00eaff33;
}
.about-content {
  margin-bottom: 1.7rem;
}
.about-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  font-size: 1.18rem;
  line-height: 2.1;
}
.about-label {
  font-weight: 700;
  min-width: 100px;
  color: #00eaff;
  flex-shrink: 0;
  letter-spacing: 0.5px;
  font-size: 1.18rem;
}
.about-value {
  color: #e0e6ed;
  word-break: break-all;
  margin-left: 0.7em;
  font-weight: 600;
  letter-spacing: 0.2px;
  font-size: 1.18rem;
}
.about-value.version {
  color: #00ffc6;
}
.about-value.company {
  color: #00eaff;
}
.about-value.address {
  color: #7cf6ff;
}
.about-value.phone {
  color: #ffb300;
}
.about-value.email {
  color: #ff5eae;
}
.about-link {
  color: #00eaff;
  word-break: break-all;
  margin-left: 0.7em;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
  position: relative;
  font-size: 1.18rem;
}
.about-link::after {
  content: '';
  display: block;
  width: 0%;
  height: 2px;
  background: linear-gradient(90deg, #00eaff, #00ffc6);
  transition: width 0.3s;
  position: absolute;
  left: 0;
  bottom: -2px;
}
.about-link:hover {
  color: #00ffc6;
}
.about-link:hover::after {
  width: 100%;
}
.about-footer {
  text-align: center;
  margin-top: 2.1rem;
}
.about-btn {
  background: linear-gradient(90deg, #00eaff 0%, #00ffc6 100%);
  color: #232a34;
  border: none;
  border-radius: 8px;
  padding: 0.7em 2.5em;
  font-size: 1.22rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px #00eaff33;
  transition:
    background 0.2s,
    color 0.2s,
    box-shadow 0.2s;
  outline: none;
}
.about-btn:hover {
  background: linear-gradient(90deg, #00ffc6 0%, #00eaff 100%);
  color: #232a34;
  box-shadow: 0 4px 16px #00ffc633;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .about-container {
    background: linear-gradient(135deg, #181e26 0%, #232a34 100%);
    border-color: #00eaff33;
  }
  .about-title {
    color: #00eaff;
  }
  .about-label {
    color: #00eaff;
  }
  .about-value {
    color: #e0e6ed;
  }
  .about-link {
    color: #00eaff;
  }
}
</style>
