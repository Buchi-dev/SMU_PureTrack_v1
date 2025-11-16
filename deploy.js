#!/usr/bin/env node

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🚀 DEPLOYMENT SCRIPT - Water Quality Monitoring System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Description: Deploys Client, Firebase Functions, and MQTT Bridge
// Requirements: Node.js, Firebase CLI, gcloud CLI, .env files configured
// Usage: node deploy.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFIG = {
  // GCP Configuration
  GCP_PROJECT_ID: 'my-app-da530',
  GCP_REGION: 'us-central1',
  SERVICE_NAME: 'mqtt-bridge',

  // MQTT Bridge Configuration (from .env)
  MQTT_BROKER_URL: 'mqtts://36965de434ff42a4a93a697c94a13ad7.s1.eu.hivemq.cloud:8883',
  MQTT_USERNAME: 'mqtt-bridge',
  MQTT_PASSWORD: 'Jaffmier@0924',

  // Directories
  CLIENT_DIR: 'client',
  FUNCTIONS_DIR: 'functions',
  MQTT_BRIDGE_DIR: 'mqtt-bridge',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ANSI COLOR CODES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function printStep(message) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}🔹 ${message}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

function printSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function printError(message) {
  console.log(`${colors.red}❌ ERROR: ${message}${colors.reset}`);
}

function printWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    execSync(command, {
      stdio: 'inherit',
      ...options,
    });
    return true;
  } catch (error) {
    return false;
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

function changeDirectory(dir) {
  process.chdir(dir);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DEPLOYMENT STEPS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function deployClient() {
  printStep('STEP 1/3: Building Client');

  const rootDir = process.cwd();
  changeDirectory(CONFIG.CLIENT_DIR);

  // Check for .env file
  if (!fileExists('.env')) {
    printError('Client .env file not found! Copy .env.example to .env and configure it.');
    process.exit(1);
  }

  // Install dependencies
  printWarning('Installing client dependencies...');
  if (!execCommand('npm install')) {
    printError('Client npm install failed!');
    process.exit(1);
  }

  // Build client
  printWarning('Building client application...');
  if (!execCommand('npm run build')) {
    printError('Client build failed!');
    process.exit(1);
  }

  // Verify dist directory
  if (!dirExists('dist')) {
    printError('Client build failed - dist directory not found!');
    process.exit(1);
  }

  printSuccess('Client build completed successfully');
  changeDirectory(rootDir);
}

async function deployFunctions() {
  printStep('STEP 2/3: Building Firebase Functions');

  const rootDir = process.cwd();
  changeDirectory(CONFIG.FUNCTIONS_DIR);

  // Install dependencies
  printWarning('Installing functions dependencies...');
  if (!execCommand('npm install')) {
    printError('Functions npm install failed!');
    process.exit(1);
  }

  // Build functions
  printWarning('Building Firebase Functions...');
  if (!execCommand('npm run build')) {
    printError('Functions build failed!');
    process.exit(1);
  }

  // Verify lib directory
  if (!dirExists('lib')) {
    printError('Functions build failed - lib directory not found!');
    process.exit(1);
  }

  printSuccess('Firebase Functions build completed successfully');
  changeDirectory(rootDir);
}

async function deployFirebase() {
  printStep('Deploying to Firebase (Hosting + Functions)');

  printWarning('Running firebase deploy...');
  if (!execCommand('firebase deploy')) {
    printError('Firebase deployment failed!');
    process.exit(1);
  }

  printSuccess('Firebase deployment completed successfully');
}

async function deployMqttBridge() {
  printStep('STEP 3/3: Deploying MQTT Bridge to Cloud Run');

  const rootDir = process.cwd();
  changeDirectory(CONFIG.MQTT_BRIDGE_DIR);

  // Check for .env file (optional)
  if (!fileExists('.env')) {
    printWarning('MQTT Bridge .env not found - using configuration from script');
  }

  // Build Docker image
  printWarning('Building Docker image...');
  const imageName = `gcr.io/${CONFIG.GCP_PROJECT_ID}/${CONFIG.SERVICE_NAME}:latest`;
  if (!execCommand(`gcloud builds submit --tag ${imageName}`)) {
    printError('Docker build failed!');
    process.exit(1);
  }

  printSuccess('Docker image built successfully');

  // Deploy to Cloud Run
  printWarning('Deploying to Cloud Run...');
  const envVars = [
    `GCP_PROJECT_ID=${CONFIG.GCP_PROJECT_ID}`,
    `MQTT_BROKER_URL=${CONFIG.MQTT_BROKER_URL}`,
    `MQTT_USERNAME=${CONFIG.MQTT_USERNAME}`,
    `MQTT_PASSWORD=${CONFIG.MQTT_PASSWORD}`,
    'LOG_LEVEL=info',
    'NODE_ENV=production',
  ].join(',');

  const deployCommand = [
    'gcloud run deploy',
    CONFIG.SERVICE_NAME,
    `--image ${imageName}`,
    '--platform managed',
    `--region ${CONFIG.GCP_REGION}`,
    '--allow-unauthenticated',
    '--port 8080',
    '--memory 256Mi',
    '--cpu 1',
    '--min-instances 1',
    '--max-instances 3',
    `--set-env-vars "${envVars}"`,
  ].join(' ');

  if (!execCommand(deployCommand)) {
    printError('Cloud Run deployment failed!');
    process.exit(1);
  }

  printSuccess('MQTT Bridge deployed successfully to Cloud Run');
  changeDirectory(rootDir);
}

function printCompletionSummary() {
  console.log(`\n${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.green}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${colors.reset}`);
  console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`\n${colors.blue}📋 Deployment Summary:${colors.reset}`);
  console.log('  ✅ Client (Vite)       → Firebase Hosting');
  console.log('  ✅ Functions (Node.js) → Firebase Functions');
  console.log(`  ✅ MQTT Bridge         → Cloud Run (${CONFIG.GCP_REGION})`);
  console.log(`\n${colors.yellow}🔗 Next Steps:${colors.reset}`);
  console.log(`  1. Verify Firebase Hosting: https://${CONFIG.GCP_PROJECT_ID}.web.app`);
  console.log(`  2. Check Cloud Run service: https://console.cloud.google.com/run?project=${CONFIG.GCP_PROJECT_ID}`);
  console.log('  3. Monitor MQTT Bridge health: [Check Cloud Run URL]/health');
  console.log(`\n${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MAIN EXECUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║   🚀 Water Quality Monitoring System - Deployment Script     ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Step 1: Build Client
    await deployClient();

    // Step 2: Build Functions
    await deployFunctions();

    // Step 2.1: Deploy to Firebase
    await deployFirebase();

    // Step 3: Deploy MQTT Bridge to Cloud Run
    await deployMqttBridge();

    // Print completion summary
    printCompletionSummary();
  } catch (error) {
    printError(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the deployment
main();
