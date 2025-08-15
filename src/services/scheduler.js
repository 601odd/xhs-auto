import cron from 'node-cron';
import fs from 'fs-extra';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import config from '../config/index.js';
import XiaohongshuService from './xiaohongshu.js';
import ContentGenerator from './contentGenerator.js';

const logger = createLogger('scheduler');

class PostScheduler {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
    this.dailyPostCount = 0;
    this.lastPostDate = null;
    this.xiaohongshuService = null;
    this.contentGenerator = new ContentGenerator();
    this.schedulerFile = path.join(config.paths.data, 'scheduler.json');
  }

  async init() {
    try {
      logger.info('初始化定时调度器...');
      
      // 加载调度器状态
      await this.loadSchedulerState();
      
      // 初始化小红书服务
      this.xiaohongshuService = new XiaohongshuService();
      await this.xiaohongshuService.init();
      
      logger.info('定时调度器初始化完成');
      return this;
    } catch (error) {
      logger.error('定时调度器初始化失败:', error);
      throw error;
    }
  }

  async loadSchedulerState() {
    try {
      if (await fs.pathExists(this.schedulerFile)) {
        const state = await fs.readJson(this.schedulerFile);
        this.dailyPostCount = state.dailyPostCount || 0;
        this.lastPostDate = state.lastPostDate ? new Date(state.lastPostDate) : null;
        logger.info('调度器状态已加载');
      }
    } catch (error) {
      logger.error('加载调度器状态失败:', error);
    }
  }

  async saveSchedulerState() {
    try {
      const state = {
        dailyPostCount: this.dailyPostCount,
        lastPostDate: this.lastPostDate,
        updatedAt: new Date().toISOString()
      };
      
      await fs.ensureDir(config.paths.data);
      await fs.writeJson(this.schedulerFile, state, { spaces: 2 });
      logger.debug('调度器状态已保存');
    } catch (error) {
      logger.error('保存调度器状态失败:', error);
    }
  }

  // 检查是否可以发帖
  canPost() {
    const now = new Date();
    const today = now.toDateString();
    
    // 检查是否是新的一天
    if (!this.lastPostDate || this.lastPostDate.toDateString() !== today) {
      this.dailyPostCount = 0;
      logger.info('新的一天开始，重置发帖计数');
    }
    
    // 检查是否超过每日限制
    if (this.dailyPostCount >= config.posting.dailyLimit) {
      logger.warn(`今日发帖已达上限 (${config.posting.dailyLimit})`);
      return false;
    }
    
    return true;
  }

  // 获取随机发帖间隔
  getRandomInterval() {
    const min = config.posting.intervalMin * 60 * 1000; // 转换为毫秒
    const max = config.posting.intervalMax * 60 * 1000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // 启动自动发帖
  async startAutoPosting() {
    if (this.isRunning) {
      logger.warn('自动发帖已经在运行中');
      return;
    }

    try {
      logger.info('启动自动发帖...');
      this.isRunning = true;

      // 设置定时任务 - 每小时检查一次
      const task = cron.schedule('0 * * * *', async () => {
        await this.checkAndPost();
      }, {
        scheduled: false,
        timezone: 'Asia/Shanghai'
      });

      this.tasks.set('autoPost', task);
      task.start();

      // 立即执行一次检查
      setTimeout(() => {
        this.checkAndPost();
      }, 5000);

      logger.info('自动发帖已启动');
    } catch (error) {
      logger.error('启动自动发帖失败:', error);
      this.isRunning = false;
      throw error;
    }
  }

  // 检查并发帖
  async checkAndPost() {
    try {
      logger.debug('检查发帖条件...');

      if (!this.canPost()) {
        return;
      }

      // 检查当前时间是否在合适的发帖时间范围内
      const now = new Date();
      const hour = now.getHours();
      
      // 避免在深夜发帖 (23:00 - 7:00)
      if (hour >= 23 || hour < 7) {
        logger.debug('当前时间不适合发帖');
        return;
      }

      await this.executePost();

    } catch (error) {
      logger.error('检查发帖条件时发生错误:', error);
    }
  }

  // 执行发帖
  async executePost() {
    try {
      logger.info('开始执行自动发帖...');

      // 生成内推内容
      const content = await this.contentGenerator.generateReferralPost();
      logger.info('内容生成完成:', { title: content.title });

      // 登录并发帖
      const success = await this.xiaohongshuService.createPost(content);

      if (success) {
        // 更新发帖统计
        this.dailyPostCount++;
        this.lastPostDate = new Date();
        await this.saveSchedulerState();

        logger.info(`发帖成功！今日已发帖: ${this.dailyPostCount}/${config.posting.dailyLimit}`);

        // 设置下次发帖的随机延迟
        const nextInterval = this.getRandomInterval();
        logger.info(`下次发帖将在 ${Math.round(nextInterval / 60000)} 分钟后`);

        setTimeout(() => {
          this.checkAndPost();
        }, nextInterval);

      } else {
        logger.error('发帖失败');
      }

    } catch (error) {
      logger.error('执行发帖时发生错误:', error);
      
      // 发帖失败时等待更长时间再试
      setTimeout(() => {
        this.checkAndPost();
      }, 30 * 60 * 1000); // 30分钟后重试
    }
  }

  // 手动发帖
  async manualPost(content = null) {
    try {
      if (!this.canPost()) {
        throw new Error('今日发帖已达上限');
      }

      logger.info('执行手动发帖...');

      // 如果没有提供内容，生成默认内推内容
      const postContent = content || await this.contentGenerator.generateReferralPost();

      const success = await this.xiaohongshuService.createPost(postContent);

      if (success) {
        this.dailyPostCount++;
        this.lastPostDate = new Date();
        await this.saveSchedulerState();
        logger.info('手动发帖成功！');
      }

      return success;
    } catch (error) {
      logger.error('手动发帖失败:', error);
      throw error;
    }
  }

  // 自定义发帖
  async postCustomContent(topic, requirements = {}) {
    try {
      if (!this.canPost()) {
        throw new Error('今日发帖已达上限');
      }

      logger.info(`发布自定义内容: ${topic}`);

      const content = await this.contentGenerator.generateCustomPost(topic, requirements);
      const success = await this.xiaohongshuService.createPost(content);

      if (success) {
        this.dailyPostCount++;
        this.lastPostDate = new Date();
        await this.saveSchedulerState();
        logger.info('自定义内容发布成功！');
      }

      return success;
    } catch (error) {
      logger.error('发布自定义内容失败:', error);
      throw error;
    }
  }

  // 停止自动发帖
  stopAutoPosting() {
    try {
      logger.info('停止自动发帖...');
      
      this.tasks.forEach((task, name) => {
        task.destroy();
        logger.info(`停止任务: ${name}`);
      });
      
      this.tasks.clear();
      this.isRunning = false;
      
      logger.info('自动发帖已停止');
    } catch (error) {
      logger.error('停止自动发帖失败:', error);
    }
  }

  // 设置定时发帖
  schedulePost(cronExpression, contentType = 'referral') {
    try {
      const taskName = `scheduled_${Date.now()}`;
      
      const task = cron.schedule(cronExpression, async () => {
        try {
          if (!this.canPost()) {
            logger.warn('无法执行定时发帖：已达今日限制');
            return;
          }

          let content;
          if (contentType === 'referral') {
            content = await this.contentGenerator.generateReferralPost();
          } else {
            content = await this.contentGenerator.generateCustomPost(contentType);
          }

          await this.xiaohongshuService.createPost(content);
          
          this.dailyPostCount++;
          this.lastPostDate = new Date();
          await this.saveSchedulerState();
          
          logger.info('定时发帖执行成功');
        } catch (error) {
          logger.error('定时发帖执行失败:', error);
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Shanghai'
      });

      this.tasks.set(taskName, task);
      task.start();
      
      logger.info(`定时任务已设置: ${taskName} (${cronExpression})`);
      return taskName;
    } catch (error) {
      logger.error('设置定时发帖失败:', error);
      throw error;
    }
  }

  // 取消定时任务
  cancelScheduledPost(taskName) {
    try {
      if (this.tasks.has(taskName)) {
        const task = this.tasks.get(taskName);
        task.destroy();
        this.tasks.delete(taskName);
        logger.info(`定时任务已取消: ${taskName}`);
        return true;
      } else {
        logger.warn(`未找到定时任务: ${taskName}`);
        return false;
      }
    } catch (error) {
      logger.error('取消定时任务失败:', error);
      return false;
    }
  }

  // 获取状态信息
  getStatus() {
    const now = new Date();
    const today = now.toDateString();
    const isNewDay = !this.lastPostDate || this.lastPostDate.toDateString() !== today;
    
    return {
      isRunning: this.isRunning,
      dailyPostCount: isNewDay ? 0 : this.dailyPostCount,
      dailyLimit: config.posting.dailyLimit,
      lastPostDate: this.lastPostDate,
      activeTasks: Array.from(this.tasks.keys()),
      canPost: this.canPost()
    };
  }

  // 关闭调度器
  async close() {
    try {
      logger.info('关闭调度器...');
      
      this.stopAutoPosting();
      await this.saveSchedulerState();
      
      if (this.xiaohongshuService) {
        await this.xiaohongshuService.close();
      }
      
      logger.info('调度器已关闭');
    } catch (error) {
      logger.error('关闭调度器失败:', error);
    }
  }
}

export default PostScheduler;