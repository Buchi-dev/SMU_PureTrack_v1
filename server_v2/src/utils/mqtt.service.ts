/**
 * MQTT Service
 * 
 * Handles bidirectional communication with IoT devices via HiveMQ Cloud
 * - Subscribes to sensor data, device registration, and presence topics
 * - Publishes commands to devices
 * - Automatic reconnection with exponential backoff
 * 
 * @module utils/mqtt.service
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { mqttConfig } from '@core/configs';
import { deviceService } from '@feature/devices';
import { DeviceStatus } from '@feature/devices/device.types';
import { sensorReadingService } from '@feature/sensorReadings';
import logger from '@utils/logger.util';
import { alertService } from '@feature/alerts';
import { websocketService } from '@utils/websocket.service';

/**
 * MQTT Topics
 * FIXED: Removed 'water-quality/' prefix to match Arduino device topics
 * Device publishes to: devices/{deviceId}/data, devices/{deviceId}/register, devices/{deviceId}/presence
 * FIXED: Added presence/response for server polling (who_is_online responses)
 */
const TOPICS = {
  SENSOR_DATA: 'devices/+/data',
  DEVICE_REGISTRATION: 'devices/+/register',
  DEVICE_PRESENCE: 'devices/+/presence',
  DEVICE_STATUS: 'devices/+/status', // LWT - Last Will Testament
  PRESENCE_RESPONSE: 'presence/response', // Devices respond to who_is_online query
  DEVICE_COMMANDS: (deviceId: string) => `devices/${deviceId}/commands`,
} as const;

/**
 * Reconnection configuration
 */
const RECONNECT_CONFIG = {
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 60000, // 60 seconds
  MULTIPLIER: 2,
};

/**
 * MQTT Service Class
 * Singleton for managing MQTT broker connection
 */
class MQTTService {
  private client: MqttClient | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectDelay = RECONNECT_CONFIG.INITIAL_DELAY;

  /**
   * Initialize MQTT connection
   */
  async connect(): Promise<void> {
    if (this.client && this.isConnected) {
      logger.info('🔄 MQTT: Already connected');
      return;
    }

    logger.info('🔌 MQTT: Connecting to HiveMQ Cloud...');

    const options: IClientOptions = {
      ...mqttConfig.options, // Contains username/password from config
      clientId: mqttConfig.clientId,
      reconnectPeriod: 0, // Override: Disable auto-reconnect (we handle manually)
    };

    this.client = mqtt.connect(mqttConfig.brokerUrl, options);

    // Wait for connection to be established
    await new Promise<void>((resolve, reject) => {
      if (!this.client) {
        reject(new Error('MQTT client initialization failed'));
        return;
      }

      const connectionTimeout = setTimeout(() => {
        reject(new Error('MQTT connection timeout after 30 seconds'));
      }, 30000);

      this.client.once('connect', () => {
        clearTimeout(connectionTimeout);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = RECONNECT_CONFIG.INITIAL_DELAY;
        logger.info('✅ MQTT: Connected to HiveMQ Cloud');
        this.subscribeToTopics();
        resolve();
      });

      this.client.once('error', (error) => {
        clearTimeout(connectionTimeout);
        logger.error('❌ MQTT Connection Error', { error: error.message, stack: error.stack });
        reject(error);
      });
    });

    // Set up persistent event handlers after initial connection
    this.client.on('error', (error) => {
      logger.error('❌ MQTT Error', { error: error.message, stack: error.stack });
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.info('🔌 MQTT: Connection closed');
      this.isConnected = false;
      this.handleReconnection();
    });

    this.client.on('offline', () => {
      logger.warn('⚠️ MQTT: Client offline');
      this.isConnected = false;
    });

    this.client.on('message', this.handleMessage.bind(this));
  }

