/**
 * DeviceSimulator Class
 * 
 * Encapsulates all device simulation logic
 * - Can be instantiated multiple times for multiple devices
 * - Generates realistic sensor readings
 * - Emits data via callback function (used by Socket.IO)
 */

export class DeviceSimulator {
  constructor(deviceConfig, emitCallback = null) {
    this.deviceId = deviceConfig.deviceId;
    this.name = deviceConfig.name;
    this.type = deviceConfig.type;
    this.firmwareVersion = deviceConfig.firmwareVersion;
    this.macAddress = deviceConfig.macAddress;
    this.ipAddress = deviceConfig.ipAddress;
    this.sensors = deviceConfig.sensors;
    
    // Callback function to emit sensor data (Socket.IO)
    this.emitCallback = emitCallback;
    
    this.publishInterval = null;
    this.isRunning = false;
    
    // Sensor Configuration
    this.sensorConfig = {
      tds: {
        baseline: 350,
        variance: 80,
        min: 100,
        max: 800,
        drift: 0.5,
        noise: 15
      },
      pH: {
        baseline: 7.2,
        variance: 0.4,
        min: 6.0,
        max: 8.5,
        drift: 0.02,
        noise: 0.1
      },
      turbidity: {
        baseline: 12,
        variance: 5,
        min: 0,
        max: 100,
        drift: 0.3,
        noise: 2
      }
    };
    
    // Initialize current values
    this.currentValues = {};
    this.driftDirection = {};
    
    this.sensors.forEach(sensor => {
      this.currentValues[sensor] = this.sensorConfig[sensor].baseline;
      this.driftDirection[sensor] = 1;
    });
  }
  
  /**
   * Generate realistic sensor value
   */
  generateSensorValue(sensor) {
    const config = this.sensorConfig[sensor];
    
    // Add random drift
    const drift = (Math.random() - 0.5) * config.drift * this.driftDirection[sensor];
    this.currentValues[sensor] += drift;
    
    // Add random noise
    const noise = (Math.random() - 0.5) * config.noise;
    let value = this.currentValues[sensor] + noise;
    
    // Constrain to realistic range
    if (value < config.min) {
      value = config.min;
      this.driftDirection[sensor] = 1;
    }
    if (value > config.max) {
      value = config.max;
      this.driftDirection[sensor] = -1;
    }
    
    // Occasionally change drift direction
    if (Math.random() < 0.05) {
      this.driftDirection[sensor] *= -1;
    }
    
    // Update current value
    this.currentValues[sensor] = value;
    
    return value;
  }
  
  /**
   * Read all sensors
   */
  readSensors() {
    const readings = {};
    
    this.sensors.forEach(sensor => {
      readings[sensor] = parseFloat(this.generateSensorValue(sensor).toFixed(2));
    });
    
    readings.timestamp = Date.now();
    
    return readings;
  }
  
  /**
   * Register device with MQTT broker
   */
  registerDevice() {
    const registrationPayload = {
      deviceId: this.deviceId,
      name: this.name,
      type: this.type,
      firmwareVersion: this.firmwareVersion,
      macAddress: this.macAddress,
      ipAddress: this.ipAddress,
      sensors: this.sensors
    };
    
    this.mqttClient.publish(
      this.TOPIC_REGISTRATION,
      JSON.stringify(registrationPayload),
      { qos: 1, retain: false }
    );
    
    console.log(`   ✅ Device registered: ${this.deviceId}`);
  }
  
  /**
   * Start publishing sensor data
   */
  startSensorPublishing() {
    this.publishInterval = setInterval(() => {
      if (!this.isRunning) return;
      
      const sensorData = this.readSensors();
      
      // Publish to MQTT
      this.mqttClient.publish(
        this.TOPIC_SENSOR_DATA,
        JSON.stringify(sensorData),
        { qos: 0 }
      );
    }, 2000); // 2 seconds interval
  }
  
  /**
   * Start the device simulator
   */
  start() {
    if (this.isRunning) {
      console.log(`⚠️  Device ${this.deviceId} is already running`);
      return;
    }
    
    this.isRunning = true;
    
    // Connect to MQTT
    this.mqttClient = mqtt.connect(this.mqttOptions);
    
    this.mqttClient.on('connect', () => {
      console.log(`   🔌 Device ${this.deviceId} connected to MQTT`);
      
      // Register device
      setTimeout(() => {
        this.registerDevice();
        this.startSensorPublishing();
      }, 500);
    });
    
    this.mqttClient.on('error', (error) => {
      console.error(`   ❌ Device ${this.deviceId} MQTT Error:`, error.message);
    });
  }
  
  /**
   * Stop the device simulator
   */
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    // Clear interval
    if (this.publishInterval) {
      clearInterval(this.publishInterval);
      this.publishInterval = null;
    }
    
    // Disconnect MQTT
    if (this.mqttClient) {
      this.mqttClient.end(false, () => {
        console.log(`   🔌 Device ${this.deviceId} disconnected from MQTT`);
      });
      this.mqttClient = null;
    }
  }
}
