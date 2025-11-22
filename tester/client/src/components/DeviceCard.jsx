import PropTypes from 'prop-types';
import { FaCircle, FaTint, FaFlask, FaSmog, FaChartBar, FaPlay, FaPause, FaChartLine, FaTrash } from 'react-icons/fa';
import './DeviceCard.css';

function DeviceCard({ device, sensorData, onStart, onStop, onDelete, onSelect, isSelected }) {
  const isRunning = device.status === 'running';
  
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  const getSensorIcon = (sensor) => {
    const icons = {
      tds: <FaTint />,
      ph: <FaFlask />,
      turbidity: <FaSmog />
    };
    return icons[sensor] || <FaChartBar />;
  };

  const getSensorUnit = (sensor) => {
    const units = {
      tds: 'ppm',
      ph: '',
      turbidity: 'NTU'
    };
    return units[sensor] || '';
  };

  const getSensorValue = (sensor) => {
    if (!sensorData) return '--';
    return sensorData[sensor] !== undefined 
      ? `${sensorData[sensor]} ${getSensorUnit(sensor)}` 
      : '--';
  };

  return (
    <div className={`device-card ${isRunning ? 'running' : 'stopped'} ${isSelected ? 'selected' : ''}`}>
      {/* Card Header */}
      <div className="card-header">
        <div className="device-info">
          <h3>{device.name}</h3>
          <span className="device-id">{device.deviceId}</span>
        </div>
        <div className={`status-indicator ${device.status}`}>
          <FaCircle color={isRunning ? '#4ade80' : '#f87171'} /> {device.status}
        </div>
      </div>

      {/* Device Details */}
      <div className="device-details">
        <div className="detail-row">
          <span className="label">Type:</span>
          <span className="value">{device.type}</span>
        </div>
        <div className="detail-row">
          <span className="label">Firmware:</span>
          <span className="value">{device.firmwareVersion}</span>
        </div>
        <div className="detail-row">
          <span className="label">MAC:</span>
          <span className="value code">{device.macAddress}</span>
        </div>
        <div className="detail-row">
          <span className="label">IP:</span>
          <span className="value code">{device.ipAddress}</span>
        </div>
        <div className="detail-row">
          <span className="label">Last Seen:</span>
          <span className="value">{formatTimestamp(device.lastSeen)}</span>
        </div>
      </div>

      {/* Sensor Readings */}
      <div className="sensor-readings">
        <h4><FaChartBar /> Sensors</h4>
        <div className="sensors-grid">
          {device.sensors.map(sensor => (
            <div key={sensor} className="sensor-item">
              <span className="sensor-icon">{getSensorIcon(sensor)}</span>
              <div className="sensor-info">
                <span className="sensor-name">{sensor.toUpperCase()}</span>
                <span className={`sensor-value ${isRunning ? 'active' : ''}`}>
                  {getSensorValue(sensor)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="card-actions">
        {!isRunning ? (
          <button className="btn btn-success" onClick={onStart}>
            <FaPlay /> Start
          </button>
        ) : (
          <button className="btn btn-warning" onClick={onStop}>
            <FaPause /> Stop
          </button>
        )}
        
        {isRunning && (
          <button 
            className={`btn ${isSelected ? 'btn-secondary' : 'btn-primary'}`}
            onClick={onSelect}
          >
            {isSelected ? <><FaChartBar /> Hide Chart</> : <><FaChartLine /> View Chart</>}
          </button>
        )}
        
        <button 
          className="btn btn-danger" 
          onClick={onDelete}
          disabled={isRunning}
          title={isRunning ? 'Stop device before deleting' : 'Delete device'}
        >
          <FaTrash /> Delete
        </button>
      </div>
    </div>
  );
}

DeviceCard.propTypes = {
  device: PropTypes.shape({
    deviceId: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    firmwareVersion: PropTypes.string.isRequired,
    macAddress: PropTypes.string.isRequired,
    ipAddress: PropTypes.string.isRequired,
    sensors: PropTypes.arrayOf(PropTypes.string).isRequired,
    status: PropTypes.string.isRequired,
    lastSeen: PropTypes.number
  }).isRequired,
  sensorData: PropTypes.object,
  onStart: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  isSelected: PropTypes.bool.isRequired
};

export default DeviceCard;
