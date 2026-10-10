// Clean application logger using pino
const pino = require('pino');
const { nodeEnv } = require('../config/env');

const logger = pino({
  level: nodeEnv === 'production' ? 'info' : 'debug',
  transport:
    nodeEnv !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

module.exports = logger;
