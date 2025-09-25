<template>
  <div class="login-container">
    <!-- 手动构建一个卡片容器 -->
    <div class="login-card">
      <div class="lang-select-wrapper">
        <span class="lang-title">{{ t('login.language') }}</span>
        <langSelect />
      </div>
      <!-- 标题部分 -->
      <div class="login-header">
        <h2>{{ t('login.title') }}</h2>
      </div>

      <!-- 表单主体 -->
      <div class="login-body">
        <div class="login-field">
          <label for="username">{{ t('login.username') }}</label>
          <InputText
            v-model="username"
            id="username"
            :placeholder="t('login.usernamePlaceholder')"
            class="login-input"
          />
        </div>

        <div class="login-field">
          <label for="password">{{ t('login.password') }}</label>
          <Password
            v-model="password"
            id="password"
            :placeholder="t('login.passwordPlaceholder')"
            toggleMask
            :feedback="false"
            class="login-input"
          />
        </div>
        <!--        <div class="login-field">
          <div>
            <label for="rememberMe">
              <InputSwitch v-model="rememberMe" id="rememberMe" />
              {{ t('login.rememberMe') }}
            </label>
          </div>
        </div> -->
        <div class="login-buttons">
          <Button
            :label="t('login.adminButton')"
            icon="pi pi-sign-in"
            class="login-btn primary"
            @click="onAdminLogin"
          />
          <Button
            :label="t('login.guestButton')"
            icon="pi pi-user"
            class="login-btn secondary"
            @click="onGuestEnter"
          />
        </div>

        <div v-if="errorMessage" class="login-error">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ errorMessage }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import langSelect from './langSelect.vue'
import { useAuthStore } from '../../../../stores/auth.js'
import { useI18n } from 'vue-i18n'
const { locale, availableLocales, t } = useI18n()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const rememberMe = ref(true)
const router = useRouter()
const authStore = useAuthStore()
// 管理员登录逻辑（示例用静态校验）
const onAdminLogin = () => {
  errorMessage.value = ''
  if (username.value === 'admin' && password.value === 'admin') {
    authStore.loginAsAdmin(username.value)
    // 如果选择保存密码，保存账号和密码
    if (rememberMe.value) {
      localStorage.setItem('username', username.value)
      localStorage.setItem('password', password.value)
    } else {
      localStorage.removeItem('username')
      localStorage.removeItem('password')
    }
    router.replace({ name: 'clusterDataSummHome' })
  } else {
    errorMessage.value = t('login.error')
  }
}

// 游客进入逻辑
const onGuestEnter = () => {
  authStore.loginAsGuest()
  router.replace({ name: 'clusterDataSummHome' })
}
// 从 localStorage 获取保存的账号和密码
onMounted(() => {
  const savedUsername = localStorage.getItem('username')
  const savedPassword = localStorage.getItem('password')

  if (savedUsername && savedPassword) {
    username.value = savedUsername
    password.value = savedPassword
    rememberMe.value = true
  }
})
</script>

<style scoped>
/* 让整个页面背景更加柔和 */
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--surface-a); /* 根据主题可修改 */
  padding: 1rem;
}

/* Card 样式：固定宽度并使其在窄屏时自适应 */
.login-card {
  width: fit-content;
  min-width: 400px;
  max-width: 100%;
  border-radius: 8px; /* 圆角 */
}
.lang-select-wrapper {
  position: absolute;
  top: 1rem;
  right: 1.5rem;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-card, #fff);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 0.2rem 0.6rem;
  transition: box-shadow 0.2s;
}
.lang-title {
  color: var(--text-color-secondary, #888);
  letter-spacing: 0.02em;
}
.lang-select-wrapper:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
/* 卡片顶部标题居中 */
.login-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem 0;
}

.login-header h2 {
  margin: 0;
  color: var(--primary-color);
}

/* 卡片内部主体内容 */
.login-body {
  display: flex;
  flex-direction: column;
  padding: 1rem 1.5rem 2rem 1.5rem;
}

/* 每个输入域的间距 */
.login-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.login-field label {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  color: var(--text-color-secondary);
}

/* 让输入框占满可用宽度 */
.login-input :deep(.p-inputtext) {
  display: block;
  width: 100%;
  box-sizing: border-box;
}
/* 按钮区域：左右对齐、间距 */
.login-buttons {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
}

/* 给按钮一个统一的高度 */
.login-btn {
  flex: 1;
  min-width: 0; /* 让它在窄屏时也能缩小 */
  height: 2.75rem;
}

/* 错误提示样式 */
.login-error {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1rem;
  color: var(--error-color);
  font-size: 0.875rem;
}

.login-error i {
  margin-right: 0.5rem;
}
</style>
