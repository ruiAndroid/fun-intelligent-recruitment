// 配置文件
const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config.json');

// 读取配置
const readConfig = async () => {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // 配置文件不存在时返回默认配置
    return {
      llm: {
        apiKey: '',
        baseURL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        model: 'qwen-vl-max'
      }
    };
  }
};

// 写入配置
const writeConfig = async (config) => {
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('写入配置失败:', error);
    return false;
  }
};

module.exports = {
  readConfig,
  writeConfig
};