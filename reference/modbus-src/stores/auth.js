// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // 登录状态：0 = 未登录，1 = 管理员，2 = 访客
  const role = ref(0)
  // role = 1 时，代表管理员；role = 2 时，代表访客；0=未登录

  // 可选择把用户名也存下来
  const username = ref('')

  // 只读的辅助属性
  const isLoggedIn = computed(() => role.value !== 0)
  const isAdmin = computed(() => role.value === 1)
  const isGuest = computed(() => role.value === 2)

  function loginAsAdmin(user) {
    role.value = 1
    username.value = user
  }

  function loginAsGuest() {
    role.value = 2
    username.value = 'guest'
  }

  function logout() {
    role.value = 0
    username.value = ''
  }

  return {
    role,
    username,
    isLoggedIn,
    isAdmin,
    isGuest,
    loginAsAdmin,
    loginAsGuest,
    logout
  }
})
