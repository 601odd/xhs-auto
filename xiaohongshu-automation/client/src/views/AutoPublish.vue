<template>
  <div class="auto-publish">
    <el-page-header @back="$router.go(-1)">
      <template #content>
        <span class="page-title">一键发布 - AI生成内容并自动发布</span>
      </template>
    </el-page-header>

    <div class="content-wrapper">
      <!-- 内推信息表单 -->
      <el-card class="form-card">
        <template #header>
          <div class="card-header">
            <el-icon><EditPen /></el-icon>
            <span>填写内推信息</span>
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
              :rows="3"
              placeholder="补充信息，如：技术栈要求、工作地点、薪资范围等（可选）"
            />
          </el-form-item>

          <el-form-item>
            <el-button-group>
              <el-button 
                type="primary" 
                @click="handleAutoPublish"
                :loading="publishing"
                :disabled="!authStore.isLoggedIn"
              >
                <el-icon><Promotion /></el-icon>
                {{ publishing ? '发布中...' : '一键发布' }}
              </el-button>
              <el-button @click="handlePreview" :loading="generating">
                <el-icon><View /></el-icon>
                {{ generating ? '生成中...' : '预览内容' }}
              </el-button>
              <el-button @click="resetForm">
                <el-icon><RefreshRight /></el-icon>
                重置
              </el-button>
            </el-button-group>
          </el-form-item>
        </el-form>

        <!-- 登录提示 -->
        <el-alert
          v-if="!authStore.isLoggedIn"
          title="请先登录小红书账号"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>您需要先登录小红书账号才能发布内容</p>
            <el-button type="primary" size="small" @click="$router.push('/login')">
              立即登录
            </el-button>
          </template>
        </el-alert>
      </el-card>

      <!-- 内容预览 -->
      <el-card v-if="generatedContent" class="preview-card">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>生成的内容预览</span>
            <el-button type="primary" text @click="showContentEditor = true">
              编辑内容
            </el-button>
          </div>
        </template>

        <div class="content-preview">
          <div class="preview-section">
            <h4>标题</h4>
            <p class="preview-title">{{ generatedContent.title }}</p>
          </div>
          
          <div class="preview-section">
            <h4>正文</h4>
            <div class="preview-content">{{ generatedContent.content }}</div>
          </div>
          
          <div class="preview-section" v-if="generatedContent.tags?.length">
            <h4>话题标签</h4>
            <div class="preview-tags">
              <el-tag 
                v-for="tag in generatedContent.tags" 
                :key="tag" 
                class="tag-item"
              >
                #{{ tag }}
              </el-tag>
            </div>
          </div>

          <div class="preview-actions">
            <el-button type="success" @click="publishContent" :loading="publishing">
              <el-icon><Check /></el-icon>
              确认发布
            </el-button>
            <el-button @click="generateVariations" :loading="generatingVariations">
              <el-icon><Refresh /></el-icon>
              生成变体
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 发布结果 -->
      <el-card v-if="publishResult" class="result-card">
        <template #header>
          <div class="card-header">
            <el-icon><component :is="publishResult.success ? 'SuccessFilled' : 'CircleCloseFilled'" /></el-icon>
            <span>发布结果</span>
          </div>
        </template>

        <el-result 
          :icon="publishResult.success ? 'success' : 'error'"
          :title="publishResult.success ? '发布成功！' : '发布失败'"
          :sub-title="publishResult.message"
        >
          <template #extra>
            <el-button type="primary" @click="resetAll">继续发布</el-button>
          </template>
        </el-result>
      </el-card>
    </div>

    <!-- 内容编辑弹窗 -->
    <el-dialog
      v-model="showContentEditor"
      title="编辑生成的内容"
      width="80%"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px" v-if="generatedContent">
        <el-form-item label="标题">
          <el-input v-model="generatedContent.title" />
        </el-form-item>
        <el-form-item label="正文">
          <el-input
            v-model="generatedContent.content"
            type="textarea"
            :rows="8"
          />
        </el-form-item>
        <el-form-item label="话题标签">
          <el-input
            v-model="tagsInput"
            placeholder="用逗号分隔标签，如：内推,求职,招聘"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showContentEditor = false">取消</el-button>
        <el-button type="primary" @click="saveContentEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  EditPen,
  Promotion,
  View,
  RefreshRight,
  Document,
  Check,
  Refresh,
  SuccessFilled,
  CircleCloseFilled
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import api from '../utils/api'

