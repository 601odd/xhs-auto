<template>
  <div class="content-generator">
    <el-page-header @back="$router.go(-1)">
      <template #content>
        <span class="page-title">AI内容生成器</span>
      </template>
    </el-page-header>

    <div class="content-wrapper">
      <!-- 生成表单 -->
      <el-card class="generator-card">
        <template #header>
          <div class="card-header">
            <el-icon><Magic /></el-icon>
            <span>内容生成设置</span>
          </div>
        </template>

        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="公司名称" prop="company">
                <el-input
                  v-model="form.company"
                  placeholder="如：字节跳动、腾讯、阿里巴巴"
                  clearable
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="职位名称" prop="position">
                <el-input
                  v-model="form.position"
                  placeholder="如：前端工程师、产品经理"
                  clearable
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="内推码" prop="referralCode">
                <el-input
                  v-model="form.referralCode"
                  placeholder="请输入您的内推码"
                  clearable
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="内容模板">
                <el-select
                  v-model="selectedTemplate"
                  placeholder="选择内容模板"
                  @change="handleTemplateChange"
                  clearable
                >
                  <el-option
                    v-for="template in templates"
                    :key="template.name"
                    :label="template.name"
                    :value="template.name"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="附加信息">
            <el-input
              v-model="form.additionalInfo"
              type="textarea"
              :rows="4"
              placeholder="补充信息，如：技术栈要求、工作地点、薪资范围、公司福利等"
            />
          </el-form-item>

          <el-form-item>
            <el-button-group>
              <el-button
                type="primary"
                @click="generateContent"
                :loading="generating"
              >
                <el-icon><Magic /></el-icon>
                {{ generating ? '生成中...' : '生成内容' }}
              </el-button>
              <el-button @click="generateVariations" :disabled="!generatedContent" :loading="generatingVariations">
                <el-icon><Refresh /></el-icon>
                生成变体
              </el-button>
              <el-button @click="resetForm">
                <el-icon><RefreshRight /></el-icon>
                重置
              </el-button>
            </el-button-group>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 生成结果 -->
      <el-card v-if="generatedContent" class="result-card">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>生成结果</span>
            <div class="header-actions">
              <el-button type="primary" text @click="copyContent">
                <el-icon><DocumentCopy /></el-icon>
                复制全部
              </el-button>
              <el-button type="success" text @click="saveAsDraft">
                <el-icon><FolderAdd /></el-icon>
                保存草稿
              </el-button>
            </div>
          </div>
        </template>

        <div class="content-result">
          <div class="result-section">
            <div class="section-header">
              <h4>标题</h4>
              <el-button type="primary" text size="small" @click="copyText(generatedContent.title)">
                复制
              </el-button>
            </div>
            <div class="title-content" @click="editTitle">
              {{ generatedContent.title }}
            </div>
          </div>

          <div class="result-section">
            <div class="section-header">
              <h4>正文内容</h4>
              <el-button type="primary" text size="small" @click="copyText(generatedContent.content)">
                复制
              </el-button>
            </div>
            <div class="content-text" @click="editContent">
              {{ generatedContent.content }}
            </div>
          </div>

          <div class="result-section" v-if="generatedContent.tags?.length">
            <div class="section-header">
              <h4>话题标签</h4>
              <el-button type="primary" text size="small" @click="copyText(generatedContent.tags.map(tag => '#' + tag).join(' '))">
                复制
              </el-button>
            </div>
            <div class="tags-content">
              <el-tag
                v-for="tag in generatedContent.tags"
                :key="tag"
                class="tag-item"
                closable
                @close="removeTag(tag)"
              >
                #{{ tag }}
              </el-tag>
              <el-button size="small" type="primary" text @click="addTag">
                <el-icon><Plus /></el-icon>
                添加标签
              </el-button>
            </div>
          </div>

          <div class="result-actions">
            <el-button type="success" @click="goToPublish">
              <el-icon><Promotion /></el-icon>
              去发布
            </el-button>
            <el-button @click="optimizeContent" :loading="optimizing">
              <el-icon><Tools /></el-icon>
              {{ optimizing ? '优化中...' : '优化内容' }}
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 历史记录 -->
      <el-card v-if="history.length > 0" class="history-card">
        <template #header>
          <div class="card-header">
            <el-icon><Clock /></el-icon>
            <span>生成历史</span>
            <el-button type="danger" text @click="clearHistory">
              清空历史
            </el-button>
          </div>
        </template>

        <div class="history-list">
          <div
            v-for="(item, index) in history"
            :key="index"
            class="history-item"
            @click="loadFromHistory(item)"
          >
            <div class="history-title">{{ item.title }}</div>
            <div class="history-meta">
              <span>{{ item.company }} - {{ item.position }}</span>
              <span class="history-time">{{ formatTime(item.timestamp) }}</span>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog v-model="showEditDialog" :title="editType === 'title' ? '编辑标题' : '编辑内容'" width="70%">
      <el-input
        v-if="editType === 'title'"
        v-model="editValue"
        placeholder="请输入标题"
      />
      <el-input
        v-else
        v-model="editValue"
        type="textarea"
        :rows="8"
        placeholder="请输入内容"
      />
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加标签对话框 -->
    <el-dialog v-model="showTagDialog" title="添加标签" width="400px">
      <el-input
        v-model="newTag"
        placeholder="请输入标签名称"
        @keyup.enter="confirmAddTag"
      />
      <template #footer>
        <el-button @click="showTagDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAddTag">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Magic,
  Document,
  Refresh,
  RefreshRight,
  DocumentCopy,
  FolderAdd,
  Plus,
  Promotion,
  Tools,
  Clock
} from '@element-plus/icons-vue'
import api from '../utils/api'

