import type * as FirebaseFirestore from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";

import {db, rtdb} from "../config/firebase";
import {REPORT_GENERATION_ERRORS, REPORT_GENERATION_MESSAGES, COLLECTIONS} from "../constants";
import type {
  ReportGenerationRequest,
  ReportResponse,
  WaterQualityReportData,
  DeviceStatusReportData,
  WaterQualityDeviceData,
  DeviceMetrics,
  SensorReading,
  AlertData,
  DeviceStatusSummary,
  DeviceStatusInfo,
} from "../types";
import {createRoutedFunction} from "../utils";

/**
 * Generate Water Quality Report Handler
 * Retrieves water quality metrics, sensor readings, and alerts
 *
 * @param {CallableRequest<ReportGenerationRequest>} request - Callable request with optional deviceIds and date range
 * @return {Promise<ReportResponse>} Water quality report with metrics and readings
 *
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleGenerateWaterQualityReport(
  request: CallableRequest<ReportGenerationRequest>
): Promise<ReportResponse> {
  try {
    const {deviceIds, startDate, endDate} = request.data;

    console.log("📊 Generating Water Quality Report");
    console.log("Device IDs:", deviceIds);
    console.log(
      "Date Range:",
      startDate ? new Date(startDate).toISOString() : "none",
      "to",
      endDate ? new Date(endDate).toISOString() : "none"
    );

    // Query devices
    let devicesQuery: FirebaseFirestore.Query = db.collection(COLLECTIONS.DEVICES);
    if (deviceIds && deviceIds.length > 0) {
      devicesQuery = devicesQuery.where("deviceId", "in", deviceIds);
    }

    const devicesSnapshot = await devicesQuery.get();
    console.log(`Found ${devicesSnapshot.size} devices`);

    if (devicesSnapshot.empty) {
      throw new HttpsError("not-found", REPORT_GENERATION_ERRORS.NO_DEVICES_FOUND);
    }

    const devices: WaterQualityDeviceData[] = [];

    // Process each device
    for (const deviceDoc of devicesSnapshot.docs) {
      const deviceData = deviceDoc.data();
      const deviceId = deviceData.deviceId;

      console.log(`\n📱 Processing device: ${deviceId}`);

      // Query sensor readings from Realtime Database
      // Path: sensorReadings/{deviceId}/history
      const historyRef = rtdb.ref(`sensorReadings/${deviceId}/history`);
      console.log(`Querying RTDB path: sensorReadings/${deviceId}/history`);

      let historyQuery = historyRef.orderByChild("receivedAt");

      // Apply date filters if provided
      if (startDate && endDate) {
        // Realtime Database queries by receivedAt timestamp
        historyQuery = historyQuery.startAt(startDate).endAt(endDate);
        console.log(
          `Filtering by date range: ${new Date(startDate).toISOString()} to ${new Date(endDate).toISOString()}`
        );
      }

      // Limit to last 100 readings
      historyQuery = historyQuery.limitToLast(100);

      const historySnapshot = await historyQuery.once("value");
      const historyData = historySnapshot.val() as Record<string, Record<string, unknown>> | null;

      console.log(
        `Found ${historyData ? Object.keys(historyData).length : 0} readings for device ${deviceId}`
      );

      const readings: SensorReading[] = [];

      if (historyData) {
        // Convert RTDB object to array of readings
        Object.values(historyData).forEach((reading: Record<string, unknown>) => {
          if (reading && typeof reading === "object") {
            readings.push({
              deviceId: reading.deviceId || deviceId,
              ph: Number(reading.ph) || 0,
              tds: Number(reading.tds) || 0,
              turbidity: Number(reading.turbidity) || 0,
              timestamp: (reading.receivedAt as number) || Date.now(), // Use receivedAt as timestamp
              receivedAt: (reading.receivedAt as number) || Date.now(),
            });
          }
        });
      }

      // Log sample reading for debugging
      if (readings.length > 0) {
        console.log("Sample reading:", {
          ph: readings[0].ph,
          tds: readings[0].tds,
          turbidity: readings[0].turbidity,
          timestamp: new Date(readings[0].timestamp).toISOString(),
          receivedAt: new Date(readings[0].receivedAt).toISOString(),
        });
      } else {
        console.warn(`⚠️ No readings found for device ${deviceId} in RTDB`);
        console.warn(`Check if path exists: sensorReadings/${deviceId}/history`);
      }

      // Calculate metrics
      const metrics: DeviceMetrics = calculateMetrics(readings);
      console.log("Calculated metrics:", metrics);

      // Query active alerts for this device
      const alertsSnapshot = await db
        .collection(COLLECTIONS.ALERTS)
        .where("deviceId", "==", deviceId)
        .where("status", "in", ["Active", "Acknowledged"])
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const alerts: AlertData[] = alertsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          severity: data.severity || "Advisory",
          parameter: data.parameter || "unknown",
          message: data.message || "",
          value: String(data.currentValue || ""),
        };
      });

      // Extract location from device metadata
      const location = deviceData.metadata?.location ?
        `${deviceData.metadata.location.building || ""}, ${deviceData.metadata.location.floor || ""}`
          .trim()
          .replace(/^,\s*|,\s*$/g, "") || "Unknown Location" :
        "Unknown Location";

      devices.push({
        deviceId,
        deviceName: deviceData.name || deviceId,
        location,
        metrics,
        readings,
        alerts,
      });
    }

    // Calculate overall summary
    const summary = {
      totalDevices: devices.length,
      totalReadings: devices.reduce((sum, d) => sum + d.readings.length, 0),
      averagePH: devices.reduce((sum, d) => sum + d.metrics.avgPH, 0) / devices.length,
      averageTDS: devices.reduce((sum, d) => sum + d.metrics.avgTDS, 0) / devices.length,
      averageTurbidity:
        devices.reduce((sum, d) => sum + d.metrics.avgTurbidity, 0) / devices.length,
    };

    const reportData: WaterQualityReportData = {
      reportType: "water_quality",
      period:
        startDate && endDate ?
          {
            start: new Date(startDate).toISOString(),
            end: new Date(endDate).toISOString(),
          } :
          undefined,
      devices,
      summary,
    };

    return {
      success: true,
      message: REPORT_GENERATION_MESSAGES.WATER_QUALITY_SUCCESS,
      data: reportData,
      timestamp: Date.now(),
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error generating water quality report:", error);
    throw new HttpsError("internal", REPORT_GENERATION_ERRORS.WATER_QUALITY_FAILED);
  }
}

/**
 * Generate Device Status Report Handler
 * Retrieves device health metrics and status information
 *
 * @param {CallableRequest<ReportGenerationRequest>} request - Callable request with optional deviceIds
 * @return {Promise<ReportResponse>} Device status report with health metrics
 *
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleGenerateDeviceStatusReport(
  request: CallableRequest<ReportGenerationRequest>
): Promise<ReportResponse> {
  console.log("handleGenerateDeviceStatusReport called");
  try {
    const {deviceIds} = request.data;
    console.log("Device IDs:", deviceIds);

    // Query devices
    let devicesQuery: FirebaseFirestore.Query = db.collection(COLLECTIONS.DEVICES);
    if (deviceIds && deviceIds.length > 0) {
      devicesQuery = devicesQuery.where("deviceId", "in", deviceIds);
    }

    const devicesSnapshot = await devicesQuery.get();

    if (devicesSnapshot.empty) {
      throw new HttpsError("not-found", REPORT_GENERATION_ERRORS.NO_DEVICES_FOUND);
    }

    const devices: DeviceStatusInfo[] = [];
    const statusCounts = {
      online: 0,
      offline: 0,
      error: 0,
      maintenance: 0,
    };

    // Process each device
    for (const deviceDoc of devicesSnapshot.docs) {
      const deviceData = deviceDoc.data();
      const status = deviceData.status || "offline";

      // Count status
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      }

      // Calculate uptime if device is online
      let uptime: string | undefined;
      if (status === "online" && deviceData.lastSeen) {
        const uptimeMs = Date.now() - deviceData.lastSeen;
        uptime = formatUptime(uptimeMs);
      }

      // Safely format lastSeen timestamp
      let lastSeenFormatted = "Unknown";
      if (deviceData.lastSeen) {
        try {
          const lastSeenDate = new Date(deviceData.lastSeen);
          if (!isNaN(lastSeenDate.getTime())) {
            lastSeenFormatted = lastSeenDate.toISOString();
          }
        } catch (error) {
          console.warn(
            `Invalid lastSeen value for device ${deviceData.deviceId}:`,
            deviceData.lastSeen
          );
        }
      }

      devices.push({
        deviceId: deviceData.deviceId,
        deviceName: deviceData.name || deviceData.deviceId,
        status,
        lastSeen: lastSeenFormatted,
        uptime,
      });
    }

    // Calculate health score
    const totalDevices = devicesSnapshot.size;
    const healthScore =
      totalDevices > 0 ? ((statusCounts.online / totalDevices) * 100).toFixed(1) : "0.0";

    const summary: DeviceStatusSummary = {
      totalDevices,
      statusBreakdown: statusCounts,
      healthScore,
    };

    const reportData: DeviceStatusReportData = {
      reportType: "device_status",
      summary,
      devices,
    };

    return {
      success: true,
      message: REPORT_GENERATION_MESSAGES.DEVICE_STATUS_SUCCESS,
      data: reportData,
      timestamp: Date.now(),
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error generating device status report:", error);
    throw new HttpsError("internal", REPORT_GENERATION_ERRORS.DEVICE_STATUS_FAILED);
  }
}

/**
 * Generate Data Summary Report Handler
 * Retrieves statistical summaries and aggregated metrics
 *
 * @param {CallableRequest<ReportGenerationRequest>} request - Callable request with optional deviceIds and date range
 * @return {Promise<ReportResponse>} Data summary report with statistics
 *
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleGenerateDataSummaryReport(
  request: CallableRequest<ReportGenerationRequest>
): Promise<ReportResponse> {
  try {
    // Placeholder implementation - can be expanded based on requirements
    const reportData = {
      reportType: "data_summary",
      message: "Data summary report generation not fully implemented",
      period: {
        start: request.data.startDate ? new Date(request.data.startDate).toISOString() : null,
        end: request.data.endDate ? new Date(request.data.endDate).toISOString() : null,
      },
    };

    return {
      success: true,
      message: REPORT_GENERATION_MESSAGES.DATA_SUMMARY_SUCCESS,
      data: reportData,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error generating data summary report:", error);
    throw new HttpsError("internal", REPORT_GENERATION_ERRORS.DATA_SUMMARY_FAILED);
  }
}

/**
 * Generate Compliance Report Handler
 * Retrieves compliance metrics against regulatory standards
 *
 * @param {CallableRequest<ReportGenerationRequest>} request - Callable request with optional deviceIds and date range
 * @return {Promise<ReportResponse>} Compliance report with regulatory metrics
 *
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleGenerateComplianceReport(
  request: CallableRequest<ReportGenerationRequest>
): Promise<ReportResponse> {
  try {
    // Placeholder implementation - can be expanded based on requirements
    const reportData = {
      reportType: "compliance",
      message: "Compliance report generation not fully implemented",
      period: {
        start: request.data.startDate ? new Date(request.data.startDate).toISOString() : null,
        end: request.data.endDate ? new Date(request.data.endDate).toISOString() : null,
      },
    };

    return {
      success: true,
      message: REPORT_GENERATION_MESSAGES.COMPLIANCE_SUCCESS,
      data: reportData,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error generating compliance report:", error);
    throw new HttpsError("internal", REPORT_GENERATION_ERRORS.COMPLIANCE_FAILED);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate metrics from sensor readings
 *
 * @param {SensorReading[]} readings - Array of sensor readings
 * @return {DeviceMetrics} Calculated metrics
 */