const router = useRouter()
const authStore = useAuthStore()

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
const publishing = ref(false)
const generatedContent = ref(null)
const publishResult = ref(null)
const showContentEditor = ref(false)

const tagsInput = computed({
  get: () => generatedContent.value?.tags?.join(', ') || '',
  set: (value) => {
    if (generatedContent.value) {
      generatedContent.value.tags = value.split(',').map(tag => tag.trim()).filter(Boolean)
    }
  }
})

// 处理模板选择
const handleTemplateChange = (templateName) => {
  // 这里可以根据模板预填一些信息
  console.log('选择模板:', templateName)
}

// 预览内容
const handlePreview = async () => {
  try {
    await formRef.value.validate()
    
    generating.value = true
    const response = await api.post('/ai/generate', form.value)
    
    if (response.data.success) {
      generatedContent.value = response.data.data
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

// 一键发布
const handleAutoPublish = async () => {
  try {
    await formRef.value.validate()
    
    const confirm = await ElMessageBox.confirm(
      '确定要生成内容并立即发布吗？',
      '确认发布',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    if (confirm) {
      publishing.value = true
      const response = await api.post('/automation/auto-publish', form.value)
      
      publishResult.value = {
        success: response.data.success,
        message: response.data.success ? '内容已成功发布到小红书' : response.data.error
      }

      if (response.data.success) {
        generatedContent.value = response.data.generatedContent
        ElMessage.success('发布成功！')
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      publishResult.value = {
        success: false,
        message: '发布失败，请稍后重试'
      }
    }
  } finally {
    publishing.value = false
  }
}

// 发布内容
const publishContent = async () => {
  try {
    publishing.value = true
    const response = await api.post('/automation/publish', generatedContent.value)
    
    publishResult.value = {
      success: response.data.success,
      message: response.data.success ? '内容已成功发布到小红书' : response.data.error
    }

    if (response.data.success) {
      ElMessage.success('发布成功！')
    }
  } catch (error) {
    publishResult.value = {
      success: false,
      message: '发布失败，请稍后重试'
    }
  } finally {
    publishing.value = false
  }
}

// 生成内容变体
const generateVariations = async () => {
  try {
    generatingVariations.value = true
    const response = await api.post('/ai/variations', {
      content: generatedContent.value,
      count: 1
    })
    
    if (response.data.success && response.data.data.length > 0) {
      generatedContent.value = response.data.data[0]
      ElMessage.success('已生成新的内容变体')
    }
  } catch (error) {
    ElMessage.error('生成变体失败')
  } finally {
    generatingVariations.value = false
  }
}

// 保存内容编辑
const saveContentEdit = () => {
  showContentEditor.value = false
  ElMessage.success('内容已更新')
}

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  selectedTemplate.value = ''
}

// 重置所有
const resetAll = () => {
  resetForm()
  generatedContent.value = null
  publishResult.value = null
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
  authStore.checkLoginStatus()
  loadTemplates()
})
</script>

<style scoped>
.auto-publish {
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

.form-card,
.preview-card,
.result-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.content-preview {
  padding: 10px 0;
}

.preview-section {
  margin-bottom: 20px;
}

.preview-section h4 {
  margin: 0 0 10px 0;
  color: var(--el-color-primary);
  font-size: 14px;
}

.preview-title {
  font-size: 16px;
  font-weight: bold;
  line-height: 1.5;
  color: var(--el-text-color-primary);
}

.preview-content {
  line-height: 1.8;
  white-space: pre-wrap;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  padding: 15px;
  border-radius: 6px;
}

.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  margin: 0;
}

.preview-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
  .auto-publish {
    padding: 10px;
  }
  
  .preview-actions {
    flex-direction: column;
  }
  
  .preview-actions .el-button {
    width: 100%;
  }
}
</style>