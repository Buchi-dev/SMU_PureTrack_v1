import type { SensorReading } from '../../../../schemas';

/**
 * Device data with sensor readings for dashboard display
 */
export interface DeviceSensorData {
  deviceId: string;
  deviceName: string;
  latestReading: SensorReading | null;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  location?: string;
}
