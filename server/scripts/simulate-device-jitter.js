/**
 * Device Jitter Simulator
 * Simulates multiple devices transmitting with random jitter offsets
 * Tests server's ability to handle distributed load during 5-minute transmission windows
 * 
 * Usage:
 *   node scripts/simulate-device-jitter.js [deviceCount] [cycles]
 * 
 * Examples:
 *   node scripts/simulate-device-jitter.js 10 3     # Simulate 10 devices for 3 cycles
 *   node scripts/simulate-device-jitter.js 50 1     # Simulate 50 devices for 1 cycle
 */

require('dotenv').config();
const mqtt = require('mqtt');

// Configuration
const DEVICE_COUNT = parseInt(process.argv[2]) || 10;
const TEST_CYCLES = parseInt(process.argv[3]) || 1;
const TRANSMISSION_JITTER_WINDOW = 300; // 5 minutes in seconds
const MQTT_CONFIG = {
  BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtts://your-broker.s1.eu.hivemq.cloud:8883',
  USERNAME: process.env.MQTT_USERNAME,
  PASSWORD: process.env.MQTT_PASSWORD,
  QOS: 1,
};

// Generate random sensor readings
function generateSensorData(deviceId, jitterOffset) {
  return {
    deviceId,
    pH: (Math.random() * 4 + 6).toFixed(2), // 6.00 - 10.00
    turbidity: (Math.random() * 10).toFixed(2), // 0 - 10 NTU
    tds: Math.floor(Math.random() * 500 + 100), // 100 - 600 ppm
    timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
    jitterOffset, // For logging/debugging
    firmwareVersion: 'v8.0.0-simulation',
    ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
  };
}

