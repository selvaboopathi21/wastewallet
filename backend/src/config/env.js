// Load environment variables from .env file
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Verify critical environment variables exist at startup
const requiredEnvVars = ['MONGO_URI'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL CONFIG ERROR: Missing required environment variable "${envVar}" in .env`);
    process.exit(1);
  }
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_for_dev_only',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
