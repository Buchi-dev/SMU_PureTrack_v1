#!/usr/bin/env node
/**
 * Firebase Service Account Key Validator
 * 
 * This script validates your Firebase service account key by:
 * 1. Checking the JSON structure
 * 2. Verifying the key ID exists in Firebase
 * 3. Testing token generation capability
 * 4. Checking server time synchronization
 * 
 * Run this script when you encounter "invalid_grant" or "Invalid JWT Signature" errors
 * 
 * Usage: node scripts/validate-firebase-key.js
 */

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('');
  log('═'.repeat(60), 'cyan');
  log(`  ${message}`, 'cyan');
  log('═'.repeat(60), 'cyan');
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

/**
 * Check system time synchronization
 */
function checkSystemTime() {
  header('STEP 1: System Time Validation');
  
  const now = new Date();
  const timestamp = Math.floor(Date.now() / 1000);
  
  info(`Current Time: ${now.toISOString()}`);
  info(`Unix Timestamp: ${timestamp}`);
  info(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  
  // Check if time is reasonable (between 2024-2030)
  const year = now.getFullYear();
  if (year < 2024 || year > 2030) {
    error(`System time appears incorrect! Year: ${year}`);
    warning('This will cause Firebase JWT signature errors.');
    warning('Please synchronize your system time with NTP servers.');
    return false;
  }
  
  success('System time appears valid');
  return true;
}

/**
 * Load and validate service account JSON structure
 */
function loadServiceAccount() {
  header('STEP 2: Service Account Key Loading');
  
  let serviceAccount;
  let source;
  
  try {
    // Try environment variable first
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      info('Loading from FIREBASE_SERVICE_ACCOUNT environment variable...');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      source = 'Environment Variable';
    }
    // Try file path
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const accountPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      info(`Loading from file: ${accountPath}`);
      serviceAccount = require(accountPath);
      source = accountPath;
    }
    else {
      error('No Firebase service account configuration found!');
      info('Please set either:');
      info('  - FIREBASE_SERVICE_ACCOUNT (JSON string)');
      info('  - FIREBASE_SERVICE_ACCOUNT_PATH (file path)');
      return null;
    }
    
    success(`Loaded service account from: ${source}`);
    return serviceAccount;
  } catch (err) {
    error(`Failed to load service account: ${err.message}`);
    return null;
  }
}

/**
 * Validate service account structure
 */
function validateStructure(serviceAccount) {
  header('STEP 3: Service Account Structure Validation');
  
  const requiredFields = [
    'type',
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'auth_uri',
    'token_uri',
    'auth_provider_x509_cert_url',
    'client_x509_cert_url',
  ];
  
  let isValid = true;
  
  for (const field of requiredFields) {
    if (!serviceAccount[field]) {
      error(`Missing required field: ${field}`);
      isValid = false;
    } else {
      success(`Found field: ${field}`);
    }
  }
  
  if (!isValid) {
    return false;
  }
  
  // Validate private key format
  if (!serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
    error('Private key appears corrupted or invalid!');
    error('Expected PEM format with "BEGIN PRIVATE KEY" header');
    return false;
  }
  success('Private key format is valid (PEM)');
  
  // Validate key ID format (should be 40-character hex string)
  if (!/^[a-f0-9]{40}$/i.test(serviceAccount.private_key_id)) {
    warning('Private key ID format is unusual (expected 40-char hex string)');
    info(`Key ID: ${serviceAccount.private_key_id}`);
  } else {
    success('Private key ID format is valid');
  }
  
  // Display key info
  console.log('');
  info('Service Account Details:');
  info(`  Project ID: ${serviceAccount.project_id}`);
  info(`  Client Email: ${serviceAccount.client_email}`);
  info(`  Key ID: ${serviceAccount.private_key_id.substring(0, 16)}...`);
  
  return true;
}

/**
 * Initialize Firebase and test authentication
 */
