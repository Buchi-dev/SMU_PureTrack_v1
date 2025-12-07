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
  alerts?: Array<{
    createdAt: Date;
    severity: string;
    parameter: string;
    message: string;
    status: string;
    value?: number;
    threshold?: number;
  }>;
  alertSummary?: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unacknowledged: number;
    acknowledged: number;
    resolved: number;
  };
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

  // WHO Water Quality Standards (for reference in compliance calculations)
  // @ts-ignore - kept for reference
  private readonly WHO_STANDARDS = {
    ph: { min: 6.5, max: 8.5, unit: '', name: 'pH' },
    tds: { min: 0, max: 1000, unit: 'ppm', name: 'TDS' },
    turbidity: { min: 0, max: 5, unit: 'NTU', name: 'Turbidity' },
  };

  // Philippine National Standards for Drinking Water (PNSDW) (for reference)
  // @ts-ignore - kept for reference
  private readonly PNSDW_STANDARDS = {
    ph: { min: 6.5, max: 8.5, unit: '', name: 'pH' },
    tds: { min: 0, max: 1000, unit: 'ppm', name: 'TDS' },
    turbidity: { min: 0, max: 5, unit: 'NTU', name: 'Turbidity' },
  };

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
   * Time-series charts for pH/turbidity/TDS with WHO standards compliance
   */
  private generateWaterQualityReport(params: IWaterQualityReportParams): jsPDF {
    const doc = new jsPDF({
      compress: true,
    });
    let yPos = 20;

    // ============================================================================
    // HEADER
    // ============================================================================
    doc.setFontSize(20);
    doc.setTextColor(this.BRAND_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('Water Quality Monitoring Report', 14, yPos);
    yPos += 3;
    
    // Underline
    doc.setDrawColor(this.BRAND_COLOR);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, 196, yPos);
    yPos += 10;

    // ============================================================================
    // REPORT METADATA
    // ============================================================================
    doc.setFontSize(11);
    doc.setTextColor(this.GRAY_COLOR);
    doc.setFont('helvetica', 'normal');
    
    const deviceName = params.deviceName || 'Unknown Device';
    const deviceLocation = (params as any).deviceLocation || 'Not specified';
    const deviceStatus = (params as any).deviceStatus || 'unknown';
    
    doc.text(`Device: ${deviceName}`, 14, yPos);
    yPos += 6;
    doc.text(`Location: ${deviceLocation}`, 14, yPos);
    yPos += 6;
    doc.text(`Status: ${deviceStatus.toUpperCase()}`, 14, yPos);
    yPos += 6;
    doc.text(`Period: ${new Date(params.startDate).toLocaleDateString()} - ${new Date(params.endDate).toLocaleDateString()}`, 14, yPos);
    yPos += 6;
    doc.text(`Total Readings: ${(params as any).totalReadings || params.readings.length}`, 14, yPos);
    yPos += 12;

    // ============================================================================
    // EXECUTIVE SUMMARY
    // ============================================================================
    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 14, yPos);
    yPos += 8;

    // Calculate compliance
    const compliance = this.calculateCompliance(params);
    const overallStatus = compliance.overallStatus;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Overall Status
    const statusColor = overallStatus === 'Safe' ? this.SUCCESS_COLOR : 
                       overallStatus === 'Warning' ? this.WARNING_COLOR : this.ERROR_COLOR;
    doc.setTextColor(statusColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`Overall Water Quality: ${overallStatus.toUpperCase()}`, 14, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.GRAY_COLOR);
    doc.text(`WHO Compliance Rate: ${compliance.complianceRate.toFixed(1)}%`, 14, yPos);
    yPos += 6;
    doc.text(`Violations Detected: ${compliance.totalViolations}`, 14, yPos);
    yPos += 6;
    doc.text(`Data Completeness: ${compliance.dataCompleteness.toFixed(1)}%`, 14, yPos);
    yPos += 12;

    // ============================================================================
    // STATISTICAL SUMMARY
    // ============================================================================
    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistical Summary', 14, yPos);
    yPos += 8;

    const statsData = [
      ['Parameter', 'Average', 'Minimum', 'Maximum', 'Std Dev', 'Samples'],
      [
        'pH',
        params.statistics.avgPh?.toFixed(2) || 'N/A',
        params.statistics.minPh?.toFixed(2) || 'N/A',
        params.statistics.maxPh?.toFixed(2) || 'N/A',
        (params.statistics as any).ph?.stdDev?.toFixed(2) || 'N/A',
        (params.statistics as any).ph?.count?.toString() || '0',
      ],
      [
        'Turbidity (NTU)',
        params.statistics.avgTurbidity?.toFixed(2) || 'N/A',
        params.statistics.minTurbidity?.toFixed(2) || 'N/A',
        params.statistics.maxTurbidity?.toFixed(2) || 'N/A',
        (params.statistics as any).turbidity?.stdDev?.toFixed(2) || 'N/A',
        (params.statistics as any).turbidity?.count?.toString() || '0',
      ],
      [
        'TDS (ppm)',
        params.statistics.avgTds?.toFixed(2) || 'N/A',
        params.statistics.minTds?.toFixed(2) || 'N/A',
        params.statistics.maxTds?.toFixed(2) || 'N/A',
        (params.statistics as any).tds?.stdDev?.toFixed(2) || 'N/A',
        (params.statistics as any).tds?.count?.toString() || '0',
      ],
    ];

    autoTable(doc, {
      startY: yPos,
      head: statsData[0] ? [statsData[0]] : [['Parameter', 'Average', 'Minimum', 'Maximum', 'Std Dev', 'Samples']],
      body: statsData.slice(1),
      theme: 'grid',
      headStyles: { 
        fillColor: this.BRAND_COLOR,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: '#f3f4f6',
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // ============================================================================
    // WHO STANDARDS COMPLIANCE
    // ============================================================================
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('WHO Standards Compliance Analysis', 14, yPos);
    yPos += 8;

    const complianceData = [
      ['Parameter', 'WHO Standard', 'PNSDW Standard', 'Observed Range', 'Status', 'Compliance'],
      [
        'pH',
        '6.5 - 8.5',
        '6.5 - 8.5',
        `${params.statistics.minPh?.toFixed(2) || 'N/A'} - ${params.statistics.maxPh?.toFixed(2) || 'N/A'}`,
        compliance.ph.status,
        `${compliance.ph.percentage.toFixed(1)}%`,
      ],
      [
        'TDS (ppm)',
        '< 1000',
        '< 1000',
        `${params.statistics.minTds?.toFixed(2) || 'N/A'} - ${params.statistics.maxTds?.toFixed(2) || 'N/A'}`,
        compliance.tds.status,
        `${compliance.tds.percentage.toFixed(1)}%`,
      ],
      [
        'Turbidity (NTU)',
        '< 5',
        '< 5',
        `${params.statistics.minTurbidity?.toFixed(2) || 'N/A'} - ${params.statistics.maxTurbidity?.toFixed(2) || 'N/A'}`,
        compliance.turbidity.status,
        `${compliance.turbidity.percentage.toFixed(1)}%`,
      ],
    ];

    autoTable(doc, {
      startY: yPos,
      head: complianceData[0] ? [complianceData[0]] : [['Parameter', 'WHO Standard', 'PNSDW Standard', 'Observed Range', 'Status', 'Compliance']],
      body: complianceData.slice(1),
      theme: 'grid',
      headStyles: { 
        fillColor: this.BRAND_COLOR,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        3: { cellWidth: 35 },
        4: { fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        // Color code status column
        if (data.column.index === 4 && data.section === 'body') {
          const status = data.cell.raw as string;
          if (status === 'Pass') {
            data.cell.styles.textColor = this.SUCCESS_COLOR;
          } else if (status === 'Fail') {
            data.cell.styles.textColor = this.ERROR_COLOR;
          }
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // ============================================================================
    // RECENT READINGS TABLE
    // ============================================================================
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Readings (Last 50)', 14, yPos);
    yPos += 8;

    const readingsData = params.readings.slice(0, 50).map((reading) => {
      const timestamp = new Date(reading.timestamp);
      const phValue = reading.ph != null ? reading.ph.toFixed(2) : 'N/A';
      const turbValue = reading.turbidity != null ? reading.turbidity.toFixed(2) : 'N/A';
      const tdsValue = reading.tds != null ? reading.tds.toFixed(2) : 'N/A';
      
      // Compliance indicators
      const phOk = reading.ph != null && reading.ph >= 6.5 && reading.ph <= 8.5 ? '✓' : '✗';
      const turbOk = reading.turbidity != null && reading.turbidity < 5 ? '✓' : '✗';
      const tdsOk = reading.tds != null && reading.tds < 1000 ? '✓' : '✗';
      
      return [
        timestamp.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        `${phValue} ${phOk}`,
        `${turbValue} ${turbOk}`,
        `${tdsValue} ${tdsOk}`,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Timestamp', 'pH', 'Turbidity (NTU)', 'TDS (ppm)']],
      body: readingsData.length > 0 ? readingsData : [['No readings available', '', '', '']],
      theme: 'striped',
      headStyles: { 
        fillColor: this.BRAND_COLOR,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        3: { cellWidth: 38 },
      },
      alternateRowStyles: {
        fillColor: '#f9fafb',
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // ============================================================================
    // ALERTS SECTION
    // ============================================================================
    if (params.alerts && params.alerts.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(this.BRAND_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text('Alerts Summary', 14, yPos);
      yPos += 8;

      // Alert Summary Statistics
      if (params.alertSummary) {
        doc.setFontSize(10);
        doc.setTextColor(this.GRAY_COLOR);
        doc.setFont('helvetica', 'normal');
        
        const summary = params.alertSummary;
        doc.text(`Total Alerts: ${summary.total}`, 14, yPos);
        yPos += 6;
        doc.text(`By Severity: Critical (${summary.critical}) | High (${summary.high}) | Medium (${summary.medium}) | Low (${summary.low})`, 14, yPos);
        yPos += 6;
        doc.text(`By Status: Unacknowledged (${summary.unacknowledged}) | Acknowledged (${summary.acknowledged}) | Resolved (${summary.resolved})`, 14, yPos);
        yPos += 10;
      }

      // Alerts Table
      const alertsData = params.alerts.slice(0, 50).map((alert) => {
        const timestamp = new Date(alert.createdAt);
        const severityColor = alert.severity === 'CRITICAL' ? '🔴' : 
                             alert.severity === 'HIGH' ? '🟠' : 
                             alert.severity === 'MEDIUM' ? '🟡' : '🟢';
        
        return [
          timestamp.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          `${severityColor} ${alert.severity}`,
          alert.parameter?.toUpperCase() || 'N/A',
          alert.value != null ? alert.value.toFixed(2) : 'N/A',
          alert.threshold != null ? alert.threshold.toFixed(2) : 'N/A',
          alert.status,
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Time', 'Severity', 'Parameter', 'Value', 'Threshold', 'Status']],
        body: alertsData.length > 0 ? alertsData : [['No alerts in this period', '', '', '', '', '']],
        theme: 'striped',
        headStyles: { 
          fillColor: this.BRAND_COLOR,
          textColor: '#ffffff',
          fontStyle: 'bold',
          fontSize: 9,
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 22 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 },
        },
        alternateRowStyles: {
          fillColor: '#f9fafb',
        },
        didParseCell: (data) => {
          // Color code severity column
          if (data.column.index === 1 && data.section === 'body') {
            const severity = data.cell.text[0];
            if (severity && severity.includes('CRITICAL')) {
              data.cell.styles.textColor = this.ERROR_COLOR;
              data.cell.styles.fontStyle = 'bold';
            } else if (severity && severity.includes('HIGH')) {
              data.cell.styles.textColor = this.WARNING_COLOR;
              data.cell.styles.fontStyle = 'bold';
            } else if (severity && severity.includes('MEDIUM')) {
              data.cell.styles.textColor = '#f59e0b'; // Amber
            }
          }
          // Color code status column
          if (data.column.index === 5 && data.section === 'body') {
            const status = data.cell.text[0];
            if (status === 'Resolved') {
              data.cell.styles.textColor = this.SUCCESS_COLOR;
            } else if (status === 'Unacknowledged') {
              data.cell.styles.textColor = this.ERROR_COLOR;
            }
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // ============================================================================
    // RECOMMENDATIONS SECTION
    // ============================================================================
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(this.BRAND_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations', 14, yPos);
    yPos += 8;

    const recommendations = this.generateRecommendations(params, compliance);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#000000');
    
    recommendations.forEach((rec, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const bullet = `${index + 1}.`;
      doc.setFont('helvetica', 'bold');
      doc.text(bullet, 14, yPos);
      doc.setFont('helvetica', 'normal');
      
      const lines = doc.splitTextToSize(rec, 175);
      doc.text(lines, 20, yPos);
      yPos += (lines.length * 6) + 3;
    });

    // Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      this.addFooter(doc, i, pageCount);
    }

    return doc;
  }

  /**
   * Calculate WHO standards compliance
   */
  private calculateCompliance(params: IWaterQualityReportParams) {
    const readings = params.readings;
    const totalReadings = readings.length;
    
    if (totalReadings === 0) {
      return {
        overallStatus: 'No Data',
        complianceRate: 0,
        totalViolations: 0,
        dataCompleteness: 0,
        ph: { status: 'N/A', percentage: 0, violations: 0 },
        tds: { status: 'N/A', percentage: 0, violations: 0 },
        turbidity: { status: 'N/A', percentage: 0, violations: 0 },
      };
    }

    // Check pH compliance
    const phReadings = readings.filter(r => r.ph != null);
    const phCompliant = phReadings.filter(r => r.ph >= 6.5 && r.ph <= 8.5).length;
    const phViolations = phReadings.length - phCompliant;
    const phPercentage = phReadings.length > 0 ? (phCompliant / phReadings.length) * 100 : 0;
    const phStatus = phPercentage === 100 ? 'Pass' : 'Fail';

    // Check TDS compliance
    const tdsReadings = readings.filter(r => r.tds != null);
    const tdsCompliant = tdsReadings.filter(r => r.tds < 1000).length;
    const tdsViolations = tdsReadings.length - tdsCompliant;
    const tdsPercentage = tdsReadings.length > 0 ? (tdsCompliant / tdsReadings.length) * 100 : 0;
    const tdsStatus = tdsPercentage === 100 ? 'Pass' : 'Fail';

    // Check Turbidity compliance
    const turbidityReadings = readings.filter(r => r.turbidity != null);
    const turbidityCompliant = turbidityReadings.filter(r => r.turbidity < 5).length;
    const turbidityViolations = turbidityReadings.length - turbidityCompliant;
    const turbidityPercentage = turbidityReadings.length > 0 ? (turbidityCompliant / turbidityReadings.length) * 100 : 0;
    const turbidityStatus = turbidityPercentage === 100 ? 'Pass' : 'Fail';

    // Overall compliance
    const totalViolations = phViolations + tdsViolations + turbidityViolations;
    const totalChecks = phReadings.length + tdsReadings.length + turbidityReadings.length;
    const complianceRate = totalChecks > 0 ? ((totalChecks - totalViolations) / totalChecks) * 100 : 0;
    
    // Determine overall status
    let overallStatus = 'Safe';
    if (totalViolations === 0) {
      overallStatus = 'Safe';
    } else if (complianceRate >= 90) {
      overallStatus = 'Warning';
    } else {
      overallStatus = 'Critical';
    }
    
    // Check for critical pH violations
    const criticalPh = readings.some(r => r.ph != null && (r.ph < 6.0 || r.ph > 9.0));
    if (criticalPh) {
      overallStatus = 'Critical';
    }

    // Data completeness
    const expectedReadings = totalReadings;
    const actualReadings = readings.filter(r => r.ph != null || r.tds != null || r.turbidity != null).length;
    const dataCompleteness = (actualReadings / expectedReadings) * 100;

    return {
      overallStatus,
      complianceRate,
      totalViolations,
      dataCompleteness,
      ph: { status: phStatus, percentage: phPercentage, violations: phViolations },
      tds: { status: tdsStatus, percentage: tdsPercentage, violations: tdsViolations },
      turbidity: { status: turbidityStatus, percentage: turbidityPercentage, violations: turbidityViolations },
    };
  }

  /**
   * Generate recommendations based on water quality data
   */
  private generateRecommendations(params: IWaterQualityReportParams, compliance: any): string[] {
    const recommendations: string[] = [];

    // pH recommendations
    if (compliance.ph.violations > 0) {
      const severity = compliance.ph.percentage < 90 ? 'CRITICAL' : 'WARNING';
      recommendations.push(
        `[${severity}] pH levels exceeded WHO standards in ${compliance.ph.violations} reading(s). ` +
        `Recommend immediate water treatment system inspection and pH correction measures.`
      );
    }

    // TDS recommendations
    if (compliance.tds.violations > 0) {
      if (compliance.tds.percentage < 95) {
        recommendations.push(
          `[WARNING] TDS levels exceeded 1000 ppm threshold in ${compliance.tds.violations} reading(s). ` +
          `Monitor for increasing trend and consider water filtration system maintenance.`
        );
      }
    }

    // Turbidity recommendations
    if (compliance.turbidity.violations > 0) {
      recommendations.push(
        `[WARNING] Turbidity exceeded 5 NTU standard in ${compliance.turbidity.violations} reading(s). ` +
        `Check for sediment buildup and inspect filtration system.`
      );
    }

    // Device status recommendations
    const deviceStatus = (params as any).deviceStatus;
    if (deviceStatus === 'offline') {
      recommendations.push(
        `[CRITICAL] Device is currently offline. Check network connectivity and power supply immediately.`
      );
    }

    // Data completeness recommendation
    if (compliance.dataCompleteness < 80) {
      recommendations.push(
        `[WARNING] Data completeness is ${compliance.dataCompleteness.toFixed(1)}%. ` +
        `Missing data may affect accuracy of water quality assessment. Check sensor connectivity.`
      );
    }

    // Alert-based recommendations
    if (params.alertSummary) {
      const alertSum = params.alertSummary;
      if (alertSum.critical > 0) {
        recommendations.push(
          `[CRITICAL] ${alertSum.critical} critical alert(s) detected during this period. ` +
          `Immediate attention required to address water quality violations.`
        );
      }
      if (alertSum.unacknowledged > 0) {
        recommendations.push(
          `[WARNING] ${alertSum.unacknowledged} unacknowledged alert(s) pending review. ` +
          `Ensure all alerts are reviewed and appropriate actions are taken.`
        );
      }
      if (alertSum.total === 0) {
        recommendations.push(
          `[INFO] No alerts triggered during this period. Water quality parameters remained within acceptable ranges.`
        );
      }
    }

    // Positive recommendation if all is well
    if (compliance.overallStatus === 'Safe' && compliance.complianceRate === 100) {
      recommendations.push(
        `[GOOD] All water quality parameters are within WHO acceptable ranges. Continue routine monitoring schedule.`
      );
    }

    // General maintenance recommendation
    if (recommendations.length === 0 || compliance.overallStatus !== 'Critical') {
      recommendations.push(
        `Regular calibration of sensors is recommended every 3-6 months to ensure accurate readings.`
      );
    }

    return recommendations;
  }

  /**
   * Add footer with page numbers
   */
  private addFooter(doc: jsPDF, pageNum?: number, totalPages?: number) {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(this.GRAY_COLOR);
    doc.setFont('helvetica', 'normal');
    
    // Generation timestamp
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated: ${timestamp}`, 14, pageHeight - 10);
    
    // System name
    doc.text('PureTrack Water Quality Monitoring System', 105, pageHeight - 10, { align: 'center' });
    
    // Page numbers
    if (pageNum && totalPages) {
      doc.text(`Page ${pageNum} of ${totalPages}`, 196, pageHeight - 10, { align: 'right' });
    }
  }

  /**
   * Generate Device Status Report
   * Online/offline summary table
   */
  private generateDeviceStatusReport(params: IDeviceStatusReportParams): jsPDF {
    const doc = new jsPDF({
      compress: true,
    });

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
    const doc = new jsPDF({
      compress: true,
    });

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
    const doc = new jsPDF({
      compress: true,
    });

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
}

// Export singleton instance
export default new PDFService();

