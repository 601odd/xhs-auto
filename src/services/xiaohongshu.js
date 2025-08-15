import BrowserManager from '../utils/browser.js';
import { createLogger } from '../utils/logger.js';
import config from '../config/index.js';
import fs from 'fs-extra';
import path from 'path';

const logger = createLogger('xiaohongshu');

class XiaohongshuService {
  constructor() {
    this.browser = new BrowserManager();
    this.isLoggedIn = false;
    this.loginCheckInterval = null;
  }

  async init() {
    await this.browser.init();
    return this;
  }

  async login() {
    try {
      logger.info('开始登录小红书...');
      
      // 先尝试加载保存的cookies
      const cookiesLoaded = await this.browser.loadCookies();
      
      // 导航到小红书首页
      await this.browser.goto(config.xhs.baseUrl);
      
      if (cookiesLoaded) {
        // 检查是否已经登录
        const isLoggedIn = await this.checkLoginStatus();
        if (isLoggedIn) {
          logger.info('通过cookies自动登录成功');
          this.isLoggedIn = true;
          return true;
        }
      }

      // 如果cookies无效，进行手动登录
      await this.performLogin();
      
      return this.isLoggedIn;
    } catch (error) {
      logger.error('登录过程中发生错误:', error);
      throw error;
    }
  }

  async checkLoginStatus() {
    try {
      // 检查页面上是否有登录按钮或用户头像
      const loginButton = await this.browser.page.$('.login-btn, .sign-in');
      if (loginButton) {
        return false; // 有登录按钮说明未登录
      }

      // 检查是否有用户头像或个人中心入口
      const userAvatar = await this.browser.page.$('.user-info, .avatar, .user-avatar');
      if (userAvatar) {
        return true; // 有用户头像说明已登录
      }

      // 尝试检查是否能访问创作者中心
      await this.browser.goto(config.xhs.creatorUrl);
      await this.browser.randomDelay(2000, 4000);
      
      const url = this.browser.page.url();
      if (url.includes('creator.xiaohongshu.com') && !url.includes('login')) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('检查登录状态失败:', error);
      return false;
    }
  }

