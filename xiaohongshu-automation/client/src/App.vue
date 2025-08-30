<template>
  <div id="app">
    <el-container class="layout-container">
      <!-- 头部导航 -->
      <el-header class="header">
        <div class="header-content">
          <div class="logo">
            <el-icon><Platform /></el-icon>
            <span>小红书自动化发帖系统</span>
          </div>
          <div class="header-actions">
            <el-switch
              v-model="isDark"
              @change="toggleTheme"
              :active-icon="Moon"
              :inactive-icon="Sunny"
              active-text="深色模式"
              inactive-text="浅色模式"
            />
            <LoginStatus />
          </div>
        </div>
      </el-header>

      <!-- 主体内容 -->
      <el-main class="main-content">
        <router-view />
      </el-main>

      <!-- 底部 -->
      <el-footer class="footer">
        <div class="footer-content">
          <span>&copy; 2024 小红书自动化发帖系统 - 基于AI和反检测技术</span>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Platform, Moon, Sunny } from '@element-plus/icons-vue'
import LoginStatus from './components/LoginStatus.vue'

const isDark = ref(false)

// 切换主题
const toggleTheme = (value) => {
  document.documentElement.classList.toggle('dark', value)
  localStorage.setItem('theme', value ? 'dark' : 'light')
}

// 初始化主题
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  padding: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: var(--el-color-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.main-content {
  background: var(--el-bg-color-page);
  min-height: calc(100vh - 120px);
}

.footer {
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color);
  padding: 0;
  height: 40px;
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>

<style>
/* 全局样式 */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

#app {
  height: 100vh;
}

/* 深色模式样式 */
html.dark {
  color-scheme: dark;
}
</style>