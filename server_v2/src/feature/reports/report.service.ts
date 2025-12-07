/**
 * Report Service
 * 
 * Business logic for report generation and management:
 * - PDF generation with jsPDF
 * - GridFS file storage
 * - Report listing and filtering
 * - Automatic cleanup of expired reports
 * 
 * @module feature/reports/report.service
 */

import Report from './report.model';
import {
  IReportDocument,
  ICreateReportData,
  IReportFilters,
  IReportStatistics,
  ReportStatus,
  ReportType,
  ReportFormat,
} from './report.types';
import { CRUDOperations } from '@utils/queryBuilder.util';
import { NotFoundError, BadRequestError } from '@utils/errors.util';
import { ERROR_MESSAGES } from '@core/configs/messages.config';
import { Types, Document } from 'mongoose';
import logger from '@utils/logger.util';

/**
 * Report Service Class
 * Handles report generation and storage
 * 
 * NOTE: PDF/GridFS services will be integrated once created
 */
export class ReportService {
  private crud: CRUDOperations<IReportDocument & Document>;

  constructor() {
    this.crud = new CRUDOperations<IReportDocument & Document>(Report as any);
  }

  /**
   * Create report request
   * Initiates report generation process
   */
  async createReport(reportData: ICreateReportData): Promise<IReportDocument> {
    // Set expiration date if not provided (default: 30 days)
    if (!reportData.expiresAt) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      reportData.expiresAt = expiresAt;
    }

    const report = await this.crud.create(reportData as any);

    // Trigger async report generation (fire and forget)
    this._generateReportAsync(report._id).catch((error) => {
      logger.error(`Failed to generate report ${report._id}:`, error);
    });