const router = useRouter()

// 表单数据
const form = ref({
  company: '',
  position: '',
  referralCode: '',
  additionalInfo: ''
})

// 表单验证规则
const rules = {
  company: [
    { required: true, message: '请输入公司名称', trigger: 'blur' }
  ],
  position: [
    { required: true, message: '请输入职位名称', trigger: 'blur' }
  ],
  referralCode: [
    { required: true, message: '请输入内推码', trigger: 'blur' }
  ]
}

// 其他状态
const formRef = ref(null)
const templates = ref([])
const selectedTemplate = ref('')
const generating = ref(false)
const generatingVariations = ref(false)
const optimizing = ref(false)
const generatedContent = ref(null)
const history = ref([])

// 编辑相关
const showEditDialog = ref(false)
const editType = ref('')
const editValue = ref('')

// 标签相关
const showTagDialog = ref(false)
const newTag = ref('')

// 生成内容
const generateContent = async () => {
  try {
    await formRef.value.validate()
    
    generating.value = true
    const response = await api.post('/ai/generate', form.value)
    
    if (response.data.success) {
      generatedContent.value = response.data.data
      addToHistory()
      ElMessage.success('内容生成成功')
    } else {
      ElMessage.error(response.data.error || '内容生成失败')
    }
  } catch (error) {
    if (error.errors) {
      ElMessage.warning('请完善必填信息')
    } else {
      ElMessage.error('生成失败，请稍后重试')
    }
  } finally {
    generating.value = false
  }
}

// 生成变体
const generateVariations = async () => {
  try {
    generatingVariations.value = true
    const response = await api.post('/ai/variations', {
      content: generatedContent.value,
      count: 1
    })
    
    if (response.data.success && response.data.data.length > 0) {
      generatedContent.value = response.data.data[0]
      addToHistory()
      ElMessage.success('已生成新的内容变体')
    }
  } catch (error) {
    ElMessage.error('生成变体失败')
  } finally {
    generatingVariations.value = false
  }
}

// 优化内容
const optimizeContent = async () => {
  try {
    optimizing.value = true
    const response = await api.post('/ai/optimize', {
      title: generatedContent.value.title,
      content: generatedContent.value.content
    })
    
    if (response.data.success) {
      ElMessage.success('内容优化建议已生成')
      // 这里可以显示优化建议
    }
  } catch (error) {
    ElMessage.error('优化失败')
  } finally {
    optimizing.value = false
  }
}

// 复制文本
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('复制成功')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 复制全部内容
const copyContent = async () => {
  const fullContent = `${generatedContent.value.title}\n\n${generatedContent.value.content}\n\n${generatedContent.value.tags?.map(tag => '#' + tag).join(' ')}`
  await copyText(fullContent)
}

