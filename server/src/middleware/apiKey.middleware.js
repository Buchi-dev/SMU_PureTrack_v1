const logger = require('../utils/logger');

/**
 * Middleware to validate API key for sensor data endpoints
 * Protects IoT device endpoints from unauthorized access
 * 
 * Usage: Add to routes that receive data from ESP32 devices
 */
const ensureApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    logger.warn('API key missing', {
      ip: req.ip,
      path: req.path,
      correlationId: req.correlationId,
    });
    
    return res.status(401).json({
      success: false,
      message: 'API key is required',
    });
  }

  // Validate API key
  const validApiKey = process.env.DEVICE_API_KEY;
  
  if (!validApiKey) {
    logger.error('DEVICE_API_KEY not configured in environment');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
    });
  }

  if (apiKey !== validApiKey) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      path: req.path,
      correlationId: req.correlationId,
      providedKey: apiKey.substring(0, 5) + '...' // Log partial key for debugging
    });
    
    return res.status(401).json({
      success: false,
      message: 'Invalid API key',
    });
  }

  // API key is valid
  logger.debug('API key validated successfully', {
    ip: req.ip,
    correlationId: req.correlationId,
  });
  
  next();
};

/**
 * Middleware to validate multiple API keys (for different device types)
 * Useful if you have different security levels for different device categories
 */
const ensureApiKeyWithTypes = (allowedTypes = []) => {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const deviceType = req.headers['x-device-type'] || 'default';
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required',
      });
    }

    // Map device types to environment variables
    const apiKeyMap = {
      'default': process.env.DEVICE_API_KEY,
      'sensor': process.env.SENSOR_API_KEY || process.env.DEVICE_API_KEY,
      'gateway': process.env.GATEWAY_API_KEY || process.env.DEVICE_API_KEY,
    };

    const validApiKey = apiKeyMap[deviceType];
    
    if (!validApiKey) {
      logger.error(`API key not configured for device type: ${deviceType}`);
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    if (apiKey !== validApiKey) {
      logger.warn('Invalid API key attempt', {
        deviceType,
        ip: req.ip,
        correlationId: req.correlationId,
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
      });
    }

    // Check if device type is allowed for this endpoint
    if (allowedTypes.length > 0 && !allowedTypes.includes(deviceType)) {
      return res.status(403).json({
        success: false,
        message: `Device type '${deviceType}' not allowed for this endpoint`,
      });
    }

    req.deviceType = deviceType;
    next();
  };
};

module.exports = {
  ensureApiKey,
  ensureApiKeyWithTypes,
};
