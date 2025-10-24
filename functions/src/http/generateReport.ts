import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import {db, rtdb} from "../config/firebase";
import type {
  ReportRequest,
  ApiResponse,
  SensorReading,
  WaterQualityMetrics,
  DeviceReport,
  ComplianceStatus,
} from "../types";
import {
  calculateStatistics,
  calculateTrends,
  calculateUptime,
  calculateDataCompleteness,
} from "../utils/helpers";

/**
 * Generate Water Quality Report
 */
export const generateReport = onRequest(
  {
    cors: true,
    invoker: "public",
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {reportType, deviceId, startDate, endDate} = req.body as ReportRequest;

      if (!reportType) {
        res.status(400).json({
          success: false,
          error: "Report type is required",
        } as ApiResponse);
        return;
      }

      console.log(`Generating ${reportType} report`);

      switch (reportType) {
      case "water_quality": {
        const report = await generateWaterQualityReport(deviceId, startDate, endDate);
        res.status(200).json({
          success: true,
          reportType: "water_quality",
          generatedAt: Date.now(),
          data: report,
        } as ApiResponse);
        break;
      }

      case "device_status": {
        const report = await generateDeviceStatusReport();
        res.status(200).json({
          success: true,
          reportType: "device_status",
          generatedAt: Date.now(),
          data: report,
        } as ApiResponse);
        break;
      }

      case "data_summary": {
        const report = await generateDataSummaryReport(deviceId, startDate, endDate);
        res.status(200).json({
          success: true,
          reportType: "data_summary",
          generatedAt: Date.now(),
          data: report,
        } as ApiResponse);
        break;
      }

      case "compliance": {
        const report = await generateComplianceReport(deviceId, startDate, endDate);
        res.status(200).json({
          success: true,
          reportType: "compliance",
          generatedAt: Date.now(),
          data: report,
        } as ApiResponse);
        break;
      }

      default:
        res.status(400).json({
          success: false,
          error: "Invalid report type",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Report generation failed",
      } as ApiResponse);
    }
  }
);

/**
 * Water Quality Report - Comprehensive analysis
 * @param {string} [deviceId] - Optional device ID to filter data
 * @param {number} [startDate] - Optional start date timestamp
 * @param {number} [endDate] - Optional end date timestamp
 * @return {Promise<unknown>} The generated water quality report
 */
async function generateWaterQualityReport(
  deviceId?: string,
  startDate?: number,
  endDate?: number
): Promise<unknown> {
  const end = endDate || Date.now();
  const start = startDate || end - 7 * 24 * 60 * 60 * 1000; // Default: 7 days

  const devices = deviceId ?
    [deviceId] :
    (await db.collection("devices").get()).docs.map((doc) => doc.id);

  const reportData: Record<string, unknown> = {
    title: "Water Quality Analysis Report",
    period: {start, end},
    devices: [],
  };

  for (const devId of devices) {
    const snapshot = await rtdb
      .ref(`sensorReadings/${devId}/history`)
      .orderByChild("receivedAt")
      .startAt(start)
      .endAt(end)
      .limitToLast(10000)
      .once("value");

    if (!snapshot.exists()) {
      console.log(`No readings found for device ${devId} in time range`);
      continue;
    }

    const readings: SensorReading[] = [];
    snapshot.forEach((child) => {
      readings.push(child.val());
    });

    if (readings.length === 0) continue;

    // Calculate metrics
    const metrics: WaterQualityMetrics = {
      avgTurbidity: readings.reduce((sum, r) => sum + r.turbidity, 0) / readings.length,
      maxTurbidity: Math.max(...readings.map((r) => r.turbidity)),
      minTurbidity: Math.min(...readings.map((r) => r.turbidity)),
      avgTDS: readings.reduce((sum, r) => sum + r.tds, 0) / readings.length,
      maxTDS: Math.max(...readings.map((r) => r.tds)),
      minTDS: Math.min(...readings.map((r) => r.tds)),
      avgPH: readings.reduce((sum, r) => sum + r.ph, 0) / readings.length,
      maxPH: Math.max(...readings.map((r) => r.ph)),
      minPH: Math.min(...readings.map((r) => r.ph)),
      totalReadings: readings.length,
      timeRange: {start, end},
    };

    const deviceDoc = await db.collection("devices").doc(devId).get();
    if (!deviceDoc.exists) {
      console.warn(`Device ${devId} not found in Firestore`);
      continue;
    }
    const deviceData = deviceDoc.data();

    (reportData.devices as Array<unknown>).push({
      deviceId: devId,
      deviceName: deviceData?.name,
      location: deviceData?.metadata?.location,
      metrics,
      readings: readings.slice(-100),
      trends: calculateTrends(readings),
      alerts: generateAlerts(metrics),
    });
  }

  return reportData;
}

/**
 * Device Status Report - Monitor active/inactive devices
 * @return {Promise<DeviceReport>} The device status report
 */
