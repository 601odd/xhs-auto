<template>
  <div class="home">
    <!-- 欢迎横幅 -->
    <el-card class="welcome-card">
      <div class="welcome-content">
        <div class="welcome-text">
          <h1>🌟 小红书自动化发帖系统</h1>
          <p>基于AI智能生成和反检测技术，轻松实现小红书内推信息自动化发布</p>
          <div class="features">
            <el-tag type="success" effect="light">AI内容生成</el-tag>
            <el-tag type="primary" effect="light">反检测机制</el-tag>
            <el-tag type="warning" effect="light">定时发布</el-tag>
            <el-tag type="info" effect="light">多样化内容</el-tag>
          </div>
        </div>
        <div class="welcome-actions">
          <el-button-group>
            <el-button type="primary" size="large" @click="$router.push('/login')" v-if="!authStore.isLoggedIn">
              <el-icon><UserFilled /></el-icon>
              开始使用
            </el-button>
            <el-button type="success" size="large" @click="$router.push('/auto-publish')" v-else>
              <el-icon><Promotion /></el-icon>
              一键发布
            </el-button>
            <el-button size="large" @click="$router.push('/content-generator')">
              <el-icon><Magic /></el-icon>
              内容生成
            </el-button>
          </el-button-group>
        </div>
      </div>
    </el-card>

    <!-- 功能卡片网格 -->
    <div class="feature-grid">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="feature in features" :key="feature.name">
          <el-card class="feature-card" shadow="hover" @click="handleFeatureClick(feature)">
            <div class="feature-content">
              <div class="feature-icon">
                <el-icon :size="40"><component :is="feature.icon" /></el-icon>
              </div>
              <h3>{{ feature.name }}</h3>
              <p>{{ feature.description }}</p>
              <el-button type="primary" text>
                {{ feature.buttonText }}
                <el-icon class="el-icon--right"><ArrowRight /></el-icon>
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 系统状态 -->
    <el-row :gutter="20" class="status-row">
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="status-card">
          <el-statistic
            title="登录状态"
            :value="authStore.isLoggedIn ? '已登录' : '未登录'"
            :value-style="{ color: authStore.isLoggedIn ? '#67C23A' : '#F56C6C' }"
          >
            <template #prefix>
              <el-icon><component :is="authStore.isLoggedIn ? 'SuccessFilled' : 'WarningFilled'" /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="status-card">
          <el-statistic
            title="AI服务状态"
            :value="aiStatus"
            :value-style="{ color: aiConnected ? '#67C23A' : '#F56C6C' }"
          >
            <template #prefix>
              <el-icon><component :is="aiConnected ? 'SuccessFilled' : 'WarningFilled'" /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="status-card">
          <el-statistic
            title="系统版本"
            value="v1.0.0"
          >
            <template #prefix>
              <el-icon><InfoFilled /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近操作日志 -->
    <el-card class="recent-logs">
      <template #header>
        <div class="card-header">
          <span>最近操作</span>
          <el-button type="primary" text @click="$router.push('/logs')">查看全部</el-button>
        </div>
      </template>
      <el-empty v-if="recentLogs.length === 0" description="暂无操作记录" />
      <el-timeline v-else>
        <el-timeline-item
          v-for="log in recentLogs"
          :key="log.id"
          :timestamp="log.timestamp"
          :type="log.type"
        >
          {{ log.message }}
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  UserFilled, 
  Promotion, 
  Magic, 
  ArrowRight, 
  SuccessFilled, 
  WarningFilled, 
  InfoFilled,
  Edit,
  Document,
  Setting,
  DataAnalysis
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import api from '../utils/api'

const router = useRouter()
const authStore = useAuthStore()
const aiConnected = ref(false)
const aiStatus = ref('检测中...')
const recentLogs = ref([])

const features = [
  {
    name: 'AI内容生成',
    description: '使用AI智能生成吸引人的内推内容',
    icon: 'Magic',
    route: '/content-generator',
    buttonText: '立即生成'
  },
  {
    name: '手动发布',
    description: '自定义内容并手动发布到小红书',
    icon: 'Edit',
    route: '/publish',
    buttonText: '开始发布'
  },
  {
    name: '一键发布',
    description: '自动生成内容并一键发布',
    icon: 'Promotion',
    route: '/auto-publish',
    buttonText: '一键发布'
  },
  {
    name: '系统设置',
    description: '配置AI模型和发布参数',
    icon: 'Setting',
    route: '/settings',
    buttonText: '进入设置'
  }
]

const handleFeatureClick = (feature) => {
  router.push(feature.route)
}

const checkAIStatus = async () => {
  try {
    const response = await api.get('/ai/test')
    if (response.data.success) {
      aiConnected.value = true
      aiStatus.value = '正常'
    } else {
      aiConnected.value = false
      aiStatus.value = '连接失败'
    }
  } catch (error) {
    aiConnected.value = false
    aiStatus.value = '连接失败'
  }
}

const loadRecentLogs = () => {
  // 模拟最近操作日志
  recentLogs.value = [
    {
      id: 1,
      message: '成功发布内推笔记：字节跳动前端工程师',
      timestamp: '2024-01-20 14:30',
      type: 'success'
    },
    {
      id: 2,
      message: '生成AI内容：腾讯产品经理岗位',
      timestamp: '2024-01-20 14:25',
      type: 'primary'
    },
    {
      id: 3,
      message: '用户登录系统',
      timestamp: '2024-01-20 14:20',
      type: 'info'
    }
  ]
}

onMounted(async () => {
  await authStore.checkLoginStatus()
  await checkAIStatus()
  loadRecentLogs()
})
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.welcome-card {
  margin-bottom: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.welcome-card :deep(.el-card__body) {
  background: transparent;
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.welcome-text h1 {
  margin: 0 0 10px 0;
  font-size: 2.5em;
  font-weight: bold;
}

.welcome-text p {
  margin: 0 0 20px 0;
  font-size: 1.2em;
  opacity: 0.9;
}

.features {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.welcome-actions {
  flex-shrink: 0;
}

.feature-grid {
  margin-bottom: 30px;
}

.feature-card {
  height: 200px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-content {
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.feature-icon {
  color: var(--el-color-primary);
  margin-bottom: 15px;
}

.feature-content h3 {
  margin: 0 0 10px 0;
  color: var(--el-text-color-primary);
}

.feature-content p {
  margin: 0 0 15px 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.status-row {
  margin-bottom: 30px;
}

.status-card {
  text-align: center;
}

.recent-logs {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 768px) {
  .welcome-content {
    flex-direction: column;
    text-align: center;
  }

  .welcome-text h1 {
    font-size: 2em;
  }

  .feature-card {
    margin-bottom: 15px;
  }
}
</style>