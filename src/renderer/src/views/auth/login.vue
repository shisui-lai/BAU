<template>
  <div class="login-container">
    <!-- 页面级语言切换 -->
    <div class="page-lang-select-wrapper">
      <span class="lang-title">{{ t('login.language') }}:</span>
      <LangSelect />
    </div>
    
    <!-- 动态背景装饰 -->
    <div class="background-effects">
      <!-- 浮动粒子效果 -->
      <div class="floating-particles">
        <div class="particle particle-1"></div>
        <div class="particle particle-2"></div>
        <div class="particle particle-3"></div>
        <div class="particle particle-4"></div>
        <div class="particle particle-5"></div>
        <div class="particle particle-6"></div>
        <div class="particle particle-7"></div>
        <div class="particle particle-8"></div>
        <div class="particle particle-9"></div>
        <div class="particle particle-10"></div>
        <div class="particle particle-11"></div>
        <div class="particle particle-12"></div>
        <div class="particle particle-13"></div>
        <div class="particle particle-14"></div>
        <div class="particle particle-15"></div>
        <div class="particle particle-16"></div>
        <div class="particle particle-17"></div>
        <div class="particle particle-18"></div>
        <div class="particle particle-19"></div>
        <div class="particle particle-20"></div>
        <div class="particle particle-21"></div>
        <div class="particle particle-22"></div>
        <div class="particle particle-23"></div>
        <div class="particle particle-24"></div>
        <div class="particle particle-25"></div>
      </div>
    </div>
    
    <!-- 登录卡片容器 -->
    <div class="login-card">
      
      <!-- 系统Logo和标题 -->
      <div class="login-header">
        <div class="brand-container">
          <img src="../../../images/icon.ico" alt="RISEN BMS" class="brand-image" />
          <span class="brand-text">RISEN BMS</span>
        </div>
        <h2>{{ t('login.title') }}</h2>
      </div>

      <!-- 表单主体 -->
      <div class="login-body">
        <div class="login-field">
          <label for="username">
            <i class="pi pi-user"></i>
            {{ t('login.username') }}
          </label>
          <InputText
            v-model="username"
            id="username"
            :placeholder="t('login.usernamePlaceholder')"
            class="login-input"
            :class="{ 'p-invalid': errorMessage }"
          />
        </div>

        <div class="login-field">
          <label for="password">
            <i class="pi pi-lock"></i>
            {{ t('login.password') }}
          </label>
          <Password
            v-model="password"
            id="password"
            :placeholder="t('login.passwordPlaceholder')"
            toggleMask
            :feedback="false"
            class="login-input"
            :class="{ 'p-invalid': errorMessage }"
          />
        </div>

        <div class="remember-me">
          <Checkbox
            v-model="rememberMe"
            inputId="remember"
            binary
          />
          <label for="remember">{{ t('login.rememberMe') }}</label>
        </div>

        <div class="login-buttons">
          <Button
            :label="t('login.adminButton')"
            icon="pi pi-sign-in"
            class="login-btn primary"
            @click="onAdminLogin"
            :loading="isLoading"
          />
          <Button
            :label="t('login.guestButton')"
            icon="pi pi-user"
            class="login-btn secondary"
            @click="onGuestEnter"
            :loading="isLoading"
          />
        </div>

        <div v-if="errorMessage" class="login-error">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ errorMessage }}</span>
        </div>
      </div>

      <!-- 底部信息 -->
      <div class="login-footer">
        <p>© 2025 {{ t('login.company') }}</p>
        <p>{{ t('login.version') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useI18n } from 'vue-i18n'
import Checkbox from 'primevue/checkbox'
import LangSelect from '../../components/LangSelect.vue'

const { t } = useI18n()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false) // 加载状态
const rememberMe = ref(true) // 记住密码
const router = useRouter()
const authStore = useAuthStore()

// 管理员登录逻辑（静态校验）
const onAdminLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true
  
  const ok = username.value === 'admin' && password.value === 'admin'
  if (!ok) {
    errorMessage.value = t('login.error')
    isLoading.value = false
    return
  }

  authStore.loginAsAdmin(username.value)
  
  // 如果选择保存密码，保存账号和密码
  if (rememberMe.value) {
    localStorage.setItem('username', username.value)
    localStorage.setItem('password', password.value)
  } else {
    localStorage.removeItem('username')
    localStorage.removeItem('password')
  }
  
  // 等待导航完成
  await router.replace({ name: 'cellDataNative' })

  // 导航完成后重置loading状态
  isLoading.value = false
}

// 访客进入逻辑
const onGuestEnter = async () => {
  isLoading.value = true
  
  authStore.loginAsGuest()
  
  // 等待导航完成
  await router.replace({ name: 'cellDataNative' })

  
  // 导航完成后重置loading状态
  isLoading.value = false
}

