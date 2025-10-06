const axios = require('axios');

module.exports = axios.create({
  baseURL: process.env.ORDER_API_URL || 'http://order-service:3000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});
