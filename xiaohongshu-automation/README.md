# 小红书自动化发帖系统 🌟

一个基于AI智能生成和反检测技术的小红书自动化发帖系统，专为内推信息发布而设计。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-16+-green.svg)
![Vue.js](https://img.shields.io/badge/vue.js-3.0-brightgreen.svg)

## ✨ 项目简介

本系统实现了小红书的智能化内容生成和自动发布功能，特别适用于HR、猎头和内推人员的日常工作。通过集成先进的AI技术和反检测机制，确保内容的多样性和发布的安全性。

## 🚀 核心特性

### 🤖 AI智能内容生成
- 基于OpenAI GPT模型，生成高质量的内推内容
- 支持多种内容模板和个性化定制
- 自动生成标题、正文和话题标签
- 内容变体功能，避免重复检测

### 🛡️ 反检测机制
- **puppeteer-extra-plugin-stealth** - 隐藏自动化特征
- **随机行为模拟** - 模拟真实用户操作模式
- **设备指纹随机化** - 动态变更浏览器指纹
- **智能延迟策略** - 避免规律性操作被识别

### 🎯 自动化发布
- 一键生成并发布内容
- 支持定时发布任务
- 可视化发布状态监控
- 自动保存登录状态

### 💻 现代化界面
- Vue3 + Element Plus 构建
- 响应式设计，支持移动端
- 深色模式支持
- 直观的操作流程

## 🏗️ 技术架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vue3 前端     │    │  Node.js 后端   │    │   小红书平台     │
│                 │    │                 │    │                 │
│ • Element Plus  │◄──►│ • Express API   │◄──►│ • 自动化发布     │
│ • Pinia Store   │    │ • Puppeteer     │    │ • 内容管理       │
│ • Vue Router    │    │ • AI Service    │    │ • 用户交互       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户界面       │    │   核心服务       │    │   目标平台       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 快速开始

### 环境要求
- Node.js 16+
- Chrome/Chromium 浏览器
- 2GB+ 内存
- OpenAI API Key

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/xiaohongshu-automation.git
cd xiaohongshu-automation
```

2. **安装依赖**
```bash
npm run install:all
```

3. **配置环境**
```bash
cp .env.example .env
# 编辑 .env 文件，填入您的 OpenAI API Key
```

4. **启动应用**
```bash
npm run dev
```

5. **访问系统**
打开浏览器访问：http://localhost:3000

### 详细安装指南

请查看 [INSTALL.md](./INSTALL.md) 获取完整的安装和配置说明。

## 🎯 使用流程

1. **登录配置** - 使用您的小红书账号登录
2. **内容生成** - 填写公司、职位、内推码等信息
3. **AI生成** - 系统自动生成符合小红书风格的内容
4. **预览编辑** - 可预览和编辑生成的内容
5. **一键发布** - 自动发布到小红书平台

## 🔧 核心技术方案

### 反检测技术实现

| 技术 | 说明 | 实现方式 |
|------|------|----------|
| Stealth插件 | 隐藏Puppeteer特征 | puppeteer-extra-plugin-stealth |
| 行为模拟 | 模拟真实用户操作 | 随机延迟、鼠标轨迹、滚动行为 |
| 指纹随机化 | 避免设备识别 | 随机User-Agent、分辨率、插件信息 |
| 智能调度 | 合理控制频率 | 动态间隔、时间分散 |

### AI内容生成策略

- **提示词工程** - 专门为小红书内推场景优化的prompt
- **内容多样化** - 自动生成不同表达方式避免重复
- **质量控制** - 内容审核和优化建议
- **模板系统** - 针对不同行业和职位的专用模板

## 📊 功能特性

- ✅ 小红书账号登录和状态管理
- ✅ AI驱动的内容生成（GPT-3.5/4支持）
- ✅ 反检测机制（Stealth + 行为模拟）
- ✅ 可视化内容编辑和预览
- ✅ 一键发布功能
- ✅ 定时发布任务管理
- ✅ 操作日志和状态监控
- ✅ 响应式Web界面
- ✅ 深色模式支持

## ⚠️ 重要提示

### 风险说明
- **账号安全**：自动化操作存在被平台检测的风险，可能导致账号限制
- **合规使用**：请确保发布内容符合小红书社区规范
- **频率控制**：建议控制发布频率，避免过于频繁的操作

### 免责声明
本项目仅供学习和研究使用，用户需自行承担使用风险。开发者不对账号封禁、内容违规等后果承担责任。

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目！

1. Fork本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📝 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。

## 🔗 相关资源

- [安装指南](./INSTALL.md)
- [API文档](./docs/API.md)
- [常见问题](./docs/FAQ.md)
- [更新日志](./CHANGELOG.md)

## 📧 联系方式

如有问题或建议，请通过以下方式联系：

- 提交Issue：[GitHub Issues](https://github.com/your-username/xiaohongshu-automation/issues)
- 邮件联系：your-email@example.com

---

**⭐ 如果这个项目对您有帮助，请给我们一个Star！**