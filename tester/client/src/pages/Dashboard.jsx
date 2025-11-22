import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { FaCircle, FaWater, FaPlus, FaSyncAlt, FaMobileAlt, FaChartBar, FaTimes } from 'react-icons/fa';
import DeviceCard from '../components/DeviceCard';
import CreateDeviceModal from '../components/CreateDeviceModal';
import SensorDataChart from '../components/SensorDataChart';
import './Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sensorData, setSensorData] = useState({});
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [serverStatus, setServerStatus] = useState('disconnected');

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setServerStatus('connected');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setServerStatus('disconnected');
    });

    // Listen for device list
    newSocket.on('devices-list', (deviceList) => {
      setDevices(deviceList);
    });

    // Listen for device events
    newSocket.on('device-created', (device) => {
      setDevices(prev => [...prev, device]);
    });

    newSocket.on('device-started', ({ deviceId, status }) => {
      setDevices(prev => prev.map(d => 
        d.deviceId === deviceId ? { ...d, status } : d
      ));
    });

    newSocket.on('device-stopped', ({ deviceId, status }) => {
      setDevices(prev => prev.map(d => 
        d.deviceId === deviceId ? { ...d, status } : d
      ));
    });

    newSocket.on('device-deleted', ({ deviceId }) => {
      setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
      if (selectedDevice === deviceId) {
        setSelectedDevice(null);
      }
    });

    // Listen for sensor data
    newSocket.on('sensor-data', (data) => {
      const { deviceId, ...readings } = data;
      setSensorData(prev => ({
        ...prev,
        [deviceId]: {
          ...readings,
          history: [
            ...(prev[deviceId]?.history || []).slice(-50), // Keep last 50 readings
            readings
          ]
        }
      }));
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/devices`);
      setDevices(response.data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const handleCreateDevice = async (deviceData) => {
    try {
      await axios.post(`${API_URL}/api/devices`, deviceData);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating device:', error);
      alert('Failed to create device');
    }
  };

  const handleStartDevice = async (deviceId) => {
    try {
      await axios.post(`${API_URL}/api/devices/${deviceId}/start`);
    } catch (error) {
      console.error('Error starting device:', error);
      alert('Failed to start device');
    }
  };

  const handleStopDevice = async (deviceId) => {
    try {
      await axios.post(`${API_URL}/api/devices/${deviceId}/stop`);
    } catch (error) {
      console.error('Error stopping device:', error);
      alert('Failed to stop device');
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!confirm(`Are you sure you want to delete device ${deviceId}?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/devices/${deviceId}`);
    } catch (error) {
      console.error('Error deleting device:', error);
      alert('Failed to delete device');
    }
  };

  const runningDevices = devices.filter(d => d.status === 'running').length;
  const stoppedDevices = devices.filter(d => d.status === 'stopped').length;

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1><FaWater /> ESP32 Device Manager</h1>
            <p>Create and manage simulated water quality monitoring devices</p>
          </div>
          <div className="header-stats">
            <div className={`status-badge ${serverStatus}`}>
              <FaCircle color={serverStatus === 'connected' ? '#4ade80' : '#f87171'} /> Server
            </div>
            <div className="stat">
              <span className="stat-value">{devices.length}</span>
              <span className="stat-label">Total Devices</span>
            </div>
            <div className="stat">
              <span className="stat-value running">{runningDevices}</span>
              <span className="stat-label">Running</span>
            </div>
            <div className="stat">
              <span className="stat-value stopped">{stoppedDevices}</span>
              <span className="stat-label">Stopped</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Actions Bar */}
        <div className="actions-bar">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus /> Create New Device
          </button>
          <button 
            className="btn btn-secondary"
            onClick={fetchDevices}
          >
            <FaSyncAlt /> Refresh
          </button>
        </div>

        {/* Devices Grid */}
        {devices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FaMobileAlt /></div>
            <h2>No devices yet</h2>
            <p>Create your first simulated ESP32 device to get started</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <FaPlus /> Create Device
            </button>
          </div>
        ) : (
          <div className="devices-grid">
            {devices.map(device => (
              <DeviceCard
                key={device.deviceId}
                device={device}
                sensorData={sensorData[device.deviceId]}
                onStart={() => handleStartDevice(device.deviceId)}
                onStop={() => handleStopDevice(device.deviceId)}
                onDelete={() => handleDeleteDevice(device.deviceId)}
                onSelect={() => setSelectedDevice(
                  selectedDevice === device.deviceId ? null : device.deviceId
                )}
                isSelected={selectedDevice === device.deviceId}
              />
            ))}
          </div>
        )}

        {/* Sensor Data Chart (when device is selected) */}
        {selectedDevice && sensorData[selectedDevice]?.history && (
          <div className="chart-section">
            <div className="chart-header">
              <h2><FaChartBar /> Real-Time Sensor Data - {selectedDevice}</h2>
              <button 
                className="btn btn-small"
                onClick={() => setSelectedDevice(null)}
              >
                <FaTimes /> Close
              </button>
            </div>
            <SensorDataChart 
              data={sensorData[selectedDevice].history}
              sensors={devices.find(d => d.deviceId === selectedDevice)?.sensors || []}
            />
          </div>
        )}
      </main>

      {/* Create Device Modal */}
      {showCreateModal && (
        <CreateDeviceModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateDevice}
        />
      )}
    </div>
  );
}

export default Dashboard;
