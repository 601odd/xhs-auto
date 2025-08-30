<template>
  <div class="logs">
    <el-page-header @back="$router.go(-1)">
      <template #content>
        <span class="page-title">操作日志</span>
      </template>
    </el-page-header>

    <div class="content-wrapper">
      <el-card class="logs-card">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>系统日志</span>
            <div class="header-actions">
              <el-button @click="refreshLogs" :loading="loading">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
              <el-button @click="clearLogs" type="danger">
                <el-icon><Delete /></el-icon>
                清空日志
              </el-button>
            </div>
          </div>
        </template>

        <!-- 过滤选项 -->
        <div class="filter-bar">
          <el-row :gutter="16">
            <el-col :span="6">
              <el-select v-model="filterLevel" placeholder="日志级别" @change="filterLogs">
                <el-option label="全部" value="" />
                <el-option label="信息" value="info" />
                <el-option label="警告" value="warning" />
                <el-option label="错误" value="error" />
                <el-option label="成功" value="success" />
              </el-select>
            </el-col>
            <el-col :span="6">
              <el-select v-model="filterModule" placeholder="模块" @change="filterLogs">
                <el-option label="全部" value="" />
                <el-option label="登录" value="login" />
                <el-option label="发布" value="publish" />
                <el-option label="AI生成" value="ai" />
                <el-option label="定时任务" value="scheduler" />
              </el-select>
            </el-col>
            <el-col :span="8">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索日志内容"
                @input="filterLogs"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-col>
            <el-col :span="4">
              <el-button type="primary" @click="exportLogs">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </el-col>
          </el-row>
        </div>

        <!-- 日志列表 -->
        <div class="logs-container">
          <el-timeline>
            <el-timeline-item
              v-for="log in filteredLogs"
              :key="log.id"
              :timestamp="formatTime(log.timestamp)"
              :type="getTimelineType(log.level)"
              :hollow="log.level === 'info'"
            >
              <div class="log-item">
                <div class="log-header">
                  <el-tag :type="getTagType(log.level)" size="small">
                    {{ getLevelText(log.level) }}
                  </el-tag>
                  <el-tag v-if="log.module" type="info" size="small">
                    {{ getModuleText(log.module) }}
                  </el-tag>
                  <span class="log-id">#{{ log.id }}</span>
                </div>
                <div class="log-message">{{ log.message }}</div>
                <div v-if="log.details" class="log-details">
                  <el-button type="primary" text @click="showDetails(log)">
                    查看详情
                  </el-button>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>

          <el-empty v-if="filteredLogs.length === 0" description="暂无日志记录" />
        </div>

        <!-- 分页 -->
        <div class="pagination-wrapper" v-if="totalLogs > pageSize">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="totalLogs"
            layout="prev, pager, next, jumper, total"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 详情对话框 -->
    <el-dialog v-model="showDetailsDialog" title="日志详情" width="60%">
      <div v-if="selectedLog" class="log-details-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="日志ID">{{ selectedLog.id }}</el-descriptions-item>
          <el-descriptions-item label="级别">
            <el-tag :type="getTagType(selectedLog.level)">
              {{ getLevelText(selectedLog.level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="模块">{{ getModuleText(selectedLog.module) }}</el-descriptions-item>
          <el-descriptions-item label="时间">{{ formatTime(selectedLog.timestamp) }}</el-descriptions-item>
          <el-descriptions-item label="消息" :span="2">{{ selectedLog.message }}</el-descriptions-item>
          <el-descriptions-item v-if="selectedLog.details" label="详细信息" :span="2">
            <pre class="details-content">{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="showDetailsDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  Refresh,
  Delete,
  Search,
  Download
} from '@element-plus/icons-vue'

// 数据
const logs = ref([])
const filteredLogs = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const totalLogs = ref(0)

// 过滤条件
const filterLevel = ref('')
const filterModule = ref('')
const searchKeyword = ref('')

// 详情对话框
const showDetailsDialog = ref(false)
const selectedLog = ref(null)

// 模拟日志数据
const mockLogs = [
  {
    id: 1001,
    level: 'success',
    module: 'publish',
    message: '笔记发布成功 - 字节跳动前端工程师内推',
    timestamp: Date.now() - 1000 * 60 * 5,
    details: {
      title: '字节跳动前端工程师内推',
      duration: '2.3s',
      url: 'https://xiaohongshu.com/discovery/item/xxx'
    }
  },
  {
    id: 1002,
    level: 'info',
    module: 'ai',
    message: 'AI内容生成完成 - 腾讯产品经理岗位',
    timestamp: Date.now() - 1000 * 60 * 10,
    details: {
      model: 'gpt-3.5-turbo',
      tokens: 256,
      duration: '1.8s'
    }
  },
  {
    id: 1003,
    level: 'info',
    module: 'login',
    message: '用户登录成功',
    timestamp: Date.now() - 1000 * 60 * 15,
    details: {
      phone: '138****8888',
      loginMethod: 'password'
    }
  },
  {
    id: 1004,
    level: 'warning',
    module: 'publish',
    message: '发布频率过快，建议增加间隔时间',
    timestamp: Date.now() - 1000 * 60 * 20,
    details: {
      interval: '30s',
      recommended: '300s'
    }
  },
  {
    id: 1005,
    level: 'error',
    module: 'ai',
    message: 'AI服务连接失败，请检查API配置',
    timestamp: Date.now() - 1000 * 60 * 25,
    details: {
      error: 'Network timeout',
      apiUrl: 'https://api.openai.com/v1/chat/completions'
    }
  },
  {
    id: 1006,
    level: 'info',
    module: 'scheduler',
    message: '定时任务执行成功 - 每日内推发布',
    timestamp: Date.now() - 1000 * 60 * 30,
    details: {
      taskName: '每日内推发布',
      nextRun: '明天 09:00'
    }
  }
]

// 计算属性
const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredLogs.value.slice(start, end)
})

// 刷新日志
const refreshLogs = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    logs.value = [...mockLogs]
    filterLogs()
    ElMessage.success('日志刷新成功')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    loading.value = false
  }
}

