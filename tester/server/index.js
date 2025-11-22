/**
 * Device Management Server
 * 
 * Manages multiple simulated ESP32 devices:
 * - Create/Delete fake devices
 * - Start/Stop device simulations
 * - Real-time sensor data streaming via Socket.IO and HTTP
 * - Device status monitoring
 * - HTTP API for real ESP32 devices to send sensor data
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { DeviceSimulator } from './DeviceSimulator.class.js';
import { deviceDB } from './database.js';

dotenv.config();

// ===========================
// EXPRESS & SOCKET.IO SETUP
// ===========================

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ===========================
// DEVICE MANAGEMENT
// ===========================

// Store all simulated devices (in-memory for runtime)
const devices = new Map();

// Counter for auto-generating device IDs
let deviceCounter = 1;

// Initialize database
deviceDB.initialize();

// Load devices from database on startup
const savedDevices = deviceDB.getAllDevices();
if (savedDevices.length > 0) {
  console.log(`\n📦 Loading ${savedDevices.length} devices from database...`);
  
  savedDevices.forEach(device => {
    devices.set(device.deviceId, device);
  });
  
  // Set device counter to next available number
  deviceCounter = deviceDB.getMaxDeviceCounter() + 1;
  
  const stats = deviceDB.getStats();
  console.log(`   ✅ Loaded ${stats.total} devices (${stats.stopped} stopped, ${stats.running} were running)\n`);
  
  // Set all devices to stopped status on startup
  savedDevices.forEach(device => {
    device.status = 'stopped';
    device.simulator = null;
    deviceDB.updateDeviceStatus(device.deviceId, 'stopped');
  });
} else {
  console.log(`\n📦 No saved devices found - starting fresh\n`);
}

/**
 * Generate a unique device ID
 */
function generateDeviceId() {
  return `esp32_sim_${String(deviceCounter++).padStart(4, '0')}`;
}

/**
 * Generate a random MAC address
 */
function generateMacAddress() {
  const hexDigits = '0123456789ABCDEF';
  let mac = '';
  for (let i = 0; i < 6; i++) {
    if (i > 0) mac += ':';
    mac += hexDigits.charAt(Math.floor(Math.random() * 16));
    mac += hexDigits.charAt(Math.floor(Math.random() * 16));
  }
  return mac;
}

/**
 * Generate a random local IP address
 */
function generateLocalIP() {
  return `192.168.1.${Math.floor(Math.random() * 200) + 50}`;
}

// ===========================
// REST API ENDPOINTS
// ===========================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    devices: devices.size,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/v1/devices/readings
 * Receive sensor data from real ESP32 devices
 */
app.post('/api/v1/devices/readings', (req, res) => {
  try {
    const { deviceId, tds, ph, turbidity, timestamp } = req.body;
    
    // Validate API key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.DEVICE_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }
    
    // Validate required fields
    if (!deviceId || tds === undefined || ph === undefined || turbidity === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: deviceId, tds, ph, turbidity' 
      });
    }
    
    // Prepare sensor data
    const sensorData = {
      deviceId,
      tds: parseFloat(tds),
      ph: parseFloat(ph),
      turbidity: parseFloat(turbidity),
      timestamp: timestamp || new Date().toISOString()
    };
    
    // Emit to Socket.IO clients for real-time dashboard updates
    io.emit('sensor-data', sensorData);
    
    // Update device last seen if it exists in our system
    if (devices.has(deviceId)) {
      const device = devices.get(deviceId);
      device.lastSeen = Date.now();
      device.status = 'running';
      deviceDB.updateDeviceLastSeen(deviceId);
    }
    
    console.log(`📊 [${deviceId}] TDS: ${tds}ppm, pH: ${ph}, Turbidity: ${turbidity}NTU`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Sensor data received',
      deviceId 
    });
  } catch (error) {
    console.error('Error processing sensor data:', error);
    res.status(500).json({ error: 'Failed to process sensor data' });
  }
});

/**
 * GET /api/devices
 * Get all devices
 */
app.get('/api/devices', (req, res) => {
  const deviceList = Array.from(devices.values()).map(device => ({
    deviceId: device.deviceId,
    name: device.name,
    type: device.type,
    firmwareVersion: device.firmwareVersion,
    macAddress: device.macAddress,
    ipAddress: device.ipAddress,
    sensors: device.sensors,
    status: device.status,
    createdAt: device.createdAt,
    lastSeen: device.lastSeen
  }));
  
  res.json(deviceList);
});

/**
 * POST /api/devices
 * Create a new simulated device
 */