    return report;
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId: string): Promise<IReportDocument> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestError('Invalid report ID');
    }

    const report = await Report.findById(reportId).lean();

    if (!report) {
      throw new NotFoundError(ERROR_MESSAGES.REPORT.NOT_FOUND);
    }

    return report as IReportDocument;
  }

  /**
   * Get all reports with filters
   */
  async getAllReports(filters: IReportFilters, page = 1, limit = 20) {
    const query = this.crud.query();

    // Apply filters
    if (filters.type) query.filter({ type: filters.type });
    if (filters.status) query.filter({ status: filters.status });
    if (filters.format) query.filter({ format: filters.format });
    if (filters.generatedBy) query.filter({ generatedBy: new Types.ObjectId(filters.generatedBy) });

    // Date range for createdAt
    if (filters.startDate || filters.endDate) {
      query.dateRange('createdAt', filters.startDate, filters.endDate);
    }

    // Pagination and sorting
    query.paginate(page, limit).sortBy('-createdAt');

    // Populate generatedBy with user details
    query.populateFields({
      path: 'generatedBy',
      select: 'displayName email'
    } as any);

    return query.execute();
  }

  /**
   * Get user's reports
   */
  async getUserReports(userId: string, page = 1, limit = 20) {
    const query = this.crud.query();

    query
      .filter({ generatedBy: new Types.ObjectId(userId) })
      .paginate(page, limit)
      .sortBy('-createdAt');

    return query.execute();
  }

  /**
   * Update report status
   */
  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    errorMessage?: string
  ): Promise<IReportDocument> {
    const updateData: any = { status };

    if (status === ReportStatus.COMPLETED) {
      updateData.generatedAt = new Date();
    }

    if (status === ReportStatus.FAILED && errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    const report = await Report.findByIdAndUpdate(reportId, { $set: updateData }, { new: true });

    if (!report) {
      throw new NotFoundError(ERROR_MESSAGES.REPORT.NOT_FOUND);
    }

    return report;
  }

  /**
   * Attach file to report
   * Called after PDF/CSV generation
   */
  async attachFile(
    reportId: string,
    fileData: {
      fileId: Types.ObjectId;
      filename: string;
      format: ReportFormat;
      size: number;
      mimeType: string;
    }
  ): Promise<IReportDocument> {
    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        $set: {
          file: fileData,
          status: ReportStatus.COMPLETED,
          generatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!report) {
      throw new NotFoundError(ERROR_MESSAGES.REPORT.NOT_FOUND);
    }

    return report;
  }

  /**
   * Delete report
   * Also deletes associated file from GridFS
   */
  async deleteReport(reportId: string): Promise<void> {
    // Get report to check for file
    const report = await this.getReportById(reportId);

    // Delete file from GridFS if exists
    if (report.file?.fileId) {
      const { gridfsService } = await import('@utils');
      await gridfsService.deleteFile(report.file.fileId);
    }

    await Report.findByIdAndDelete(reportId);
  }

  /**
   * Delete expired reports
   * Called by scheduled job
   */
  async deleteExpiredReports(): Promise<number> {
    const now = new Date();

    // Find expired reports with files
    const expiredReports = await Report.find({
      expiresAt: { $lt: now },
    }).select('_id file');

    // Delete files from GridFS
    if (expiredReports.length > 0) {
      const fileIds = expiredReports
        .filter((report) => report.file?.fileId)
        .map((report) => report.file!.fileId);

      if (fileIds.length > 0) {
        const { gridfsService } = await import('@utils');
        await gridfsService.deleteFiles(fileIds);
      }
    }

    // Delete reports
    const result = await Report.deleteMany({
      expiresAt: { $lt: now },
    });

    return result.deletedCount || 0;
  }

  /**
   * Get report statistics
   */
  async getReportStatistics(userId?: string): Promise<IReportStatistics> {
    const matchStage: any = {};
    if (userId) {
      matchStage.generatedBy = new Types.ObjectId(userId);
    }

    const stats = await Report.aggregate([
      { $match: matchStage },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byType: [
            {
              $group: {
                _id: '$type',
                count: { $sum: 1 },
              },
            },
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          byFormat: [
            {
              $group: {
                _id: '$format',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const result = stats[0];

    // Transform to statistics format
    const byType: Record<string, number> = {};
    for (const type of Object.values(ReportType)) {
      byType[type] = 0;
    }
    result.byType.forEach((item: any) => {
      byType[item._id] = item.count;
    });

    const byStatus: Record<string, number> = {};
    for (const status of Object.values(ReportStatus)) {
      byStatus[status] = 0;
    }
    result.byStatus.forEach((item: any) => {
      byStatus[item._id] = item.count;
    });

    const byFormat: Record<string, number> = {};
    for (const format of Object.values(ReportFormat)) {
      byFormat[format] = 0;
    }
    result.byFormat.forEach((item: any) => {
      byFormat[item._id] = item.count;
    });

    return {
      total: result.total[0]?.count || 0,
      byType: byType as Record<ReportType, number>,
      byStatus: byStatus as Record<ReportStatus, number>,
      byFormat: byFormat as Record<ReportFormat, number>,
    };
  }

  /**
   * Generate report (async)
   * Generates PDF and stores in GridFS
   * @private
   */
  private async _generateReportAsync(reportId: Types.ObjectId): Promise<void> {
    try {
      // Update status to generating
      await this.updateReportStatus(reportId.toString(), ReportStatus.GENERATING);

      // Get report details
      const report = await this.getReportById(reportId.toString());

      // Build report parameters based on type
      const reportParams = await this._buildReportParams(report);

      // Generate PDF
      const { pdfService } = await import('@utils');
      const pdfBuffer = await pdfService.generateReport(report.type, reportParams);

      // Upload to GridFS
      const { gridfsService } = await import('@utils');
      const filename = `${report.type}-${reportId}-${Date.now()}.pdf`;
      const uploadResult = await gridfsService.uploadFile(pdfBuffer, filename, {
        filename,
        contentType: 'application/pdf',
        reportId: reportId.toString(),
        reportType: report.type,
        uploadedAt: new Date(),
      });

      // Attach file to report
      await this.attachFile(reportId.toString(), {
        fileId: uploadResult.fileId,
        filename: uploadResult.filename,
        format: ReportFormat.PDF,
        size: uploadResult.size,
        mimeType: 'application/pdf',
      });
    } catch (error) {
      await this.updateReportStatus(
        reportId.toString(),
        ReportStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Build report parameters based on report type
   * @private
   */
  private async _buildReportParams(report: IReportDocument): Promise<any> {
    const { parameters } = report;

    switch (report.type) {
      case ReportType.WATER_QUALITY: {
        // Fetch actual Device document(s) first for accurate device information
        const Device = (await import('@feature/devices/device.model')).default;
        let deviceInfo: any = null;
        let deviceInfos: any[] = [];
        
        // Support both single device and multiple devices
        if (parameters.deviceId) {
          deviceInfo = await Device.findOne({ deviceId: parameters.deviceId }).lean();
          if (deviceInfo) {
            deviceInfos = [deviceInfo];
          }
        } else if (parameters.deviceIds && parameters.deviceIds.length > 0) {
          deviceInfos = await Device.find({ deviceId: { $in: parameters.deviceIds } }).lean();
          // Use the first device info for single-device fields
          if (deviceInfos.length > 0) {
            deviceInfo = deviceInfos[0];
          }
        }

        // Fetch sensor readings for device(s) in date range
        const SensorReading = (await import('@feature/sensorReadings/sensorReading.model')).default;
        const query: any = {
          timestamp: {
            $gte: parameters.startDate,
            $lte: parameters.endDate,
          },
        };

        // Support both single device and multiple devices
        if (parameters.deviceId) {
          query.deviceId = parameters.deviceId;
        } else if (parameters.deviceIds && parameters.deviceIds.length > 0) {
          query.deviceId = { $in: parameters.deviceIds };
        }

        const readings = await SensorReading.find(query)
          .sort({ timestamp: -1 })
          .limit(1000) // Increased limit for better statistics
          .lean();

        // Fetch alerts for the device(s) in date range
        const Alert = (await import('@feature/alerts/alert.model')).default;
        const alertQuery: any = {
          createdAt: {
            $gte: parameters.startDate,
            $lte: parameters.endDate,
          },
        };

        // Support both single device and multiple devices
        if (parameters.deviceId) {
          alertQuery.deviceId = parameters.deviceId;
        } else if (parameters.deviceIds && parameters.deviceIds.length > 0) {
          alertQuery.deviceId = { $in: parameters.deviceIds };
        }

        const alerts = await Alert.find(alertQuery)
          .sort({ createdAt: -1 })
          .limit(100) // Limit to last 100 alerts
          .lean();

        // Helper function to safely filter and validate numeric values
        const getValidNumbers = (values: any[]): number[] => {
          return values
            .filter((v: any) => v != null && typeof v === 'number' && isFinite(v))
            .map((v: number) => Number(v));
        };

        // Extract valid values for each parameter
        const phValues = getValidNumbers(readings.map((r: any) => r.pH));
        const turbidityValues = getValidNumbers(readings.map((r: any) => r.turbidity));
        const tdsValues = getValidNumbers(readings.map((r: any) => r.tds));

        // Helper function to calculate statistics safely
        const calculateStats = (values: number[]) => {
          if (values.length === 0) {
            return {
              avg: 0,
              min: 0,
              max: 0,
              median: 0,
              stdDev: 0,
              count: 0,
            };
          }

          const sorted = [...values].sort((a, b) => a - b);
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          
          // Calculate median
          const mid = Math.floor(sorted.length / 2);
          const median = sorted.length % 2 === 0 
            ? ((sorted[mid - 1] || 0) + (sorted[mid] || 0)) / 2 
            : (sorted[mid] || 0);

          // Calculate standard deviation
          const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
          const stdDev = Math.sqrt(variance);

          return {
            avg: Math.round(avg * 100) / 100,
            min: Math.round((sorted[0] || 0) * 100) / 100,
            max: Math.round((sorted[sorted.length - 1] || 0) * 100) / 100,
            median: Math.round(median * 100) / 100,
            stdDev: Math.round(stdDev * 100) / 100,
            count: values.length,
          };
        };

        const phStats = calculateStats(phValues);
        const turbidityStats = calculateStats(turbidityValues);
        const tdsStats = calculateStats(tdsValues);

        // Determine device name and location with proper fallback
        // If single device or first device from multiple devices
        const deviceName = deviceInfo?.name || 
                          (deviceInfos.length > 0 ? deviceInfos[0].name : null) || 
                          parameters.deviceName || 
                          parameters.deviceId || 
                          (parameters.deviceIds && parameters.deviceIds.length > 0 ? parameters.deviceIds[0] : null) || 
                          'Unknown Device';
                          
        const deviceLocation = deviceInfo?.location || 
                              (deviceInfos.length > 0 ? deviceInfos[0].location : null) || 
                              'Not specified';
                              
        const deviceStatus = deviceInfo?.status || 
                            (deviceInfos.length > 0 ? deviceInfos[0].status : null) || 
                            'UNKNOWN';

        return {
          deviceId: parameters.deviceId || (parameters.deviceIds && parameters.deviceIds.length > 0 ? parameters.deviceIds[0] : 'multiple'),
          deviceName: deviceName,
          deviceLocation: deviceLocation,
          deviceStatus: deviceStatus,
          startDate: parameters.startDate,
          endDate: parameters.endDate,
          totalReadings: readings.length,
          readings: readings.slice(0, 50).map((r: any) => ({
            timestamp: r.timestamp,
            ph: r.pH != null ? Math.round(r.pH * 100) / 100 : null,
            turbidity: r.turbidity != null ? Math.round(r.turbidity * 100) / 100 : null,
            tds: r.tds != null ? Math.round(r.tds * 100) / 100 : null,
          })),
          alerts: alerts.map((a: any) => ({
            createdAt: a.createdAt,
            severity: a.severity,
            parameter: a.parameter,
            message: a.message,
            status: a.status,
            value: a.value,
            threshold: a.threshold,
          })),
          alertSummary: {
            total: alerts.length,
            critical: alerts.filter((a: any) => a.severity === 'CRITICAL').length,
            high: alerts.filter((a: any) => a.severity === 'HIGH').length,
            medium: alerts.filter((a: any) => a.severity === 'MEDIUM').length,
            low: alerts.filter((a: any) => a.severity === 'LOW').length,
            unacknowledged: alerts.filter((a: any) => a.status === 'Unacknowledged').length,
            acknowledged: alerts.filter((a: any) => a.status === 'Acknowledged').length,
            resolved: alerts.filter((a: any) => a.status === 'Resolved').length,
          },
          statistics: {
            ph: phStats,
            turbidity: turbidityStats,
            tds: tdsStats,
            // Legacy format for backward compatibility
            avgPh: phStats.avg,
            avgTurbidity: turbidityStats.avg,
            avgTds: tdsStats.avg,
            minPh: phStats.min,
            maxPh: phStats.max,
            minTurbidity: turbidityStats.min,
            maxTurbidity: turbidityStats.max,
            minTds: tdsStats.min,
            maxTds: tdsStats.max,
          },
        };
      }

      case ReportType.DEVICE_STATUS: {
        // Fetch all devices
        const Device = (await import('@feature/devices/device.model')).default;
        const devices = await Device.find().lean();

        const deviceData = devices.map((d: any) => ({
          deviceId: d.deviceId,
          name: d.name,
          status: d.status,
          location: d.location,
          lastHeartbeat: d.lastHeartbeat,
          uptime: 95.5, // Placeholder - calculate from historical data
        }));

        const onlineCount = devices.filter((d: any) => d.status === 'online').length;

        return {
          devices: deviceData,
          summary: {
            total: devices.length,
            online: onlineCount,
            offline: devices.length - onlineCount,
          },
        };
      }

      case ReportType.COMPLIANCE: {
        // Fetch threshold violations (alerts with severity)
        const Alert = (await import('@feature/alerts/alert.model')).default;
        const violations = await Alert.find({
          createdAt: {
            $gte: parameters.startDate,
            $lte: parameters.endDate,
          },
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();

        const severityCounts = {
          critical: violations.filter((v: any) => v.severity === 'CRITICAL').length,
          high: violations.filter((v: any) => v.severity === 'HIGH').length,
          medium: violations.filter((v: any) => v.severity === 'MEDIUM').length,
          low: violations.filter((v: any) => v.severity === 'LOW').length,
        };

        return {
          startDate: parameters.startDate,
          endDate: parameters.endDate,
          violations: violations.map((v: any) => ({
            timestamp: v.createdAt,
            deviceId: v.deviceId,
            deviceName: v.deviceName || v.deviceId,
            parameter: v.parameter,
            value: v.currentValue,
            threshold: v.thresholdValue,
            severity: v.severity,
          })),
          summary: {
            total: violations.length,
            ...severityCounts,
          },
        };
      }

      case ReportType.ALERT_SUMMARY: {
        // Fetch all alerts in date range
        const Alert = (await import('@feature/alerts/alert.model')).default;
        const alerts = await Alert.find({
          createdAt: {
            $gte: parameters.startDate,
            $lte: parameters.endDate,
          },
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();

        const statusCounts = {
          active: alerts.filter((a: any) => a.status === 'ACTIVE').length,
          acknowledged: alerts.filter((a: any) => a.status === 'ACKNOWLEDGED').length,
          resolved: alerts.filter((a: any) => a.status === 'RESOLVED').length,
        };

        const severityCounts = {
          critical: alerts.filter((a: any) => a.severity === 'CRITICAL').length,
          high: alerts.filter((a: any) => a.severity === 'HIGH').length,
          medium: alerts.filter((a: any) => a.severity === 'MEDIUM').length,
          low: alerts.filter((a: any) => a.severity === 'LOW').length,
        };

        return {
          startDate: parameters.startDate,
          endDate: parameters.endDate,
          alerts: alerts.map((a: any) => ({
            alertId: a.alertId,
            createdAt: a.createdAt,
            severity: a.severity,
            parameter: a.parameter,
            deviceId: a.deviceId,
            status: a.status,
            acknowledgedAt: a.acknowledgedAt,
            resolvedAt: a.resolvedAt,
          })),
          summary: {
            total: alerts.length,
            ...statusCounts,
            bySeverity: severityCounts,
          },
        };
      }

      default:
        throw new Error(`Unsupported report type: ${report.type}`);
    }
  }
}

export default new ReportService();