async function generateDeviceStatusReport(): Promise<DeviceReport> {
  const devicesSnapshot = await db.collection("devices").get();

  const statusSummary: Record<string, number> = {
    online: 0,
    offline: 0,
    error: 0,
    maintenance: 0,
  };

  const devices = devicesSnapshot.docs.map((doc) => {
    const data = doc.data();
    const status = data.status || "offline";
    statusSummary[status]++;

    const lastSeenTimestamp = data.lastSeen?.toMillis?.() || 0;
    const isActive = Date.now() - lastSeenTimestamp < 5 * 60 * 1000;

    return {
      deviceId: doc.id,
      name: data.name,
      type: data.type,
      status: isActive ? status : "offline",
      lastSeen: lastSeenTimestamp,
      firmwareVersion: data.firmwareVersion,
      sensors: data.sensors,
      location: data.metadata?.location,
      connectivity: isActive ? "active" : "inactive",
      uptime: calculateUptime(lastSeenTimestamp),
    };
  });

  const healthScore =
    devices.length > 0 ? Math.round((statusSummary.online / devices.length) * 100) : 0;

  return {
    summary: {
      totalDevices: devices.length,
      onlineDevices: statusSummary.online,
      offlineDevices: statusSummary.offline,
      healthScore,
    },
    devices,
  };
}

/**
 * Data Summary Report - Statistical analysis
 * @param {string} [deviceId] - Optional device ID to filter data
 * @param {number} [startDate] - Optional start date timestamp
 * @param {number} [endDate] - Optional end date timestamp
 * @return {Promise<unknown>} The generated data summary report
 */
async function generateDataSummaryReport(
  deviceId?: string,
  startDate?: number,
  endDate?: number
): Promise<unknown> {
  const end = endDate || Date.now();
  const start = startDate || end - 30 * 24 * 60 * 60 * 1000; // Default: 30 days

  const devices = deviceId ?
    [deviceId] :
    (await db.collection("devices").get()).docs.map((doc) => doc.id);

  let totalReadings = 0;
  const aggregatedData: Record<string, unknown> = {
    turbidity: [],
    tds: [],
    ph: [],
  };

  for (const devId of devices) {
    const snapshot = await rtdb
      .ref(`sensorReadings/${devId}/history`)
      .orderByChild("receivedAt")
      .startAt(start)
      .endAt(end)
      .limitToLast(10000)
      .once("value");

    if (!snapshot.exists()) continue;

    snapshot.forEach((child) => {
      const reading = child.val();
      (aggregatedData.turbidity as number[]).push(reading.turbidity);
      (aggregatedData.tds as number[]).push(reading.tds);
      (aggregatedData.ph as number[]).push(reading.ph);
      totalReadings++;
    });
  }

  return {
    title: "Data Summary Report",
    period: {start, end},
    summary: {
      totalReadings,
      totalDevices: devices.length,
      dataCompleteness: calculateDataCompleteness(totalReadings, start, end),
    },
    statistics: {
      turbidity: calculateStatistics(aggregatedData.turbidity as number[]),
      tds: calculateStatistics(aggregatedData.tds as number[]),
      ph: calculateStatistics(aggregatedData.ph as number[]),
    },
    hourlyDistribution: {},
    dataQuality: {
      overall: "good",
      turbidity: "good",
      tds: "good",
      ph: "good",
    },
  };
}

/**
 * Compliance Report - Regulatory standards verification
 * @param {string} [deviceId] - Optional device ID to filter data
 * @param {number} [startDate] - Optional start date timestamp
 * @param {number} [endDate] - Optional end date timestamp
 * @return {Promise<unknown>} The generated compliance report
 */
