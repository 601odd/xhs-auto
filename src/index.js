#!/usr/bin/env node

import readline from 'readline';
import { createLogger } from './utils/logger.js';
import config from './config/index.js';
import PostScheduler from './services/scheduler.js';
import XiaohongshuService from './services/xiaohongshu.js';
import ContentGenerator from './services/contentGenerator.js';

const logger = createLogger('main');

class XHSAutoApp {
  constructor() {
    this.scheduler = null;
    this.xhsService = null;
    this.contentGenerator = new ContentGenerator();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async init() {
    try {
      logger.info('🚀 启动小红书自动发帖工具...');
      
      // 检查配置
      this.checkConfig();
      
      // 初始化服务
      this.scheduler = new PostScheduler();
      await this.scheduler.init();
      
      this.xhsService = new XiaohongshuService();
      await this.xhsService.init();
      
      logger.info('✅ 初始化完成！');
      
      // 显示主菜单
      this.showMainMenu();
      
    } catch (error) {
      logger.error('❌ 初始化失败:', error);
      process.exit(1);
    }
  }

  checkConfig() {
    const missingConfig = [];
    
    if (!config.xhs.username) missingConfig.push('XHS_USERNAME');
    if (!config.xhs.referralCode) missingConfig.push('XHS_REFERRAL_CODE');
    
    if (missingConfig.length > 0) {
      logger.warn('⚠️  以下配置项未设置:');
      missingConfig.forEach(item => logger.warn(`   - ${item}`));
      logger.warn('请在 .env 文件中配置这些项目');
    }
    
    if (!config.openai.apiKey) {
      logger.warn('⚠️  未配置 OpenAI API 密钥，将使用默认内容模板');
    }
  }

  showMainMenu() {
    console.log('\n=== 小红书自动发帖工具 ===');
    console.log('1. 登录小红书');
    console.log('2. 手动发帖');
    console.log('3. 启动自动发帖');
    console.log('4. 停止自动发帖');
    console.log('5. 发布自定义内容');
    console.log('6. 查看状态');
    console.log('7. 生成内容预览');
    console.log('8. 设置定时发帖');
    console.log('0. 退出');
    console.log('=======================\n');
    
    this.rl.question('请选择操作 (0-8): ', (answer) => {
      this.handleMenuChoice(answer);
    });
  }

  async handleMenuChoice(choice) {
    try {
      switch (choice) {
        case '1':
          await this.loginAction();
          break;
        case '2':
          await this.manualPostAction();
          break;
        case '3':
          await this.startAutoPostAction();
          break;
        case '4':
          await this.stopAutoPostAction();
          break;
        case '5':
          await this.customPostAction();
          break;
        case '6':
          this.showStatusAction();
          break;
        case '7':
          await this.previewContentAction();
          break;
        case '8':
          await this.schedulePostAction();
          break;
        case '0':
          await this.exitAction();
          return;
        default:
          console.log('❌ 无效选择，请重新输入');
      }
    } catch (error) {
      logger.error('操作失败:', error);
    }
    
    // 返回主菜单
    setTimeout(() => {
      this.showMainMenu();
    }, 2000);
  }

  async loginAction() {
    try {
      console.log('\n🔐 开始登录小红书...');
      const success = await this.xhsService.login();
      
      if (success) {
        console.log('✅ 登录成功！');
      } else {
        console.log('❌ 登录失败');
      }
    } catch (error) {
      console.log('❌ 登录过程中发生错误:', error.message);
    }
  }

  async manualPostAction() {
    try {
      console.log('\n📝 开始手动发帖...');
      
      const success = await this.scheduler.manualPost();
      
      if (success) {
        console.log('✅ 发帖成功！');
      } else {
        console.log('❌ 发帖失败');
      }
    } catch (error) {
      console.log('❌ 发帖过程中发生错误:', error.message);
    }
  }

  async startAutoPostAction() {
    try {
      console.log('\n⚡ 启动自动发帖...');
      
      await this.scheduler.startAutoPosting();
      console.log('✅ 自动发帖已启动！程序将在后台运行');
      console.log('💡 提示：程序会根据配置的时间间隔自动发帖');
      
    } catch (error) {
      console.log('❌ 启动自动发帖失败:', error.message);
    }
  }

  async stopAutoPostAction() {
    try {
      console.log('\n⏹️  停止自动发帖...');
      
      this.scheduler.stopAutoPosting();
      console.log('✅ 自动发帖已停止');
      
    } catch (error) {
      console.log('❌ 停止自动发帖失败:', error.message);
    }
  }

  async customPostAction() {
    return new Promise((resolve) => {
      this.rl.question('\n📖 请输入发帖主题: ', async (topic) => {
        if (!topic.trim()) {
          console.log('❌ 主题不能为空');
          resolve();
          return;
        }

        try {
          console.log('📝 生成并发布自定义内容...');
          
          const success = await this.scheduler.postCustomContent(topic);
          
          if (success) {
            console.log('✅ 自定义内容发布成功！');
          } else {
            console.log('❌ 发布失败');
          }
        } catch (error) {
          console.log('❌ 发布过程中发生错误:', error.message);
        }
        
        resolve();
      });
    });
  }

  showStatusAction() {
    console.log('\n📊 当前状态:');
    
    const status = this.scheduler.getStatus();
    
    console.log(`🔄 自动发帖: ${status.isRunning ? '运行中' : '已停止'}`);
    console.log(`📈 今日发帖: ${status.dailyPostCount}/${status.dailyLimit}`);
    console.log(`⏰ 上次发帖: ${status.lastPostDate ? status.lastPostDate.toLocaleString() : '无'}`);
    console.log(`✅ 可以发帖: ${status.canPost ? '是' : '否'}`);
    console.log(`⚙️  活动任务: ${status.activeTasks.length} 个`);
    
    if (status.activeTasks.length > 0) {
      console.log('   任务列表:', status.activeTasks.join(', '));
    }
  }

  async previewContentAction() {
    try {
      console.log('\n👀 生成内容预览...');
      
      const content = await this.contentGenerator.generateReferralPost();
      
      console.log('\n📝 生成的内容:');
      console.log('='.repeat(50));
      console.log(`标题: ${content.title}`);
      console.log(`内容: ${content.text}`);
      console.log(`标签: ${content.tags.map(tag => `#${tag}`).join(' ')}`);
      console.log('='.repeat(50));
      
    } catch (error) {
      console.log('❌ 生成内容预览失败:', error.message);
    }
  }

  async schedulePostAction() {
    return new Promise((resolve) => {
      console.log('\n⏰ 设置定时发帖');
      console.log('格式: 分 时 日 月 周 (使用 cron 表达式)');
      console.log('示例: "0 9,15,21 * * *" (每天9点、15点、21点)');
      
      this.rl.question('请输入 cron 表达式: ', (cronExpression) => {
        if (!cronExpression.trim()) {
          console.log('❌ cron 表达式不能为空');
          resolve();
          return;
        }

        try {
          const taskId = this.scheduler.schedulePost(cronExpression);
          console.log(`✅ 定时任务已设置，任务ID: ${taskId}`);
        } catch (error) {
          console.log('❌ 设置定时任务失败:', error.message);
        }
        
        resolve();
      });
    });
  }

  async exitAction() {
    try {
      console.log('\n👋 正在退出...');
      
      if (this.scheduler) {
        await this.scheduler.close();
      }
      
      if (this.xhsService) {
        await this.xhsService.close();
      }
      
      this.rl.close();
      
      console.log('✅ 程序已退出');
      process.exit(0);
      
    } catch (error) {
      logger.error('退出时发生错误:', error);
      process.exit(1);
    }
  }
}

// 处理未捕获的错误
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

// 处理程序终止信号
process.on('SIGINT', async () => {
  console.log('\n\n🛑 收到中断信号，正在关闭程序...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 收到终止信号，正在关闭程序...');
  process.exit(0);
});

// 启动应用
const app = new XHSAutoApp();
app.init();