  async performLogin() {
    try {
      logger.info('执行手动登录流程...');
      
      // 导航到登录页面
      await this.browser.goto('https://www.xiaohongshu.com');
      
      // 等待并点击登录按钮
      const loginSelectors = [
        '.login-btn',
        '.sign-in',
        'button[data-v-*=""][class*="login"]',
        'a[href*="login"]',
        '.header-login'
      ];

      let loginButtonFound = false;
      for (const selector of loginSelectors) {
        try {
          await this.browser.waitForSelector(selector, { timeout: 3000 });
          await this.browser.humanClick(selector);
          loginButtonFound = true;
          logger.info(`找到登录按钮: ${selector}`);
          break;
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }

      if (!loginButtonFound) {
        logger.warn('未找到登录按钮，可能已经在登录页面');
      }

      await this.browser.randomDelay(2000, 4000);
      
      // 等待登录框出现
      const loginModalSelectors = [
        '.login-container',
        '.login-modal',
        '.sign-container',
        '.login-form'
      ];

      for (const selector of loginModalSelectors) {
        try {
          await this.browser.waitForSelector(selector, { timeout: 3000 });
          logger.info(`登录框已出现: ${selector}`);
          break;
        } catch (error) {
          // 继续尝试
        }
      }

      // 选择手机号登录方式
      const phoneTabSelectors = [
        'button[data-v-*=""][class*="phone"]',
        '.tab-phone',
        '.login-phone',
        'div[class*="phone"][class*="tab"]'
      ];

      for (const selector of phoneTabSelectors) {
        try {
          await this.browser.waitForSelector(selector, { timeout: 3000 });
          await this.browser.humanClick(selector);
          logger.info('已选择手机号登录');
          break;
        } catch (error) {
          // 继续尝试
        }
      }

      await this.browser.randomDelay(1000, 2000);

      // 输入手机号
      if (config.xhs.username) {
        const phoneInputSelectors = [
          'input[placeholder*="手机号"]',
          'input[type="tel"]',
          'input[name="phone"]',
          '.phone-input input',
          'input[placeholder*="请输入手机号"]'
        ];

        let phoneInputFound = false;
        for (const selector of phoneInputSelectors) {
          try {
            await this.browser.waitForSelector(selector, { timeout: 3000 });
            await this.browser.humanType(selector, config.xhs.username);
            phoneInputFound = true;
            logger.info('已输入手机号');
            break;
          } catch (error) {
            // 继续尝试
          }
        }

        if (!phoneInputFound) {
          throw new Error('未找到手机号输入框');
        }
      }

      // 等待用户完成验证码或密码输入
      logger.info('请在浏览器中完成登录验证（验证码/密码）...');
      logger.info('程序将等待登录完成...');

      // 等待登录完成
      await this.waitForLoginComplete();
      
      if (this.isLoggedIn) {
        // 保存cookies
        await this.browser.saveCookies();
        logger.info('登录成功，cookies已保存');
      }

    } catch (error) {
      logger.error('手动登录失败:', error);
      throw error;
    }
  }

  async waitForLoginComplete() {
    const maxWaitTime = 300000; // 5分钟超时
    const checkInterval = 3000; // 每3秒检查一次
    let waitedTime = 0;

    return new Promise((resolve, reject) => {
      const checkLoginStatus = async () => {
        try {
          const isLoggedIn = await this.checkLoginStatus();
          
          if (isLoggedIn) {
            this.isLoggedIn = true;
            clearInterval(this.loginCheckInterval);
            resolve(true);
            return;
          }

          waitedTime += checkInterval;
          if (waitedTime >= maxWaitTime) {
            clearInterval(this.loginCheckInterval);
            reject(new Error('登录等待超时'));
            return;
          }

          logger.debug(`等待登录完成... (${waitedTime / 1000}s/${maxWaitTime / 1000}s)`);
        } catch (error) {
          clearInterval(this.loginCheckInterval);
          reject(error);
        }
      };

      this.loginCheckInterval = setInterval(checkLoginStatus, checkInterval);
      checkLoginStatus(); // 立即检查一次
    });
  }

  async navigateToCreatorCenter() {
    try {
      if (!this.isLoggedIn) {
        throw new Error('用户未登录');
      }

      logger.info('导航到创作者中心...');
      await this.browser.goto(config.xhs.creatorUrl);
      
      // 等待页面加载
      await this.browser.randomDelay(3000, 5000);
      
      // 检查是否成功进入创作者中心
      const url = this.browser.page.url();
      if (!url.includes('creator.xiaohongshu.com')) {
        throw new Error('无法进入创作者中心');
      }

      logger.info('已成功进入创作者中心');
      return true;
    } catch (error) {
      logger.error('导航到创作者中心失败:', error);
      throw error;
    }
  }

  async createPost(content) {
    try {
      if (!this.isLoggedIn) {
        await this.login();
      }

      await this.navigateToCreatorCenter();

      logger.info('开始创建新帖子...');

      // 查找并点击发布按钮
      const publishButtonSelectors = [
        'button[class*="publish"]',
        '.publish-btn',
        'button[data-v-*=""][class*="create"]',
        '.create-btn',
        'a[href*="publish"]'
      ];

      let publishButtonFound = false;
      for (const selector of publishButtonSelectors) {
        try {
          await this.browser.waitForSelector(selector, { timeout: 5000 });
          await this.browser.humanClick(selector);
          publishButtonFound = true;
          logger.info(`找到发布按钮: ${selector}`);
          break;
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }

      if (!publishButtonFound) {
        throw new Error('未找到发布按钮');
      }

      await this.browser.randomDelay(2000, 4000);

      // 选择图文类型（如果有选择）
      const imageTextSelectors = [
        'button[class*="image-text"]',
        '.type-image-text',
        'div[data-type="image-text"]'
      ];

      for (const selector of imageTextSelectors) {
        try {
          await this.browser.waitForSelector(selector, { timeout: 3000 });
          await this.browser.humanClick(selector);
          logger.info('已选择图文类型');
          break;
        } catch (error) {
          // 可能没有类型选择，继续
        }
      }

      await this.browser.randomDelay(1000, 2000);

      // 输入标题
      if (content.title) {
        const titleInputSelectors = [
          'input[placeholder*="标题"]',
          'input[name="title"]',
          '.title-input input',
          'textarea[placeholder*="标题"]'
        ];

        for (const selector of titleInputSelectors) {
          try {
            await this.browser.waitForSelector(selector, { timeout: 5000 });
            await this.browser.humanType(selector, content.title);
            logger.info('已输入标题');
            break;
          } catch (error) {
            // 继续尝试
          }
        }
      }

      // 输入正文内容
      if (content.text) {
        const contentInputSelectors = [
          'textarea[placeholder*="内容"]',
          'textarea[placeholder*="正文"]',
          '.content-input textarea',
          'div[contenteditable="true"]',
          '.editor-content'
        ];

        for (const selector of contentInputSelectors) {
          try {
            await this.browser.waitForSelector(selector, { timeout: 5000 });
            await this.browser.humanType(selector, content.text);
            logger.info('已输入正文内容');
            break;
          } catch (error) {
            // 继续尝试
          }
        }
      }

      // 添加话题标签
      if (content.tags && content.tags.length > 0) {
        await this.addTags(content.tags);
      }

      // 发布帖子
      await this.publishPost();

      logger.info('帖子发布成功');
      return true;

    } catch (error) {
      logger.error('创建帖子失败:', error);
      throw error;
    }
  }

  async addTags(tags) {
    try {
      logger.info('添加话题标签...');
      
      for (const tag of tags) {
        // 在内容中添加话题标签
        const tagText = tag.startsWith('#') ? tag : `#${tag}`;
        
        // 查找内容输入框并添加标签
        const contentSelectors = [
          'textarea[placeholder*="内容"]',
          'div[contenteditable="true"]',
          '.editor-content'
        ];

        for (const selector of contentSelectors) {
          try {
            const element = await this.browser.page.$(selector);
            if (element) {
              await this.browser.page.evaluate((el, tag) => {
                if (el.tagName === 'TEXTAREA') {
                  el.value += ` ${tag}`;
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                  el.textContent += ` ${tag}`;
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }, element, tagText);
              
              await this.browser.randomDelay(500, 1000);
              break;
            }
          } catch (error) {
            // 继续尝试
          }
        }
      }

      logger.info(`已添加 ${tags.length} 个话题标签`);
    } catch (error) {
      logger.error('添加标签失败:', error);
    }
  }

  async publishPost() {
    try {
      logger.info('发布帖子...');

      // 查找并点击发布按钮
      const submitButtonSelectors = [
        'button[class*="submit"]',
        'button[class*="publish"]',
        '.submit-btn',
        '.publish-btn',
        'button[type="submit"]'
      ];

      for (const selector of submitButtonSelectors) {
        try {
          await this.browser.waitForSelector(selector, { timeout: 5000 });
          await this.browser.humanClick(selector);
          logger.info('已点击发布按钮');
          break;
        } catch (error) {
          // 继续尝试
        }
      }

      // 等待发布完成
      await this.browser.randomDelay(3000, 6000);

      // 检查是否发布成功
      const successIndicators = [
        '.success-message',
        '.publish-success',
        'div[class*="success"]'
      ];

      for (const selector of successIndicators) {
        try {
          await this.browser.waitForSelector(selector, { timeout: 10000 });
          logger.info('发布成功确认');
          return true;
        } catch (error) {
          // 继续检查
        }
      }

      // 如果没有明确的成功提示，检查URL变化
      await this.browser.randomDelay(5000, 8000);
      const currentUrl = this.browser.page.url();
      if (currentUrl.includes('success') || !currentUrl.includes('publish')) {
        logger.info('发布可能已成功（根据URL判断）');
        return true;
      }

      logger.warn('无法确认发布状态');
      return false;

    } catch (error) {
      logger.error('发布失败:', error);
      throw error;
    }
  }

  async close() {
    if (this.loginCheckInterval) {
      clearInterval(this.loginCheckInterval);
    }
    await this.browser.close();
  }
}

export default XiaohongshuService;