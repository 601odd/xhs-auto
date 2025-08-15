<template>
  <div class="settings">
    <el-page-header @back="$router.go(-1)">
      <template #content>
        <span class="page-title">系统设置</span>
      </template>
    </el-page-header>

    <div class="content-wrapper">
      <el-row :gutter="20">
        <el-col :span="16">
          <!-- AI设置 -->
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><Magic /></el-icon>
                <span>AI设置</span>
              </div>
            </template>

            <el-form :model="aiSettings" label-width="120px">
              <el-form-item label="API Key">
                <el-input
                  v-model="aiSettings.apiKey"
                  type="password"
                  placeholder="请输入OpenAI API Key"
                  show-password
                />
              </el-form-item>

              <el-form-item label="API地址">
                <el-input
                  v-model="aiSettings.baseUrl"
                  placeholder="https://api.openai.com/v1"
                />
              </el-form-item>

              <el-form-item label="模型选择">
                <el-select v-model="aiSettings.model" placeholder="选择AI模型">
                  <el-option label="GPT-3.5 Turbo (推荐)" value="gpt-3.5-turbo" />
                  <el-option label="GPT-4" value="gpt-4" />
                  <el-option label="GPT-4 Turbo" value="gpt-4-turbo-preview" />
                </el-select>
              </el-form-item>

              <el-form-item label="温度参数">
                <el-slider
                  v-model="aiSettings.temperature"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  show-input
                />
                <div class="setting-tip">控制生成内容的随机性，0最保守，1最创新</div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="testAIConnection" :loading="testing">
                  <el-icon><Link /></el-icon>
                  测试连接
                </el-button>
                <el-button @click="saveAISettings">
                  <el-icon><Check /></el-icon>
                  保存设置
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 发布设置 -->
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><Setting /></el-icon>
                <span>发布设置</span>
              </div>
            </template>

            <el-form :model="publishSettings" label-width="120px">
              <el-form-item label="发布间隔">
                <el-input-number
                  v-model="publishSettings.interval"
                  :min="30"
                  :max="3600"
                  controls-position="right"
                />
                <span class="unit">秒</span>
                <div class="setting-tip">两次发布之间的最小间隔时间</div>
              </el-form-item>

              <el-form-item label="随机延迟">
                <el-switch v-model="publishSettings.randomDelay" />
                <div class="setting-tip">开启后会在操作间添加随机延迟</div>
              </el-form-item>

              <el-form-item label="失败重试">
                <el-input-number
                  v-model="publishSettings.retryCount"
                  :min="0"
                  :max="5"
                  controls-position="right"
                />
                <span class="unit">次</span>
              </el-form-item>

              <el-form-item label="自动保存草稿">
                <el-switch v-model="publishSettings.autoSaveDraft" />
              </el-form-item>

              <el-form-item>
                <el-button @click="savePublishSettings">
                  <el-icon><Check /></el-icon>
                  保存设置
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 定时任务 -->
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <el-icon><Clock /></el-icon>
                <span>定时任务管理</span>
                <el-button type="primary" text @click="showCreateTask = true">
                  <el-icon><Plus /></el-icon>
                  新建任务
                </el-button>
              </div>
            </template>

            <el-table :data="scheduledTasks" style="width: 100%">
              <el-table-column prop="name" label="任务名称" />
              <el-table-column prop="cron" label="执行时间" />
              <el-table-column prop="status" label="状态">
                <template #default="scope">
                  <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'">
                    {{ scope.row.status === 'active' ? '运行中' : '已停止' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="nextRun" label="下次执行" />
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button
                    v-if="scope.row.status === 'inactive'"
                    type="primary"
                    text
                    @click="startTask(scope.row.id)"
                  >
                    启动
                  </el-button>
                  <el-button
                    v-else
                    type="warning"
                    text
                    @click="stopTask(scope.row.id)"
                  >
                    停止
                  </el-button>
                  <el-button
                    type="danger"
                    text
                    @click="deleteTask(scope.row.id)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-empty v-if="scheduledTasks.length === 0" description="暂无定时任务" />
          </el-card>
        </el-col>

        <el-col :span="8">
          <!-- 系统状态 -->
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon><Monitor /></el-icon>
                <span>系统状态</span>
              </div>
            </template>

            <div class="status-item">
              <span>登录状态</span>
              <el-tag :type="authStore.isLoggedIn ? 'success' : 'danger'">
                {{ authStore.isLoggedIn ? '已登录' : '未登录' }}
              </el-tag>
            </div>

            <div class="status-item">
              <span>AI服务</span>
              <el-tag :type="aiConnected ? 'success' : 'danger'">
                {{ aiConnected ? '正常' : '异常' }}
              </el-tag>
            </div>

            <div class="status-item">
              <span>运行时间</span>
              <span>{{ uptime }}</span>
            </div>

            <div class="status-item">
              <span>版本信息</span>
              <span>v1.0.0</span>
            </div>
          </el-card>

          <!-- 快捷操作 -->
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon><Operation /></el-icon>
                <span>快捷操作</span>
              </div>
            </template>

            <div class="quick-actions">
              <el-button @click="clearCache" :loading="clearing">
                <el-icon><Delete /></el-icon>
                清理缓存
              </el-button>
              <el-button @click="exportSettings">
                <el-icon><Download /></el-icon>
                导出配置
              </el-button>
              <el-button @click="$refs.importInput.click()">
                <el-icon><Upload /></el-icon>
                导入配置
              </el-button>
              <input
                ref="importInput"
                type="file"
                accept=".json"
                style="display: none"
                @change="importSettings"
              />
            </div>
          </el-card>

          <!-- 使用统计 -->
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon><DataAnalysis /></el-icon>
                <span>使用统计</span>
              </div>
            </template>

            <div class="stats-item">
              <span>今日发布</span>
              <span class="stats-value">{{ stats.todayPosts }}</span>
            </div>

            <div class="stats-item">
              <span>本月发布</span>
              <span class="stats-value">{{ stats.monthPosts }}</span>
            </div>

            <div class="stats-item">
              <span>总计发布</span>
              <span class="stats-value">{{ stats.totalPosts }}</span>
            </div>

            <div class="stats-item">
              <span>成功率</span>
              <span class="stats-value">{{ stats.successRate }}%</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 创建定时任务对话框 -->
    <el-dialog v-model="showCreateTask" title="创建定时任务" width="600px">
      <el-form :model="newTask" :rules="taskRules" ref="taskFormRef" label-width="100px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="newTask.name" placeholder="请输入任务名称" />
        </el-form-item>

        <el-form-item label="执行时间" prop="cron">
          <el-select v-model="newTask.template" placeholder="选择时间模板" @change="updateCron">
            <el-option
              v-for="template in timeTemplates"
              :key="template.cron"
              :label="template.name"
              :value="template.cron"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Cron表达式" prop="cron">
          <el-input v-model="newTask.cron" placeholder="或手动输入cron表达式" />
          <div class="setting-tip">格式：秒 分 时 日 月 周，如：0 9 * * * 表示每天9点</div>
        </el-form-item>

        <el-form-item label="发布内容" prop="content">
          <el-input
            v-model="newTask.content.company"
            placeholder="公司名称"
            style="margin-bottom: 10px;"
          />
          <el-input
            v-model="newTask.content.position"
            placeholder="职位名称"
            style="margin-bottom: 10px;"
          />
          <el-input
            v-model="newTask.content.referralCode"
            placeholder="内推码"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateTask = false">取消</el-button>
        <el-button type="primary" @click="createTask" :loading="creating">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Magic,
  Setting,
  Clock,
  Monitor,
  Operation,
  DataAnalysis,
  Link,
  Check,
  Plus,
  Delete,
  Download,
  Upload
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import api from '../utils/api'

const authStore = useAuthStore()

// AI设置
const aiSettings = ref({
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  temperature: 0.8
})

// 发布设置
const publishSettings = ref({
  interval: 300,
  randomDelay: true,
  retryCount: 3,
  autoSaveDraft: true
})

// 系统状态
const aiConnected = ref(false)
const uptime = ref('0分钟')
const testing = ref(false)
const clearing = ref(false)

// 统计数据
const stats = ref({
  todayPosts: 0,
  monthPosts: 0,
  totalPosts: 0,
  successRate: 0
})

// 定时任务
const scheduledTasks = ref([])
const showCreateTask = ref(false)
const creating = ref(false)
const newTask = ref({
  name: '',
  cron: '',
  template: '',
  content: {
    company: '',
    position: '',
    referralCode: ''
  }
})

const taskRules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' }
  ],
  cron: [
    { required: true, message: '请输入cron表达式', trigger: 'blur' }
  ]
}

