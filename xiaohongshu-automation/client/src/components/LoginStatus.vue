<template>
  <div class="login-status">
    <el-dropdown v-if="authStore.isLoggedIn" @command="handleCommand">
      <el-button type="primary" text>
        <el-icon><User /></el-icon>
        <span>{{ accountName }}</span>
        <el-icon class="el-icon--right"><arrow-down /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="profile">
            <el-icon><User /></el-icon>
            个人信息
          </el-dropdown-item>
          <el-dropdown-item command="logout" divided>
            <el-icon><SwitchButton /></el-icon>
            登出
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-button 
      v-else 
      type="primary" 
      @click="$router.push('/login')"
    >
      <el-icon><UserFilled /></el-icon>
      登录小红书
    </el-button>

    <!-- 账号信息弹窗 -->
    <el-dialog
      v-model="showProfile"
      title="账号信息"
      width="400px"
    >
      <div class="profile-info" v-if="authStore.accountInfo">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户名">
            {{ authStore.accountInfo.name || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="粉丝数">
            {{ authStore.accountInfo.fans || '0' }}
          </el-descriptions-item>
          <el-descriptions-item label="笔记数">
            {{ authStore.accountInfo.notes || '0' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="showProfile = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { User, UserFilled, SwitchButton, ArrowDown } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const showProfile = ref(false)

const accountName = computed(() => {
  return authStore.accountInfo?.name || '用户'
})

const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      showProfile.value = true
      break
    case 'logout':
      await handleLogout()
      break
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要登出吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await authStore.logout()
    ElMessage.success('已成功登出')
    router.push('/')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('登出失败')
    }
  }
}

onMounted(() => {
  authStore.checkLoginStatus()
})
</script>

<style scoped>
.login-status {
  display: flex;
  align-items: center;
}

.profile-info {
  padding: 10px 0;
}
</style>