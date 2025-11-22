# ESP32 Water Quality Monitoring - Dashboard

## Overview
Real-time dashboard for monitoring ESP32 water quality sensors with **direct HTTP integration**.

## Features
- 📊 Real-time sensor data visualization (TDS, pH, Turbidity)
- 🔄 Live updates via Socket.IO WebSocket
- 📱 Responsive design with React Icons
- 📈 Interactive charts for historical data
- ⚡ Manage simulated devices for testing
- 🎨 Modern UI with CSS animations

## Architecture
- **Frontend**: React + Vite
- **Real-time**: Socket.IO client
- **HTTP API**: Axios for REST calls
- **Charts**: Custom chart components
- **Icons**: React Icons (Font Awesome)

## Configuration

### Environment Variables (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

**Important**: Both URLs must point to the same server port (default: 5000) where the Express backend is running.

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Backend server running on port 5000

### Installation
```bash
cd client
npm install
```

### Development
```bash
# Start dev server with hot reload
npm run dev
```

The dashboard will be available at `http://localhost:5174`

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

### Real-Time Monitoring
- Connects to backend via Socket.IO
- Receives sensor data every 2 seconds
- Updates charts and cards instantly
- Connection status indicator

### Device Management
- Create simulated devices for testing
- Start/Stop device simulations
- Delete devices
- View device details (MAC, IP, status, etc.)

### Sensor Data
- **TDS (Total Dissolved Solids)**: Measured in ppm
- **pH Level**: 0-14 scale
- **Turbidity**: Measured in NTU

### Charts
- Real-time line charts for each sensor
- Historical data (last 50 readings)
- Interactive tooltips
- Auto-scaling axes

## Components

### Dashboard
Main page that orchestrates all components and manages state.

### DeviceCard
Displays individual device information and sensor readings with real-time updates.

### CreateDeviceModal
Form to create new simulated devices with custom sensors.

### SensorDataChart
Real-time chart component for visualizing sensor data trends.

## Socket.IO Events

### Received from Server
- `connect` - Connection established
- `disconnect` - Connection lost
- `devices-list` - Initial device list
- `device-created` - New device added
- `device-started` - Device simulation started
- `device-stopped` - Device simulation stopped
- `device-deleted` - Device removed
- `sensor-data` - Real-time sensor readings

### Sent to Server
None (read-only dashboard for sensor monitoring)

## API Endpoints Used

### GET /api/devices
Fetch all devices on initial load

### POST /api/devices
Create a new simulated device

### POST /api/devices/:deviceId/start
Start a device simulation

### POST /api/devices/:deviceId/stop
Stop a device simulation

### DELETE /api/devices/:deviceId
Delete a device

## Styling
- Custom CSS with CSS variables
- Responsive grid layouts
- Smooth animations and transitions
- Dark theme optimized for data visualization
- Accessibility-friendly color schemes

## Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Troubleshooting

### Dashboard Not Connecting
1. Verify backend server is running on port 5000
2. Check `.env` file has correct API_URL
3. Open browser console to see connection errors
4. Verify CORS is configured in backend

### Sensor Data Not Updating
1. Check Socket.IO connection status (green indicator)
2. Verify devices are in "running" state
3. Check browser console for JavaScript errors
4. Ensure backend is emitting sensor-data events

### Charts Not Displaying
1. Ensure device has historical data (start device first)
2. Check that sensor readings are being received
3. Verify chart component is properly mounted

## Development

### Project Structure
```
client/
├── src/
│   ├── components/          # Reusable components
│   │   ├── DeviceCard.jsx
│   │   ├── CreateDeviceModal.jsx
│   │   └── SensorDataChart.jsx
│   ├── pages/              # Page components
│   │   └── Dashboard.jsx
│   ├── App.jsx             # Root component
│   └── main.jsx            # Entry point
├── public/                 # Static assets
├── .env                    # Environment config
└── package.json           # Dependencies
```

### Key Dependencies
- `react` & `react-dom` - UI framework
- `socket.io-client` - Real-time WebSocket
- `axios` - HTTP client
- `react-icons` - Icon library
- `vite` - Build tool & dev server

## Migration from MQTT

This version uses **HTTP + Socket.IO** instead of MQTT:

✅ **Simpler architecture** - No MQTT client library needed  
✅ **WebSocket for real-time** - Built into Socket.IO  
✅ **Better browser support** - Native WebSocket API  
✅ **Easier debugging** - Browser DevTools support  
✅ **Lower latency** - Direct WebSocket connection  

## License
MIT