function calculateMetrics(readings: SensorReading[]): DeviceMetrics {
  if (readings.length === 0) {
    return {
      avgPH: 0,
      minPH: 0,
      maxPH: 0,
      avgTDS: 0,
      minTDS: 0,
      maxTDS: 0,
      avgTurbidity: 0,
      minTurbidity: 0,
      maxTurbidity: 0,
      totalReadings: 0,
    };
  }

  const phValues = readings.map((r) => r.ph);
  const tdsValues = readings.map((r) => r.tds);
  const turbidityValues = readings.map((r) => r.turbidity);

  return {
    avgPH: average(phValues),
    minPH: Math.min(...phValues),
    maxPH: Math.max(...phValues),
    avgTDS: average(tdsValues),
    minTDS: Math.min(...tdsValues),
    maxTDS: Math.max(...tdsValues),
    avgTurbidity: average(turbidityValues),
    minTurbidity: Math.min(...turbidityValues),
    maxTurbidity: Math.max(...turbidityValues),
    totalReadings: readings.length,
  };
}

/**
 * Calculate average of numbers
 *
 * @param {number[]} numbers - Array of numbers
 * @return {number} Average value
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Format uptime duration
 *
 * @param {number} ms - Milliseconds
 * @return {string} Formatted uptime string
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ============================================================================
// CALLABLE FUNCTION EXPORT
// ============================================================================

/**
 * Generate Report Callable Function
 * Single entry point for all report generation operations
 *
 * Uses createRoutedFunction for clean switch-case routing
 *
 * Security:
 * - Requires authentication
 * - All report generation available to both Staff and Admin roles
 *
 * @example
 * // Generate water quality report
 * const result = await httpsCallable('generateReport')({
 *   reportType: 'water_quality',
 *   startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
 *   endDate: Date.now()
 * });
 *
 * @example
 * // Generate device status report
 * const result = await httpsCallable('generateReport')({
 *   reportType: 'device_status'
 * });
 */
export const generateReport = onCall(
  createRoutedFunction<ReportGenerationRequest, ReportResponse>(
    {
      generateWaterQualityReport: handleGenerateWaterQualityReport,
      generateDeviceStatusReport: handleGenerateDeviceStatusReport,
      generateDataSummaryReport: handleGenerateDataSummaryReport,
      generateComplianceReport: handleGenerateComplianceReport,
    },
    {
      requireAuth: true,
      requireAdmin: false, // Staff can generate reports for monitoring purposes
    }
  )
);
