#!/usr/bin/env node

import PostScheduler from './services/scheduler.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('post');

async function main() {
  let scheduler = null;
  
  try {
    console.log('📝 启动小红书发帖工具...\n');
    
    scheduler = new PostScheduler();
    await scheduler.init();
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    const topic = args[0];
    
    let success;
    if (topic) {
      console.log(`📖 发布自定义内容: ${topic}`);
      success = await scheduler.postCustomContent(topic);
    } else {
      console.log('📮 发布内推内容...');
      success = await scheduler.manualPost();
    }
    
    if (success) {
      console.log('\n✅ 发帖成功！');
    } else {
      console.log('\n❌ 发帖失败');
    }
    
  } catch (error) {
    logger.error('发帖过程中发生错误:', error);
    console.log('\n❌ 发帖失败:', error.message);
  } finally {
    if (scheduler) {
      await scheduler.close();
    }
    process.exit(0);
  }
}

// 显示用法说明
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
📝 小红书发帖工具

用法:
  npm run post              # 发布默认内推内容
  npm run post "主题"       # 发布自定义主题内容
  npm run post -- --help   # 显示此帮助信息

示例:
  npm run post "技术分享"
  npm run post "职场经验"
`);
  process.exit(0);
}

main();