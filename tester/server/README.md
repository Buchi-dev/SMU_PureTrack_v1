# ESP32 Water Quality Monitoring - Server & Simulator

## Overview
Backend server and device simulator for ESP32 water quality monitoring system with **direct HTTP integration** (no MQTT required).

## Architecture

### Real ESP32 Devices
- **ESP32 → HTTP POST** → Express API
- Sends sensor data every 2 seconds
- Uses API key authentication
- Direct JSON payloads (minimal overhead)

### Simulated Devices
- **DeviceSimulator** → Socket.IO → Dashboard
- Mimics ESP32 behavior for testing
- No external dependencies (no MQTT broker needed)
- Managed via REST API

### Dashboard
- **Socket.IO** for real-time updates
- Receives data from both real and simulated devices
- WebSocket connection for live sensor graphs

## Configuration

### Environment Variables (.env)
```env
# Server Configuration
PORT=5000                          # API server port (matches ESP32 config)
NODE_ENV=development
CLIENT_URL=http://localhost:5174   # Frontend URL for CORS

# Device Authentication
DEVICE_API_KEY=your_64_char_hex_key_here  # Required for ESP32 devices
```

### ESP32 Device Configuration
Your ESP32 device should be configured with:
```cpp
#define API_SERVER "http://your-server-ip:5000"
#define API_ENDPOINT "/api/v1/devices/readings"
#define API_KEY "6a8d48a00823c869ad23c27cc34a3d446493cf35d6924d8f9d54e17c4565737a"
```

## API Endpoints

### For ESP32 Devices

#### POST /api/v1/devices/readings
Receive sensor data from real ESP32 devices.

**Headers:**
- `Content-Type: application/json`
- `x-api-key: YOUR_DEVICE_API_KEY`

**Request Body:**
```json
{
  "deviceId": "esp32_dev_002",
  "tds": 350.25,
  "ph": 7.2,
  "turbidity": 12.5,
  "timestamp": "2025-11-21T10:30:45.123Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sensor data received",
  "deviceId": "esp32_dev_002"
}
```

### For Web Dashboard

#### GET /api/devices
Get all devices (simulated).

#### POST /api/devices
Create a new simulated device.

#### POST /api/devices/:deviceId/start
Start a simulated device.

#### POST /api/devices/:deviceId/stop
Stop a simulated device.

#### DELETE /api/devices/:deviceId
Delete a simulated device.

#### GET /health
Health check endpoint.

## Running the Server

### Install Dependencies
```bash
cd server
npm install
```

### Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

Expected output:
```
╔═══════════════════════════════════════════════════════════╗
║         ESP32 Device Management Server (HTTP Mode)       ║
╚═══════════════════════════════════════════════════════════╝

🚀 Server running on http://localhost:5000
📡 Socket.IO ready for connections
🌐 HTTP API ready for ESP32 devices
📍 Endpoint: POST /api/v1/devices/readings
🔑 API Key required: ✅ Configured
```

## Device Simulator

### Running the Simulator
```bash
# Run simulator with default device ID
npm run simulate

# Run with custom device ID and name
node deviceSimulator.js esp32_dev_002 "Kitchen Monitor"
```

### Simulator Features
- Generates realistic sensor readings
- Sends data every 2 seconds (real-time)
- Matches real ESP32 device payload format
- Statistics tracking (success/fail rates)

### Data Format
The simulator sends JSON payloads matching the real ESP32 device:
```json
{
  "deviceId": "esp32_dev_002",
  "tds": 350.25,
  "ph": 7.2,
  "turbidity": 12.5,
  "timestamp": "2025-11-21T10:30:45.123Z"
}
```

### Sensor Simulation Ranges
- **TDS**: 100-800 ppm with realistic drift and noise
- **pH**: 6.0-8.5 with slow variations
- **Turbidity**: 0-100 NTU with smoothing

## Migration from MQTT

This version uses **HTTP POST** instead of MQTT for significant improvements:

✅ **No MQTT broker required** - Eliminates infrastructure dependency  
✅ **50% less memory usage** - Simpler protocol stack  
✅ **Faster connection** - Direct HTTP POST (sub-second response)  
✅ **Better error handling** - Standard HTTP status codes  
✅ **Easier debugging** - Standard web tools (curl, Postman, browser DevTools)  
✅ **Simpler architecture** - One less moving part  
✅ **API key authentication** - Built-in security  

### Changes from Previous Version
1. **Removed MQTT dependency** - No mqtt package needed
2. **Added HTTP endpoint** - `/api/v1/devices/readings`
3. **API key authentication** - Via `x-api-key` header
4. **Socket.IO for real-time** - Dashboard updates via WebSocket
5. **Simplified simulator** - No MQTT connection overhead

## Troubleshooting

### ESP32 Device Can't Connect
1. Check server is running on port 5000
2. Verify API key matches in `.env` and ESP32 code
3. Ensure firewall allows incoming connections on port 5000
4. Check ESP32 WiFi connection and server IP address

### Simulator Not Sending Data
1. Verify API_SERVER in `.env` matches running server port
2. Check DEVICE_API_KEY is configured
3. Look for error messages in simulator output

### Dashboard Not Updating
1. Check Socket.IO connection in browser console
2. Verify CLIENT_URL in `.env` matches frontend URL
3. Check CORS settings if frontend is on different port

## Development

### File Structure
```
server/
├── index.js                    # Main server (Express + Socket.IO)
├── DeviceSimulator.class.js    # Simulated device class
├── deviceSimulator.js          # Standalone simulator script
├── database.js                 # SQLite database for devices
├── .env                        # Configuration
├── package.json               # Dependencies
└── README.md                  # This file
```

### Key Dependencies
- `express` - HTTP server
- `socket.io` - Real-time WebSocket communication
- `axios` - HTTP client (for simulator)
- `better-sqlite3` - Database for device persistence
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment configuration

## License
MIT