const taskFormRef = ref(null)

// 时间模板
const timeTemplates = ref([
  { name: '每日上午9点', cron: '0 9 * * *' },
  { name: '每日下午2点', cron: '0 14 * * *' },
  { name: '每日晚上8点', cron: '0 20 * * *' },
  { name: '工作日上午10点', cron: '0 10 * * 1-5' },
  { name: '每3小时', cron: '0 */3 * * *' },
  { name: '每周一上午9点', cron: '0 9 * * 1' }
])

// 测试AI连接
const testAIConnection = async () => {
  testing.value = true
  try {
    const response = await api.get('/ai/test')
    if (response.data.success) {
      aiConnected.value = true
      ElMessage.success('AI服务连接正常')
    } else {
      aiConnected.value = false
      ElMessage.error('AI服务连接失败')
    }
  } catch (error) {
    aiConnected.value = false
    ElMessage.error('连接测试失败')
  } finally {
    testing.value = false
  }
}

// 保存AI设置
const saveAISettings = () => {
  localStorage.setItem('aiSettings', JSON.stringify(aiSettings.value))
  ElMessage.success('AI设置已保存')
}

// 保存发布设置
const savePublishSettings = () => {
  localStorage.setItem('publishSettings', JSON.stringify(publishSettings.value))
  ElMessage.success('发布设置已保存')
}