// 编辑标题
const editTitle = () => {
  editType.value = 'title'
  editValue.value = generatedContent.value.title
  showEditDialog.value = true
}

// 编辑内容
const editContent = () => {
  editType.value = 'content'
  editValue.value = generatedContent.value.content
  showEditDialog.value = true
}

// 保存编辑
const saveEdit = () => {
  if (editType.value === 'title') {
    generatedContent.value.title = editValue.value
  } else {
    generatedContent.value.content = editValue.value
  }
  showEditDialog.value = false
  ElMessage.success('保存成功')
}

// 添加标签
const addTag = () => {
  newTag.value = ''
  showTagDialog.value = true
}

// 确认添加标签
const confirmAddTag = () => {
  if (newTag.value.trim()) {
    if (!generatedContent.value.tags) {
      generatedContent.value.tags = []
    }
    if (!generatedContent.value.tags.includes(newTag.value.trim())) {
      generatedContent.value.tags.push(newTag.value.trim())
      ElMessage.success('标签添加成功')
    } else {
      ElMessage.warning('标签已存在')
    }
  }
  showTagDialog.value = false
}

// 删除标签
const removeTag = (tag) => {
  const index = generatedContent.value.tags.indexOf(tag)
  if (index > -1) {
    generatedContent.value.tags.splice(index, 1)
  }
}

// 保存草稿
const saveAsDraft = () => {
  const drafts = JSON.parse(localStorage.getItem('contentDrafts') || '[]')
  drafts.unshift({
    ...generatedContent.value,
    timestamp: Date.now(),
    formData: { ...form.value }
  })
  localStorage.setItem('contentDrafts', JSON.stringify(drafts.slice(0, 20))) // 最多保存20个草稿
  ElMessage.success('草稿保存成功')
}

// 去发布
const goToPublish = () => {
  // 将生成的内容传递给发布页面
  router.push({
    name: 'Publish',
    query: {
      title: generatedContent.value.title,
      content: generatedContent.value.content,
      tags: generatedContent.value.tags?.join(',') || ''
    }
  })
}

// 添加到历史记录
const addToHistory = () => {
  if (generatedContent.value) {
    history.value.unshift({
      ...generatedContent.value,
      company: form.value.company,
      position: form.value.position,
      timestamp: Date.now()
    })
    // 最多保存10条历史记录
    if (history.value.length > 10) {
      history.value = history.value.slice(0, 10)
    }
  }
}

// 从历史记录加载
const loadFromHistory = (item) => {
  generatedContent.value = {
    title: item.title,
    content: item.content,
    tags: item.tags
  }
}

// 清空历史
const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有历史记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    history.value = []
    ElMessage.success('历史记录已清空')
  } catch (error) {
    // 用户取消
  }
}

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  selectedTemplate.value = ''
  generatedContent.value = null
}

// 处理模板选择
const handleTemplateChange = (templateName) => {
  console.log('选择模板:', templateName)
}

// 格式化时间
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

// 获取模板列表
const loadTemplates = async () => {
  try {
    const response = await api.get('/ai/templates')
    if (response.data.success) {
      templates.value = response.data.data
    }
  } catch (error) {
    console.error('获取模板失败:', error)
  }
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.content-generator {
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

.generator-card,
.result-card,
.history-card {
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

.content-result {
  padding: 10px 0;
}

.result-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header h4 {
  margin: 0;
  color: var(--el-color-primary);
  font-size: 14px;
}

.title-content {
  font-size: 16px;
  font-weight: bold;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  cursor: pointer;
  padding: 10px;
  border-radius: 6px;
  transition: background-color 0.3s;
}

.title-content:hover {
  background-color: var(--el-fill-color-light);
}

.content-text {
  line-height: 1.8;
  white-space: pre-wrap;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  padding: 15px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.content-text:hover {
  background-color: var(--el-fill-color);
}

.tags-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tag-item {
  margin: 0;
}

.result-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.history-list {
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.history-item:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-fill-color-light);
}

.history-title {
  font-weight: bold;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.history-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.history-time {
  color: var(--el-text-color-placeholder);
}

@media (max-width: 768px) {
  .content-generator {
    padding: 10px;
  }
  
  .result-actions {
    flex-direction: column;
  }
  
  .result-actions .el-button {
    width: 100%;
  }
}
</style>