  /**
   * Subscribe to all required topics
   * STATUS DETECTION: Server Polling Only
   */
  private subscribeToTopics(): void {
    if (!this.client) return;

    const topics = [
      TOPICS.SENSOR_DATA,
      TOPICS.DEVICE_REGISTRATION,
      TOPICS.DEVICE_PRESENCE, // For individual device presence announcements
      TOPICS.PRESENCE_RESPONSE, // For "who_is_online" query responses (CRITICAL for heartbeat)

    ];

    topics.forEach((topic) => {
      this.client!.subscribe(topic, { qos: 1 as 0 | 1 | 2 }, (error) => {
        if (error) {
          logger.error(`❌ MQTT: Failed to subscribe to ${topic}`, { error: error.message, topic });
        } else {
          logger.info(`✅ MQTT: Subscribed to ${topic}`);
        }
      });
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      // Convert buffer to string first
      const payloadString = payload.toString();
      
      // Try to parse JSON
      const message = JSON.parse(payloadString);

      // Special handling for presence/response (no deviceId in topic)
      if (topic === 'presence/response') {
        const deviceId = message.deviceId;
        if (deviceId) {
          await this.handleDevicePresence(deviceId, message);
        } else {
          logger.error('❌ MQTT: presence/response missing deviceId', { message });
        }
        return;
      }

      // Extract deviceId from topic for device-specific topics
      const deviceId = this.extractDeviceId(topic);
      if (!deviceId) {
        logger.error('❌ MQTT: Invalid topic format', { topic });
        return;
      }

      // Route message to appropriate handler
      if (topic.includes('/data')) {
        await this.handleSensorData(deviceId, message);
      } else if (topic.includes('/registration') || topic.includes('/register')) {
        await this.handleDeviceRegistration(deviceId, message);
      } else if (topic.includes('/presence')) {
        await this.handleDevicePresence(deviceId, message);
      }
      // REMOVED: handleDeviceStatus - No LWT handling
    } catch (error: any) {
      // Log the malformed payload for debugging
      const payloadPreview = payload.toString().substring(0, 500); // First 500 chars
      logger.error('❌ MQTT: Message handling error', { 
        error: error.message, 
        topic,
        payloadLength: payload.length,
        payloadPreview,
        stack: error.stack 
      });
    }
  }

  /**
   * Handle sensor data messages
   * BUG FIXES #2, #3, #4:
   * - #2: Validate sensor validity flags (pH_valid, tds_valid, turbidity_valid)
   * - #3: Validate timestamps are after Jan 1, 2020
   * - #4: Validate sensor ranges (pH 0-14, TDS 0-2000, Turbidity 0-1000)
   */
  private async handleSensorData(deviceId: string, data: any): Promise<void> {
    try {
      // Validate required fields exist
      if (typeof data.pH !== 'number' || typeof data.turbidity !== 'number' || typeof data.tds !== 'number') {
        logger.error('❌ MQTT: Invalid sensor data format', { deviceId, data });
        return;
      }

      // BUG FIX #3: Timestamp validation
      const MIN_VALID_EPOCH = 1609459200; // Jan 1, 2020
      const now = Math.floor(Date.now() / 1000);
      const MAX_FUTURE = 3600; // 1 hour tolerance

      if (data.timestamp && data.timestamp < MIN_VALID_EPOCH) {
        logger.error(`❌ MQTT: Invalid timestamp from ${deviceId}: ${data.timestamp} (before Jan 1, 2020)`, { deviceId, timestamp: data.timestamp });
        return;
      }

      if (data.timestamp && data.timestamp > now + MAX_FUTURE) {
        logger.error(`❌ MQTT: Future timestamp from ${deviceId}: ${data.timestamp} (${data.timestamp - now}s ahead of server)`, { deviceId, timestamp: data.timestamp });
        return;
      }

      // BUG FIX #4: Sensor range validation
      const rangeValidation = this.validateSensorRanges(data);
      if (!rangeValidation.valid) {
        logger.error(`❌ MQTT: Sensor values out of range from ${deviceId}:`, { deviceId, errors: rangeValidation.errors });
        return;
      }

      // BUG FIX #2: Check sensor validity flags
      const invalidSensors = [];
      if (data.pH_valid === false) invalidSensors.push('pH');
      if (data.tds_valid === false) invalidSensors.push('TDS');
      if (data.turbidity_valid === false) invalidSensors.push('turbidity');

      if (invalidSensors.length > 0) {
        logger.warn(`⚠️ MQTT: Device ${deviceId} reporting invalid sensors:`, { deviceId, invalidSensors });
      }

      // STATUS DETECTION: Do NOT update device status here
      // Status is only updated by presence responses (ping-pong mechanism)
      // Update lastSeen timestamp only (for UI display purposes)
      await deviceService.updateLastSeenOnly(deviceId);

      // Store sensor reading with validity flags
      const reading = await sensorReadingService.processSensorData(deviceId, {
        pH: data.pH_valid !== false ? data.pH : null, // Store null if sensor invalid
        turbidity: data.turbidity_valid !== false ? data.turbidity : null,
        tds: data.tds_valid !== false ? data.tds : null,
        pH_valid: data.pH_valid !== false,
        tds_valid: data.tds_valid !== false,
        turbidity_valid: data.turbidity_valid !== false,
        timestamp: data.timestamp ? new Date(data.timestamp * 1000) : new Date(),
      });

      // ✅ BROADCAST TO WEBSOCKET CLIENTS IMMEDIATELY
      // This eliminates the need for HTTP polling - data appears instantly
      websocketService.broadcastSensorData(deviceId, reading);

      // Only check thresholds for valid sensors
      if (invalidSensors.length === 0) {
        await alertService.checkThresholdsAndCreateAlerts(deviceId, data.deviceName || deviceId, {
          pH: data.pH,
          turbidity: data.turbidity,
          tds: data.tds,
          timestamp: data.timestamp ? new Date(data.timestamp * 1000) : new Date(),
        });
      }

      logger.info(`📊 MQTT: Processed sensor data from ${deviceId}`, { invalidSensors: invalidSensors.length > 0 ? invalidSensors : undefined });
    } catch (error: any) {
      // Auto-register device if not found
      if (error.message === 'Device not found' || error.message?.includes('not found')) {
        logger.warn(`⚠️ MQTT: Device ${deviceId} not registered, auto-registering from sensor data...`);
        try {
          await deviceService.processDeviceRegistration({
            deviceId,
            name: data.deviceName || `Auto-registered ${deviceId}`,
            type: 'Unknown',
            sensors: ['pH', 'turbidity', 'tds'],
          });
          logger.info(`✅ MQTT: Auto-registered device ${deviceId} from sensor data`);
          
          // Retry processing sensor data after registration
          await this.handleSensorData(deviceId, data);
        } catch (regError: any) {
          logger.error(`❌ MQTT: Failed to auto-register device ${deviceId}`, { error: regError.message, stack: regError.stack });
        }
      } else {
        logger.error(`❌ MQTT: Error processing sensor data from ${deviceId}`, { error: error.message, stack: error.stack, deviceId });
      }
    }
  }

  /**
   * Validate sensor value ranges
   * BUG FIX #4: Ensure sensor values are physically possible
   */
  private validateSensorRanges(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // pH: 0-14 (standard pH scale)
    if (data.pH < 0 || data.pH > 14) {
      errors.push(`pH: ${data.pH} (valid range: 0-14)`);
    }

    // TDS: 0-2000 ppm
    if (data.tds < 0 || data.tds > 2000) {
      errors.push(`TDS: ${data.tds} (valid range: 0-2000 ppm)`);
    }

    // Turbidity: 0-1000 NTU
    if (data.turbidity < 0 || data.turbidity > 1000) {
      errors.push(`Turbidity: ${data.turbidity} (valid range: 0-1000 NTU)`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Handle device registration messages
   */
  private async handleDeviceRegistration(deviceId: string, data: any): Promise<void> {
    try {
      await deviceService.processDeviceRegistration({
        deviceId,
        name: data.name || deviceId,
        location: data.location,
        ...data,
      });
      logger.info(`📝 MQTT: Processed registration for ${deviceId}`);
    } catch (error: any) {
      logger.error(`❌ MQTT: Error processing registration for ${deviceId}`, { error: error.message, stack: error.stack, deviceId });
    }
  }

  /**
   * Handle device presence/heartbeat messages
   * STATUS DETECTION: This is the ONLY place device status is set to ONLINE
   * Responds to "who_is_online" queries - ping-pong mechanism
   * AUTO-REGISTRATION: If device is not found, auto-register it
   */
  private async handleDevicePresence(deviceId: string, data: any): Promise<void> {
    try {
      // Update device status to ONLINE and lastSeen timestamp
      const updatedDevice = await deviceService.updateDeviceStatus(deviceId, DeviceStatus.ONLINE);
      await deviceService.updateHeartbeat(deviceId);
      logger.info(`💚 MQTT: Device ${deviceId} is ONLINE (presence confirmed)`);
      
      // 🔥 FIX: Broadcast device status change to WebSocket clients
      websocketService.broadcastDeviceStatus(deviceId, 'online', updatedDevice);
    } catch (error: any) {
      // Auto-register device if not found
      if (error.message === 'Device not found' || error.message?.includes('not found')) {
        logger.warn(`⚠️ MQTT: Device ${deviceId} not registered, auto-registering from presence...`);
        try {
          await deviceService.processDeviceRegistration({
            deviceId,
            name: data.name || `Auto-registered ${deviceId}`,
            type: data.type || 'Unknown',
            sensors: data.sensors || [],
          });
          logger.info(`✅ MQTT: Auto-registered device ${deviceId} from presence`);
          
          // Retry presence update after registration
          const updatedDevice = await deviceService.updateDeviceStatus(deviceId, DeviceStatus.ONLINE);
          await deviceService.updateHeartbeat(deviceId);
          
          // 🔥 FIX: Broadcast device status change after auto-registration
          websocketService.broadcastDeviceStatus(deviceId, 'online', updatedDevice);
        } catch (regError: any) {
          logger.error(`❌ MQTT: Failed to auto-register device ${deviceId}`, { error: regError.message, stack: regError.stack });
        }
      } else {
        logger.error(`❌ MQTT: Error processing heartbeat from ${deviceId}`, { error: error.message, stack: error.stack, deviceId });
      }
    }
  }

  /**
   * REMOVED: handleDeviceStatus - No longer used
   * Device status is ONLY updated via presence responses (ping-pong)
   * LWT (Last Will & Testament) has been removed for simplicity
   */

  /**
   * Publish command to device
   */
  public async publishCommand(deviceId: string, command: any): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected');
    }

    const topic = TOPICS.DEVICE_COMMANDS(deviceId);
    const payload = JSON.stringify(command);

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos: 1 as 0 | 1 | 2 }, (error) => {
        if (error) {
          logger.error(`❌ MQTT: Failed to publish command to ${deviceId}`, { error: error.message, deviceId, command });
          reject(error);
        } else {
          logger.info(`✅ MQTT: Published command to ${deviceId}`);
          resolve();
        }
      });
    });
  }

  /**
   * Generic publish method
   * Used by background jobs to publish to any topic
   */
  public publish(topic: string, payload: string): void {
    if (!this.client || !this.isConnected) {
      logger.error('MQTT: Cannot publish - client not connected');
      return;
    }

    this.client.publish(topic, payload, { qos: 1 as 0 | 1 | 2 }, (error) => {
      if (error) {
        logger.error(`❌ MQTT: Failed to publish to ${topic}`, { error: error.message });
      }
    });
  }

  /**
   * Extract device ID from topic
   * FIXED: Updated to match new topic structure devices/{deviceId}/data
   */
  private extractDeviceId(topic: string): string | null {
    const parts = topic.split('/');
    // Topic format: devices/{deviceId}/data or devices/{deviceId}/register
    return parts.length >= 2 && parts[1] ? parts[1] : null;
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection(): void {
    if (this.isConnected) return;

    this.reconnectAttempts++;
    
    logger.info(`🔄 MQTT: Reconnecting (attempt ${this.reconnectAttempts}) in ${this.reconnectDelay}ms...`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch((error) => {
          logger.error('❌ MQTT: Reconnection failed', { error: error.message, attempts: this.reconnectAttempts });
        });
      }
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(
      this.reconnectDelay * RECONNECT_CONFIG.MULTIPLIER,
      RECONNECT_CONFIG.MAX_DELAY
    );
  }

  /**
   * Disconnect from MQTT broker
   */
  public async disconnect(): Promise<void> {
    if (!this.client) return;

    return new Promise((resolve) => {
      this.client!.end(false, {}, () => {
        logger.info('👋 MQTT: Disconnected from broker');
        this.isConnected = false;
        this.client = null;
        resolve();
      });
    });
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export default new MQTTService();
