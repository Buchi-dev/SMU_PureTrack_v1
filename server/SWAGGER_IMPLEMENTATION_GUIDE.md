# 🔧 SWAGGER/OpenAPI IMPLEMENTATION GUIDE
**Quick Reference for Adding API Documentation Annotations**

---

## 📋 OVERVIEW

**Missing:** JSDoc annotations on 41 route endpoints  
**Estimated Time:** 3-4 hours  
**Priority:** HIGH  
**Impact:** Interactive API documentation at `/api-docs`

---

## 🎯 TEMPLATE REFERENCE

### Basic Endpoint Template

```javascript
/**
 * @openapi
 * /api/v1/resource:
 *   get:
 *     summary: Brief description
 *     description: Detailed description of what this endpoint does
 *     tags: [ResourceName]
 *     security:
 *       - SessionAuth: []     # For authenticated routes
 *       - ApiKeyAuth: []      # For API key routes
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *         description: Parameter description
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', middleware, controller);
```

---

## 📚 COMPLETE EXAMPLES BY ROUTE FILE

### 1. device.Routes.js (9 endpoints)

```javascript
/**
 * @openapi
 * /api/v1/devices:
 *   get:
 *     summary: Get all devices
 *     description: Retrieve a paginated list of all registered IoT water quality monitoring devices
 *     tags: [Devices]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of devices per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [online, offline]
 *         description: Filter by device status
 *       - in: query
 *         name: registrationStatus
 *         schema:
 *           type: string
 *           enum: [registered, pending]
 *         description: Filter by registration status
 *     responses:
 *       200:
 *         description: List of devices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', ensureAuthenticated, validatePagination, getAllDevices);

/**
 * @openapi
 * /api/v1/devices/stats:
 *   get:
 *     summary: Get device statistics
 *     description: Retrieve aggregated statistics about all devices (online/offline count, registration status, etc.)
 *     tags: [Devices]
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Device statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDevices:
 *                       type: integer
 *                       example: 10
 *                     onlineDevices:
 *                       type: integer
 *                       example: 8
 *                     offlineDevices:
 *                       type: integer
 *                       example: 2
 *                     registeredDevices:
 *                       type: integer
 *                       example: 9
 *                     pendingDevices:
 *                       type: integer
 *                       example: 1
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/stats', ensureAuthenticated, getDeviceStats);

/**
 * @openapi
 * /api/v1/devices/{id}:
 *   get:
 *     summary: Get device by ID
 *     description: Retrieve detailed information about a specific device including latest readings
 *     tags: [Devices]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Device details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Device'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Device not found
 */
router.get('/:id', ensureAuthenticated, validateMongoId, getDeviceById);

/**
 * @openapi
 * /api/v1/devices/{id}/readings:
 *   get:
 *     summary: Get device sensor readings
 *     description: Retrieve historical sensor readings for a specific device with date range filtering
 *     tags: [Devices]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device MongoDB ObjectId
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for readings (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for readings (ISO 8601)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Sensor readings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SensorReading'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/:id/readings', ensureAuthenticated, validateMongoId, validateDateRange, validatePagination, getDeviceReadings);

/**
 * @openapi
 * /api/v1/devices/{id}/readings:
 *   post:
 *     summary: Submit sensor data from IoT device
 *     description: Process and store sensor readings from ESP32 devices. Creates alerts if water quality thresholds are exceeded.
 *     tags: [Devices]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - pH
 *               - turbidity
 *               - tds
 *               - temperature
 *             properties:
 *               deviceId:
 *                 type: string
 *                 example: ESP32-001
 *               pH:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 14
 *                 example: 7.2
 *               turbidity:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 3.5
 *               tds:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 250
 *               temperature:
 *                 type: number
 *                 format: float
 *                 minimum: -10
 *                 maximum: 50
 *                 example: 25.5
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Optional timestamp (defaults to server time)
 *     responses:
 *       201:
 *         description: Sensor data processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Sensor data processed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     deviceId:
 *                       type: string
 *                     readingsCount:
 *                       type: integer
 *                     alertsCreated:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid or missing API key
 *       429:
 *         description: Rate limit exceeded (max 1000 requests per 15 minutes)
 */
router.post('/:id/readings', ensureApiKey, sensorDataLimiter, validateSensorData, processSensorData);

/**
 * @openapi
 * /api/v1/devices/{id}:
 *   patch:
 *     summary: Update device information
 *     description: Update device location, registration status, or metadata (Admin only)
 *     tags: [Devices]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: string
 *                 maxLength: 200
 *               registrationStatus:
 *                 type: string
 *                 enum: [registered, pending]
 *               metadata:
 *                 type: object
 *                 properties:
 *                   firmware:
 *                     type: string
 *                   hardware:
 *                     type: string
 *                   ipAddress:
 *                     type: string
 *     responses:
 *       200:
 *         description: Device updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Admin access required
 */
router.patch('/:id', ensureAdmin, validateMongoId, validateDeviceUpdate, updateDevice);

/**
 * @openapi
 * /api/v1/devices/{id}:
 *   delete:
 *     summary: Delete a device
 *     description: Permanently remove a device from the system (Admin only)
 *     tags: [Devices]
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Device not found
 */
router.delete('/:id', ensureAdmin, validateMongoId, deleteDevice);
```

