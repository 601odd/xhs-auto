import OpenAI from 'openai';
import { createLogger } from '../utils/logger.js';
import config from '../config/index.js';

const logger = createLogger('contentGenerator');

class ContentGenerator {
  constructor() {
    if (!config.openai.apiKey) {
      logger.warn('未配置OpenAI API密钥，AI内容生成功能将无法使用');
      this.openai = null;
      return;
    }

    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL
    });
  }

  async generateReferralPost() {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API未配置');
      }

      logger.info('生成内推内容...');

      const prompt = `
你是一个小红书内容创作者，专门分享职场内推信息。请为我生成一篇关于内推的小红书帖子。

要求：
1. 标题要吸引人，包含关键词"内推"
2. 正文要真诚、有用，分享内推的价值和机会
3. 内容要符合小红书的风格，使用表情符号
4. 提到内推码：${config.xhs.referralCode}
5. 字数控制在200-300字
6. 添加3-5个相关话题标签

请按以下JSON格式返回：
{
  "title": "标题",
  "text": "正文内容",
  "tags": ["话题1", "话题2", "话题3"]
}
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的小红书内容创作者，擅长创作吸引人的职场相关内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.8
      });

      const content = response.choices[0].message.content;
      logger.debug('生成的原始内容:', content);

      // 尝试解析JSON
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        logger.error('解析AI生成内容失败，使用默认格式');
        parsedContent = this.parseContentFromText(content);
      }

      // 确保内容完整性
      const finalContent = {
        title: parsedContent.title || '💼 内推机会分享',
        text: parsedContent.text || this.getDefaultReferralText(),
        tags: parsedContent.tags || ['内推', '求职', '职场', '工作机会']
      };

      logger.info('内推内容生成成功');
      return finalContent;

    } catch (error) {
      logger.error('生成内推内容失败:', error);
      // 返回默认内容
      return this.getDefaultReferralContent();
    }
  }

  async generateCustomPost(topic, requirements = {}) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API未配置');
      }

      logger.info(`生成自定义内容: ${topic}`);

      const prompt = `
请为我生成一篇关于"${topic}"的小红书帖子。

要求：
${requirements.style ? `1. 风格：${requirements.style}` : '1. 风格：小红书热门帖子风格'}
${requirements.length ? `2. 字数：${requirements.length}字左右` : '2. 字数：200-300字'}
${requirements.target ? `3. 目标用户：${requirements.target}` : '3. 目标用户：年轻职场人群'}
4. 使用合适的表情符号
5. 内容要真实、有价值
${config.xhs.referralCode ? `6. 如果相关，可以提到内推码：${config.xhs.referralCode}` : ''}

请按以下JSON格式返回：
{
  "title": "标题",
  "text": "正文内容", 
  "tags": ["话题1", "话题2", "话题3"]
}
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的小红书内容创作者，擅长创作各种类型的优质内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.8
      });

      const content = response.choices[0].message.content;
      let parsedContent;

      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        logger.error('解析AI生成内容失败，使用默认格式');
        parsedContent = this.parseContentFromText(content);
      }

      const finalContent = {
        title: parsedContent.title || `关于${topic}的分享`,
        text: parsedContent.text || `今天想和大家分享一下关于${topic}的一些想法...`,
        tags: parsedContent.tags || [topic, '分享', '日常']
      };

      logger.info('自定义内容生成成功');
      return finalContent;

    } catch (error) {
      logger.error('生成自定义内容失败:', error);
      return {
        title: `关于${topic}的分享`,
        text: `今天想和大家分享一下关于${topic}的一些想法和经验，希望对大家有帮助！✨`,
        tags: [topic, '分享', '日常']
      };
    }
  }

  parseContentFromText(text) {
    try {
      // 尝试从文本中提取结构化内容
      const lines = text.split('\n').filter(line => line.trim());
      
      let title = '';
      let content = '';
      let tags = [];

      for (const line of lines) {
        if (line.includes('标题') || line.includes('title')) {
          title = line.replace(/.*[:：]/, '').trim().replace(/["""]/g, '');
        } else if (line.includes('正文') || line.includes('内容') || line.includes('text')) {
          content = line.replace(/.*[:：]/, '').trim().replace(/["""]/g, '');
        } else if (line.includes('标签') || line.includes('话题') || line.includes('tags')) {
          const tagText = line.replace(/.*[:：]/, '').trim();
          tags = tagText.split(/[,，、]/).map(tag => tag.trim().replace(/[#\[\]"""]/g, ''));
        }
      }

      return {
        title: title || '分享内容',
        text: content || text.substring(0, 200),
        tags: tags.length > 0 ? tags : ['分享']
      };
    } catch (error) {
      logger.error('解析文本内容失败:', error);
      return {
        title: '分享内容',
        text: text.substring(0, 200),
        tags: ['分享']
      };
    }
  }

  getDefaultReferralContent() {
    return {
      title: '💼 内推机会来啦！优质岗位等你来',
      text: `大家好！又到了分享内推机会的时候啦～🎉

🌟 最近收集了一些不错的岗位信息：
• 技术类：前端、后端、算法工程师
• 产品类：产品经理、产品运营  
• 设计类：UI/UX设计师
• 市场类：市场营销、品牌推广

💡 内推的好处：
✅ 简历直达HR，避免海投石沉大海
✅ 内部推荐通道，流程更快
✅ 有内推人了解情况，准备更充分

感兴趣的小伙伴可以私信我，备注【内推+岗位】
内推码：${config.xhs.referralCode || 'YOUR_CODE'}

#内推 #求职 #职场 #工作机会 #校招`,
      tags: ['内推', '求职', '职场', '工作机会', '校招']
    };
  }

  getDefaultReferralText() {
    return `大家好！又到了分享内推机会的时候啦～🎉

🌟 最近收集了一些不错的岗位信息，各个方向都有！

💡 内推的好处：
✅ 简历直达HR
✅ 流程更快
✅ 准备更充分

感兴趣可以私信，内推码：${config.xhs.referralCode || 'YOUR_CODE'}`;
  }

  // 生成话题标签建议
  async generateTopicSuggestions(content) {
    try {
      if (!this.openai) {
        return ['分享', '日常', '生活'];
      }

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: '你是小红书话题标签专家，根据内容推荐合适的话题标签。'
          },
          {
            role: 'user',
            content: `请为以下内容推荐3-5个小红书话题标签：\n\n${content}\n\n只返回标签列表，用逗号分隔，不要包含#号。`
          }
        ],
        max_tokens: 100,
        temperature: 0.5
      });

      const tags = response.choices[0].message.content
        .split(/[,，、]/)
        .map(tag => tag.trim().replace(/[#]/g, ''))
        .filter(tag => tag.length > 0)
        .slice(0, 5);

      return tags.length > 0 ? tags : ['分享', '日常', '生活'];

    } catch (error) {
      logger.error('生成话题标签失败:', error);
      return ['分享', '日常', '生活'];
    }
  }

  // 内容优化
  async optimizeContent(content) {
    try {
      if (!this.openai) {
        return content;
      }

      logger.info('优化内容...');

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: '你是小红书内容优化专家，帮助优化内容使其更符合平台特点和用户喜好。'
          },
          {
            role: 'user',
            content: `请优化以下小红书内容，使其更吸引人、更符合平台风格：\n\n${content}\n\n保持原意，但让表达更生动、更有感染力。`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const optimizedContent = response.choices[0].message.content.trim();
      logger.info('内容优化完成');
      
      return optimizedContent;

    } catch (error) {
      logger.error('内容优化失败:', error);
      return content;
    }
  }
}

export default ContentGenerator;