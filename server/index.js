// Vercel serverless function handler
const path = require('path');

// Set up module aliases for production
require('module-alias/register');
require('module-alias').addAliases({
  '@core': path.join(__dirname, 'dist/core'),
  '@feature': path.join(__dirname, 'dist/feature'),
  '@utils': path.join(__dirname, 'dist/utils'),
  '@types': path.join(__dirname, 'dist/types'),
});

// Load the Express app
const appModule = require('./dist/index.js');
const app = appModule.default || appModule;

// Export for Vercel
module.exports = app;