// Simulate a single device
class SimulatedDevice {
  constructor(deviceNumber) {
    this.deviceId = `DEVICE_SIM_${String(deviceNumber).padStart(3, '0')}`;
    this.jitterOffset = Math.floor(Math.random() * TRANSMISSION_JITTER_WINDOW);
    this.client = null;
    this.connected = false;
    this.transmissionCount = 0;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(MQTT_CONFIG.BROKER_URL, {
        username: MQTT_CONFIG.USERNAME,
        password: MQTT_CONFIG.PASSWORD,
        clientId: `simulator_${this.deviceId}_${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
      });

      this.client.on('connect', () => {
        this.connected = true;
        console.log(`✓ [${this.deviceId}] Connected (jitter: ${this.jitterOffset}s = ${Math.floor(this.jitterOffset / 60)}m ${this.jitterOffset % 60}s)`);
        resolve();
      });

      this.client.on('error', (error) => {
        console.error(`✗ [${this.deviceId}] Connection error:`, error.message);
        reject(error);
      });
    });
  }

  async transmitData() {
    if (!this.connected) {
      console.warn(`⚠ [${this.deviceId}] Not connected, skipping transmission`);
      return;
    }

    const topic = `devices/${this.deviceId}/data`;
    const data = generateSensorData(this.deviceId, this.jitterOffset);

    return new Promise((resolve) => {
      this.client.publish(topic, JSON.stringify(data), { qos: MQTT_CONFIG.QOS }, (error) => {
        if (error) {
          console.error(`✗ [${this.deviceId}] Transmission failed:`, error.message);
        } else {
          this.transmissionCount++;
          console.log(`📡 [${this.deviceId}] Transmitted data (count: ${this.transmissionCount}, pH: ${data.pH}, turbidity: ${data.turbidity})`);
        }
        resolve();
      });
    });
  }

  async disconnect() {
    if (this.client && this.connected) {
      return new Promise((resolve) => {
        this.client.end(false, {}, () => {
          this.connected = false;
          console.log(`⏹ [${this.deviceId}] Disconnected`);
          resolve();
        });
      });
    }
  }

  getJitterOffset() {
    return this.jitterOffset;
  }
}

// Main simulation orchestrator
class JitterSimulation {
  constructor(deviceCount) {
    this.devices = [];
    this.deviceCount = deviceCount;
    this.cycleCount = 0;
    this.startTime = null;
  }

  async initialize() {
    console.log('\n' + '='.repeat(80));
    console.log('  DEVICE JITTER SIMULATION');
    console.log('='.repeat(80));
    console.log(`  Devices: ${this.deviceCount}`);
    console.log(`  Cycles: ${TEST_CYCLES}`);
    console.log(`  Jitter Window: ${TRANSMISSION_JITTER_WINDOW}s (${TRANSMISSION_JITTER_WINDOW / 60} minutes)`);
    console.log(`  MQTT Broker: ${MQTT_CONFIG.BROKER_URL}`);
    console.log('='.repeat(80) + '\n');

    // Create and connect all devices
    console.log('📡 Connecting devices...\n');
    for (let i = 1; i <= this.deviceCount; i++) {
      const device = new SimulatedDevice(i);
      this.devices.push(device);
      
      try {
        await device.connect();
      } catch (error) {
        console.error(`Failed to connect device ${i}:`, error.message);
      }

      // Small delay between connections to avoid overwhelming broker
      await this.sleep(100);
    }

    // Sort devices by jitter offset for display
    const sortedDevices = [...this.devices].sort((a, b) => a.getJitterOffset() - b.getJitterOffset());
    
    console.log('\n' + '-'.repeat(80));
    console.log('  TRANSMISSION SCHEDULE (sorted by jitter offset)');
    console.log('-'.repeat(80));
    sortedDevices.forEach((device) => {
      const offset = device.getJitterOffset();
      console.log(`  ${device.deviceId}: +${String(offset).padStart(3, ' ')}s (+${String(Math.floor(offset / 60)).padStart(1, ' ')}m ${String(offset % 60).padStart(2, ' ')}s)`);
    });
    console.log('-'.repeat(80) + '\n');
  }

  async runCycle() {
    this.cycleCount++;
    console.log('\n' + '▬'.repeat(80));
    console.log(`  CYCLE ${this.cycleCount}/${TEST_CYCLES} - Starting transmission window`);
    console.log('▬'.repeat(80) + '\n');

    this.startTime = Date.now();

    // Schedule transmissions based on jitter offsets
    const transmissionPromises = this.devices.map((device) => {
      const delay = device.getJitterOffset() * 1000; // Convert to milliseconds
      return this.sleep(delay).then(() => device.transmitData());
    });

    // Wait for all transmissions to complete
    await Promise.all(transmissionPromises);

    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(`\n✓ Cycle ${this.cycleCount} completed in ${totalDuration}s\n`);
  }

  async runAllCycles() {
    for (let cycle = 0; cycle < TEST_CYCLES; cycle++) {
      await this.runCycle();

      // Wait before next cycle (unless it's the last cycle)
      if (cycle < TEST_CYCLES - 1) {
        console.log('⏳ Waiting 10 seconds before next cycle...\n');
        await this.sleep(10000);
      }
    }
  }

  async cleanup() {
    console.log('\n' + '='.repeat(80));
    console.log('  SIMULATION COMPLETE - Cleaning up');
    console.log('='.repeat(80) + '\n');

    // Disconnect all devices
    for (const device of this.devices) {
      await device.disconnect();
      await this.sleep(50); // Small delay between disconnections
    }

    // Print summary statistics
    console.log('\n' + '-'.repeat(80));
    console.log('  SUMMARY STATISTICS');
    console.log('-'.repeat(80));
    
    const totalTransmissions = this.devices.reduce((sum, d) => sum + d.transmissionCount, 0);
    const expectedTransmissions = this.deviceCount * TEST_CYCLES;
    const successRate = ((totalTransmissions / expectedTransmissions) * 100).toFixed(2);

    console.log(`  Total Devices: ${this.deviceCount}`);
    console.log(`  Total Cycles: ${TEST_CYCLES}`);
    console.log(`  Expected Transmissions: ${expectedTransmissions}`);
    console.log(`  Actual Transmissions: ${totalTransmissions}`);
    console.log(`  Success Rate: ${successRate}%`);
    console.log('-'.repeat(80) + '\n');

    console.log('✓ Simulation finished\n');
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Run simulation
async function main() {
  const simulation = new JitterSimulation(DEVICE_COUNT);

  try {
    await simulation.initialize();
    await simulation.runAllCycles();
  } catch (error) {
    console.error('\n✗ Simulation error:', error);
  } finally {
    await simulation.cleanup();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠ Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠ Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start simulation
main();
