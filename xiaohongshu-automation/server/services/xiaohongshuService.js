const PuppeteerService = require('./puppeteerService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class XiaohongshuService extends PuppeteerService {
  constructor() {
    super();
    this.isLoggedIn = false;
    this.cookiesPath = path.join(__dirname, '../../data/cookies.json');
  }

  // 登录小红书
  async login(phone, password) {
    try {
      await this.initBrowser();
      
      // 先尝试使用保存的cookies登录
      if (await this.loadCookies()) {
        await this.navigateToXiaohongshu();
        if (await this.checkLoginStatus()) {
          this.isLoggedIn = true;
          logger.info('使用cookies登录成功');
          return { success: true, message: '登录成功' };
        }
      }

      // 如果cookies登录失败，进行正常登录流程
      await this.navigateToXiaohongshu();
      
      // 点击登录按钮
      await this.humanClick('.login-btn, [data-v-click="signIn"]');
      
      // 选择手机号登录
      await this.humanClick('.phone-login, [data-v-click="phoneLogin"]');
      
      // 输入手机号
      await this.humanType('input[placeholder*="手机号"], input[type="tel"]', phone);
      
      // 输入密码
      await this.humanType('input[placeholder*="密码"], input[type="password"]', password);
      
      // 模拟人类行为 - 随机滚动和移动鼠标
      await this.randomScroll();
      await this.randomDelay([1000, 2000]);
      
      // 点击登录
      await this.humanClick('.login-submit, button[type="submit"]');
      
      // 等待登录结果
      await this.page.waitForNavigation({ 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      }).catch(() => {
        // 忽略导航超时，可能已经登录成功
      });
      
      // 检查是否需要验证码
      if (await this.handleCaptcha()) {
        logger.info('处理验证码完成');
      }
      
      // 检查登录状态
      if (await this.checkLoginStatus()) {
        this.isLoggedIn = true;
        await this.saveCookies();
        logger.info('登录成功');
        return { success: true, message: '登录成功' };
      } else {
        throw new Error('登录失败，请检查账号密码');
      }
      
    } catch (error) {
      logger.error('登录过程出错:', error);
      await this.takeScreenshot('login_error');
      return { success: false, error: error.message };
    }
  }

  // 检查登录状态
  async checkLoginStatus() {
    try {
      // 等待页面加载
      await this.randomDelay([2000, 3000]);
      
      // 检查是否存在用户头像或登录状态指示器
      const loginIndicators = [
        '.user-info',
        '.avatar',
        '[data-v-click="userInfo"]',
        '.profile-entrance'
      ];
      
      for (const selector of loginIndicators) {
        const element = await this.page.$(selector);
        if (element) {
          return true;
        }
      }
      
      // 检查URL是否包含登录后的路径
      const currentUrl = this.page.url();
      if (currentUrl.includes('/user/') || currentUrl.includes('/creator/')) {
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('检查登录状态失败:', error);
      return false;
    }
  }

  // 处理验证码
  async handleCaptcha() {
    try {
      // 等待验证码出现
      await this.page.waitForSelector('.captcha, .geetest', { timeout: 5000 });
      
      logger.info('检测到验证码，等待用户手动处理...');
      
      // 在开发环境下，给用户时间手动处理验证码
      if (process.env.NODE_ENV !== 'production') {
        await this.randomDelay([30000, 60000]); // 等待30-60秒
      }
      
      return true;
    } catch (error) {
      // 没有验证码或验证码处理完成
      return false;
    }
  }

  // 发布笔记
  async publishNote(noteData) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('用户未登录');
      }

      const { title, content, images = [], tags = [] } = noteData;
      
      // 导航到发布页面
      await this.navigateToPublishPage();
      
      // 上传图片（如果有）
      if (images.length > 0) {
        await this.uploadImages(images);
      }
      
      // 输入标题
      await this.inputTitle(title);
      
      // 输入内容
      await this.inputContent(content, tags);
      
      // 设置发布选项
      await this.setPublishOptions();
      
      // 发布
      await this.submitPost();
      
      logger.info('笔记发布成功');
      return { success: true, message: '发布成功' };
      
    } catch (error) {
      logger.error('发布笔记失败:', error);
      await this.takeScreenshot('publish_error');
      return { success: false, error: error.message };
    }
  }

  // 导航到发布页面
  async navigateToPublishPage() {
    try {
      // 点击发布按钮
      const publishSelectors = [
        '.publish-btn',
        '[data-v-click="publish"]',
        '.creator-btn',
        'a[href*="/publish"]'
      ];
      
      let clicked = false;
      for (const selector of publishSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          await this.humanClick(selector);
          clicked = true;
          break;
        }
      }
      
      if (!clicked) {
        // 直接导航到发布页面
        await this.page.goto('https://creator.xiaohongshu.com/publish/publish', {
          waitUntil: 'networkidle2'
        });
      }
      
      await this.randomDelay([2000, 3000]);
      logger.info('成功导航到发布页面');
    } catch (error) {
      logger.error('导航到发布页面失败:', error);
      throw error;
    }
  }

  // 上传图片
  async uploadImages(images) {
    try {
      const uploadInput = await this.page.$('input[type="file"], .upload-input');
      if (!uploadInput) {
        logger.warn('未找到图片上传组件');
        return;
      }
      
      // 上传每张图片
      for (const imagePath of images) {
        await uploadInput.uploadFile(imagePath);
        await this.randomDelay([1000, 2000]);
        logger.info(`图片上传成功: ${imagePath}`);
      }
      
      // 等待图片处理完成
      await this.randomDelay([3000, 5000]);
    } catch (error) {
      logger.error('图片上传失败:', error);
      throw error;
    }
  }

  // 输入标题
  async inputTitle(title) {
    try {
      const titleSelectors = [
        'input[placeholder*="标题"]',
        '.title-input input',
        '[data-placeholder*="标题"] input'
      ];
      
      for (const selector of titleSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          await this.humanType(selector, title);
          logger.info('标题输入完成');
          return;
        }
      }
      
      throw new Error('未找到标题输入框');
    } catch (error) {
      logger.error('输入标题失败:', error);
      throw error;
    }
  }

  // 输入内容
  async inputContent(content, tags) {
    try {
      const contentSelectors = [
        '.content-editor',
        'textarea[placeholder*="内容"]',
        '.rich-editor textarea',
        '[contenteditable="true"]'
      ];
      
      // 组合内容和标签
      const fullContent = content + '\n\n' + tags.map(tag => `#${tag}`).join(' ');
      
      for (const selector of contentSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          await this.humanType(selector, fullContent);
          logger.info('内容输入完成');
          return;
        }
      }
      
      throw new Error('未找到内容输入框');
    } catch (error) {
      logger.error('输入内容失败:', error);
      throw error;
    }
  }

  // 设置发布选项
  async setPublishOptions() {
    try {
      // 设置为公开发布
      const publicSelector = '.publish-public, input[value="public"]';
      const publicElement = await this.page.$(publicSelector);
      if (publicElement) {
        await this.humanClick(publicSelector);
      }
      
      // 其他发布设置...
      await this.randomDelay([1000, 2000]);
    } catch (error) {
      logger.warn('设置发布选项失败:', error);
      // 不抛出错误，使用默认设置
    }
  }

  // 提交发布
  async submitPost() {
    try {
      const submitSelectors = [
        '.publish-submit',
        'button[type="submit"]',
        '.confirm-publish',
        '[data-v-click="publish"]'
      ];
      
      for (const selector of submitSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          await this.humanClick(selector);
          break;
        }
      }
      
      // 等待发布完成
      await this.randomDelay([3000, 5000]);
      
      // 检查是否发布成功
      const successIndicators = [
        '.success-message',
        '.publish-success',
        'text="发布成功"'
      ];
      
      for (const indicator of successIndicators) {
        const element = await this.page.$(indicator);
        if (element) {
          return true;
        }
      }
      
      logger.info('发布提交完成');
      return true;
    } catch (error) {
      logger.error('提交发布失败:', error);
      throw error;
    }
  }

  // 保存cookies
  async saveCookies() {
    try {
      const cookies = await this.page.cookies();
      await fs.writeFile(this.cookiesPath, JSON.stringify(cookies, null, 2));
      logger.info('Cookies保存成功');
    } catch (error) {
      logger.error('保存cookies失败:', error);
    }
  }

  // 加载cookies
  async loadCookies() {
    try {
      const cookiesContent = await fs.readFile(this.cookiesPath, 'utf8');
      const cookies = JSON.parse(cookiesContent);
      await this.page.setCookie(...cookies);
      logger.info('Cookies加载成功');
      return true;
    } catch (error) {
      logger.warn('加载cookies失败:', error);
      return false;
    }
  }

  // 获取账号信息
  async getAccountInfo() {
    try {
      if (!this.isLoggedIn) {
        throw new Error('用户未登录');
      }
      
      // 导航到个人主页
      await this.page.goto('https://www.xiaohongshu.com/user/profile', {
        waitUntil: 'networkidle2'
      });
      
      // 提取账号信息
      const accountInfo = await this.page.evaluate(() => {
        const nameElement = document.querySelector('.username, .user-name');
        const fansElement = document.querySelector('.fans-count, .follower-count');
        const notesElement = document.querySelector('.notes-count, .note-count');
        
        return {
          name: nameElement?.textContent?.trim() || '',
          fans: fansElement?.textContent?.trim() || '0',
          notes: notesElement?.textContent?.trim() || '0'
        };
      });
      
      return { success: true, data: accountInfo };
    } catch (error) {
      logger.error('获取账号信息失败:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = XiaohongshuService;