import { useCallback } from 'react';
import { message } from 'antd';
import type { SensorReading } from '../../../../schemas';

export const useSensorExport = () => {
  const exportToCSV = useCallback((sensorHistory: SensorReading[], deviceId: string) => {
    if (!sensorHistory.length) {
      message.warning('No data to export');
      return;
    }

    const headers = ['Timestamp', 'Turbidity (NTU)', 'TDS (ppm)', 'pH'];
    const rows = sensorHistory.map(reading => [
      new Date(reading.timestamp).toLocaleString(),
      reading.turbidity,
      reading.tds,
      reading.ph,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sensor-data-${deviceId}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('Data exported successfully');
  }, []);

  return { exportToCSV };
};