app.post('/api/devices', (req, res) => {
  try {
    const { name, sensors } = req.body;
    
    // Validate sensors
    const validSensors = ['tds', 'ph', 'turbidity'];
    const deviceSensors = sensors && sensors.length > 0 
      ? sensors.filter(s => validSensors.includes(s))
      : validSensors; // Default: all sensors
    
    if (deviceSensors.length === 0) {
      return res.status(400).json({ 
        error: 'At least one valid sensor is required' 
      });
    }
    
    // Generate device configuration
    const deviceId = generateDeviceId();
    const deviceConfig = {
      deviceId,
      name: name || `Water Monitor ${deviceId}`,
      type: 'ESP32 Dev Module (Simulated)',
      firmwareVersion: '3.2.2-SIM',
      macAddress: generateMacAddress(),
      ipAddress: generateLocalIP(),
      sensors: deviceSensors,
      status: 'stopped',
      createdAt: Date.now(),
      lastSeen: null,
      simulator: null
    };
    
    devices.set(deviceId, deviceConfig);
    
    // Save to database
    const saved = deviceDB.createDevice(deviceConfig);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save device to database' });
    }
    
    // Notify all clients
    io.emit('device-created', deviceConfig);
    
    console.log(`✅ Device created: ${deviceId} (${deviceConfig.name})`);
    
    res.status(201).json(deviceConfig);
  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({ error: 'Failed to create device' });
  }
});

/**
 * POST /api/devices/:deviceId/start
 * Start a device simulation
 */
app.post('/api/devices/:deviceId/start', (req, res) => {
  const { deviceId } = req.params;
  
  if (!devices.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  const device = devices.get(deviceId);
  
  if (device.status === 'running') {
    return res.status(400).json({ error: 'Device is already running' });
  }
  
  try {
    // Create and start simulator with Socket.IO emit callback
    const simulator = new DeviceSimulator(device, (event, data) => {
      io.emit(event, data);
    });
    device.simulator = simulator;
    device.status = 'running';
    device.lastSeen = Date.now();
    
    simulator.start();
    
    // Update in database
    deviceDB.updateDeviceStatus(deviceId, 'running', device.lastSeen);
    
    // Notify all clients
    io.emit('device-started', { deviceId, status: 'running' });
    
    console.log(`▶️  Device started: ${deviceId}`);
    
    res.json({ message: 'Device started', deviceId, status: 'running' });
  } catch (error) {
    console.error('Error starting device:', error);
    device.status = 'error';
    res.status(500).json({ error: 'Failed to start device' });
  }
});

/**
 * POST /api/devices/:deviceId/stop
 * Stop a device simulation
 */
app.post('/api/devices/:deviceId/stop', (req, res) => {
  const { deviceId } = req.params;
  
  if (!devices.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  const device = devices.get(deviceId);
  
  if (device.status !== 'running') {
    return res.status(400).json({ error: 'Device is not running' });
  }
  
  try {
    if (device.simulator) {
      device.simulator.stop();
      device.simulator = null;
    }
    
    device.status = 'stopped';
    
    // Update in database
    deviceDB.updateDeviceStatus(deviceId, 'stopped');
    
    // Notify all clients
    io.emit('device-stopped', { deviceId, status: 'stopped' });
    
    console.log(`⏸️  Device stopped: ${deviceId}`);
    
    res.json({ message: 'Device stopped', deviceId, status: 'stopped' });
  } catch (error) {
    console.error('Error stopping device:', error);
    res.status(500).json({ error: 'Failed to stop device' });
  }
});

/**
 * DELETE /api/devices/:deviceId
 * Delete a device
 */
app.delete('/api/devices/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  
  if (!devices.has(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  const device = devices.get(deviceId);
  
  try {
    // Stop simulator if running
    if (device.simulator) {
      device.simulator.stop();
    }
    
    devices.delete(deviceId);
    
    // Delete from database
    deviceDB.deleteDevice(deviceId);
    
    // Notify all clients
    io.emit('device-deleted', { deviceId });
    
    console.log(`🗑️  Device deleted: ${deviceId}`);
    
    res.json({ message: 'Device deleted', deviceId });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

/**
 * Health check (old path for backward compatibility)
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    devices: devices.size,
    timestamp: new Date().toISOString()
  });
});

// ===========================
// SOCKET.IO EVENTS
// ===========================

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Send current devices on connection
  const deviceList = Array.from(devices.values());
  socket.emit('devices-list', deviceList);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ===========================
// GRACEFUL SHUTDOWN
// ===========================

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down server...');
  
  // Stop all running devices
  for (const device of devices.values()) {
    if (device.simulator) {
      device.simulator.stop();
    }
    // Update status in database
    if (device.status === 'running') {
      deviceDB.updateDeviceStatus(device.deviceId, 'stopped');
    }
  }
  
  // Close database connection
  deviceDB.close();
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

// ===========================
// START SERVER
// ===========================

httpServer.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         ESP32 Device Management Server (HTTP Mode)       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`🌐 HTTP API ready for ESP32 devices`);
  console.log(`📍 Endpoint: POST /api/v1/devices/readings`);
  console.log(`🔑 API Key required: ${process.env.DEVICE_API_KEY ? '✅ Configured' : '❌ Missing'}\n`);
});
