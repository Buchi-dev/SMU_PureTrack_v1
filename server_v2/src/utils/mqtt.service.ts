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
import { sensorReadingService } from '@feature/sensorReadings';
import logger from '@utils/logger.util';
import { alertService } from '@feature/alerts';

/**
 * MQTT Topics
 */
const TOPICS = {
  SENSOR_DATA: 'water-quality/sensors/+/data',
  DEVICE_REGISTRATION: 'water-quality/devices/+/registration',
  DEVICE_PRESENCE: 'water-quality/devices/+/presence',
  DEVICE_COMMANDS: (deviceId: string) => `water-quality/devices/${deviceId}/commands`,
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

    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = RECONNECT_CONFIG.INITIAL_DELAY;
      logger.info('✅ MQTT: Connected to HiveMQ Cloud');
      this.subscribeToTopics();
    });

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
   */
  private subscribeToTopics(): void {
    if (!this.client) return;

    const topics = [
      TOPICS.SENSOR_DATA,
      TOPICS.DEVICE_REGISTRATION,
      TOPICS.DEVICE_PRESENCE,
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
      const message = JSON.parse(payload.toString());
      const deviceId = this.extractDeviceId(topic);

      if (!deviceId) {
        logger.error('❌ MQTT: Invalid topic format', { topic });
        return;
      }

      // Route message to appropriate handler
      if (topic.includes('/data')) {
        await this.handleSensorData(deviceId, message);
      } else if (topic.includes('/registration')) {
        await this.handleDeviceRegistration(deviceId, message);
      } else if (topic.includes('/presence')) {
        await this.handleDevicePresence(deviceId, message);
      }
    } catch (error: any) {
      logger.error('❌ MQTT: Message handling error', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Handle sensor data messages
   */
  private async handleSensorData(deviceId: string, data: any): Promise<void> {
    try {
      // Validate required fields
      if (typeof data.pH !== 'number' || typeof data.turbidity !== 'number' || typeof data.tds !== 'number') {
        logger.error('❌ MQTT: Invalid sensor data format', { deviceId, data });
        return;
      }

      // Update device heartbeat
      await deviceService.updateHeartbeat(deviceId);

      // Store sensor reading
      await sensorReadingService.processSensorData(deviceId, {
        pH: data.pH,
        turbidity: data.turbidity,
        tds: data.tds,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      });

      // Check for threshold violations and create alerts
      await alertService.checkThresholdsAndCreateAlerts(deviceId, data.deviceName || deviceId, {
        pH: data.pH,
        turbidity: data.turbidity,
        tds: data.tds,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      });

      logger.info(`📊 MQTT: Processed sensor data from ${deviceId}`);
    } catch (error: any) {
      logger.error(`❌ MQTT: Error processing sensor data from ${deviceId}`, { error: error.message, stack: error.stack, deviceId });
    }
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
   */
  private async handleDevicePresence(deviceId: string, _data: any): Promise<void> {
    try {
      await deviceService.updateHeartbeat(deviceId);
      logger.info(`💓 MQTT: Heartbeat from ${deviceId}`);
    } catch (error: any) {
      logger.error(`❌ MQTT: Error processing heartbeat from ${deviceId}`, { error: error.message, stack: error.stack, deviceId });
    }
  }

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
   * Extract device ID from topic
   */
  private extractDeviceId(topic: string): string | null {
    const parts = topic.split('/');
    // Topic format: water-quality/sensors/{deviceId}/data or water-quality/devices/{deviceId}/registration
    return parts.length >= 3 && parts[2] ? parts[2] : null;
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
