const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const logger = require('../utils/logger');

// 添加隐藏插件
puppeteer.use(StealthPlugin());

// 添加验证码插件（如果需要）
puppeteer.use(RecaptchaPlugin({
  provider: { id: '2captcha', token: process.env.CAPTCHA_TOKEN }
}));

class PuppeteerService {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  // 启动浏览器
  async initBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: process.env.NODE_ENV === 'production', // 生产环境使用无头模式
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-features=VizDisplayCompositor'
        ],
        defaultViewport: {
          width: 1366,
          height: 768
        }
      });

      this.page = await this.browser.newPage();
      
      // 设置随机User-Agent
      await this.setRandomUserAgent();
      
      // 设置其他反检测措施
      await this.setupAntiDetection();
      
      logger.info('浏览器初始化成功');
      return true;
    } catch (error) {
      logger.error('浏览器初始化失败:', error);
      throw error;
    }
  }

  // 设置随机User-Agent
  async setRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ];
    
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    await this.page.setUserAgent(randomUA);
  }

  // 设置反检测措施
  async setupAntiDetection() {
    // 覆盖webdriver属性
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // 覆盖chrome属性
    await this.page.evaluateOnNewDocument(() => {
      window.chrome = {
        runtime: {},
      };
    });

    // 覆盖permissions属性
    await this.page.evaluateOnNewDocument(() => {
      const originalQuery = window.navigator.permissions.query;
      return window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    // 覆盖plugins属性
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    });
  }

  // 模拟人类行为的点击
  async humanClick(selector, delay = null) {
    const element = await this.page.$(selector);
    if (!element) {
      throw new Error(`元素未找到: ${selector}`);
    }

    // 滚动到元素位置
    await this.page.evaluate(el => el.scrollIntoView(), element);
    
    // 随机延迟
    await this.randomDelay(delay || [500, 1500]);
    
    // 移动鼠标到元素
    const box = await element.boundingBox();
    const x = box.x + box.width / 2 + (Math.random() - 0.5) * 10;
    const y = box.y + box.height / 2 + (Math.random() - 0.5) * 10;
    
    await this.page.mouse.move(x, y, { steps: Math.random() * 10 + 5 });
    await this.randomDelay([100, 300]);
    
    // 点击
    await element.click();
    await this.randomDelay([200, 500]);
  }

  // 模拟人类输入
  async humanType(selector, text, delay = null) {
    await this.page.focus(selector);
    await this.randomDelay(delay || [200, 500]);
    
    // 逐字符输入，随机延迟
    for (const char of text) {
      await this.page.keyboard.type(char);
      await this.randomDelay([50, 150]);
    }
  }

  // 随机延迟
  async randomDelay(range = [1000, 3000]) {
    const [min, max] = range;
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // 滚动页面
  async randomScroll() {
    const scrollDistance = Math.random() * 500 + 200;
    await this.page.evaluate((distance) => {
      window.scrollBy(0, distance);
    }, scrollDistance);
    await this.randomDelay([500, 1000]);
  }

  // 导航到小红书
  async navigateToXiaohongshu() {
    try {
      await this.page.goto('https://www.xiaohongshu.com', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await this.randomDelay([2000, 4000]);
      logger.info('成功导航到小红书');
    } catch (error) {
      logger.error('导航到小红书失败:', error);
      throw error;
    }
  }

  // 关闭浏览器
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info('浏览器已关闭');
    }
  }

  // 截图
  async takeScreenshot(filename) {
    const screenshotPath = `./logs/screenshots/${filename}_${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }
}

module.exports = PuppeteerService;