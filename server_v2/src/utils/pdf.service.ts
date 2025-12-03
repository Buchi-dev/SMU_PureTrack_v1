/**
 * PDF Service
 * Generates PDF reports using jsPDF library
 * Supports 4 report types: water-quality, device-status, compliance, alert-summary
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportType } from '@feature/reports/report.types';
import logger from '@utils/logger.util';

/**
 * PDF generation parameters for different report types
 */
interface IWaterQualityReportParams {
  deviceId: string;
  deviceName: string;
  startDate: Date;
  endDate: Date;
  readings: Array<{
    timestamp: Date;
    ph: number;
    turbidity: number;
    tds: number;
  }>;
  statistics: {
    avgPh: number;
    avgTurbidity: number;
    avgTds: number;
    minPh: number;
    maxPh: number;
    minTurbidity: number;
    maxTurbidity: number;
    minTds: number;
    maxTds: number;
  };
}

interface IDeviceStatusReportParams {
  devices: Array<{
    deviceId: string;
    name: string;
    status: string;
    location: string;
    lastHeartbeat: Date;
    uptime: number; // percentage
  }>;
  summary: {
    total: number;
    online: number;
    offline: number;
  };
}

interface IComplianceReportParams {
  startDate: Date;
  endDate: Date;
  violations: Array<{
    timestamp: Date;
    deviceId: string;
    deviceName: string;
    parameter: string;
    value: number;
    threshold: number;
    severity: string;
  }>;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface IAlertSummaryReportParams {
  startDate: Date;
  endDate: Date;
  alerts: Array<{
    alertId: string;
    createdAt: Date;
    severity: string;
    parameter: string;
    deviceId: string;
    status: string;
    acknowledgedAt?: Date;
    resolvedAt?: Date;
  }>;
  summary: {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

type ReportParams =
  | IWaterQualityReportParams
  | IDeviceStatusReportParams
  | IComplianceReportParams
  | IAlertSummaryReportParams;

/**
 * PDF Service Class
 * Singleton pattern for consistent PDF generation
 */
class PDFService {
  private readonly BRAND_COLOR = '#1e40af'; // Blue
  private readonly SUCCESS_COLOR = '#16a34a'; // Green
  private readonly WARNING_COLOR = '#ea580c'; // Orange
  private readonly ERROR_COLOR = '#dc2626'; // Red
  private readonly GRAY_COLOR = '#6b7280'; // Gray

  /**
   * Generate PDF report based on type
   * @param type - Report type
   * @param params - Report-specific parameters
   * @returns Buffer containing PDF data
   */
  async generateReport(type: ReportType, params: ReportParams): Promise<Buffer> {
    logger.info(`📄 PDF Service: Generating ${type} report...`);

    let doc: jsPDF;

    switch (type) {
      case ReportType.WATER_QUALITY:
        doc = this.generateWaterQualityReport(params as IWaterQualityReportParams);
        break;
      case ReportType.DEVICE_STATUS:
        doc = this.generateDeviceStatusReport(params as IDeviceStatusReportParams);
        break;
      case ReportType.COMPLIANCE:
        doc = this.generateComplianceReport(params as IComplianceReportParams);
        break;
      case ReportType.ALERT_SUMMARY:
        doc = this.generateAlertSummaryReport(params as IAlertSummaryReportParams);
        break;
      default:
        throw new Error(`Unsupported report type: ${type}`);
    }

    // Convert to Buffer
    const pdfBlob = doc.output('arraybuffer');
    const buffer = Buffer.from(pdfBlob);

    logger.info(`✅ PDF Service: Generated ${type} report (${(buffer.length / 1024).toFixed(2)} KB)`);

    return buffer;
  }

  /**
   * Generate Water Quality Report
   * Time-series charts for pH/turbidity/TDS
   */
  private generateWaterQualityReport(params: IWaterQualityReportParams): jsPDF {
    const doc = new jsPDF();

    // Header
    this.addHeader(doc, 'Water Quality Report');
    this.addSubheader(doc, `Device: ${params.deviceName} (${params.deviceId})`);
    this.addDateRange(doc, params.startDate, params.endDate);

    let yPos = 60;

    // Statistics Summary
    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.text('Statistical Summary', 14, yPos);
    yPos += 8;

    const statsData = [
      ['Parameter', 'Average', 'Minimum', 'Maximum'],
      [
        'pH',
        params.statistics.avgPh.toFixed(2),
        params.statistics.minPh.toFixed(2),
        params.statistics.maxPh.toFixed(2),
      ],
      [
        'Turbidity (NTU)',
        params.statistics.avgTurbidity.toFixed(2),
        params.statistics.minTurbidity.toFixed(2),
        params.statistics.maxTurbidity.toFixed(2),
      ],
      [
        'TDS (ppm)',
        params.statistics.avgTds.toFixed(2),
        params.statistics.minTds.toFixed(2),
        params.statistics.maxTds.toFixed(2),
      ],
    ];

    autoTable(doc, {
      startY: yPos,
      head: statsData[0] ? [statsData[0]] : [],
      body: statsData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: this.BRAND_COLOR },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Recent Readings Table
    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.text('Recent Readings', 14, yPos);
    yPos += 8;

    const readingsData = params.readings.slice(0, 20).map((reading) => [
      new Date(reading.timestamp).toLocaleString(),
      reading.ph.toFixed(2),
      reading.turbidity.toFixed(2),
      reading.tds.toFixed(2),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Timestamp', 'pH', 'Turbidity (NTU)', 'TDS (ppm)']],
      body: readingsData,
      theme: 'striped',
      headStyles: { fillColor: this.BRAND_COLOR },
    });

    // Footer
    this.addFooter(doc);

    return doc;
  }

  /**
   * Generate Device Status Report
   * Online/offline summary table
   */
  private generateDeviceStatusReport(params: IDeviceStatusReportParams): jsPDF {
    const doc = new jsPDF();

    // Header
    this.addHeader(doc, 'Device Status Report');
    this.addSubheader(doc, `Generated: ${new Date().toLocaleString()}`);

    let yPos = 50;

    // Summary Cards
    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.text('Summary', 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Devices: ${params.summary.total}`, 14, yPos);
    doc.text(`Online: ${params.summary.online}`, 80, yPos);
    doc.text(`Offline: ${params.summary.offline}`, 140, yPos);
    yPos += 15;

    // Device Table
    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.text('Device Details', 14, yPos);
    yPos += 8;

    const deviceData = params.devices.map((device) => [
      device.name,
      device.deviceId,
      device.status,
      device.location || 'N/A',
      new Date(device.lastHeartbeat).toLocaleString(),
      `${device.uptime.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Device Name', 'Device ID', 'Status', 'Location', 'Last Heartbeat', 'Uptime']],
      body: deviceData,
      theme: 'striped',
      headStyles: { fillColor: this.BRAND_COLOR },
      didParseCell: (data: any) => {
        // Color code status column
        if (data.column.index === 2 && data.section === 'body') {
          const status = data.cell.raw;
          if (status === 'online') {
            data.cell.styles.textColor = this.SUCCESS_COLOR;
          } else if (status === 'offline') {
            data.cell.styles.textColor = this.ERROR_COLOR;
          }
        }
      },
    });

    // Footer
    this.addFooter(doc);

    return doc;
  }

  /**
   * Generate Compliance Report
   * Threshold violation timeline
   */
  private generateComplianceReport(params: IComplianceReportParams): jsPDF {
    const doc = new jsPDF();

    // Header
    this.addHeader(doc, 'Compliance Report');
    this.addDateRange(doc, params.startDate, params.endDate);

    let yPos = 50;

    // Summary
    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.text('Violation Summary', 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Violations: ${params.summary.total}`, 14, yPos);
    doc.text(`Critical: ${params.summary.critical}`, 80, yPos);
    doc.text(`High: ${params.summary.high}`, 120, yPos);
    doc.text(`Medium: ${params.summary.medium}`, 160, yPos);
    yPos += 15;

    // Violations Table
    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.text('Violation Details', 14, yPos);
    yPos += 8;

    const violationData = params.violations.map((violation) => [
      new Date(violation.timestamp).toLocaleString(),
      violation.deviceName,
      violation.parameter,
      violation.value.toFixed(2),
      violation.threshold.toFixed(2),
      violation.severity,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Timestamp', 'Device', 'Parameter', 'Value', 'Threshold', 'Severity']],
      body: violationData,
      theme: 'striped',
      headStyles: { fillColor: this.BRAND_COLOR },
      didParseCell: (data: any) => {
        // Color code severity column
        if (data.column.index === 5 && data.section === 'body') {
          const severity = data.cell.raw.toLowerCase();
          if (severity === 'critical') {
            data.cell.styles.textColor = this.ERROR_COLOR;
          } else if (severity === 'high') {
            data.cell.styles.textColor = this.WARNING_COLOR;
          }
        }
      },
    });

    // Footer
    this.addFooter(doc);

    return doc;
  }

  /**
   * Generate Alert Summary Report
   * Alert statistics with charts
   */
  private generateAlertSummaryReport(params: IAlertSummaryReportParams): jsPDF {
    const doc = new jsPDF();

    // Header
    this.addHeader(doc, 'Alert Summary Report');
    this.addDateRange(doc, params.startDate, params.endDate);

    let yPos = 50;

    // Summary Statistics
    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.text('Alert Statistics', 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Alerts: ${params.summary.total}`, 14, yPos);
    doc.text(`Active: ${params.summary.active}`, 80, yPos);
    doc.text(`Acknowledged: ${params.summary.acknowledged}`, 140, yPos);
    yPos += 5;
    doc.text(`Resolved: ${params.summary.resolved}`, 14, yPos);
    yPos += 10;

    // Severity Breakdown
    doc.setFontSize(12);
    doc.setTextColor(this.BRAND_COLOR);
    doc.text('By Severity:', 14, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Critical: ${params.summary.bySeverity.critical}`, 14, yPos);
    doc.text(`High: ${params.summary.bySeverity.high}`, 60, yPos);
    doc.text(`Medium: ${params.summary.bySeverity.medium}`, 100, yPos);
    doc.text(`Low: ${params.summary.bySeverity.low}`, 140, yPos);
    yPos += 15;

    // Recent Alerts Table
    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.text('Recent Alerts', 14, yPos);
    yPos += 8;

    const alertData = params.alerts.slice(0, 15).map((alert) => [
      alert.alertId.substring(0, 8),
      new Date(alert.createdAt).toLocaleString(),
      alert.severity,
      alert.parameter,
      alert.deviceId.substring(0, 8),
      alert.status,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Alert ID', 'Created At', 'Severity', 'Parameter', 'Device ID', 'Status']],
      body: alertData,
      theme: 'striped',
      headStyles: { fillColor: this.BRAND_COLOR },
      didParseCell: (data: any) => {
        // Color code severity column
        if (data.column.index === 2 && data.section === 'body') {
          const severity = data.cell.raw.toLowerCase();
          if (severity === 'critical') {
            data.cell.styles.textColor = this.ERROR_COLOR;
          } else if (severity === 'high') {
            data.cell.styles.textColor = this.WARNING_COLOR;
          }
        }
        // Color code status column
        if (data.column.index === 5 && data.section === 'body') {
          const status = data.cell.raw.toLowerCase();
          if (status === 'resolved') {
            data.cell.styles.textColor = this.SUCCESS_COLOR;
          } else if (status === 'active') {
            data.cell.styles.textColor = this.ERROR_COLOR;
          }
        }
      },
    });

    // Footer
    this.addFooter(doc);

    return doc;
  }

  /**
   * Helper: Add report header
   */
  private addHeader(doc: jsPDF, title: string): void {
    doc.setFontSize(20);
    doc.setTextColor(this.BRAND_COLOR);
    doc.text(title, 14, 20);

    // Horizontal line
    doc.setDrawColor(this.BRAND_COLOR);
    doc.setLineWidth(0.5);
    doc.line(14, 24, 196, 24);
  }

  /**
   * Helper: Add subheader
   */
  private addSubheader(doc: jsPDF, text: string): void {
    doc.setFontSize(10);
    doc.setTextColor(this.GRAY_COLOR);
    doc.text(text, 14, 32);
  }

  /**
   * Helper: Add date range
   */
  private addDateRange(doc: jsPDF, startDate: Date, endDate: Date): void {
    doc.setFontSize(10);
    doc.setTextColor(this.GRAY_COLOR);
    const dateRange = `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    doc.text(dateRange, 14, 40);
  }

  /**
   * Helper: Add footer with page numbers
   */
  private addFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(this.GRAY_COLOR);
      doc.text(
        `Page ${i} of ${pageCount} | Generated by Water Quality Monitoring System | ${new Date().toLocaleDateString()}`,
        14,
        285
      );
    }
  }
}

// Export singleton instance
export default new PDFService();

