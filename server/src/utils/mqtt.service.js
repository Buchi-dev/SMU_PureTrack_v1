/**
 * MQTT Service for HiveMQ Integration
 * Handles MQTT connections, subscriptions, and message handling
 * Updated: Device tracking and status management
 */

const mqtt = require('mqtt');
const { MQTT_CONFIG, generateTopics } = require('../configs/mqtt.config');
const logger = require('../utils/logger');

class MQTTService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.deviceSubscriptions = new Set(); // Track active devices
    this.deviceLastSeen = new Map(); // Track last message timestamp for each device
    this.presenceResponses = new Map(); // Track presence responses during queries
    this.presenceQueryActive = false;
    this.presenceTimeout = null;
    this.reconnectCount = 0;
    this.lastReconnectTime = null;
    this.processedRegistrations = new Map(); // Track recently processed registrations to avoid duplicates
    this.DEVICE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes - devices are considered offline if no message received
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
        // Set a connection timeout to prevent hanging
        const connectionTimeout = setTimeout(() => {
          if (!this.connected) {
            logger.error('[MQTT Service] Connection timeout after 30 seconds');
            reject(new Error('MQTT connection timeout'));
          }
        }, 30000);

        this.client.on('connect', () => {
          clearTimeout(connectionTimeout);
          this.reconnectCount = 0;
          this.lastReconnectTime = new Date();
          logger.info('[MQTT Service] ✓ Connected to HiveMQ successfully', {
            clientId: MQTT_CONFIG.CLIENT_ID,
            keepalive: MQTT_CONFIG.OPTIONS.keepalive,
            broker: MQTT_CONFIG.BROKER_URL
          });
          this.connected = true;

          // Subscribe to all device topics
          this.subscribeToDeviceTopics();

          resolve();
        });

        this.client.on('error', (error) => {
          clearTimeout(connectionTimeout);
          logger.error('[MQTT Service] Connection error:', {
            error: error.message,
            code: error.code,
            errno: error.errno,
            syscall: error.syscall
          });
          this.connected = false;
          
          // Only reject on initial connection, not reconnection attempts
          if (this.reconnectCount === 0) {
            reject(error);
          }
        });

        this.client.on('offline', () => {
          this.reconnectCount++;
          const secondsConnected = this.lastReconnectTime ? Math.floor((Date.now() - this.lastReconnectTime.getTime()) / 1000) : 'N/A';
          
          // Only log warning if connection was stable (more than 30 seconds)
          if (secondsConnected === 'N/A' || secondsConnected < 30) {
            logger.error(`[MQTT Service] ⚠️ Connection unstable - disconnected after ${secondsConnected}s (attempt #${this.reconnectCount})`, {
              lastConnected: this.lastReconnectTime,
              possibleCauses: [
                'Client ID conflict (another server instance running?)',
                'Authentication failure',
                'Keepalive timeout (broker expecting faster pings)',
                'Network instability'
              ]
            });
          } else {
            logger.warn(`[MQTT Service] MQTT client went offline (reconnect attempt #${this.reconnectCount})`, {
              lastConnected: this.lastReconnectTime,
              secondsConnected
            });
          }
          this.connected = false;
        });

        this.client.on('close', () => {
          if (this.connected) {
            logger.warn('[MQTT Service] MQTT connection closed unexpectedly');
          }
          this.connected = false;
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
   * Handle incoming MQTT messages with rate tracking
   */
  handleMessage(topic, message) {
    try {
      // Track message rate for monitoring
      if (!this.messageStats) {
        this.messageStats = {
          total: 0,
          lastMinute: 0,
          lastMinuteTimestamp: Date.now(),
          byType: { data: 0, register: 0, presence: 0, other: 0 }
        };
      }
      
      this.messageStats.total++;
      this.messageStats.lastMinute++;
      
      // Reset per-minute counter every minute
      const now = Date.now();
      if (now - this.messageStats.lastMinuteTimestamp >= 60000) {
        logger.debug(`[MQTT Service] Messages in last minute: ${this.messageStats.lastMinute}`);
        this.messageStats.lastMinute = 0;
        this.messageStats.lastMinuteTimestamp = now;
      }

      const messageStr = message.toString();
      const data = JSON.parse(messageStr);

      logger.debug('[MQTT Service] Received message:', {
        topic,
        data: messageStr.substring(0, 200) + (messageStr.length > 200 ? '...' : ''),
      });

      // Extract device ID from topic
      const topicParts = topic.split('/');
      const deviceId = topicParts[1]; // devices/{deviceId}/...

      // Track device as active when it sends ANY message
      if (deviceId && topic.startsWith('devices/')) {
        const now = Date.now();
        
        // Add device to active set if not already present
        if (!this.deviceSubscriptions.has(deviceId)) {
          this.deviceSubscriptions.add(deviceId);
          logger.info(`[MQTT Service] Device ${deviceId} is now tracked as ACTIVE/ONLINE`);
        }
        
        // Update last seen timestamp
        this.deviceLastSeen.set(deviceId, now);
        
        // Cleanup stale devices periodically (every 100 messages)
        if (this.messageStats.total % 100 === 0) {
          this.cleanupStaleDevices();
        }
      }

      // Route message based on topic type
      if (topic.includes('/data')) {
        this.messageStats.byType.data++;
        this.handleSensorData(deviceId, data);
      } else if (topic.includes('/register')) {
        this.messageStats.byType.register++;
        this.handleDeviceRegistration(deviceId, data);
      } else if (topic.includes('/presence')) {
        this.messageStats.byType.presence++;
        this.handleDevicePresence(deviceId, data);
      } else if (topic === MQTT_CONFIG.TOPICS.PRESENCE_RESPONSE) {
        this.messageStats.byType.presence++;
        this.handlePresenceResponse(data);
      } else {
        this.messageStats.byType.other++;
      }

    } catch (error) {
      logger.error('[MQTT Service] Error processing message:', {
        topic,
        error: error.message,
        message: message.toString(),
      });
    }
  }

  /**
   * Get message statistics for monitoring
   */
  getMessageStats() {
    return this.messageStats || {
      total: 0,
      lastMinute: 0,
      lastMinuteTimestamp: Date.now(),
      byType: { data: 0, register: 0, presence: 0, other: 0 }
    };
  }

  /**
   * Handle sensor data messages from devices
   * Uses async queue to prevent blocking during high load (jittered transmissions)
   */
  async handleSensorData(deviceId, data) {
    // Only log in verbose mode - sensor data processing happens frequently
    if (process.env.VERBOSE_LOGGING === 'true') {
      logger.info(`[MQTT Service] Received sensor data from device: ${deviceId}`);
    }

    try {
      // Queue the sensor data for async processing instead of blocking
      const { queueSensorData } = require('./sensorDataQueue');
      await queueSensorData(deviceId, data);
      
      logger.debug(`[MQTT Service] Sensor data queued for processing: ${deviceId}`);
    } catch (error) {
      logger.error(`[MQTT Service] Error queueing sensor data from ${deviceId}:`, error);
      
      // Fallback: process immediately if queue fails
      logger.warn(`[MQTT Service] Queue failed, processing ${deviceId} immediately`);
      try {
        const { processSensorData } = require('../devices/device.Controller');
        
        const mockReq = {
          body: { deviceId, ...data },
          headers: { 'x-api-key': process.env.API_KEY },
        };
        const mockRes = {
          status: (code) => ({ json: (data) => data }),
          json: (data) => data,
        };
        
        await processSensorData(mockReq, mockRes);
      } catch (fallbackError) {
        logger.error(`[MQTT Service] Fallback processing failed for ${deviceId}:`, fallbackError);
      }
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
          'x-api-key': process.env.API_KEY,
        },
      };

      const mockRes = {
        status: (code) => ({
          json: (data) => data,
        }),
        json: (data) => data,
      };

      const result = await deviceRegister(mockReq, mockRes);
      
      // Log if device is already registered and approved
      if (result && result.data && result.data.isRegistered) {
        logger.info(`[MQTT Service] Device ${deviceId} is already registered and approved`);
      }

    } catch (error) {
      logger.error(`[MQTT Service] Error processing registration from ${deviceId}:`, error);
    }
  }

  /**
   * Handle device presence messages (online/offline status)
   * NOTE: Presence messages are NOT trusted automatically.
   * Only responses to presence queries actually update device status.
   * This handler just logs the announcement for debugging.
   * 
   * IMPORTANT: When device comes online, check for pending commands in Redis
   */
  async handleDevicePresence(deviceId, data) {
    try {
      const { status, timestamp } = data;
      
      // Log the announcement but don't update database
      // Database updates are handled by handlePresenceResponse() to avoid duplicates
      logger.debug(`[MQTT Presence] Device ${deviceId} announced: ${status} (announcement only - no DB update)`, { timestamp });

      // ⚠️ DO NOT UPDATE DATABASE HERE
      // This would create duplicate updates since handlePresenceResponse() already handles it
      // Presence announcements are just for logging/debugging

      // If device is announcing "online", check for pending commands
      if (status === 'online') {
        logger.info(`[MQTT Presence] Device ${deviceId} came online - checking for pending commands`);
        await this.sendPendingCommandsToDevice(deviceId);
      }

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

          // Invalidate cache (single operation)
          const CacheService = require('./cache.service');
          await Promise.all([
            CacheService.del(`device:${data.deviceId}`),
            CacheService.delPattern('devices:all:*')
          ]);
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
   * 
   * IMPORTANT: Commands are NOT retained because:
   * 1. Commands are one-time actions (restart, send_now, etc.)
   * 2. Device subscribes with QoS 0 - retained messages with QoS 1 may not deliver properly
   * 3. For offline devices, we use Redis queue instead (see queueCommandForDevice)
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
      // Use QoS 1 for reliable delivery, but NO retain flag
      // Device must be online to receive commands
      this.client.publish(topic, JSON.stringify(message), {
        qos: MQTT_CONFIG.QOS.AT_LEAST_ONCE,
        retain: false,  // Do NOT retain - commands are one-time actions
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
    const isConnected = this.deviceSubscriptions.has(deviceId);
    
    if (isConnected) {
      const lastSeen = this.deviceLastSeen.get(deviceId);
      const now = Date.now();
      const timeSinceLastSeen = now - (lastSeen || 0);
      
      logger.debug(`[MQTT Service] Device ${deviceId} connection check:`, {
        isInSet: true,
        lastSeenAgo: `${Math.round(timeSinceLastSeen / 1000)}s`,
        isStale: timeSinceLastSeen > this.DEVICE_TIMEOUT_MS
      });
    } else {
      logger.debug(`[MQTT Service] Device ${deviceId} NOT in active devices set`);
    }
    
    return isConnected;
  }

  /**
   * Clean up stale devices that haven't sent messages recently
   * Runs periodically to keep deviceSubscriptions accurate
   */
  cleanupStaleDevices() {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [deviceId, lastSeen] of this.deviceLastSeen.entries()) {
      const timeSinceLastSeen = now - lastSeen;
      
      if (timeSinceLastSeen > this.DEVICE_TIMEOUT_MS) {
        this.deviceSubscriptions.delete(deviceId);
        this.deviceLastSeen.delete(deviceId);
        removedCount++;
        
        logger.info(`[MQTT Service] Removed stale device ${deviceId} (inactive for ${Math.round(timeSinceLastSeen / 1000)}s)`);
      }
    }
    
    if (removedCount > 0) {
      logger.info(`[MQTT Service] Cleanup complete: removed ${removedCount} stale devices, ${this.deviceSubscriptions.size} devices remain active`);
    }
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
   * Queue command in Redis for offline device (will be delivered on reconnection)
   */
  async queueCommandForDevice(deviceId, command, data = {}) {
    try {
      const { getRedisClient } = require('../configs/redis.Config');
      const redisClient = getRedisClient();

      if (!redisClient) {
        logger.warn('[MQTT Service] Redis not available - cannot queue command', {
          deviceId,
          command,
        });
        return false;
      }

      const queueKey = `pending_commands:${deviceId}`;
      const commandData = {
        command,
        data,
        timestamp: new Date().toISOString(),
        queuedAt: Date.now()
      };

      // Add command to Redis list (queue)
      await redisClient.rPush(queueKey, JSON.stringify(commandData));
      
      // Set expiration to 7 days (604800 seconds)
      await redisClient.expire(queueKey, 604800);

      logger.info('[MQTT Service] Command queued in Redis for offline device', {
        deviceId,
        command,
        queueKey,
      });

      return true;
    } catch (error) {
      logger.error('[MQTT Service] Failed to queue command in Redis:', {
        deviceId,
        command,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Send pending commands to device (called when device reconnects)
   */
  async sendPendingCommandsToDevice(deviceId) {
    try {
      const { getRedisClient } = require('../configs/redis.Config');
      const redisClient = getRedisClient();

      if (!redisClient) {
        return;
      }

      const queueKey = `pending_commands:${deviceId}`;
      
      // Get all pending commands
      const pendingCommands = await redisClient.lRange(queueKey, 0, -1);

      if (!pendingCommands || pendingCommands.length === 0) {
        logger.debug('[MQTT Service] No pending commands for device', { deviceId });
        return;
      }

      logger.info('[MQTT Service] Sending pending commands to reconnected device', {
        deviceId,
        commandCount: pendingCommands.length,
      });

      // Send each command via MQTT
      for (const cmdStr of pendingCommands) {
        try {
          const cmd = JSON.parse(cmdStr);
          
          logger.info('[MQTT Service] Delivering queued command', {
            deviceId,
            command: cmd.command,
            queuedAt: cmd.timestamp,
          });

          // Send command via MQTT with special flag indicating it's a pending command
          this.sendCommandToDevice(deviceId, cmd.command, {
            ...cmd.data,
            _pending: true,
            _queuedAt: cmd.timestamp,
          });

          // Small delay between commands
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (parseError) {
          logger.error('[MQTT Service] Failed to parse queued command', {
            deviceId,
            error: parseError.message,
          });
        }
      }

      // Clear the queue after sending
      await redisClient.del(queueKey);
      
      logger.info('[MQTT Service] Cleared pending commands queue', {
        deviceId,
        commandsDelivered: pendingCommands.length,
      });

    } catch (error) {
      logger.error('[MQTT Service] Failed to send pending commands:', {
        deviceId,
        error: error.message,
      });
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.connected,
      broker: MQTT_CONFIG.BROKER_URL,
      clientId: MQTT_CONFIG.CLIENT_ID,
      activeDevices: Array.from(this.deviceSubscriptions),
      activeDeviceCount: this.deviceSubscriptions.size,
      deviceLastSeen: Object.fromEntries(
        Array.from(this.deviceLastSeen.entries()).map(([deviceId, timestamp]) => [
          deviceId,
          new Date(timestamp).toISOString()
        ])
      ),
      presenceQueryActive: this.presenceQueryActive,
    };
  }
}

// Create singleton instance
const mqttService = new MQTTService();

module.exports = mqttService;