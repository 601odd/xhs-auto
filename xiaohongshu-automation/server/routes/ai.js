const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');
const logger = require('../utils/logger');

const aiService = new AIService();

// 生成内容
router.post('/generate', async (req, res) => {
  try {
    const { company, position, referralCode, additionalInfo } = req.body;
    
    if (!company || !position || !referralCode) {
      return res.status(400).json({ 
        success: false, 
        error: '公司、职位和内推码不能为空' 
      });
    }
    
    const result = await aiService.generateReferralContent({
      company,
      position,
      referralCode,
      additionalInfo
    });
    
    res.json(result);
  } catch (error) {
    logger.error('AI生成内容错误:', error);
    res.status(500).json({ 
      success: false, 
      error: '内容生成失败' 
    });
  }
});

// 检查和优化内容
router.post('/optimize', async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        error: '标题和内容不能为空' 
      });
    }
    
    const result = await aiService.checkAndOptimizeContent({
      title,
      content
    });
    
    res.json(result);
  } catch (error) {
    logger.error('AI优化内容错误:', error);
    res.status(500).json({ 
      success: false, 
      error: '内容优化失败' 
    });
  }
});

// 生成内容变体
router.post('/variations', async (req, res) => {
  try {
    const { content, count = 3 } = req.body;
    
    if (!content || !content.title || !content.content) {
      return res.status(400).json({ 
        success: false, 
        error: '基础内容格式不正确' 
      });
    }
    
    const result = await aiService.generateContentVariations(content, parseInt(count));
    res.json(result);
  } catch (error) {
    logger.error('AI生成变体错误:', error);
    res.status(500).json({ 
      success: false, 
      error: '变体生成失败' 
    });
  }
});

// 获取预设模板
router.get('/templates', (req, res) => {
  try {
    const templates = aiService.getTemplates();
    res.json({ 
      success: true, 
      data: templates 
    });
  } catch (error) {
    logger.error('获取AI模板错误:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取模板失败' 
    });
  }
});

// 测试AI连接
router.get('/test', async (req, res) => {
  try {
    // 简单的测试请求
    const testResult = await aiService.generateReferralContent({
      company: '测试公司',
      position: '测试职位',
      referralCode: 'TEST123',
      additionalInfo: '这是一个连接测试'
    });
    
    if (testResult.success) {
      res.json({ 
        success: true, 
        message: 'AI服务连接正常',
        testContent: testResult.data
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'AI服务连接失败',
        details: testResult.error
      });
    }
  } catch (error) {
    logger.error('AI连接测试错误:', error);
    res.status(500).json({ 
      success: false, 
      error: 'AI服务连接失败' 
    });
  }
});

module.exports = router;