require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'your-fallback-secret-key',
  expiresIn: process.env.JWT_EXPIRE || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  algorithm: 'HS256'
};