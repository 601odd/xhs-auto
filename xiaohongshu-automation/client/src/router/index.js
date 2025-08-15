import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录小红书' }
  },
  {
    path: '/content-generator',
    name: 'ContentGenerator',
    component: () => import('../views/ContentGenerator.vue'),
    meta: { title: 'AI内容生成' }
  },
  {
    path: '/publish',
    name: 'Publish',
    component: () => import('../views/Publish.vue'),
    meta: { title: '发布笔记' }
  },
  {
    path: '/auto-publish',
    name: 'AutoPublish',
    component: () => import('../views/AutoPublish.vue'),
    meta: { title: '一键发布' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { title: '系统设置' }
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('../views/Logs.vue'),
    meta: { title: '操作日志' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 小红书自动化发帖系统`
  }
  next()
})

export default router