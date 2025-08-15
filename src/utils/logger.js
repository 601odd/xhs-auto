import fs from 'fs-extra';
import path from 'path';
import config from '../config/index.js';

class Logger {
  constructor(category = 'default') {
    this.category = category;
    this.logDir = config.paths.logs;
    this.ensureLogDir();
  }

  async ensureLogDir() {
    try {
      await fs.ensureDir(this.logDir);
    } catch (error) {
      console.error('创建日志目录失败:', error);
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.category}] ${message}`;
    
    if (data) {
      logMessage += ` ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}`;
    }
    
    return logMessage;
  }

  async writeToFile(level, message) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `${date}.log`);
      await fs.appendFile(logFile, message + '\n');
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  log(level, message, data = null) {
    const formattedMessage = this.formatMessage(level, message, data);
    
    // 控制台输出
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'debug':
        if (config.debug.enabled) {
          console.debug(formattedMessage);
        }
        break;
      default:
        console.log(formattedMessage);
    }

    // 写入文件
    this.writeToFile(level, formattedMessage);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }
}

export function createLogger(category) {
  return new Logger(category);
}

export default Logger;