// 组件挂载时的初始化
onMounted(() => {
  // 从 localStorage 获取保存的账号和密码
  const savedUsername = localStorage.getItem('username')
  const savedPassword = localStorage.getItem('password')

  if (savedUsername && savedPassword) {
    username.value = savedUsername
    password.value = savedPassword
    rememberMe.value = true
  }
  
  // 预加载AppLayout和cellDataNative页面，避免首次登录时的跳转卡顿
  // 触发一次懒加载解析（不挂载）
  import('@/layout/AppLayout.vue')
  import('@/views/Cluster/linux/cellDataNative.vue')
})
</script>

<style scoped>
/* 主容器 - 深色主题背景 */
.login-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--surface-ground, #1a1a1a);
  padding: 1rem;
  overflow: hidden;
}

/* 动态背景效果 */
.background-effects {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}


/* 浮动粒子效果 */
.floating-particles {
  position: absolute;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  background: rgba(0, 122, 217, 0.8);
  border-radius: 50%;
  animation: float 8s ease-in-out infinite;
  box-shadow: 0 0 25px rgba(0, 122, 217, 0.6);
  border: 1px solid rgba(0, 255, 150, 0.3);
}

.particle-1 {
  width: 4px;
  height: 4px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
  animation-duration: 6s;
}

.particle-2 {
  width: 6px;
  height: 6px;
  top: 60%;
  left: 20%;
  animation-delay: 1s;
  animation-duration: 8s;
}

.particle-3 {
  width: 3px;
  height: 3px;
  top: 40%;
  right: 15%;
  animation-delay: 2s;
  animation-duration: 7s;
}

.particle-4 {
  width: 5px;
  height: 5px;
  bottom: 30%;
  left: 30%;
  animation-delay: 3s;
  animation-duration: 9s;
}

.particle-5 {
  width: 4px;
  height: 4px;
  top: 80%;
  right: 25%;
  animation-delay: 4s;
  animation-duration: 6.5s;
}

.particle-6 {
  width: 3px;
  height: 3px;
  top: 10%;
  right: 40%;
  animation-delay: 5s;
  animation-duration: 7.5s;
}

.particle-7 {
  width: 5px;
  height: 5px;
  top: 30%;
  left: 5%;
  animation-delay: 1.5s;
  animation-duration: 6s;
}

.particle-8 {
  width: 4px;
  height: 4px;
  top: 70%;
  left: 15%;
  animation-delay: 2.5s;
  animation-duration: 8.5s;
}

.particle-9 {
  width: 6px;
  height: 6px;
  top: 15%;
  right: 30%;
  animation-delay: 3.5s;
  animation-duration: 7s;
}

.particle-10 {
  width: 3px;
  height: 3px;
  bottom: 20%;
  right: 10%;
  animation-delay: 4.5s;
  animation-duration: 9s;
}

.particle-11 {
  width: 4px;
  height: 4px;
  top: 50%;
  left: 8%;
  animation-delay: 0.5s;
  animation-duration: 6.5s;
}

.particle-12 {
  width: 5px;
  height: 5px;
  top: 25%;
  right: 5%;
  animation-delay: 1.8s;
  animation-duration: 8s;
}

.particle-13 {
  width: 3px;
  height: 3px;
  bottom: 40%;
  left: 25%;
  animation-delay: 3.2s;
  animation-duration: 7.2s;
}

.particle-14 {
  width: 4px;
  height: 4px;
  top: 85%;
  right: 35%;
  animation-delay: 4.8s;
  animation-duration: 6.8s;
}

.particle-15 {
  width: 6px;
  height: 6px;
  top: 35%;
  left: 40%;
  animation-delay: 2.2s;
  animation-duration: 8.8s;
}

.particle-16 {
  width: 4px;
  height: 4px;
  top: 5%;
  left: 15%;
  animation-delay: 0.8s;
  animation-duration: 7.2s;
}

.particle-17 {
  width: 5px;
  height: 5px;
  top: 55%;
  right: 5%;
  animation-delay: 1.3s;
  animation-duration: 8.5s;
}

.particle-18 {
  width: 3px;
  height: 3px;
  top: 12%;
  left: 60%;
  animation-delay: 2.8s;
  animation-duration: 6.8s;
}

.particle-19 {
  width: 6px;
  height: 6px;
  bottom: 15%;
  left: 45%;
  animation-delay: 3.7s;
  animation-duration: 9.2s;
}

.particle-20 {
  width: 4px;
  height: 4px;
  top: 75%;
  right: 40%;
  animation-delay: 1.9s;
  animation-duration: 7.6s;
}

.particle-21 {
  width: 5px;
  height: 5px;
  top: 45%;
  left: 5%;
  animation-delay: 4.2s;
  animation-duration: 8.1s;
}

.particle-22 {
  width: 3px;
  height: 3px;
  top: 65%;
  left: 70%;
  animation-delay: 0.6s;
  animation-duration: 6.9s;
}

.particle-23 {
  width: 4px;
  height: 4px;
  top: 25%;
  right: 25%;
  animation-delay: 3.1s;
  animation-duration: 7.8s;
}

