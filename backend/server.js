const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const os = require('os');

// 引入配置模块
const { readConfig, writeConfig } = require('./config');
const {
  initDatabase,
  migrateLegacyData,
  readData,
  writeData,
  readInterviews,
  writeInterviews
} = require('./database');

// 获取服务器IP地址
function getServerIP() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const interface = interfaces[interfaceName];
    for (const iface of interface) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const SERVER_IP = getServerIP();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.get('/api/recruitment', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '读取数据失败' });
  }
});

app.post('/api/recruitment', async (req, res) => {
  try {
    const data = await readData();
    const newItem = {
      id: Date.now(),
      type: req.body.type || 'social',
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.push(newItem);
    await writeData(data);
    res.json(newItem);
  } catch (error) {
    console.error('创建失败，详细错误:', error);
    res.status(500).json({ error: '创建失败: ' + error.message });
  }
});

app.put('/api/recruitment/:id', async (req, res) => {
  try {
    const data = await readData();
    const index = data.findIndex(item => item.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: '未找到' });
    }
    data[index] = { 
      ...data[index], 
      type: req.body.type || data[index].type || 'social',
      ...req.body, 
      updatedAt: new Date().toISOString() 
    };
    await writeData(data);
    res.json(data[index]);
  } catch (error) {
    res.status(500).json({ error: '更新失败' });
  }
});

app.delete('/api/recruitment/:id', async (req, res) => {
  try {
    const data = await readData();
    const filtered = data.filter(item => item.id !== parseInt(req.params.id));
    await writeData(filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除失败' });
  }
});

app.get('/api/interviews', async (req, res) => {
  try {
    const data = await readInterviews();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '读取面试数据失败' });
  }
});

app.post('/api/interviews', async (req, res) => {
  try {
    const data = await readInterviews();
    let interviewData = { ...req.body };
    
    if (req.body.positionId) {
      try {
        const recruitmentData = await readData();
        const position = recruitmentData.find(p => p.id === req.body.positionId);
        if (position && position.department) {
          interviewData.department = position.department;
        }
      } catch (err) {
        console.log('无法获取岗位信息:', err.message);
      }
    }
    
    const newItem = {
      id: Date.now(),
      ...interviewData,
      createdAt: new Date().toISOString()
    };
    data.push(newItem);
    await writeInterviews(data);
    res.json(newItem);
  } catch (error) {
    res.status(500).json({ error: '创建面试失败' });
  }
});

app.delete('/api/interviews/:id', async (req, res) => {
  try {
    const data = await readInterviews();
    const filtered = data.filter(item => item.id !== parseInt(req.params.id));
    await writeInterviews(filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除面试失败' });
  }
});

app.put('/api/interviews/:id', async (req, res) => {
  try {
    const data = await readInterviews();
    const index = data.findIndex(item => item.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: '未找到面试记录' });
    }
    
    let updatedData = { ...req.body };
    
    if (req.body.positionId) {
      try {
        const recruitmentData = await readData();
        const position = recruitmentData.find(p => p.id === req.body.positionId);
        if (position && position.department) {
          updatedData.department = position.department;
        }
      } catch (err) {
        console.log('无法获取岗位信息:', err.message);
      }
    }
    
    // 保留feedbackSubmitted字段的值，同时更新其他字段
    data[index] = { 
      ...data[index], 
      ...updatedData,
      // 保留原有的feedbackSubmitted状态
      feedbackSubmitted: data[index].feedbackSubmitted || false
    };
    await writeInterviews(data);
    res.json(data[index]);
  } catch (error) {
    res.status(500).json({ error: '更新面试失败' });
  }
});

app.post('/api/interviews/:id/generate-share-link', async (req, res) => {
  try {
    const data = await readInterviews();
    const index = data.findIndex(item => item.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: '未找到面试记录' });
    }
    
    const shareId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    
    data[index].shareId = shareId;
    data[index].shareLink = `${req.protocol}://${SERVER_IP}:${PORT}/share-feedback/${shareId}`;
    data[index].feedbackSubmitted = false;
    
    await writeInterviews(data);
    
    res.json({ 
      success: true, 
      shareId: shareId,
      shareLink: data[index].shareLink
    });
  } catch (error) {
    console.error('生成分享链接失败:', error);
    res.status(500).json({ error: '生成分享链接失败' });
  }
});

app.get('/api/interviews/share/:shareId', async (req, res) => {
  try {
    const data = await readInterviews();
    const interview = data.find(item => item.shareId === req.params.shareId);
    if (!interview) {
      return res.status(404).json({ error: '无效的分享链接' });
    }
    
    if (interview.feedbackSubmitted) {
      return res.status(400).json({ error: '该面试反馈已提交' });
    }
    
    res.json({
      success: true,
      interview: {
        id: interview.id,
        position: interview.position,
        candidateName: interview.candidateName,
        interviewTime: interview.interviewTime
      }
    });
  } catch (error) {
    console.error('获取分享信息失败:', error);
    res.status(500).json({ error: '获取分享信息失败' });
  }
});

