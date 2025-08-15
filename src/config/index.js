import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // 小红书账号配置
  xhs: {
    username: process.env.XHS_USERNAME,
    password: process.env.XHS_PASSWORD,
    referralCode: process.env.XHS_REFERRAL_CODE,
    baseUrl: 'https://www.xiaohongshu.com',
    creatorUrl: 'https://creator.xiaohongshu.com'
  },

  // OpenAI配置
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo'
  },

  // 浏览器配置
  browser: {
    headless: process.env.HEADLESS === 'true',
    timeout: parseInt(process.env.BROWSER_TIMEOUT) || 30000,
    pageTimeout: parseInt(process.env.PAGE_TIMEOUT) || 10000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  },

  // 发帖配置
  posting: {
    intervalMin: parseInt(process.env.POST_INTERVAL_MIN) || 60,
    intervalMax: parseInt(process.env.POST_INTERVAL_MAX) || 180,
    dailyLimit: parseInt(process.env.DAILY_POST_LIMIT) || 5
  },

  // 反检测配置
  antiDetection: {
    useStealth: process.env.USE_STEALTH === 'true',
    useProxy: process.env.USE_PROXY === 'true',
    proxyServer: process.env.PROXY_SERVER
  },

  // 调试配置
  debug: {
    enabled: process.env.DEBUG === 'true',
    saveScreenshots: process.env.SAVE_SCREENSHOTS === 'true'
  },

  // 路径配置
  paths: {
    data: path.join(process.cwd(), 'data'),
    logs: path.join(process.cwd(), 'logs'),
    screenshots: path.join(process.cwd(), 'data', 'screenshots'),
    cookies: path.join(process.cwd(), 'data', 'cookies.json')
  }
};

export default config;