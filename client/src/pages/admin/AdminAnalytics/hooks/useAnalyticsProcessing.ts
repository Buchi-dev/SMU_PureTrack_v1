import { useMemo } from 'react';
import type { WaterQualityReportData } from '../../../../schemas';

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

interface ParameterComparisonPoint {
  parameter: string;
  Average: number;
  Maximum: number;
  Minimum: number;
}

/**
 * useAnalyticsProcessing - Local Hook (UI Logic Only)
 * 
 * Processes water quality report data into chart-ready formats.
 * NO service layer calls - pure data transformation.
 * 
 * @param waterQualityData - Water quality report data from useCall_Reports
 * @returns Processed data for charts and visualizations
 * 
 * @example
 * ```tsx
 * const { timeSeriesData, parameterDistribution, parameterComparisonData } = 
 *   useAnalyticsProcessing(reportData);
 * ```
 */
export const useAnalyticsProcessing = (
  waterQualityData: WaterQualityReportData | null
) => {
  // Transform readings into time series format (last 24 readings for visualization)
  const timeSeriesData = useMemo<TimeSeriesDataPoint[]>(() => {
    if (!waterQualityData?.devices?.[0]?.readings) return [];
    
    const readings = waterQualityData.devices[0].readings.slice(-24);
    return readings.map((reading, index) => ({
      time: `${index}h`,
      pH: reading.ph,
      TDS: reading.tds,
      Turbidity: reading.turbidity,
    }));
  }, [waterQualityData]);

  // Calculate parameter distributions for radar charts
  const parameterDistribution = useMemo<ParameterDistributionPoint[]>(() => {
    if (!waterQualityData?.devices?.[0]?.metrics) return [];
    
    const metrics = waterQualityData.devices[0].metrics;
    return [
      { name: 'pH', value: metrics.avgPH, max: 14 },
      { name: 'TDS', value: metrics.avgTDS, max: 1000 },
      { name: 'Turbidity', value: metrics.avgTurbidity, max: 100 },
    ];
  }, [waterQualityData]);

  // Calculate parameter comparisons (avg, max, min) for bar charts
  const parameterComparisonData = useMemo<ParameterComparisonPoint[]>(() => {
    if (!waterQualityData?.devices?.[0]?.metrics) return [];
    
    const metrics = waterQualityData.devices[0].metrics;
    return [
      {
        parameter: 'pH',
        Average: metrics.avgPH,
        Maximum: metrics.maxPH,
        Minimum: metrics.minPH,
      },
      {
        parameter: 'TDS',
        Average: metrics.avgTDS / 10,
        Maximum: metrics.maxTDS / 10,
        Minimum: metrics.minTDS / 10,
      },
      {
        parameter: 'Turbidity',
        Average: metrics.avgTurbidity,
        Maximum: metrics.maxTurbidity,
        Minimum: metrics.minTurbidity,
      },
    ];
  }, [waterQualityData]);

  return {
    timeSeriesData,
    parameterDistribution,
    parameterComparisonData,
  };
};
