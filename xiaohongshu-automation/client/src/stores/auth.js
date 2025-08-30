import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../utils/api'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const accountInfo = ref(null)
  const loading = ref(false)

  // 检查登录状态
  const checkLoginStatus = async () => {
    try {
      loading.value = true
      const response = await api.get('/automation/status')
      isLoggedIn.value = response.data.isLoggedIn
      accountInfo.value = response.data.accountInfo
    } catch (error) {
      console.error('检查登录状态失败:', error)
      isLoggedIn.value = false
      accountInfo.value = null
    } finally {
      loading.value = false
    }
  }

  // 登录
  const login = async (phone, password) => {
    try {
      loading.value = true
      const response = await api.post('/automation/login', {
        phone,
        password
      })
      
      if (response.data.success) {
        await checkLoginStatus()
        return { success: true, message: response.data.message }
      } else {
        return { success: false, error: response.data.error }
      }
    } catch (error) {
      console.error('登录失败:', error)
      return { 
        success: false, 
        error: error.response?.data?.error || '登录失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 登出
  const logout = async () => {
    try {
      await api.post('/automation/close')
      isLoggedIn.value = false
      accountInfo.value = null
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  return {
    isLoggedIn,
    accountInfo,
    loading,
    checkLoginStatus,
    login,
    logout
  }
})