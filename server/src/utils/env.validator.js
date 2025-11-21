/**
 * Environment Variable Validator
 * Ensures all required environment variables are set before starting the server
 */

const requiredEnvVars = [
  'MONGO_URI',
  'SESSION_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
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
  'MQTT_BROKER_URL',
  'MQTT_USERNAME',
  'MQTT_PASSWORD',
];

/**
 * Validate that all required environment variables are set
 * @throws {Error} If any required variable is missing
 */
const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('\n[VALIDATION] Validating environment variables...\n');

  const missing = [];
  const warnings = [];

  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      if (isProduction) {
        // In production, only show that variable is set (no values)
        console.log(`  [OK] ${varName}: [CONFIGURED]`);
      } else {
        // In development, show values with masking for sensitive data
        const isSensitive = ['SECRET', 'KEY', 'PASSWORD', 'URI'].some(keyword => 
          varName.includes(keyword)
        );
        const displayValue = isSensitive 
          ? '***' + process.env[varName].slice(-4)
          : process.env[varName];
        console.log(`  [OK] ${varName}: ${displayValue}`);
      }
    }
  });

  // Check optional variables and warn if missing
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName);
    } else {
      if (isProduction) {
        // In production, only show that variable is set (no values)
        console.log(`  [OK] ${varName}: [CONFIGURED]`);
      } else {
        // In development, show values with masking for sensitive data
        const isSensitive = ['SECRET', 'KEY', 'PASSWORD', 'URI'].some(keyword => 
          varName.includes(keyword)
        );
        const displayValue = isSensitive 
          ? '***' + process.env[varName].slice(-4)
          : process.env[varName];
        console.log(`  [OK] ${varName}: ${displayValue}`);
      }
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

  // Report missing optional variables
  if (warnings.length > 0) {
    console.warn('\n[WARNING] Optional environment variables not set (using defaults):\n');
    warnings.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
  }

  console.log('\n[OK] Environment validation complete!\n');
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

  // Production-specific validations
  if (nodeEnv === 'production') {
    // Ensure secure session settings
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      console.error('[ERROR] SESSION_SECRET must be at least 32 characters in production');
      process.exit(1);
    }

    // Ensure HTTPS callback URL
    if (process.env.GOOGLE_CALLBACK_URL && !process.env.GOOGLE_CALLBACK_URL.startsWith('https://')) {
      console.error('[ERROR] GOOGLE_CALLBACK_URL must use HTTPS in production');
      process.exit(1);
    }

    // Warn if using default ports
    if (!process.env.PORT || process.env.PORT === '5000') {
      console.warn('[WARNING] Using default PORT 5000 in production. Consider setting a custom port.');
    }
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
    mqttConfigured: !!process.env.MQTT_BROKER_URL,
    oauthConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apiKeyConfigured: !!process.env.DEVICE_API_KEY,
  };
};

module.exports = {
  validateEnv,
  validateFormat,
  validateEnvironmentSettings,
  getEnvironmentSummary,
};