async function generateComplianceReport(
  deviceId?: string,
  startDate?: number,
  endDate?: number
): Promise<unknown> {
  const end = endDate || Date.now();
  const start = startDate || end - 7 * 24 * 60 * 60 * 1000;

  // WHO/EPA Standards
  const standards = {
    turbidity: {max: 5, unit: "NTU", name: "Turbidity"},
    tds: {max: 500, unit: "ppm", name: "Total Dissolved Solids"},
    ph: {min: 6.5, max: 8.5, unit: "pH", name: "pH Level"},
  };

  const devices = deviceId ?
    [deviceId] :
    (await db.collection("devices").get()).docs.map((doc) => doc.id);

  const complianceData: Array<unknown> = [];

  for (const devId of devices) {
    const snapshot = await rtdb
      .ref(`sensorReadings/${devId}/history`)
      .orderByChild("receivedAt")
      .startAt(start)
      .endAt(end)
      .limitToLast(10000)
      .once("value");

    if (!snapshot.exists()) continue;

    const readings: SensorReading[] = [];
    snapshot.forEach((child) => {
      readings.push(child.val());
    });

    if (readings.length === 0) continue;

    const avgTurbidity = readings.reduce((sum, r) => sum + r.turbidity, 0) / readings.length;
    const avgTDS = readings.reduce((sum, r) => sum + r.tds, 0) / readings.length;
    const avgPH = readings.reduce((sum, r) => sum + r.ph, 0) / readings.length;

    const violations = {
      turbidity: readings.filter((r) => r.turbidity > standards.turbidity.max).length,
      tds: readings.filter((r) => r.tds > standards.tds.max).length,
      ph: readings.filter((r) => r.ph < standards.ph.min || r.ph > standards.ph.max).length,
    };

    const complianceStatus: ComplianceStatus[] = [
      {
        parameter: "Turbidity",
        value: avgTurbidity,
        standard: standards.turbidity.max,
        unit: standards.turbidity.unit,
        status: avgTurbidity <= standards.turbidity.max ? "compliant" : "violation",
        percentage: ((readings.length - violations.turbidity) / readings.length) * 100,
      },
      {
        parameter: "TDS",
        value: avgTDS,
        standard: standards.tds.max,
        unit: standards.tds.unit,
        status: avgTDS <= standards.tds.max ? "compliant" : "violation",
        percentage: ((readings.length - violations.tds) / readings.length) * 100,
      },
      {
        parameter: "pH",
        value: avgPH,
        standard: (standards.ph.min + standards.ph.max) / 2,
        unit: standards.ph.unit,
        status: avgPH >= standards.ph.min && avgPH <= standards.ph.max ? "compliant" : "violation",
        percentage: ((readings.length - violations.ph) / readings.length) * 100,
      },
    ];

    const deviceDoc = await db.collection("devices").doc(devId).get();
    if (!deviceDoc.exists) {
      console.warn(`Device ${devId} not found in Firestore`);
      continue;
    }
    const deviceData = deviceDoc.data();

    complianceData.push({
      deviceId: devId,
      deviceName: deviceData?.name,
      location: deviceData?.metadata?.location,
      totalReadings: readings.length,
      complianceStatus,
      overallCompliance: complianceStatus.every((s) => s.status === "compliant"),
      violations,
      recommendations: generateComplianceRecommendations(violations),
    });
  }

  return {
    title: "Water Quality Compliance Report",
    period: {start, end},
    standards: {
      turbidity: `≤ ${standards.turbidity.max} ${standards.turbidity.unit}`,
      tds: `≤ ${standards.tds.max} ${standards.tds.unit}`,
      ph: `${standards.ph.min} - ${standards.ph.max}`,
      reference: "WHO/EPA Drinking Water Standards",
    },
    devices: complianceData,
    summary: {
      totalDevices: complianceData.length,
      compliantDevices: (complianceData as Array<Record<string, unknown>>).filter(
        (d) => d.overallCompliance
      ).length,
      complianceRate:
        complianceData.length > 0 ?
          (
            ((complianceData as Array<Record<string, unknown>>).filter((d) => d.overallCompliance)
              .length /
              complianceData.length) *
            100
          ).toFixed(1) :
          "0.0",
    },
  };
}

/**
 * Generate alerts based on water quality metrics
 * @param {WaterQualityMetrics} metrics - Water quality metrics to analyze
 * @return {Array<unknown>} Array of alert objects
 */
function generateAlerts(metrics: WaterQualityMetrics): Array<unknown> {
  const alerts: Array<unknown> = [];

  if (metrics.avgTurbidity > 5) {
    alerts.push({
      severity: "high",
      parameter: "turbidity",
      message: "Average turbidity exceeds WHO standards (5 NTU)",
      value: metrics.avgTurbidity.toFixed(2),
    });
  }

  if (metrics.avgTDS > 500) {
    alerts.push({
      severity: "medium",
      parameter: "tds",
      message: "Average TDS exceeds recommended limit (500 ppm)",
      value: metrics.avgTDS.toFixed(2),
    });
  }

  if (metrics.avgPH < 6.5 || metrics.avgPH > 8.5) {
    alerts.push({
      severity: "high",
      parameter: "ph",
      message: "pH level outside safe range (6.5-8.5)",
      value: metrics.avgPH.toFixed(2),
    });
  }

  return alerts;
}

/**
 * Generate compliance recommendations based on violations
 * @param {Record<string, number>} violations - Violation counts by parameter
 * @return {Array<string>} Array of recommendation strings
 */
function generateComplianceRecommendations(
  violations: Record<string, number>
): Array<string> {
  const recommendations: Array<string> = [];

  if (violations.turbidity > 0) {
    recommendations.push("Check and replace water filters - high turbidity detected");
  }

  if (violations.tds > 0) {
    recommendations.push("Consider RO system maintenance - elevated TDS levels");
  }

  if (violations.ph > 0) {
    recommendations.push("pH adjustment required - levels outside safe range");
  }

  return recommendations;
}
