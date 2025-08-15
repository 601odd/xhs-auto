import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import fs from 'fs-extra';
import path from 'path';
import config from '../config/index.js';
import { createLogger } from './logger.js';

const logger = createLogger('browser');

// 配置插件
if (config.antiDetection.useStealth) {
  puppeteer.use(StealthPlugin());
}

puppeteer.use(RecaptchaPlugin({
  provider: {
    id: '2captcha',
    token: 'XXXXXXX' // 如果需要的话可以配置验证码服务
  },
  visualFeedback: true
}));

class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    try {
      logger.info('正在初始化浏览器...');
      
      const launchOptions = {
        headless: config.browser.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--window-size=1366,768'
        ],
        defaultViewport: {
          width: 1366,
          height: 768
        },
        userDataDir: path.join(config.paths.data, 'browser-profile')
      };

      // 如果配置了代理
      if (config.antiDetection.useProxy && config.antiDetection.proxyServer) {
        launchOptions.args.push(`--proxy-server=${config.antiDetection.proxyServer}`);
      }

      this.browser = await puppeteer.launch(launchOptions);
      this.page = await this.browser.newPage();

      // 设置用户代理
      await this.page.setUserAgent(config.browser.userAgent);

      // 设置额外的头部信息
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
      });

      // 设置超时
      this.page.setDefaultTimeout(config.browser.pageTimeout);
      this.page.setDefaultNavigationTimeout(config.browser.timeout);

      // 监听页面错误
      this.page.on('error', (error) => {
        logger.error('页面错误:', error);
      });

      this.page.on('pageerror', (error) => {
        logger.error('页面脚本错误:', error);
      });

      logger.info('浏览器初始化完成');
      return true;
    } catch (error) {
      logger.error('浏览器初始化失败:', error);
      throw error;
    }
  }

  async goto(url, options = {}) {
    try {
      logger.info(`导航到: ${url}`);
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        ...options
      });
      
      // 随机延迟，模拟人类行为
      await this.randomDelay(1000, 3000);
      
      if (config.debug.saveScreenshots) {
        await this.screenshot(`navigation-${Date.now()}.png`);
      }
    } catch (error) {
      logger.error(`导航失败: ${url}`, error);
      throw error;
    }
  }

  async screenshot(filename) {
    try {
      const screenshotPath = path.join(config.paths.screenshots, filename);
      await fs.ensureDir(config.paths.screenshots);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      logger.debug(`截图保存至: ${screenshotPath}`);
    } catch (error) {
      logger.error('截图失败:', error);
    }
  }

  async randomDelay(min = 500, max = 2000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    logger.debug(`随机延迟: ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async humanType(selector, text, options = {}) {
    try {
      await this.page.waitForSelector(selector, { timeout: 10000 });
      await this.page.click(selector);
      await this.randomDelay(100, 300);
      
      // 清空输入框
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');
      
      // 模拟人类打字速度
      for (const char of text) {
        await this.page.keyboard.type(char);
        await this.randomDelay(50, 150);
      }
      
      await this.randomDelay(300, 800);
    } catch (error) {
      logger.error(`人性化输入失败: ${selector}`, error);
      throw error;
    }
  }

  async humanClick(selector, options = {}) {
    try {
      await this.page.waitForSelector(selector, { timeout: 10000 });
      
      // 滚动到元素可见
      await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, selector);
      
      await this.randomDelay(500, 1000);
      
      // 模拟鼠标移动和点击
      const element = await this.page.$(selector);
      const box = await element.boundingBox();
      if (box) {
        const x = box.x + box.width / 2 + (Math.random() - 0.5) * 10;
        const y = box.y + box.height / 2 + (Math.random() - 0.5) * 10;
        
        await this.page.mouse.move(x, y);
        await this.randomDelay(100, 300);
        await this.page.mouse.click(x, y);
      } else {
        await this.page.click(selector);
      }
      
      await this.randomDelay(300, 800);
    } catch (error) {
      logger.error(`人性化点击失败: ${selector}`, error);
      throw error;
    }
  }

  async loadCookies() {
    try {
      if (await fs.pathExists(config.paths.cookies)) {
        const cookies = await fs.readJson(config.paths.cookies);
        await this.page.setCookie(...cookies);
        logger.info('已加载保存的cookies');
        return true;
      }
    } catch (error) {
      logger.error('加载cookies失败:', error);
    }
    return false;
  }

  async saveCookies() {
    try {
      const cookies = await this.page.cookies();
      await fs.ensureDir(config.paths.data);
      await fs.writeJson(config.paths.cookies, cookies);
      logger.info('cookies已保存');
    } catch (error) {
      logger.error('保存cookies失败:', error);
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        logger.info('浏览器已关闭');
      }
    } catch (error) {
      logger.error('关闭浏览器失败:', error);
    }
  }

  async waitForNavigation(options = {}) {
    try {
      await this.page.waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: config.browser.timeout,
        ...options
      });
    } catch (error) {
      logger.error('等待导航失败:', error);
      throw error;
    }
  }

  async evaluate(fn, ...args) {
    return await this.page.evaluate(fn, ...args);
  }

  async waitForSelector(selector, options = {}) {
    return await this.page.waitForSelector(selector, {
      timeout: 10000,
      ...options
    });
  }
}

export default BrowserManager;