app.post('/api/interviews/share/:shareId/feedback', async (req, res) => {
  try {
    const data = await readInterviews();
    const index = data.findIndex(item => item.shareId === req.params.shareId);
    if (index === -1) {
      return res.status(404).json({ error: '无效的分享链接' });
    }
    
    if (data[index].feedbackSubmitted) {
      return res.status(400).json({ error: '该面试反馈已提交' });
    }
    
    data[index].feedback = req.body.feedback;
    data[index].feedbackSubmitted = true;
    data[index].feedbackSubmittedAt = new Date().toISOString();
    
    await writeInterviews(data);
    
    res.json({ success: true, message: '反馈提交成功' });
  } catch (error) {
    console.error('提交分享反馈失败:', error);
    res.status(500).json({ error: '提交反馈失败' });
  }
});

// 批量更新所有使用localhost的分享链接为IP地址
app.post('/api/interviews/update-share-links', async (req, res) => {
  try {
    const data = await readInterviews();
    let updatedCount = 0;
    
    data.forEach(interview => {
      if (interview.shareLink && interview.shareLink.includes('localhost:3000')) {
        // 替换localhost为服务器IP地址
        interview.shareLink = interview.shareLink.replace('localhost:3000', `${SERVER_IP}:${PORT}`);
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      await writeInterviews(data);
    }
    
    res.json({ 
      success: true, 
      message: `成功更新了 ${updatedCount} 个分享链接`,
      updatedCount: updatedCount
    });
  } catch (error) {
    console.error('批量更新分享链接失败:', error);
    res.status(500).json({ error: '批量更新分享链接失败' });
  }
});

app.post('/api/llm/image-recognition', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '缺少图片参数' });
    }
    
    // 读取后端配置
    const config = await readConfig();
    const { apiKey, baseURL, model } = config.llm;
    
    if (!apiKey || !baseURL || !model) {
      return res.status(400).json({ error: '后端未配置大模型API参数' });
    }
    
    const prompt = `请分析这张招聘图片，提取出所有的岗位信息。
要求：
1. 提取每个岗位的以下信息：
   - 岗位名称 (position)
   - 经验要求 (experience，例如：3-5年、经验不限、应届生等)
   - 学历要求 (education，例如：本科、大专、硕士等)
   - 薪资范围 (salary，例如：15-25K、8-13K·15薪、120-150元/天等)
   - 招聘类型 (recruitmentType，可选值：社招、校招、实习，如果无法判断则留空)
   - 工作地点 (location，例如：武汉、北京、上海等)
2. 如果某个信息不存在，可以留空或不返回该字段
3. 以JSON数组格式返回，每个岗位为一个对象
4. 只返回JSON数据，不要返回其他解释性文字

请直接返回JSON格式的结果，格式如下：
[
  {
    "position": "岗位名称",
    "experience": "3-5年",
    "education": "本科",
    "salary": "15-25K",
    "recruitmentType": "社招",
    "location": "武汉"
  }
]`;

    const compatibleBaseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

    const response = await axios.post(
      `${compatibleBaseURL}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    let content;
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      content = response.data.choices[0].message.content.trim();
    } else {
      throw new Error('阿里云通义千问响应格式异常');
    }
    
    console.log('大模型识别结果:', content);
    
    if (!content) {
      return res.json({ success: true, jobs: [] });
    }
    
    let jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      throw new Error('无法解析大模型返回的JSON数据');
    }
    
    let jsonStr = jsonMatch[0];
    
    jsonStr = jsonStr
      .replace(/,(\s*[\}\]])/g, '$1')
      .replace(/,(\s*\])/g, '$1');
    
    console.log('清理后的JSON:', jsonStr);
    
    let jobs = JSON.parse(jsonStr);
    
    jobs = jobs.filter(job => job && job.position);
    
    jobs = jobs.map(job => ({
      position: job.position,
      experience: job.experience || job.Experience || '',
      education: job.education || job.Education || '',
      salary: job.salary || job.Salary || '',
      recruitmentType: job.recruitmentType || job.RecruitmentType || '',
      location: job.location || job.Location || ''
    }));
    
    console.log('最终处理的岗位数据:', jobs);
    
    res.json({ success: true, jobs });
  } catch (error) {
    console.error('大模型调用失败:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'API密钥无效，请检查配置' });
    } else if (error.response?.status === 429) {
      res.status(429).json({ error: 'API调用次数超限，请稍后重试' });
    } else {
      res.status(500).json({ error: '大模型调用失败: ' + (error.message || '未知错误') });
    }
  }
});

// 获取配置
app.get('/api/config', async (req, res) => {
  try {
    const config = await readConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ error: '获取配置失败' });
  }
});

// 设置配置
app.post('/api/config', async (req, res) => {
  try {
    const { llm } = req.body;
    
    if (!llm) {
      return res.status(400).json({ error: '缺少配置参数' });
    }
    
    // 读取当前配置
    const currentConfig = await readConfig();
    // 合并新配置
    const newConfig = {
      ...currentConfig,
      llm: {
        ...currentConfig.llm,
        ...llm
      }
    };
    
    // 写入配置
    const success = await writeConfig(newConfig);
    
    if (success) {
      res.json({ success: true, message: '配置保存成功' });
    } else {
      res.status(500).json({ error: '配置保存失败' });
    }
  } catch (error) {
    console.error('设置配置失败:', error);
    res.status(500).json({ error: '设置配置失败' });
  }
});

app.post('/api/llm/test-connection', async (req, res) => {
  try {
    // 读取后端配置
    const config = await readConfig();
    const { apiKey, baseURL, model } = config.llm;
    
    if (!apiKey || !baseURL || !model) {
      return res.status(400).json({ error: '后端未配置大模型API参数' });
    }
    
    const compatibleBaseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    
    const response = await axios.post(
      `${compatibleBaseURL}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'user',
            content: '你好，请回复"连接成功"'
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    let isSuccess = false;
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      isSuccess = true;
    }
    
    if (isSuccess) {
      res.json({ success: true, message: '连接测试成功' });
    } else {
      res.status(500).json({ error: '连接成功，但返回格式异常' });
    }
  } catch (error) {
    console.error('连接测试失败:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'API密钥无效' });
    } else if (error.response?.status === 429) {
      res.status(429).json({ error: 'API调用次数超限' });
    } else {
      res.status(500).json({ error: '连接失败: ' + (error.message || '未知错误') });
    }
  }
});

