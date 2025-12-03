/**
 * MQTT Service for HiveMQ Integration
 * Handles MQTT connections, subscriptions, and message handling
 */

const mqtt = require('mqtt');
const { MQTT_CONFIG, generateTopics } = require('../configs/mqtt.config');
const logger = require('../utils/logger');

class MQTTService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.deviceSubscriptions = new Set();
    this.presenceResponses = new Map(); // Track presence responses during queries
    this.presenceQueryActive = false;
    this.presenceTimeout = null;
    this.reconnectCount = 0;
    this.lastReconnectTime = null;
    this.processedRegistrations = new Map(); // Track recently processed registrations to avoid duplicates
  }

  /**
   * Connect to MQTT Broker
   */
  async connect() {
    try {
      logger.info('[MQTT Service] Connecting to HiveMQ broker...', {
        broker: MQTT_CONFIG.BROKER_URL,
        clientId: MQTT_CONFIG.CLIENT_ID,
      });

      this.client = mqtt.connect(MQTT_CONFIG.BROKER_URL, {
        ...MQTT_CONFIG.OPTIONS,
        clientId: MQTT_CONFIG.CLIENT_ID,
      });

      return new Promise((resolve, reject) => {
        this.client.on('connect', () => {
          this.reconnectCount = 0;
          this.lastReconnectTime = new Date();
          logger.info('[MQTT Service] Connected to HiveMQ successfully', {
            clientId: MQTT_CONFIG.CLIENT_ID,
            keepalive: MQTT_CONFIG.OPTIONS.keepalive
          });
          this.connected = true;

          // Subscribe to all device topics
          this.subscribeToDeviceTopics();

          resolve();
        });

        this.client.on('error', (error) => {
          logger.error('[MQTT Service] Connection error:', {
            error: error.message,
            code: error.code,
            stack: error.stack
          });
          this.connected = false;
          
          // Only reject on initial connection, not reconnection attempts
          if (this.reconnectCount === 0) {
            reject(error);
          }
        });

        this.client.on('offline', () => {
          this.reconnectCount++;
          logger.warn(`[MQTT Service] MQTT client went offline (reconnect attempt #${this.reconnectCount})`, {
            lastConnected: this.lastReconnectTime,
            secondsConnected: this.lastReconnectTime ? Math.floor((Date.now() - this.lastReconnectTime.getTime()) / 1000) : 'N/A'
          });
          this.connected = false;
        });

        this.client.on('close', () => {
          logger.warn('[MQTT Service] MQTT connection closed');
        });

        this.client.on('end', () => {
          logger.warn('[MQTT Service] MQTT client ended');
        });

        this.client.on('reconnect', () => {
          logger.info(`[MQTT Service] Attempting to reconnect to MQTT broker... (attempt #${this.reconnectCount + 1})`);
        });

        // Handle incoming messages
        this.client.on('message', this.handleMessage.bind(this));
      });

    } catch (error) {
      logger.error('[MQTT Service] Failed to connect to MQTT broker:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MQTT Broker
   */
  async disconnect() {
    if (this.client && this.connected) {
      logger.info('[MQTT Service] Disconnecting from MQTT broker...');

      return new Promise((resolve) => {
        this.client.end(false, {}, () => {
          this.connected = false;
          logger.info('[MQTT Service] Disconnected from MQTT broker');
          resolve();
        });
      });
    }
  }

  /**
   * Subscribe to all device topics (ACTIVE TOPICS ONLY)
   */
  subscribeToDeviceTopics() {
    const topics = [
      MQTT_CONFIG.TOPICS.ALL_DEVICE_DATA,        // Sensor readings
      MQTT_CONFIG.TOPICS.ALL_DEVICE_REGISTER,    // Device registrations
      MQTT_CONFIG.TOPICS.ALL_PRESENCE_RESPONSES, // "i_am_online" responses
      MQTT_CONFIG.TOPICS.ALL_DEVICE_PRESENCE,    // Presence announcements
    ];

    topics.forEach(topic => {
      this.client.subscribe(topic, { qos: MQTT_CONFIG.QOS.AT_LEAST_ONCE }, (err) => {
        if (err) {
          logger.error(`[MQTT Service] Failed to subscribe to ${topic}:`, err);
        } else {
          logger.info(`[MQTT Service] ✓ Subscribed to ${topic}`);
        }
      });
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  handleMessage(topic, message) {
    try {
      const messageStr = message.toString();
      const data = JSON.parse(messageStr);

      // Always log registration messages (not just in debug mode)
      if (topic.includes('/register')) {
        logger.info('[MQTT Service] ⚡ REGISTRATION MESSAGE RECEIVED:', {
          topic,
          deviceId: data.deviceId || 'unknown',
          data: messageStr.substring(0, 300),
        });
      } else {
        logger.debug('[MQTT Service] Received message:', {
          topic,
          data: messageStr.substring(0, 200) + (messageStr.length > 200 ? '...' : ''),
        });
      }

      // Extract device ID from topic
      const topicParts = topic.split('/');
      const deviceId = topicParts[1]; // devices/{deviceId}/...

      // Route message based on topic type
      if (topic.includes('/data')) {
        this.handleSensorData(deviceId, data);
      } else if (topic.includes('/register')) {
        this.handleDeviceRegistration(deviceId, data);
      } else if (topic.includes('/presence')) {
        this.handleDevicePresence(deviceId, data);
      } else if (topic === MQTT_CONFIG.TOPICS.PRESENCE_RESPONSE) {
        this.handlePresenceResponse(data);
      }

    } catch (error) {
      logger.error('[MQTT Service] Error processing message:', {
        topic,
        error: error.message,
        stack: error.stack,
        message: message.toString(),
      });
    }
  }

  /**
   * Handle sensor data messages from devices
   */
  async handleSensorData(deviceId, data) {
    // Track device as connected when it sends data
    this.deviceSubscriptions.add(deviceId);
    
    // Remove from subscriptions after 5 minutes of inactivity
    setTimeout(() => {
      this.deviceSubscriptions.delete(deviceId);
    }, 5 * 60 * 1000);

    // Only log in verbose mode - sensor data processing happens frequently
    if (process.env.VERBOSE_LOGGING === 'true') {
      logger.info(`[MQTT Service] Processing sensor data from device: ${deviceId}`);
    }

    // Import device controller dynamically to avoid circular dependencies
    const { processSensorData } = require('../devices/device.Controller');

    try {
      // Create mock request/response objects for the existing controller
      const mockReq = {
        body: {
          deviceId,
          ...data,
        },
        headers: {
          'x-api-key': process.env.DEVICE_API_KEY || process.env.API_KEY, // Use environment API key
        },
      };

      const mockRes = {
        status: (code) => ({
          json: (data) => data,
        }),
        json: (data) => data,
      };

      // Process the sensor data using existing controller logic
      await processSensorData(mockReq, mockRes);

    } catch (error) {
      logger.error(`[MQTT Service] Error processing sensor data from ${deviceId}:`, {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Handle device registration messages
   */
  async handleDeviceRegistration(deviceId, data) {
    // Check if we've recently processed this registration (within last 30 seconds)
    const registrationKey = `${deviceId}-${data.macAddress || ''}-${data.firmwareVersion || ''}`;
    const lastProcessed = this.processedRegistrations.get(registrationKey);
    const now = Date.now();
    
    if (lastProcessed && (now - lastProcessed) < 30000) {
      logger.debug(`[MQTT Service] Ignoring duplicate registration for ${deviceId} (processed ${Math.floor((now - lastProcessed) / 1000)}s ago)`);
      return;
    }

    logger.info(`[MQTT Service] Device registration request: ${deviceId}`, data);

    // Mark as processed
    this.processedRegistrations.set(registrationKey, now);
    
    // Clean up old entries (keep last 100)
    if (this.processedRegistrations.size > 100) {
      const entries = Array.from(this.processedRegistrations.entries());
      entries.sort((a, b) => a[1] - b[1]);
      entries.slice(0, entries.length - 100).forEach(([key]) => {
        this.processedRegistrations.delete(key);
      });
    }

    // Import device controller dynamically
    const { deviceRegister } = require('../devices/device.Controller');

    try {
      // Create mock request/response for registration
      const mockReq = {
        body: {
          deviceId,
          ...data,
        },
        headers: {
          'x-api-key': process.env.DEVICE_API_KEY || process.env.API_KEY,
        },
      };

      let responseStatus = null;
      let responseData = null;

      const mockRes = {
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseData = data;
              logger.info(`[MQTT Service] Device registration response [${code}]:`, {
                deviceId,
                success: data.success,
                message: data.message,
                status: data.data?.status,
                isRegistered: data.data?.isRegistered,
              });
              return data;
            },
          };
        },
        json: (data) => {
          responseData = data;
          logger.info(`[MQTT Service] Device registration response [200]:`, {
            deviceId,
            success: data.success,
            message: data.message,
            status: data.data?.status,
            isRegistered: data.data?.isRegistered,
          });
          return data;
        },
      };

      await deviceRegister(mockReq, mockRes);

      // Log the final result
      if (responseStatus && responseStatus !== 200 && responseStatus !== 201) {
        logger.warn(`[MQTT Service] Registration returned non-success status ${responseStatus} for ${deviceId}`);
      }

    } catch (error) {
      logger.error(`[MQTT Service] Error processing registration from ${deviceId}:`, {
        error: error.message,
        stack: error.stack,
        deviceData: data,
      });
    }
  }

  /**
   * Handle device presence messages (online/offline status)
   * NOTE: Presence messages are NOT trusted automatically.
   * Only responses to presence queries actually update device status.
   * This handler just logs the announcement for debugging.
   */
  async handleDevicePresence(deviceId, data) {
    try {
      // Track device as connected when it sends presence announcement
      this.deviceSubscriptions.add(deviceId);
      
      // Remove from subscriptions after 5 minutes of inactivity
      setTimeout(() => {
        this.deviceSubscriptions.delete(deviceId);
      }, 5 * 60 * 1000);

      const { status, timestamp } = data;
      
      // Log the announcement but don't update database
      // Database updates are handled by handlePresenceResponse() to avoid duplicates
      logger.debug(`[MQTT Presence] Device ${deviceId} announced: ${status} (announcement only - no DB update)`, { timestamp });

      // ⚠️ DO NOT UPDATE DATABASE HERE
      // This would create duplicate updates since handlePresenceResponse() already handles it
      // Presence announcements are just for logging/debugging

    } catch (error) {
      logger.error(`[MQTT Presence] Error processing device ${deviceId} presence announcement:`, error);
    }
  }

  /**
   * Handle presence response messages from devices
   * This is called when devices respond to "who_is_online" queries
   */
  async handlePresenceResponse(data) {
    try {
      if (data.response === 'i_am_online' && data.deviceId) {
        // Track device as connected when it responds to presence query
        this.deviceSubscriptions.add(data.deviceId);
        
        // Remove from subscriptions after 5 minutes of inactivity
        setTimeout(() => {
          this.deviceSubscriptions.delete(data.deviceId);
        }, 5 * 60 * 1000);

        // Check if we've already processed this response (prevent duplicates)
        const existingResponse = this.presenceResponses.get(data.deviceId);
        if (existingResponse) {
          const timeDiff = Date.now() - existingResponse.receivedAt;
          if (timeDiff < 2000) {
            // Ignore duplicate responses within 2 seconds
            logger.debug(`[MQTT Presence] Ignoring duplicate response from ${data.deviceId}`);
            return;
          }
        }

        // Store the response with separate receivedAt timestamp
        this.presenceResponses.set(data.deviceId, {
          ...data,
          receivedAt: Date.now(), // Use milliseconds timestamp for reliable comparison
        });
        
        logger.info(`[MQTT Presence] ✅ Device ${data.deviceId} responded to presence query - marking ONLINE`);

        // Update device status to ONLINE immediately when it responds
        const { Device } = require('../devices/device.Model');
        const device = await Device.findOne({ deviceId: data.deviceId.trim() });
        
        if (device) {
          const oldStatus = device.status;
          const now = new Date();
          
          // Validate and parse timestamp
          let lastSeenDate = now;
          if (data.timestamp) {
            // Handle Unix timestamp (number) or ISO string
            const parsedDate = typeof data.timestamp === 'number' 
              ? new Date(data.timestamp * 1000) // Assuming Unix timestamp in seconds
              : new Date(data.timestamp);
            
            // Only use parsed date if it's valid
            if (!isNaN(parsedDate.getTime())) {
              lastSeenDate = parsedDate;
            } else {
              logger.warn(`[MQTT Presence] Invalid timestamp from ${data.deviceId}, using current time`, { timestamp: data.timestamp });
            }
          }

          device.status = 'online';
          device.lastSeen = lastSeenDate;
          await device.save();

          if (oldStatus !== 'online') {
            logger.info(`[MQTT Presence] Device ${data.deviceId} status changed: ${oldStatus} → online`);
          }
        } else {
          logger.warn(`[MQTT Presence] Device ${data.deviceId} responded but not found in database`);
        }
      } else {
        logger.warn('[MQTT Presence] Invalid presence response format:', data);
      }
    } catch (error) {
      logger.error('[MQTT Presence] Failed to process presence response:', error);
    }
  }

  /**
   * Send command to specific device
   */
  sendCommandToDevice(deviceId, command, data = {}) {
    if (!this.connected) {
      logger.warn(`[MQTT Service] Cannot send command - MQTT not connected`);
      return false;
    }

    const topic = generateTopics.deviceCommands(deviceId);
    const message = {
      command,
      timestamp: new Date().toISOString(),
      ...data,
    };

    try {
      this.client.publish(topic, JSON.stringify(message), {
        qos: MQTT_CONFIG.QOS.AT_LEAST_ONCE,
        retain: true,  // Changed to true so devices receive commands even if offline
      });

      logger.info(`[MQTT Service] Command sent to device ${deviceId}:`, { command, topic });
      return true;

    } catch (error) {
      logger.error(`[MQTT Service] Failed to send command to ${deviceId}:`, error);
      return false;
    }
  }

  /**
   * Publish message to MQTT topic
   */
  publish(topic, message, options = {}) {
    if (!this.connected) {
      logger.warn(`[MQTT Service] Cannot publish - MQTT not connected`);
      return false;
    }

    try {
      this.client.publish(topic, JSON.stringify(message), {
        qos: MQTT_CONFIG.QOS.AT_LEAST_ONCE,
        retain: false,
        ...options,
      });

      logger.debug(`[MQTT Service] Published to topic ${topic}`);
      return true;

    } catch (error) {
      logger.error(`[MQTT Service] Failed to publish to ${topic}:`, error);
      return false;
    }
  }

  /**
   * Check if device is connected (based on recent messages)
   */
  isDeviceConnected(deviceId) {
    return this.deviceSubscriptions.has(deviceId);
  }

  /**
   * Publish presence query to check which devices are online
   * @param {number} timeoutMs - How long to wait for responses (default: 10000ms)
   * @returns {Promise<Array>} - Array of device IDs that responded
   */
  async queryDevicePresence(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      // Double-check connection status
      if (!this.connected || !this.client || !this.client.connected) {
        logger.warn('[MQTT Presence] Cannot query presence - MQTT not connected');
        resolve([]);
        return;
      }

      // If there's already an active query, wait for it to complete
      if (this.presenceQueryActive) {
        logger.warn('[MQTT Presence] Query already in progress - skipping');
        resolve([]);
        return;
      }

      // Clear any existing presence data and timeout
      if (this.presenceTimeout) {
        clearTimeout(this.presenceTimeout);
        this.presenceTimeout = null;
      }
      this.presenceResponses.clear();
      this.presenceQueryActive = true;

      logger.debug('[MQTT Presence] Publishing presence query...');

      try {
        // Publish "who is online?" message
        const published = this.publish(MQTT_CONFIG.TOPICS.PRESENCE_QUERY, {
          query: 'who_is_online',
          timestamp: new Date().toISOString(),
          serverId: MQTT_CONFIG.CLIENT_ID,
        }, { qos: 1 });

        if (!published) {
          logger.warn('[MQTT Presence] Failed to publish presence query');
          this.presenceQueryActive = false;
          resolve([]);
          return;
        }

        // Set timeout for collecting responses
        this.presenceTimeout = setTimeout(() => {
          this.presenceQueryActive = false;
          const onlineDevices = Array.from(this.presenceResponses.keys());
          
          if (onlineDevices.length > 0) {
            logger.debug(`[MQTT Presence] Query complete - ${onlineDevices.length} devices responded`);
          } else {
            logger.debug('[MQTT Presence] Query complete - no devices responded');
          }
          
          resolve(onlineDevices);
        }, timeoutMs);

      } catch (error) {
        logger.error('[MQTT Presence] Error during presence query:', error);
        this.presenceQueryActive = false;
        if (this.presenceTimeout) {
          clearTimeout(this.presenceTimeout);
          this.presenceTimeout = null;
        }
        resolve([]);
      }
    });
  }

  /**
   * Send command to specific device
   */
  sendCommandToDevice(deviceId, command, data = {}) {
    const topic = `devices/${deviceId}/commands`;
    const message = {
      command,
      timestamp: new Date().toISOString(),
      ...data,
    };

    return this.publish(topic, message, { qos: 1 });
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.connected,
      broker: MQTT_CONFIG.BROKER_URL,
      clientId: MQTT_CONFIG.CLIENT_ID,
      subscriptions: Array.from(this.deviceSubscriptions),
      presenceQueryActive: this.presenceQueryActive,
    };
  }
}

// Create singleton instance
const mqttService = new MQTTService();

module.exports = mqttService;