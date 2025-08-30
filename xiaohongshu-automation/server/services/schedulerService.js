const cron = require('node-cron');
const logger = require('../utils/logger');
const XiaohongshuService = require('./xiaohongshuService');
const AIService = require('./aiService');

class SchedulerService {
  constructor() {
    this.tasks = new Map();
    this.aiService = new AIService();
  }

  // 添加定时发布任务
  addScheduledPost(taskId, cronExpression, postData) {
    try {
      // 验证cron表达式
      if (!cron.validate(cronExpression)) {
        throw new Error('无效的cron表达式');
      }

      // 停止已存在的任务
      if (this.tasks.has(taskId)) {
        this.removeTask(taskId);
      }

      // 创建新任务
      const task = cron.schedule(cronExpression, async () => {
        await this.executeScheduledPost(taskId, postData);
      }, {
        scheduled: false,
        timezone: 'Asia/Shanghai'
      });

      this.tasks.set(taskId, {
        task,
        cronExpression,
        postData,
        createdAt: new Date(),
        lastRun: null,
        nextRun: null,
        status: 'inactive'
      });

      logger.info(`定时任务已创建: ${taskId}, 表达式: ${cronExpression}`);
      return { success: true, message: '定时任务创建成功' };
    } catch (error) {
      logger.error('创建定时任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 启动定时任务
  startTask(taskId) {
    try {
      const taskInfo = this.tasks.get(taskId);
      if (!taskInfo) {
        throw new Error('任务不存在');
      }

      taskInfo.task.start();
      taskInfo.status = 'active';
      taskInfo.nextRun = this.getNextRunTime(taskInfo.cronExpression);
      
      logger.info(`定时任务已启动: ${taskId}`);
      return { success: true, message: '任务启动成功' };
    } catch (error) {
      logger.error('启动定时任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 停止定时任务
  stopTask(taskId) {
    try {
      const taskInfo = this.tasks.get(taskId);
      if (!taskInfo) {
        throw new Error('任务不存在');
      }

      taskInfo.task.stop();
      taskInfo.status = 'inactive';
      taskInfo.nextRun = null;
      
      logger.info(`定时任务已停止: ${taskId}`);
      return { success: true, message: '任务停止成功' };
    } catch (error) {
      logger.error('停止定时任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 删除定时任务
  removeTask(taskId) {
    try {
      const taskInfo = this.tasks.get(taskId);
      if (taskInfo) {
        taskInfo.task.destroy();
        this.tasks.delete(taskId);
        logger.info(`定时任务已删除: ${taskId}`);
      }
      return { success: true, message: '任务删除成功' };
    } catch (error) {
      logger.error('删除定时任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 执行定时发布
  async executeScheduledPost(taskId, postData) {
    try {
      logger.info(`开始执行定时任务: ${taskId}`);
      
      const taskInfo = this.tasks.get(taskId);
      taskInfo.lastRun = new Date();
      taskInfo.nextRun = this.getNextRunTime(taskInfo.cronExpression);

      // 创建小红书服务实例
      const xhsService = new XiaohongshuService();
      
      // 生成内容
      const contentResult = await this.aiService.generateReferralContent(postData);
      if (!contentResult.success) {
        throw new Error(`内容生成失败: ${contentResult.error}`);
      }

      // 发布内容
      const publishResult = await xhsService.publishNote({
        title: contentResult.data.title,
        content: contentResult.data.content,
        tags: contentResult.data.tags || []
      });

      if (publishResult.success) {
        logger.info(`定时任务执行成功: ${taskId}`);
      } else {
        throw new Error(`发布失败: ${publishResult.error}`);
      }

      // 清理资源
      await xhsService.closeBrowser();
    } catch (error) {
      logger.error(`定时任务执行失败: ${taskId}`, error);
      
      // 记录失败信息到任务状态
      const taskInfo = this.tasks.get(taskId);
      if (taskInfo) {
        taskInfo.lastError = error.message;
        taskInfo.errorCount = (taskInfo.errorCount || 0) + 1;
      }
    }
  }

  // 获取下次运行时间
  getNextRunTime(cronExpression) {
    try {
      // 这里可以使用cron库来计算下次运行时间
      // 简化实现，返回当前时间加1小时
      const next = new Date();
      next.setHours(next.getHours() + 1);
      return next;
    } catch (error) {
      return null;
    }
  }

  // 获取所有任务状态
  getAllTasks() {
    const tasks = [];
    this.tasks.forEach((taskInfo, taskId) => {
      tasks.push({
        id: taskId,
        cronExpression: taskInfo.cronExpression,
        status: taskInfo.status,
        createdAt: taskInfo.createdAt,
        lastRun: taskInfo.lastRun,
        nextRun: taskInfo.nextRun,
        lastError: taskInfo.lastError,
        errorCount: taskInfo.errorCount || 0,
        postData: {
          company: taskInfo.postData.company,
          position: taskInfo.postData.position
          // 不返回敏感信息如内推码
        }
      });
    });
    return tasks;
  }

  // 获取预设的时间模板
  getTimeTemplates() {
    return [
      {
        name: '每日上午9点',
        cron: '0 9 * * *',
        description: '每天上午9点发布'
      },
      {
        name: '每日下午2点',
        cron: '0 14 * * *',
        description: '每天下午2点发布'
      },
      {
        name: '每日晚上8点',
        cron: '0 20 * * *',
        description: '每天晚上8点发布'
      },
      {
        name: '工作日上午10点',
        cron: '0 10 * * 1-5',
        description: '周一到周五上午10点发布'
      },
      {
        name: '每3小时',
        cron: '0 */3 * * *',
        description: '每3小时发布一次'
      },
      {
        name: '每周一上午9点',
        cron: '0 9 * * 1',
        description: '每周一上午9点发布'
      }
    ];
  }

  // 停止所有任务
  stopAllTasks() {
    this.tasks.forEach((taskInfo, taskId) => {
      try {
        taskInfo.task.stop();
        taskInfo.status = 'inactive';
        logger.info(`已停止任务: ${taskId}`);
      } catch (error) {
        logger.error(`停止任务失败: ${taskId}`, error);
      }
    });
  }

  // 启动所有任务
  startAllTasks() {
    this.tasks.forEach((taskInfo, taskId) => {
      try {
        taskInfo.task.start();
        taskInfo.status = 'active';
        taskInfo.nextRun = this.getNextRunTime(taskInfo.cronExpression);
        logger.info(`已启动任务: ${taskId}`);
      } catch (error) {
        logger.error(`启动任务失败: ${taskId}`, error);
      }
    });
  }
}

module.exports = SchedulerService;