const OpenAI = require('openai');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    });
  }

  // 生成内推内容
  async generateReferralContent(params) {
    try {
      const { company, position, referralCode, additionalInfo } = params;
      
      const systemPrompt = `你是一个专业的小红书内容创作者，擅长写吸引人的内推贴。你需要：
1. 使用小红书的写作风格（emoji、分段、话题标签）
2. 内容要真诚、有用，避免过度营销
3. 突出内推的优势和价值
4. 保持内容的多样性，避免模板化
5. 字数控制在300-500字`;

      const userPrompt = `请为以下内容生成一篇小红书内推帖：

公司：${company}
职位：${position}
内推码：${referralCode}
${additionalInfo ? `附加信息：${additionalInfo}` : ''}

要求：
- 标题要吸引人，包含相关关键词
- 正文要有吸引力，突出职位优势
- 自然地融入内推码
- 添加相关的话题标签
- 使用适当的emoji增加可读性
- 提供一些求职建议或公司内部信息

请以JSON格式返回，包含title（标题）、content（正文）、tags（话题标签数组）字段。`;

      const completion = await this.openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8, // 增加创造性
        max_tokens: 1000
      });

      const response = completion.choices[0].message.content;
      
      // 尝试解析JSON响应
      try {
        const parsedContent = JSON.parse(response);
        return {
          success: true,
          data: parsedContent
        };
      } catch (parseError) {
        // 如果JSON解析失败，尝试提取内容
        return {
          success: true,
          data: {
            title: this.extractTitle(response),
            content: this.extractContent(response),
            tags: this.extractTags(response)
          }
        };
      }
    } catch (error) {
      logger.error('AI内容生成失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 生成多样化内容变体
  async generateContentVariations(baseContent, count = 3) {
    try {
      const systemPrompt = `基于以下内容，生成${count}个不同的变体版本。每个版本都要：
1. 保持核心信息不变
2. 改变表达方式和结构
3. 使用不同的emoji和话题标签
4. 避免重复和雷同`;

      const userPrompt = `原始内容：
标题：${baseContent.title}
正文：${baseContent.content}
标签：${baseContent.tags?.join(', ')}

请生成${count}个不同的版本，以JSON数组格式返回。`;

      const completion = await this.openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.9,
        max_tokens: 2000
      });

      const response = completion.choices[0].message.content;
      const variations = JSON.parse(response);
      
      return {
        success: true,
        data: variations
      };
    } catch (error) {
      logger.error('内容变体生成失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 内容检查和优化
  async checkAndOptimizeContent(content) {
    try {
      const systemPrompt = `你是一个小红书内容审核专家。请检查以下内容是否：
1. 符合小红书社区规范
2. 避免过度营销
3. 语言自然流畅
4. 包含适当的互动元素

如果有问题，请提供优化建议。`;

      const userPrompt = `请检查以下内容：
标题：${content.title}
正文：${content.content}

返回检查结果和优化建议（JSON格式）。`;

      const completion = await this.openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const response = completion.choices[0].message.content;
      return {
        success: true,
        data: JSON.parse(response)
      };
    } catch (error) {
      logger.error('内容检查失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 辅助方法：提取标题
  extractTitle(text) {
    const titleMatch = text.match(/标题[：:]\s*(.+)/);
    return titleMatch ? titleMatch[1].trim() : '【内推机会】优质岗位推荐 💼';
  }

  // 辅助方法：提取正文
  extractContent(text) {
    const contentMatch = text.match(/正文[：:]\s*([\s\S]+?)(?=标签|$)/);
    return contentMatch ? contentMatch[1].trim() : text;
  }

  // 辅助方法：提取标签
  extractTags(text) {
    const tagsMatch = text.match(/标签[：:]\s*(.+)/);
    if (tagsMatch) {
      return tagsMatch[1].split(/[，,、]/).map(tag => tag.trim().replace(/[#＃]/, ''));
    }
    return ['内推', '求职', '招聘', '职场'];
  }

  // 获取预设模板
  getTemplates() {
    return [
      {
        name: '技术岗内推',
        prompt: '技术岗位内推，突出技术栈和成长机会',
        variables: ['company', 'position', 'techStack', 'referralCode']
      },
      {
        name: '产品岗内推',
        prompt: '产品经理岗位内推，突出产品线和发展前景',
        variables: ['company', 'position', 'products', 'referralCode']
      },
      {
        name: '运营岗内推',
        prompt: '运营岗位内推，突出业务增长和团队氛围',
        variables: ['company', 'position', 'business', 'referralCode']
      }
    ];
  }
}

module.exports = AIService;