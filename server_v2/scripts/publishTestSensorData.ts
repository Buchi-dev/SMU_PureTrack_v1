/**
 * Test Script: Publish Sample Sensor Data
 * 
 * Simulates Arduino device publishing sensor data to MQTT broker
 * Useful for testing WebSocket real-time updates without physical device
 */

import mqtt from 'mqtt';
import * as dotenv from 'dotenv';

dotenv.config();

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtts://f4f8d29564364fbdbe9b052230c33d40.s1.eu.hivemq.cloud:8883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || 'Server_Production';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'Server123';

const DEVICE_ID = 'arduino_r4_64E8335EAFE4'; // Your device

// Sample sensor data (good quality readings)
const sampleData = {
  deviceId: DEVICE_ID,
  pH: 7.2,          // Optimal range
  turbidity: 0.8,   // Excellent
  tds: 250,         // Excellent
  timestamp: new Date().toISOString(),
};

console.log('🔌 Connecting to MQTT broker...');
console.log(`📍 Broker: ${MQTT_BROKER_URL}`);
console.log(`👤 Username: ${MQTT_USERNAME}`);

const client = mqtt.connect(MQTT_BROKER_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clean: true,
  reconnectPeriod: 0, // Don't auto-reconnect
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  console.log(`📡 Publishing sensor data to: devices/${DEVICE_ID}/data`);
  console.log('📊 Data:', JSON.stringify(sampleData, null, 2));

  const topic = `devices/${DEVICE_ID}/data`;
  const payload = JSON.stringify(sampleData);

  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Failed to publish:', err.message);
    } else {
      console.log('✅ Sensor data published successfully!');
      console.log('\n📋 What to check:');
      console.log('1. Check server logs for MQTT message receipt');
      console.log('2. Open http://localhost:5174 → Sensor Readings');
      console.log('3. Data should appear instantly (WebSocket push)');
      console.log('4. Check browser console for WebSocket logs');
    }

    client.end();
    process.exit(0);
  });
});

client.on('error', (err) => {
  console.error('❌ MQTT Connection Error:', err.message);
  process.exit(1);
});

client.on('close', () => {
  console.log('🔌 Disconnected from MQTT broker');
});