app.post('/api/llm/interview-recognition', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '缺少图片参数' });
    }
    
    // 读取后端配置
    const config = await readConfig();
    const { apiKey, baseURL, model } = config.llm;
    
    if (!apiKey || !baseURL || !model) {
      return res.status(400).json({ error: '后端未配置大模型API参数' });
    }
    
    const prompt = `请分析这张面试安排图片，提取出所有的面试信息。
要求：
1. 提取每个面试者的以下信息：
   - 姓名 (candidateName)
   - 时间 (interviewTime，格式为YYYY-MM-DD HH:mm:ss，如果只有时间没有日期，默认为2026年的当天)
   - 岗位 (position)
   - 电话 (phone)
   - 面试类型 (interviewType，可选值：phone-电话面试, video-视频面试, onsite-现场面试)
2. 如果某个信息不存在，可以留空或不返回该字段
3. 以JSON数组格式返回，每个面试者为一个对象
4. 只返回JSON数据，不要返回其他解释性文字
5. 注意：年份应该是2026年，不要使用其他年份

请直接返回JSON格式的结果，格式如下：
[
  {
    "candidateName": "姓名",
    "interviewTime": "2026-02-14 10:30:00",
    "position": "岗位",
    "phone": "电话",
    "interviewType": "onsite"
  }
]`;

    const compatibleBaseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

    const response = await axios.post(
      `${compatibleBaseURL}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    let content;
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      content = response.data.choices[0].message.content.trim();
    } else {
      throw new Error('阿里云通义千问响应格式异常');
    }
    
    console.log('大模型识别结果:', content);
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('无法解析大模型返回的JSON数据');
    }
    
    const interviews = JSON.parse(jsonMatch[0]);
    res.json({ success: true, interviews });
  } catch (error) {
    console.error('大模型调用失败:', error);
    if (error.response?.status === 401) {
      res.status(401).json({ error: 'API密钥无效，请检查配置' });
    } else if (error.response?.status === 429) {
      res.status(429).json({ error: 'API调用次数超限，请稍后重试' });
    } else {
      res.status(500).json({ error: '大模型调用失败: ' + (error.message || '未知错误') });
    }
  }
});

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API接口不存在' });
  }
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

const startServer = async () => {
  try {
    await initDatabase();
    await migrateLegacyData();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`后端服务器运行在 http://localhost:${PORT}`);
      console.log(`内网访问地址: http://你的IP地址:${PORT}`);
      console.log('MySQL 连接成功，数据库已就绪');
    });
  } catch (error) {
    console.error('服务启动失败，请检查 MySQL 配置（backend/.env）:', error.message);
    process.exit(1);
  }
};

startServer();
