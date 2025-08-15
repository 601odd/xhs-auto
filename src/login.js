#!/usr/bin/env node

import XiaohongshuService from './services/xiaohongshu.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('login');

async function main() {
  let xhsService = null;
  
  try {
    console.log('🔐 启动小红书登录工具...\n');
    
    xhsService = new XiaohongshuService();
    await xhsService.init();
    
    const success = await xhsService.login();
    
    if (success) {
      console.log('\n✅ 登录成功！Cookies已保存，后续可以直接使用。');
    } else {
      console.log('\n❌ 登录失败，请检查网络连接和账号信息。');
    }
    
  } catch (error) {
    logger.error('登录过程中发生错误:', error);
    console.log('\n❌ 登录失败:', error.message);
  } finally {
    if (xhsService) {
      await xhsService.close();
    }
    process.exit(0);
  }
}

main();