---

## 🔗 COMMON RESPONSE REFERENCES

Add these to your `swagger.config.js` under `components.responses`:

```javascript
components: {
  responses: {
    UnauthorizedError: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: false,
              },
              message: {
                type: 'string',
                example: 'Authentication required',
              },
            },
          },
        },
      },
    },
    ValidationError: {
      description: 'Validation failed',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: false,
              },
              message: {
                type: 'string',
                example: 'Validation failed',
              },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: {
                      type: 'string',
                    },
                    message: {
                      type: 'string',
                    },
                    value: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    ForbiddenError: {
      description: 'Insufficient permissions',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: false,
              },
              message: {
                type: 'string',
                example: 'Admin access required',
              },
            },
          },
        },
      },
    },
  },
}
```

---

## 📊 IMPLEMENTATION CHECKLIST

### Device Routes (device.Routes.js)
- [ ] GET /api/v1/devices
- [ ] GET /api/v1/devices/stats
- [ ] GET /api/v1/devices/:id
- [ ] GET /api/v1/devices/:id/readings
- [ ] POST /api/v1/devices/:id/readings (IoT endpoint)
- [ ] PATCH /api/v1/devices/:id
- [ ] DELETE /api/v1/devices/:id

### Alert Routes (alert.Routes.js)
- [ ] GET /api/v1/alerts
- [ ] GET /api/v1/alerts/stats
- [ ] GET /api/v1/alerts/:id
- [ ] PATCH /api/v1/alerts/:id/acknowledge
- [ ] PATCH /api/v1/alerts/:id/resolve
- [ ] POST /api/alerts (internal)
- [ ] DELETE /api/alerts/:id (internal)

### User Routes (user.Routes.js)
- [ ] GET /api/v1/users
- [ ] GET /api/v1/users/:id
- [ ] PATCH /api/v1/users/:id/role
- [ ] PATCH /api/v1/users/:id/status
- [ ] PATCH /api/users/:id/profile
- [ ] PATCH /api/users/:id/complete-profile
- [ ] DELETE /api/users/:id
- [ ] GET /api/users/:id/preferences
- [ ] PUT /api/users/:id/preferences
- [ ] DELETE /api/users/:id/preferences

### Report Routes (report.Routes.js)
- [ ] POST /api/v1/reports/water-quality
- [ ] POST /api/v1/reports/device-status
- [ ] GET /api/v1/reports
- [ ] GET /api/v1/reports/:id
- [ ] DELETE /api/v1/reports/:id

### Analytics Routes (analytics.Routes.js)
- [ ] GET /api/analytics/summary
- [ ] GET /api/analytics/trends
- [ ] GET /api/analytics/parameters

### Auth Routes (auth.Routes.js)
- [ ] GET /auth/google
- [ ] GET /auth/google/callback
- [ ] GET /auth/logout
- [ ] GET /auth/current-user
- [ ] GET /auth/status

### Health Routes (health.Routes.js)
- [ ] GET /health
- [ ] GET /health/liveness
- [ ] GET /health/readiness

---

## 🚀 QUICK START

1. **Start with one file** (device.Routes.js recommended)
2. **Copy the template** for each endpoint
3. **Customize** parameters and responses
4. **Test** at http://localhost:5000/api-docs
5. **Move to next file**

---

## 🧪 TESTING SWAGGER

```powershell
# Start server
npm run dev

# Open Swagger UI
start http://localhost:5000/api-docs

# Check for errors
# Look for endpoints appearing in UI
# Test "Try it out" buttons
```

---

## 💡 PRO TIPS

1. **Use $ref for reusable schemas** instead of duplicating
2. **Add examples** to make API easier to understand
3. **Document error cases** (400, 401, 403, 404, 500)
4. **Group endpoints with tags** (Devices, Alerts, Users, etc.)
5. **Include rate limits** in descriptions
6. **Mark required parameters** clearly

---

## ❓ NEED HELP?

Just ask me:
- "Implement Swagger for device routes"
- "Add Swagger annotations to all routes"
- "Show me example for POST endpoint"
- "Help with Swagger authentication"

---

*Ready to implement? Let me know which routes to start with!*