// 更新cron表达式
const updateCron = (template) => {
  newTask.value.cron = template
}

// 创建定时任务
const createTask = async () => {
  try {
    await taskFormRef.value.validate()
    creating.value = true
    
    // 这里调用API创建定时任务
    // const response = await api.post('/scheduler/create', newTask.value)
    
    // 模拟创建成功
    scheduledTasks.value.push({
      id: Date.now(),
      name: newTask.value.name,
      cron: newTask.value.cron,
      status: 'inactive',
      nextRun: '-',
      content: newTask.value.content
    })
    
    showCreateTask.value = false
    ElMessage.success('定时任务创建成功')
    
    // 重置表单
    newTask.value = {
      name: '',
      cron: '',
      template: '',
      content: {
        company: '',
        position: '',
        referralCode: ''
      }
    }
  } catch (error) {
    ElMessage.error('创建失败，请检查输入')
  } finally {
    creating.value = false
  }
}

// 启动任务
const startTask = (taskId) => {
  const task = scheduledTasks.value.find(t => t.id === taskId)
  if (task) {
    task.status = 'active'
    task.nextRun = '1小时后'
    ElMessage.success('任务已启动')
  }
}

// 停止任务
const stopTask = (taskId) => {
  const task = scheduledTasks.value.find(t => t.id === taskId)
  if (task) {
    task.status = 'inactive'
    task.nextRun = '-'
    ElMessage.success('任务已停止')
  }
}

// 删除任务
const deleteTask = async (taskId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个任务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const index = scheduledTasks.value.findIndex(t => t.id === taskId)
    if (index > -1) {
      scheduledTasks.value.splice(index, 1)
      ElMessage.success('任务已删除')
    }
  } catch (error) {
    // 用户取消
  }
}

// 清理缓存
const clearCache = async () => {
  clearing.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟清理过程
    localStorage.removeItem('contentDrafts')
    localStorage.removeItem('publishDrafts')
    ElMessage.success('缓存清理完成')
  } catch (error) {
    ElMessage.error('清理失败')
  } finally {
    clearing.value = false
  }
}

// 导出设置
const exportSettings = () => {
  const settings = {
    ai: aiSettings.value,
    publish: publishSettings.value,
    tasks: scheduledTasks.value
  }
  
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `xhs-automation-settings-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('设置已导出')
}

// 导入设置
const importSettings = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const settings = JSON.parse(e.target.result)
      if (settings.ai) aiSettings.value = settings.ai
      if (settings.publish) publishSettings.value = settings.publish
      if (settings.tasks) scheduledTasks.value = settings.tasks
      
      ElMessage.success('设置导入成功')
    } catch (error) {
      ElMessage.error('导入失败，文件格式错误')
    }
  }
  reader.readAsText(file)
}

// 加载设置
const loadSettings = () => {
  const savedAISettings = localStorage.getItem('aiSettings')
  if (savedAISettings) {
    aiSettings.value = JSON.parse(savedAISettings)
  }
  
  const savedPublishSettings = localStorage.getItem('publishSettings')
  if (savedPublishSettings) {
    publishSettings.value = JSON.parse(savedPublishSettings)
  }
}

// 更新统计数据
const updateStats = () => {
  // 这里应该从API获取实际统计数据
  stats.value = {
    todayPosts: 3,
    monthPosts: 45,
    totalPosts: 128,
    successRate: 95
  }
}

// 更新运行时间
const updateUptime = () => {
  const start = Date.now()
  setInterval(() => {
    const diff = Date.now() - start
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      uptime.value = `${days}天${hours % 24}小时`
    } else if (hours > 0) {
      uptime.value = `${hours}小时${minutes % 60}分钟`
    } else {
      uptime.value = `${minutes}分钟`
    }
  }, 60000)
}

onMounted(() => {
  loadSettings()
  updateStats()
  updateUptime()
  testAIConnection()
})
</script>

<style scoped>
.settings {
  max-width: 1200px;
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

.settings-card,
.info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.setting-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.unit {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
}

.status-item,
.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.status-item:last-child,
.stats-item:last-child {
  border-bottom: none;
}

.stats-value {
  font-weight: bold;
  color: var(--el-color-primary);
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-actions .el-button {
  justify-content: flex-start;
}

@media (max-width: 768px) {
  .settings {
    padding: 10px;
  }
  
  :deep(.el-col) {
    width: 100%;
    margin-bottom: 20px;
  }
}
</style>