// 过滤日志
const filterLogs = () => {
  let filtered = [...logs.value]

  // 按级别过滤
  if (filterLevel.value) {
    filtered = filtered.filter(log => log.level === filterLevel.value)
  }

  // 按模块过滤
  if (filterModule.value) {
    filtered = filtered.filter(log => log.module === filterModule.value)
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(log => 
      log.message.toLowerCase().includes(keyword) ||
      log.id.toString().includes(keyword)
    )
  }

  filteredLogs.value = filtered.sort((a, b) => b.timestamp - a.timestamp)
  totalLogs.value = filtered.length
  currentPage.value = 1
}

// 清空日志
const clearLogs = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有日志吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    logs.value = []
    filteredLogs.value = []
    totalLogs.value = 0
    ElMessage.success('日志已清空')
  } catch (error) {
    // 用户取消
  }
}

// 显示详情
const showDetails = (log) => {
  selectedLog.value = log
  showDetailsDialog.value = true
}

// 导出日志
const exportLogs = () => {
  const exportData = filteredLogs.value.map(log => ({
    ID: log.id,
    级别: getLevelText(log.level),
    模块: getModuleText(log.module),
    消息: log.message,
    时间: formatTime(log.timestamp),
    详情: log.details ? JSON.stringify(log.details) : ''
  }))

  const csvContent = [
    Object.keys(exportData[0]).join(','),
    ...exportData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)

  ElMessage.success('日志导出成功')
}

// 分页处理
const handlePageChange = (page) => {
  currentPage.value = page
}

// 格式化时间
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 获取时间线类型
const getTimelineType = (level) => {
  const typeMap = {
    success: 'success',
    info: 'primary',
    warning: 'warning',
    error: 'danger'
  }
  return typeMap[level] || 'primary'
}

// 获取标签类型
const getTagType = (level) => {
  const typeMap = {
    success: 'success',
    info: 'info',
    warning: 'warning',
    error: 'danger'
  }
  return typeMap[level] || 'info'
}

// 获取级别文本
const getLevelText = (level) => {
  const textMap = {
    success: '成功',
    info: '信息',
    warning: '警告',
    error: '错误'
  }
  return textMap[level] || level
}

// 获取模块文本
const getModuleText = (module) => {
  const textMap = {
    login: '登录',
    publish: '发布',
    ai: 'AI生成',
    scheduler: '定时任务'
  }
  return textMap[module] || module
}

onMounted(() => {
  logs.value = [...mockLogs]
  filterLogs()
})
</script>

<style scoped>
.logs {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
}

.content-wrapper {
  margin-top: 20px;
}

.logs-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.header-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.filter-bar {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.logs-container {
  max-height: 600px;
  overflow-y: auto;
}

.log-item {
  padding: 8px 0;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.log-id {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-left: auto;
}

.log-message {
  color: var(--el-text-color-primary);
  line-height: 1.5;
  margin-bottom: 4px;
}

.log-details {
  margin-top: 8px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}

.log-details-content {
  padding: 10px 0;
}

.details-content {
  background: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  overflow-x: auto;
  white-space: pre-wrap;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .logs {
    padding: 10px;
  }
  
  .filter-bar :deep(.el-col) {
    margin-bottom: 10px;
  }
  
  .header-actions {
    flex-direction: column;
  }
}
</style>