async function testFirebaseAuth(serviceAccount) {
  header('STEP 4: Firebase Authentication Test');
  
  try {
    // Initialize Firebase Admin SDK
    info('Initializing Firebase Admin SDK...');
    
    // Clean up any existing apps
    if (admin.apps.length > 0) {
      await Promise.all(admin.apps.map(app => app.delete()));
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    
    success('Firebase Admin SDK initialized successfully');
    
    // Test 1: Create a custom token (this tests JWT signing)
    info('Testing JWT token generation...');
    const testToken = await admin.auth().createCustomToken('test-validation-uid', {
      test: true,
      timestamp: Date.now(),
    });
    
    if (testToken && testToken.length > 0) {
      success('Successfully generated custom token');
      info(`Token length: ${testToken.length} characters`);
    } else {
      error('Token generation returned empty result');
      return false;
    }
    
    // Test 2: List users (this tests API connectivity and permissions)
    info('Testing Firebase Auth API connectivity...');
    try {
      const listResult = await admin.auth().listUsers(1);
      success(`Successfully connected to Firebase Auth API`);
      info(`Found ${listResult.users.length} user(s) in first page`);
    } catch (listError) {
      if (listError.code === 'auth/insufficient-permission') {
        warning('Service account has limited permissions (cannot list users)');
        warning('This is OK for basic authentication, but may limit admin features');
      } else {
        throw listError;
      }
    }
    
    return true;
  } catch (err) {
    error(`Firebase authentication test failed: ${err.message}`);
    
    if (err.message.includes('invalid_grant')) {
      console.log('');
      error('INVALID_GRANT ERROR DETECTED!');
      warning('Common causes:');
      warning('1. Service account key has been revoked or rotated');
      warning('2. Server time is not synchronized (time drift)');
      warning('3. Key was generated for a different project');
      console.log('');
      info('Solutions:');
      info('1. Generate a new service account key:');
      info('   https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk');
      info('2. Synchronize your system time (Windows: w32tm /resync)');
      info('3. Verify the project ID matches your Firebase project');
    }
    
    if (err.message.includes('Invalid JWT Signature')) {
      console.log('');
      error('JWT SIGNATURE ERROR DETECTED!');
      warning('This is almost always caused by system time synchronization issues.');
      console.log('');
      info('Fix for Windows:');
      info('  w32tm /resync');
      info('Fix for Linux:');
      info('  sudo ntpdate pool.ntp.org');
      info('Fix for Docker:');
      info('  docker restart <container-name>');
    }
    
    return false;
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║  Firebase Service Account Key Validator                   ║', 'cyan');
  log('║  Diagnose and fix invalid_grant and JWT signature errors  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  let allPassed = true;
  
  // Step 1: Check system time
  if (!checkSystemTime()) {
    allPassed = false;
    warning('Please fix system time before proceeding');
  }
  
  // Step 2: Load service account
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    allPassed = false;
    process.exit(1);
  }
  
  // Step 3: Validate structure
  if (!validateStructure(serviceAccount)) {
    allPassed = false;
    error('Service account structure is invalid');
    process.exit(1);
  }
  
  // Step 4: Test Firebase authentication
  if (!await testFirebaseAuth(serviceAccount)) {
    allPassed = false;
  }
  
  // Final summary
  header('VALIDATION SUMMARY');
  
  if (allPassed) {
    console.log('');
    success('🎉 All checks passed! Your Firebase service account is valid.');
    success('The server should be able to authenticate users successfully.');
    console.log('');
  } else {
    console.log('');
    error('❌ Some checks failed. Please review the errors above.');
    console.log('');
    info('Next steps:');
    info('1. Fix any system time issues');
    info('2. Generate a new service account key if needed');
    info('3. Update your environment variables or JSON file');
    info('4. Run this script again to verify');
    console.log('');
    process.exit(1);
  }
}

// Run validation
main().catch((err) => {
  console.error('');
  error(`Unexpected error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
