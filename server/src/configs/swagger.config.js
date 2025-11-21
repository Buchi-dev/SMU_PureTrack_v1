const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { API_VERSION } = require('../utils/constants');

/**
 * Swagger/OpenAPI Configuration
 * Provides interactive API documentation
 */

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Water Quality Monitoring API',
      version: '1.0.0',
      description: 'RESTful API for IoT water quality monitoring system with real-time alerts and reporting',
      contact: {
        name: 'API Support',
        email: 'support@waterquality.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}${API_VERSION.PREFIX}`,
        description: 'Development server',
      },
      {
        url: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}${API_VERSION.PREFIX}` : 'http://localhost:5000/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        SessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication using Passport.js',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for device authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            error: {
              type: 'string',
              example: 'Detailed error information',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              example: 100,
            },
            page: {
              type: 'integer',
              example: 1,
            },
            pages: {
              type: 'integer',
              example: 10,
            },
          },
        },
        Device: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            deviceId: {
              type: 'string',
              example: 'ESP32-001',
            },
            location: {
              type: 'string',
              example: 'Building A - Water Tank',
            },
            status: {
              type: 'string',
              enum: ['online', 'offline'],
              example: 'online',
            },
            registrationStatus: {
              type: 'string',
              enum: ['registered', 'pending'],
              example: 'registered',
            },
            lastSeen: {
              type: 'string',
              format: 'date-time',
            },
            metadata: {
              type: 'object',
              properties: {
                firmware: { type: 'string' },
                hardware: { type: 'string' },
                ipAddress: { type: 'string' },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        SensorReading: {
          type: 'object',
          properties: {
            deviceId: {
              type: 'string',
              example: 'ESP32-001',
            },
            pH: {
              type: 'number',
              format: 'float',
              example: 7.2,
            },
            turbidity: {
              type: 'number',
              format: 'float',
              example: 3.5,
            },
            tds: {
              type: 'number',
              format: 'float',
              example: 320,
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['deviceId', 'pH', 'turbidity', 'tds'],
        },
        Alert: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            alertId: {
              type: 'string',
              example: 'ALT-123456',
            },
            deviceId: {
              type: 'string',
              example: 'ESP32-001',
            },
            deviceName: {
              type: 'string',
              example: 'Building A - Water Tank',
            },
            severity: {
              type: 'string',
              enum: ['Critical', 'Warning', 'Advisory'],
              example: 'Critical',
            },
            parameter: {
              type: 'string',
              enum: ['pH', 'Turbidity', 'TDS'],
              example: 'pH',
            },
            value: {
              type: 'number',
              example: 9.2,
            },
            threshold: {
              type: 'number',
              example: 8.5,
            },
            message: {
              type: 'string',
              example: 'pH level above safe threshold',
            },
            status: {
              type: 'string',
              enum: ['Unacknowledged', 'Acknowledged', 'Resolved'],
              example: 'Unacknowledged',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            displayName: {
              type: 'string',
              example: 'John Doe',
            },
            role: {
              type: 'string',
              enum: ['admin', 'staff'],
              example: 'staff',
            },
            status: {
              type: 'string',
              enum: ['active', 'pending', 'suspended'],
              example: 'active',
            },
            profilePicture: {
              type: 'string',
              format: 'uri',
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Google OAuth authentication endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Devices',
        description: 'IoT device management endpoints',
      },
      {
        name: 'Alerts',
        description: 'Water quality alert management',
      },
      {
        name: 'Reports',
        description: 'Report generation and retrieval',
      },
      {
        name: 'Analytics',
        description: 'Data analytics and statistics',
      },
      {
        name: 'Health',
        description: 'System health and monitoring',
      },
    ],
  },
  apis: [
    './src/auth/*.Routes.js',
    './src/users/*.Routes.js',
    './src/devices/*.Routes.js',
    './src/alerts/*.Routes.js',
    './src/reports/*.Routes.js',
    './src/analytics/*.Routes.js',
    './src/health/*.Routes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI middleware
 * @param {Express} app - Express application
 */
const setupSwagger = (app) => {
  // Swagger UI options
  const swaggerUiOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Water Quality Monitoring API Docs',
  };

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Serve Swagger JSON spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Only show docs URL in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DOCS] API Documentation available at: http://localhost:${process.env.PORT || 5000}/api-docs`);
  }
};

module.exports = {
  setupSwagger,
  swaggerSpec,
};
