import { useState, useEffect } from 'react';
import { message } from 'antd';
import { reportsService } from '../../../../services/reports.Service';
import type { 
  DeviceStatusSummary as DeviceStatusData,
  AlertData,
} from '../../../../schemas';
import type { SensorReading } from '../../../../schemas/deviceManagement.schema';

interface WaterQualityData {
  devices?: Array<{
    readings: SensorReading[];
    metrics: {
      avgPH: number;
      maxPH: number;
      minPH: number;
      avgTDS: number;
      maxTDS: number;
      minTDS: number;
      avgTurbidity: number;
      maxTurbidity: number;
      minTurbidity: number;
      totalReadings: number;
    };
    alerts: AlertData[];
  }>;
  period?: {
    start: string;
    end: string;
  };
}

interface TimeSeriesDataPoint {
  time: string;
  pH: number;
  TDS: number;
  Turbidity: number;
}

interface ParameterDistributionPoint {
  name: string;
  value: number;
  max: number;
}

export const useAnalyticsData = () => {
  const [loading, setLoading] = useState(true);
  const [waterQualityData, setWaterQualityData] = useState<WaterQualityData | null>(null);
  const [deviceStatusData, setDeviceStatusData] = useState<DeviceStatusData | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [parameterDistribution, setParameterDistribution] = useState<ParameterDistributionPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch water quality report using service layer
      const waterQuality = await reportsService.generateWaterQualityReport();

      // Fetch device status report using service layer
      const deviceStatus = await reportsService.generateDeviceStatusReport();

      setWaterQualityData(waterQuality);
      setDeviceStatusData(deviceStatus.summary);

      // Process time series data from readings (last 24 readings for visualization)
      if (waterQuality.devices && waterQuality.devices[0]?.readings) {
        const readings = waterQuality.devices[0].readings.slice(-24);
        const formattedData = readings.map((reading: SensorReading, index: number) => ({
          time: `${index}h`,
          pH: reading.ph,
          TDS: reading.tds,
          Turbidity: reading.turbidity,
        }));
        setTimeSeriesData(formattedData);

        // Create parameter distribution data
        const metrics = waterQuality.devices[0].metrics;
        setParameterDistribution([
          { name: 'pH', value: metrics.avgPH, max: 14 },
          { name: 'TDS', value: metrics.avgTDS, max: 1000 },
          { name: 'Turbidity', value: metrics.avgTurbidity, max: 100 },
        ]);
      }

      // Extract alerts
      if (waterQuality.devices && waterQuality.devices[0]?.alerts) {
        setAlerts(waterQuality.devices[0].alerts);
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      message.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  return {
    loading,
    waterQualityData,
    deviceStatusData,
    timeSeriesData,
    parameterDistribution,
    alerts,
  };
};
