const logger = require('../utils/logger');

/**
 * API Version Middleware
 * Handles API versioning, deprecation warnings, and version-specific routing
 */

// API version configuration
const API_VERSION_CONFIG = {
  v1: {
    version: 'v1',
    deprecated: false,
    sunsetDate: null, // ISO 8601 date string when this version will be removed
    minimumVersion: '1.0.0',
    currentVersion: '1.0.0',
  },
  // Future versions can be added here
  // v2: {
  //   version: 'v2',
  //   deprecated: false,
  //   sunsetDate: null,
  //   minimumVersion: '2.0.0',
  //   currentVersion: '2.0.0',
  // },
};

/**
 * Get API version from request
 * Supports version from:
 * 1. URL path (/api/v1/...)
 * 2. Accept header (Accept: application/vnd.api+json;version=1)
 * 3. Custom header (X-API-Version: v1)
 * 
 * @param {Object} req - Express request object
 * @returns {string} API version (e.g., 'v1')
 */
function getApiVersion(req) {
  // 1. Check URL path first (most common)
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (pathMatch) {
    return pathMatch[1];
  }

  // 2. Check custom header
  const headerVersion = req.headers['x-api-version'];
  if (headerVersion) {
    return headerVersion.toLowerCase().startsWith('v') ? headerVersion.toLowerCase() : `v${headerVersion}`;
  }

  // 3. Check Accept header
  const acceptHeader = req.headers.accept;
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/version=(\d+)/);
    if (versionMatch) {
      return `v${versionMatch[1]}`;
    }
  }

  // Default to v1
  return 'v1';
}

/**
 * API Version middleware factory
 * @param {string} requiredVersion - Required API version for this route (e.g., 'v1')
 * @returns {Function} Express middleware
 */
function apiVersion(requiredVersion) {
  return (req, res, next) => {
    const requestedVersion = getApiVersion(req);
    const versionConfig = API_VERSION_CONFIG[requestedVersion];

    // Attach version info to request
    req.apiVersion = requestedVersion;
    req.apiVersionConfig = versionConfig;

    // Log version usage
    logger.debug('[API Version] Request version', {
      requestedVersion,
      requiredVersion,
      path: req.path,
      correlationId: req.correlationId,
    });

    // Check if version exists
    if (!versionConfig) {
      logger.warn('[API Version] Unsupported API version requested', {
        requestedVersion,
        path: req.path,
        correlationId: req.correlationId,
      });

      return res.status(400).json({
        success: false,
        message: `Unsupported API version: ${requestedVersion}`,
        supportedVersions: Object.keys(API_VERSION_CONFIG),
        correlationId: req.correlationId,
      });
    }

    // Check if requested version matches required version
    if (requestedVersion !== requiredVersion) {
      logger.warn('[API Version] Version mismatch', {
        requestedVersion,
        requiredVersion,
        path: req.path,
      });

      return res.status(400).json({
        success: false,
        message: `This endpoint requires API version ${requiredVersion}`,
        requestedVersion,
        correlationId: req.correlationId,
      });
    }

    // Add deprecation headers if version is deprecated
    if (versionConfig.deprecated) {
      res.setHeader('X-API-Deprecated', 'true');
      res.setHeader('Deprecation', 'true');
      
      if (versionConfig.sunsetDate) {
        res.setHeader('X-API-Sunset', versionConfig.sunsetDate);
        res.setHeader('Sunset', versionConfig.sunsetDate);
      }

      logger.info('[API Version] Deprecated version accessed', {
        version: requestedVersion,
        sunsetDate: versionConfig.sunsetDate,
        path: req.path,
        userId: req.user?._id,
      });
    }

    // Add version headers to response
    res.setHeader('X-API-Version', requestedVersion);
    res.setHeader('X-API-Version-Current', versionConfig.currentVersion);

    next();
  };
}

/**
 * Middleware to add version info to all responses
 * Use this globally before routes
 */
function apiVersionInfo(req, res, next) {
  const version = getApiVersion(req);
  req.apiVersion = version;
  res.setHeader('X-API-Version', version);
  next();
}

/**
 * Deprecate an API version
 * @param {string} version - Version to deprecate (e.g., 'v1')
 * @param {string} sunsetDate - ISO 8601 date when version will be removed
 */
function deprecateVersion(version, sunsetDate = null) {
  if (API_VERSION_CONFIG[version]) {
    API_VERSION_CONFIG[version].deprecated = true;
    API_VERSION_CONFIG[version].sunsetDate = sunsetDate;
    logger.info(`[API Version] Version ${version} marked as deprecated`, { sunsetDate });
  } else {
    logger.error(`[API Version] Cannot deprecate unknown version: ${version}`);
  }
}

/**
 * Get all supported API versions
 * @returns {Array} List of version objects
 */
function getSupportedVersions() {
  return Object.keys(API_VERSION_CONFIG).map(key => ({
    version: key,
    ...API_VERSION_CONFIG[key],
  }));
}

module.exports = {
  apiVersion,
  getSupportedVersions,
};
