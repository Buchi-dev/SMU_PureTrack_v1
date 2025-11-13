/**
 * useCall_Reports - Write Hook
 * 
 * Handles report generation operations.
 * Wraps reportsService functions with React-friendly state management.
 * 
 * ⚠️ WRITE ONLY - Generates reports, does not handle real-time data
 * 
 * @module hooks/writes
 */

import { useMutation } from './useMutation';
import { reportsService } from '../../services/reports.Service';
import type { 
  WaterQualityReportData, 
  DeviceStatusReportData,
  GenerateReportRequest 
} from '../../schemas';

/**
 * Hook return value
 */
interface UseCallReportsReturn {
  /** Generate a water quality report */
  generateWaterQualityReport: (
    deviceIds?: string[], 
    startDate?: number, 
    endDate?: number
  ) => Promise<WaterQualityReportData>;
  
  /** Generate a device status report */
  generateDeviceStatusReport: (deviceIds?: string[]) => Promise<DeviceStatusReportData>;
  
  /** Generate a data summary report */
  generateDataSummaryReport: (
    deviceIds?: string[], 
    startDate?: number, 
    endDate?: number
  ) => Promise<any>;
  
  /** Generate a compliance report */
  generateComplianceReport: (
    deviceIds?: string[], 
    startDate?: number, 
    endDate?: number
  ) => Promise<any>;
  
  /** Generate a custom report with full control */
  generateReport: (request: GenerateReportRequest) => Promise<any>;
  
  /** Loading state for any operation */
  isLoading: boolean;
  /** Error from last operation */
  error: Error | null;
  /** Success flag - true after successful operation */
  isSuccess: boolean;
  /** Data from last successful report generation */
  reportData: any | null;
  /** Reset error, success states, and report data */
  reset: () => void;
}

/**
 * Hook for report generation operations
 * 
 * Provides functions to generate various types of reports with proper
 * loading/error/success state management.
 * 
 * @example
 * ```tsx
 * const { 
 *   generateWaterQualityReport,
 *   generateDeviceStatusReport,
 *   isLoading, 
 *   error, 
 *   reportData,
 *   isSuccess
 * } = useCall_Reports();
 * 
 * // Generate water quality report
 * const report = await generateWaterQualityReport(
 *   ['ESP32-001', 'ESP32-002'], 
 *   Date.now() - 7 * 24 * 60 * 60 * 1000, 
 *   Date.now()
 * );
 * 
 * // Generate device status report (all devices)
 * const statusReport = await generateDeviceStatusReport();
 * 
 * if (isSuccess) {
 *   console.log('Report generated:', reportData);
 * }
 * ```
 * 
 * @returns Report generation functions and state
 */
export const useCall_Reports = (): UseCallReportsReturn => {
  const waterQualityMutation = useMutation<WaterQualityReportData, Error, { deviceIds?: string[]; startDate?: number; endDate?: number }>({
    mutationFn: async ({ deviceIds, startDate, endDate }) => {
      return await reportsService.generateWaterQualityReport(deviceIds, startDate, endDate);
    },
    onError: (error) => {
      console.error('[useCall_Reports] Water quality report error:', error);
    },
  });

  const deviceStatusMutation = useMutation<DeviceStatusReportData, Error, { deviceIds?: string[] }>({
    mutationFn: async ({ deviceIds }) => {
      return await reportsService.generateDeviceStatusReport(deviceIds);
    },
    onError: (error) => {
      console.error('[useCall_Reports] Device status report error:', error);
    },
  });

  const dataSummaryMutation = useMutation<any, Error, { deviceIds?: string[]; startDate?: number; endDate?: number }>({
    mutationFn: async ({ deviceIds, startDate, endDate }) => {
      return await reportsService.generateDataSummaryReport(deviceIds, startDate, endDate);
    },
    onError: (error) => {
      console.error('[useCall_Reports] Data summary report error:', error);
    },
  });

  const complianceMutation = useMutation<any, Error, { deviceIds?: string[]; startDate?: number; endDate?: number }>({
    mutationFn: async ({ deviceIds, startDate, endDate }) => {
      return await reportsService.generateComplianceReport(deviceIds, startDate, endDate);
    },
    onError: (error) => {
      console.error('[useCall_Reports] Compliance report error:', error);
    },
  });

  const customReportMutation = useMutation<any, Error, GenerateReportRequest>({
    mutationFn: async (request) => {
      return await reportsService.generateReport(request);
    },
    onError: (error) => {
      console.error('[useCall_Reports] Custom report error:', error);
    },
  });

  // Determine combined loading/error/success state
  const isLoading = 
    waterQualityMutation.isLoading || 
    deviceStatusMutation.isLoading || 
    dataSummaryMutation.isLoading || 
    complianceMutation.isLoading || 
    customReportMutation.isLoading;
  
  const error = 
    waterQualityMutation.error || 
    deviceStatusMutation.error || 
    dataSummaryMutation.error || 
    complianceMutation.error || 
    customReportMutation.error;
  
  const isSuccess = 
    waterQualityMutation.isSuccess || 
    deviceStatusMutation.isSuccess || 
    dataSummaryMutation.isSuccess || 
    complianceMutation.isSuccess || 
    customReportMutation.isSuccess;

  // Get the most recent report data from any mutation
  const reportData = 
    waterQualityMutation.data || 
    deviceStatusMutation.data || 
    dataSummaryMutation.data || 
    complianceMutation.data || 
    customReportMutation.data;

  const reset = () => {
    waterQualityMutation.reset();
    deviceStatusMutation.reset();
    dataSummaryMutation.reset();
    complianceMutation.reset();
    customReportMutation.reset();
  };

  return {
    generateWaterQualityReport: (deviceIds?: string[], startDate?: number, endDate?: number) =>
      waterQualityMutation.mutate({ deviceIds, startDate, endDate }),
    generateDeviceStatusReport: (deviceIds?: string[]) =>
      deviceStatusMutation.mutate({ deviceIds }),
    generateDataSummaryReport: (deviceIds?: string[], startDate?: number, endDate?: number) =>
      dataSummaryMutation.mutate({ deviceIds, startDate, endDate }),
    generateComplianceReport: (deviceIds?: string[], startDate?: number, endDate?: number) =>
      complianceMutation.mutate({ deviceIds, startDate, endDate }),
    generateReport: customReportMutation.mutate,
    isLoading,
    error,
    isSuccess,
    reportData,
    reset,
  };
};

export default useCall_Reports;
