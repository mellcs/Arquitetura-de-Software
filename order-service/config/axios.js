const axios = require('axios');

const instance = axios.create({
  baseURL: process.env.ORDER_API_URL || 'http://order-service:3000', // fallback local
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

module.exports = instance;
