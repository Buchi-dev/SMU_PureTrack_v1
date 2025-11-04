/**
 * Statistical utility functions for report generation
 */

export interface Statistics {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
}

/**
 * Calculate statistics from an array of numeric data
 */
export const calculateStatistics = (data: number[]): Statistics => {
  if (data.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
    };
  }

  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const median = sorted.length % 2 === 0 
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    mean,
    median,
    stdDev,
    min: Math.min(...data),
    max: Math.max(...data),
  };
};

/**
 * Calculate data completeness percentage
 */
export const calculateDataCompleteness = (
  totalReadings: number,
  startDate?: number,
  endDate?: number
): string => {
  if (!startDate || !endDate) return 'N/A';
  
  const durationHours = (endDate - startDate) / (1000 * 60 * 60);
  const expectedReadings = Math.floor(durationHours * 12); // Assuming 12 readings per hour (every 5 minutes)
  const completeness = Math.min((totalReadings / expectedReadings) * 100, 100);
  
  return `${completeness.toFixed(1)}%`;
};
