<template>
  <div class="publish">
    <el-page-header @back="$router.go(-1)">
      <template #content>
        <span class="page-title">发布笔记</span>
      </template>
    </el-page-header>

    <div class="content-wrapper">
      <el-card class="publish-card">
        <template #header>
          <div class="card-header">
            <el-icon><Edit /></el-icon>
            <span>编辑内容</span>
          </div>
        </template>

        <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
          <el-form-item label="标题" prop="title">
            <el-input
              v-model="form.title"
              placeholder="请输入笔记标题"
              maxlength="50"
              show-word-limit
              clearable
            />
          </el-form-item>

          <el-form-item label="正文" prop="content">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="8"
              placeholder="请输入笔记内容"
              maxlength="1000"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="话题标签">
            <div class="tags-input">
              <el-tag
                v-for="tag in form.tags"
                :key="tag"
                closable
                @close="removeTag(tag)"
                class="tag-item"
              >
                #{{ tag }}
              </el-tag>
              <el-input
                v-if="inputVisible"
                ref="inputRef"
                v-model="inputValue"
                class="tag-input"
                size="small"
                @keyup.enter="handleInputConfirm"
                @blur="handleInputConfirm"
              />
              <el-button
                v-else
                class="button-new-tag"
                size="small"
                @click="showInput"
              >
                + 添加标签
              </el-button>
            </div>
          </el-form-item>

          <el-form-item label="图片">
            <el-upload
              v-model:file-list="fileList"
              action="#"
              list-type="picture-card"
              :auto-upload="false"
              :limit="9"
              accept="image/*"
              @exceed="handleExceed"
              @remove="handleRemove"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <div class="upload-tip">
              最多上传9张图片，支持jpg、png格式
            </div>
          </el-form-item>

          <el-form-item>
            <el-button-group>
              <el-button
                type="primary"
                @click="handlePublish"
                :loading="publishing"
                :disabled="!authStore.isLoggedIn"
              >
                <el-icon><Promotion /></el-icon>
                {{ publishing ? '发布中...' : '立即发布' }}
              </el-button>
              <el-button @click="saveAsDraft">
                <el-icon><FolderAdd /></el-icon>
                保存草稿
              </el-button>
              <el-button @click="previewContent">
                <el-icon><View /></el-icon>
                预览
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
            <el-button type="primary" @click="resetForm">继续发布</el-button>
          </template>
        </el-result>
      </el-card>
    </div>

    <!-- 预览对话框 -->
    <el-dialog v-model="showPreview" title="内容预览" width="60%">
      <div class="preview-content">
        <h3>{{ form.title }}</h3>
        <div class="preview-text">{{ form.content }}</div>
        <div class="preview-tags" v-if="form.tags.length">
          <el-tag v-for="tag in form.tags" :key="tag" class="tag-item">
            #{{ tag }}
          </el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="showPreview = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, genFileId } from 'element-plus'
import {
  Edit,
  Plus,
  Promotion,
  FolderAdd,
  View,
  SuccessFilled,
  CircleCloseFilled
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import api from '../utils/api'

const route = useRoute()
const authStore = useAuthStore()

// 表单数据
const form = ref({
  title: '',
  content: '',
  tags: [],
  images: []
})

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 5, message: '标题长度至少5个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入内容', trigger: 'blur' },
    { min: 20, message: '内容长度至少20个字符', trigger: 'blur' }
  ]
}

// 其他状态
const formRef = ref(null)
const publishing = ref(false)
const publishResult = ref(null)
const showPreview = ref(false)

// 标签相关
const inputVisible = ref(false)
const inputValue = ref('')
const inputRef = ref(null)

// 文件上传相关
const fileList = ref([])

// 删除标签
const removeTag = (tag) => {
  const index = form.value.tags.indexOf(tag)
  if (index > -1) {
    form.value.tags.splice(index, 1)
  }
}

// 显示标签输入框
const showInput = () => {
  inputVisible.value = true
  nextTick(() => {
    inputRef.value.input.focus()
  })
}

// 确认输入标签
const handleInputConfirm = () => {
  if (inputValue.value) {
    if (!form.value.tags.includes(inputValue.value)) {
      form.value.tags.push(inputValue.value)
    }
  }
  inputVisible.value = false
  inputValue.value = ''
}

// 处理文件上传超出限制
const handleExceed = (files) => {
  ElMessage.warning('最多只能上传9张图片')
}

// 删除文件
const handleRemove = (file) => {
  console.log('删除文件:', file)
}

// 发布内容
const handlePublish = async () => {
  try {
    await formRef.value.validate()
    
    publishing.value = true
    
    // 准备发布数据
    const publishData = {
      title: form.value.title,
      content: form.value.content,
      tags: form.value.tags,
      images: form.value.images
    }
    
    const response = await api.post('/automation/publish', publishData)
    
    publishResult.value = {
      success: response.data.success,
      message: response.data.success ? '内容已成功发布到小红书' : response.data.error
    }

    if (response.data.success) {
      ElMessage.success('发布成功！')
    }
  } catch (error) {
    if (error.errors) {
      ElMessage.warning('请完善必填信息')
    } else {
      publishResult.value = {
        success: false,
        message: '发布失败，请稍后重试'
      }
    }
  } finally {
    publishing.value = false
  }
}

// 保存草稿
const saveAsDraft = () => {
  const drafts = JSON.parse(localStorage.getItem('publishDrafts') || '[]')
  drafts.unshift({
    ...form.value,
    timestamp: Date.now()
  })
  localStorage.setItem('publishDrafts', JSON.stringify(drafts.slice(0, 20)))
  ElMessage.success('草稿保存成功')
}

// 预览内容
const previewContent = () => {
  if (!form.value.title && !form.value.content) {
    ElMessage.warning('请先输入标题和内容')
    return
  }
  showPreview.value = true
}

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  form.value.tags = []
  fileList.value = []
  publishResult.value = null
}

// 从URL参数加载内容
const loadFromQuery = () => {
  if (route.query.title) {
    form.value.title = route.query.title
  }
  if (route.query.content) {
    form.value.content = route.query.content
  }
  if (route.query.tags) {
    form.value.tags = route.query.tags.split(',').filter(Boolean)
  }
}

onMounted(() => {
  authStore.checkLoginStatus()
  loadFromQuery()
})
</script>

<style scoped>
.publish {
  max-width: 800px;
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

.publish-card,
.result-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tag-item {
  margin: 0;
}

.tag-input {
  width: 120px;
}

.button-new-tag {
  border-style: dashed;
}

.upload-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}

.preview-content {
  padding: 20px 0;
}

.preview-content h3 {
  margin: 0 0 15px 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
}

.preview-text {
  line-height: 1.8;
  white-space: pre-wrap;
  color: var(--el-text-color-regular);
  margin-bottom: 15px;
}

.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.el-upload--picture-card) {
  width: 80px;
  height: 80px;
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 80px;
  height: 80px;
}

@media (max-width: 768px) {
  .publish {
    padding: 10px;
  }
  
  :deep(.el-button-group) {
    flex-direction: column;
  }
  
  :deep(.el-button-group .el-button) {
    width: 100%;
    margin-bottom: 8px;
  }
}
</style>