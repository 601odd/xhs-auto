#!/usr/bin/env node

import PostScheduler from './services/scheduler.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('scheduler-cli');

async function main() {
  let scheduler = null;
  
  try {
    console.log('⏰ 启动小红书定时发帖工具...\n');
    
    scheduler = new PostScheduler();
    await scheduler.init();
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case 'start':
        await scheduler.startAutoPosting();
        console.log('✅ 自动发帖已启动！程序将持续运行...');
        
        // 保持程序运行
        process.on('SIGINT', async () => {
          console.log('\n\n🛑 正在停止自动发帖...');
          await scheduler.close();
          process.exit(0);
        });
        
        // 阻止程序退出
        await new Promise(() => {});
        break;
        
      case 'stop':
        scheduler.stopAutoPosting();
        console.log('✅ 自动发帖已停止');
        break;
        
      case 'status':
        const status = scheduler.getStatus();
        console.log('📊 当前状态:');
        console.log(`  🔄 自动发帖: ${status.isRunning ? '运行中' : '已停止'}`);
        console.log(`  📈 今日发帖: ${status.dailyPostCount}/${status.dailyLimit}`);
        console.log(`  ⏰ 上次发帖: ${status.lastPostDate ? status.lastPostDate.toLocaleString() : '无'}`);
        console.log(`  ✅ 可以发帖: ${status.canPost ? '是' : '否'}`);
        break;
        
      case 'schedule':
        const cronExpression = args[1];
        if (!cronExpression) {
          console.log('❌ 请提供cron表达式');
          console.log('示例: npm run schedule schedule "0 9,15,21 * * *"');
          break;
        }
        
        try {
          const taskId = scheduler.schedulePost(cronExpression);
          console.log(`✅ 定时任务已设置，任务ID: ${taskId}`);
          console.log('程序将持续运行以执行定时任务...');
          
          // 保持程序运行
          process.on('SIGINT', async () => {
            console.log('\n\n🛑 正在停止定时任务...');
            await scheduler.close();
            process.exit(0);
          });
          
          await new Promise(() => {});
        } catch (error) {
          console.log('❌ 设置定时任务失败:', error.message);
        }
        break;
        
      default:
        showHelp();
    }
    
  } catch (error) {
    logger.error('调度器运行错误:', error);
    console.log('\n❌ 运行失败:', error.message);
  } finally {
    if (scheduler && !['start', 'schedule'].includes(command)) {
      await scheduler.close();
    }
    
    if (!['start', 'schedule'].includes(command)) {
      process.exit(0);
    }
  }
}

function showHelp() {
  console.log(`
⏰ 小红书定时发帖工具

用法:
  npm run schedule start                        # 启动自动发帖
  npm run schedule stop                         # 停止自动发帖  
  npm run schedule status                       # 查看状态
  npm run schedule schedule "cron表达式"        # 设置定时任务
  npm run schedule -- --help                   # 显示此帮助信息

Cron表达式示例:
  "0 9,15,21 * * *"    # 每天9点、15点、21点
  "0 */2 * * *"        # 每2小时
  "0 10 * * 1-5"       # 工作日上午10点

示例:
  npm run schedule start
  npm run schedule schedule "0 9,15,21 * * *"
`);
}

// 显示用法说明
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

main();