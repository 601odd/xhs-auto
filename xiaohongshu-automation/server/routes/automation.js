const express = require('express');
const router = express.Router();
const XiaohongshuService = require('../services/xiaohongshuService');
const AIService = require('../services/aiService');
const logger = require('../utils/logger');

let xhsService = null;
const aiService = new AIService();

// 登录
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }
    
    xhsService = new XiaohongshuService();
    const result = await xhsService.login(phone, password);
    
    res.json(result);
  } catch (error) {
    logger.error('登录API错误:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 检查登录状态
router.get('/status', async (req, res) => {
  try {
    if (!xhsService) {
      return res.json({ isLoggedIn: false });
    }
    
    const isLoggedIn = xhsService.isLoggedIn;
    const accountInfo = isLoggedIn ? await xhsService.getAccountInfo() : null;
    
    res.json({
      isLoggedIn,
      accountInfo: accountInfo?.data || null
    });
  } catch (error) {
    logger.error('状态检查API错误:', error);
    res.status(500).json({ error: '状态检查失败' });
  }
});

// 发布笔记
router.post('/publish', async (req, res) => {
  try {
    if (!xhsService || !xhsService.isLoggedIn) {
      return res.status(401).json({ error: '用户未登录' });
    }
    
    const { title, content, images, tags } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }
    
    const noteData = {
      title,
      content,
      images: images || [],
      tags: tags || []
    };
    
    const result = await xhsService.publishNote(noteData);
    res.json(result);
  } catch (error) {
    logger.error('发布笔记API错误:', error);
    res.status(500).json({ error: '发布失败' });
  }
});

// 生成AI内容
router.post('/generate-content', async (req, res) => {
  try {
    const { company, position, referralCode, additionalInfo } = req.body;
    
    if (!company || !position || !referralCode) {
      return res.status(400).json({ error: '公司、职位和内推码不能为空' });
    }
    
    const result = await aiService.generateReferralContent({
      company,
      position,
      referralCode,
      additionalInfo
    });
    
    res.json(result);
  } catch (error) {
    logger.error('生成内容API错误:', error);
    res.status(500).json({ error: '内容生成失败' });
  }
});

// 生成内容变体
router.post('/generate-variations', async (req, res) => {
  try {
    const { content, count = 3 } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: '基础内容不能为空' });
    }
    
    const result = await aiService.generateContentVariations(content, count);
    res.json(result);
  } catch (error) {
    logger.error('生成变体API错误:', error);
    res.status(500).json({ error: '变体生成失败' });
  }
});

// 一键发布（生成+发布）
router.post('/auto-publish', async (req, res) => {
  try {
    if (!xhsService || !xhsService.isLoggedIn) {
      return res.status(401).json({ error: '用户未登录' });
    }
    
    const { company, position, referralCode, additionalInfo } = req.body;
    
    if (!company || !position || !referralCode) {
      return res.status(400).json({ error: '公司、职位和内推码不能为空' });
    }
    
    // 生成内容
    const contentResult = await aiService.generateReferralContent({
      company,
      position,
      referralCode,
      additionalInfo
    });
    
    if (!contentResult.success) {
      return res.status(500).json({ error: '内容生成失败', details: contentResult.error });
    }
    
    // 发布笔记
    const publishResult = await xhsService.publishNote({
      title: contentResult.data.title,
      content: contentResult.data.content,
      tags: contentResult.data.tags || []
    });
    
    res.json({
      success: publishResult.success,
      generatedContent: contentResult.data,
      publishResult: publishResult
    });
  } catch (error) {
    logger.error('自动发布API错误:', error);
    res.status(500).json({ error: '自动发布失败' });
  }
});

// 关闭浏览器
router.post('/close', async (req, res) => {
  try {
    if (xhsService) {
      await xhsService.closeBrowser();
      xhsService = null;
    }
    res.json({ success: true, message: '浏览器已关闭' });
  } catch (error) {
    logger.error('关闭浏览器API错误:', error);
    res.status(500).json({ error: '关闭失败' });
  }
});

// 获取AI模板
router.get('/templates', (req, res) => {
  try {
    const templates = aiService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('获取模板API错误:', error);
    res.status(500).json({ error: '获取模板失败' });
  }
});

module.exports = router;