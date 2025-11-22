import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './SensorDataChart.css';

function SensorDataChart({ data, sensors }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart configuration
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Colors for each sensor
    const colors = {
      tds: '#3b82f6',       // Blue
      ph: '#10b981',        // Green
      turbidity: '#f59e0b', // Orange
      temperature: '#ef4444' // Red
    };

    const sensorNames = {
      tds: 'TDS (ppm)',
      ph: 'pH Level',
      turbidity: 'Turbidity (NTU)',
      temperature: 'Temperature (°C)'
    };

    // Draw background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw each sensor's data
    sensors.forEach(sensor => {
      if (!colors[sensor]) return;

      // Get all values for this sensor
      const values = data.map(d => d[sensor]).filter(v => v !== undefined);
      if (values.length === 0) return;

      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const valueRange = maxValue - minValue || 1;

      // Draw line
      ctx.strokeStyle = colors[sensor];
      ctx.lineWidth = 2;
      ctx.beginPath();

      values.forEach((value, index) => {
        const x = padding + (chartWidth / (values.length - 1)) * index;
        const normalizedValue = (value - minValue) / valueRange;
        const y = height - padding - normalizedValue * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw points
      ctx.fillStyle = colors[sensor];
      values.forEach((value, index) => {
        const x = padding + (chartWidth / (values.length - 1)) * index;
        const normalizedValue = (value - minValue) / valueRange;
        const y = height - padding - normalizedValue * chartHeight;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Draw legend
    ctx.font = 'bold 14px sans-serif';
    let legendY = padding + 20;

    sensors.forEach(sensor => {
      if (!colors[sensor]) return;

      // Color box
      ctx.fillStyle = colors[sensor];
      ctx.fillRect(width - padding - 200, legendY - 10, 20, 10);

      // Label
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(sensorNames[sensor] || sensor, width - padding - 175, legendY);

      // Current value
      const currentValue = data[data.length - 1]?.[sensor];
      if (currentValue !== undefined) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(currentValue.toFixed(2), width - padding - 50, legendY);
      }

      legendY += 25;
    });

    // Draw title
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Real-Time Sensor Readings', padding, padding - 20);

    // Draw time label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('← Past', padding, height - padding + 30);
    ctx.fillText('Now →', width - padding - 50, height - padding + 30);

  }, [data, sensors]);

  return (
    <div className="chart-container">
      <canvas 
        ref={canvasRef} 
        width={1200} 
        height={500}
        className="sensor-chart"
      />
    </div>
  );
}

SensorDataChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  sensors: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default SensorDataChart;
