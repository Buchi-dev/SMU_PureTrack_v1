/**
 * Environment Variable Validator
 * Ensures all required environment variables are set before starting the server
 * 
 * NOTE: This file intentionally uses console.log/error/warn instead of logger
 * because it runs BEFORE the logger is initialized during application startup.
 */

const requiredEnvVars = [
  'MONGO_URI',
  'FIREBASE_PROJECT_ID',
  'CLIENT_URL',
  'DEVICE_API_KEY', // Required for securing sensor data endpoints
];

const optionalEnvVars = [
  'PORT',
  'NODE_ENV',
  'LOG_LEVEL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_NAME',
  'SMTP_SECURE',
  'REDIS_URL',
  'SESSION_SECRET', // Optional - only if using sessions for other features
  'FIREBASE_SERVICE_ACCOUNT_PATH', // Optional if using FIREBASE_SERVICE_ACCOUNT env var
  'FIREBASE_SERVICE_ACCOUNT', // Optional if using file path
];

/**
 * Validate that all required environment variables are set
 * @throws {Error} If any required variable is missing
 */
const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const missing = [];
  const warnings = [];

  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else if (!isProduction) {
      // Only show details in development
      const isSensitive = ['SECRET', 'KEY', 'PASSWORD', 'URI'].some(keyword => 
        varName.includes(keyword)
      );
      const displayValue = isSensitive 
        ? '***' + process.env[varName].slice(-4)
        : process.env[varName];
      console.log(`  [OK] ${varName}: ${displayValue}`);
    }
  });

  // Check optional variables and warn if missing
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    } else if (!isProduction) {
      // Only show details in development
      const isSensitive = ['SECRET', 'KEY', 'PASSWORD', 'URI'].some(keyword => 
        varName.includes(keyword)
      );
      const displayValue = isSensitive 
        ? '***' + process.env[varName].slice(-4)
        : process.env[varName];
      console.log(`  [OK] ${varName}: ${displayValue}`);
    }
  });

  // Report missing required variables
  if (missing.length > 0) {
    console.error('\n[ERROR] Missing required environment variables:\n');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these variables in your .env file and restart the server.\n');
    process.exit(1);
  }

  // In production, show simple validation success
  if (isProduction) {
    console.log('[OK] Environment validation passed');
  } else {
    // In development, show detailed validation
    console.log('\n[VALIDATION] Validating environment variables...\n');
    if (warnings.length > 0) {
      console.warn('\n[WARNING] Optional environment variables not set (using defaults):\n');
      warnings.forEach(varName => {
        console.warn(`   - ${varName}`);
      });
    }
    console.log('\n[OK] Environment validation complete!\n');
  }
};

/**
 * Validate specific environment variable format
 * @param {string} varName - Environment variable name
 * @param {RegExp} pattern - Regex pattern to validate against
 * @param {string} errorMessage - Error message if validation fails
 */
const validateFormat = (varName, pattern, errorMessage) => {
  const value = process.env[varName];
  if (value && !pattern.test(value)) {
    console.error(`[ERROR] Invalid format for ${varName}: ${errorMessage}`);
    process.exit(1);
  }
};

/**
 * Validate environment-specific settings
 */
const validateEnvironmentSettings = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Validate NODE_ENV value
  const validEnvironments = ['development', 'production', 'test'];
  if (!validEnvironments.includes(nodeEnv)) {
    console.warn(`[WARNING] Invalid NODE_ENV value: ${nodeEnv}. Using 'development'.`);
    process.env.NODE_ENV = 'development';
  }

  // Validate Firebase configuration
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH && !process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error('[ERROR] Either FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT must be set');
    console.error('       See QUICKSTART-FIREBASE.md for setup instructions');
    process.exit(1);
  }

  // Production-specific validations (suppress non-critical warnings in production)
  if (nodeEnv === 'production') {
    // Only show critical warnings in production
    // Optional: Uncomment if you want to see these warnings
    // if (!process.env.PORT || process.env.PORT === '5000') {
    //   console.warn('[WARNING] Using default PORT 5000 in production.');
    // }
  }
};

/**
 * Get environment summary for logging
 */
const getEnvironmentSummary = () => {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    mongoConfigured: !!process.env.MONGO_URI,
    redisConfigured: !!process.env.REDIS_URL,
    smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    firebaseConfigured: !!(process.env.FIREBASE_PROJECT_ID && (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.FIREBASE_SERVICE_ACCOUNT)),
    apiKeyConfigured: !!process.env.DEVICE_API_KEY,
  };
};

module.exports = {
  validateEnv,
  validateFormat,
  validateEnvironmentSettings,
  getEnvironmentSummary,
};
