import { useState } from 'react';
import PropTypes from 'prop-types';
import { FaPlus, FaTimes, FaCheck, FaTint, FaFlask, FaSmog, FaInfoCircle, FaMagic } from 'react-icons/fa';
import './CreateDeviceModal.css';

function CreateDeviceModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    sensors: ['tds', 'ph', 'turbidity']
  });

  const availableSensors = [
    { id: 'tds', name: 'TDS (Total Dissolved Solids)', icon: <FaTint />, unit: 'ppm' },
    { id: 'ph', name: 'pH Level', icon: <FaFlask />, unit: '' },
    { id: 'turbidity', name: 'Turbidity', icon: <FaSmog />, unit: 'NTU' }
  ];

  const handleSensorToggle = (sensorId) => {
    setFormData(prev => ({
      ...prev,
      sensors: prev.sensors.includes(sensorId)
        ? prev.sensors.filter(s => s !== sensorId)
        : [...prev.sensors, sensorId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.sensors.length === 0) {
      alert('Please select at least one sensor');
      return;
    }

    onCreate(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><FaPlus /> Create New Device</h2>
          <button className="close-btn" onClick={onClose}><FaTimes /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="deviceName">Device Name</label>
            <input
              id="deviceName"
              type="text"
              placeholder="e.g., Living Room Monitor"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
            <small>Leave empty to auto-generate</small>
          </div>

          <div className="form-group">
            <label>Sensors to Enable</label>
            <div className="sensors-selection">
              {availableSensors.map(sensor => (
                <div 
                  key={sensor.id} 
                  className={`sensor-option ${formData.sensors.includes(sensor.id) ? 'selected' : ''}`}
                  onClick={() => handleSensorToggle(sensor.id)}
                >
                  <div className="sensor-checkbox">
                    {formData.sensors.includes(sensor.id) ? <FaCheck /> : ''}
                  </div>
                  <div className="sensor-details">
                    <span className="sensor-icon">{sensor.icon}</span>
                    <span className="sensor-name">{sensor.name}</span>
                    {sensor.unit && <span className="sensor-unit">({sensor.unit})</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="info-box">
            <strong><FaInfoCircle /> Device Configuration:</strong>
            <ul>
              <li>Device ID will be auto-generated</li>
              <li>MAC address and IP will be simulated</li>
              <li>Sensor data published every 2 seconds</li>
              <li>Realistic sensor value ranges and drift</li>
            </ul>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <FaMagic /> Create Device
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreateDeviceModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired
};

export default CreateDeviceModal;