.particle-24 {
  width: 6px;
  height: 6px;
  bottom: 5%;
  right: 15%;
  animation-delay: 2.5s;
  animation-duration: 8.9s;
}

.particle-25 {
  width: 5px;
  height: 5px;
  top: 85%;
  left: 25%;
  animation-delay: 1.7s;
  animation-duration: 7.4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) translateX(0px);
    opacity: 0.6;
  }
  25% {
    transform: translateY(-35px) translateX(20px);
    opacity: 0.9;
  }
  50% {
    transform: translateY(-20px) translateX(-10px);
    opacity: 1;
  }
  75% {
    transform: translateY(-45px) translateX(25px);
    opacity: 0.8;
  }
}


/* 登录卡片 - 与主题页面数据卡片样式一致 */
.login-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 400px;
  background: var(--surface-card, #2d3748);
  border: 1px solid var(--surface-border, #4a5568);
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  backdrop-filter: blur(10px);
}

/* Logo和标题区域 */
.login-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--surface-border, #4a5568);
}

.brand-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.brand-image {
  width: 32px;
  height: 32px;
  display: block;
  object-fit: contain;
}

.brand-text {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--text-color, #ffffff);
}

.login-header h2 {
  margin: 0;
  color: var(--text-color, #ffffff);
  font-size: 1.5rem;
  font-weight: 600;
}

/* 表单主体 */
.login-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 输入字段 */
.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-field label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-color, #ffffff);
  font-weight: 500;
  font-size: 0.9rem;
}

.login-field label i {
  color: var(--text-color-secondary, #a0aec0);
  font-size: 0.9rem;
}

/* 输入框样式 - 与主题保持一致 */
.login-input {
  width: 100%;
}

.login-input :deep(.p-inputtext) {
  width: 100%;
  height: 40px;
  border: 1px solid var(--surface-border, #4a5568);
  border-radius: 4px;
  padding: 0 0.75rem;
  font-size: 0.9rem;
  background: var(--surface-0, #1a202c);
  color: var(--text-color, #ffffff) !important;
  transition: border-color 0.2s;
}

.login-input :deep(.p-inputtext:focus) {
  border-color: var(--primary-color, #007ad9);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 122, 217, 0.2);
}

.login-input.p-invalid :deep(.p-inputtext) {
  border-color: var(--red-500, #e53e3e);
}

/* 密码输入框特殊样式 */
.login-input :deep(.p-password) {
  width: 100%;
}

.login-input :deep(.p-password .p-inputtext) {
  width: 100%;
  height: 40px;
  border: 1px solid var(--surface-border, #4a5568);
  border-radius: 4px;
  padding: 0 0.75rem;
  font-size: 0.9rem;
  background: var(--surface-0, #1a202c);
  color: var(--text-color, #ffffff) !important;
  transition: border-color 0.2s;
}

.login-input :deep(.p-password .p-inputtext:focus) {
  border-color: var(--primary-color, #007ad9);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 122, 217, 0.2);
}

.login-input :deep(.p-password .p-password-toggle-button) {
  right: 0.75rem;
  color: var(--text-color-secondary, #a0aec0);
}

/* 记住密码区域 */
.remember-me {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.remember-me label {
  color: var(--text-color, #ffffff);
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;
}

/* 按钮区域 */
.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

/* 按钮样式 - 与主题保持一致 */
.login-btn {
  height: 40px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.login-btn.primary {
  background: var(--primary-color, #007ad9);
  color: var(--primary-color-text, #ffffff);
  border-color: var(--primary-color, #007ad9);
}

.login-btn.primary:hover {
  background: var(--primary-600, #0056b3);
  border-color: var(--primary-600, #0056b3);
}

.login-btn.secondary {
  background: transparent;
  color: var(--text-color, #ffffff);
  border-color: var(--surface-border, #4a5568);
}

.login-btn.secondary:hover {
  background: var(--surface-hover, #4a5568);
  border-color: var(--surface-border, #4a5568);
}

.login-btn:active {
  transform: translateY(1px);
}

/* 加载状态 */
.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 错误提示 */
.login-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--red-50, rgba(229, 62, 62, 0.1));
  border: 1px solid var(--red-200, rgba(229, 62, 62, 0.3));
  border-radius: 4px;
  color: var(--red-500, #e53e3e);
  font-size: 0.85rem;
  font-weight: 500;
}

/* 页面级语言切换区域 */
.page-lang-select-wrapper {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-title {
  font-size: 14px;
  color: #a0aec0;
  white-space: nowrap;
  font-weight: 500;
}

/* 底部信息 */
.login-footer {
  text-align: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--surface-border, #4a5568);
}

.login-footer p {
  margin: 0.25rem 0;
  color: var(--text-color-secondary, #a0aec0);
  font-size: 0.75rem;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-card {
    margin: 0.5rem;
    padding: 1.5rem;
  }
  
  .brand-container {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .brand-text {
    font-size: 1.1rem;
  }
  
  .login-header h2 {
    font-size: 1.25rem;
  }
}
</style>


