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
        // Fetch sensor readings for device in date range
        const SensorReading = (await import('@feature/sensorReadings/sensorReading.model')).default;
        const readings = await SensorReading.find({
          deviceId: parameters.deviceId,
          timestamp: {
            $gte: parameters.startDate,
            $lte: parameters.endDate,
          },
        })
          .sort({ timestamp: -1 })
          .limit(100)
          .lean();

        // Calculate statistics
        const phValues = readings.map((r: any) => r.ph).filter((v: number) => v != null);
        const turbidityValues = readings.map((r: any) => r.turbidity).filter((v: number) => v != null);
        const tdsValues = readings.map((r: any) => r.tds).filter((v: number) => v != null);

        return {
          deviceId: parameters.deviceId,
          deviceName: parameters.deviceName || parameters.deviceId,
          startDate: parameters.startDate,
          endDate: parameters.endDate,
          readings: readings.map((r: any) => ({
            timestamp: r.timestamp,
            ph: r.ph,
            turbidity: r.turbidity,
            tds: r.tds,
          })),
          statistics: {
            avgPh: phValues.reduce((a: number, b: number) => a + b, 0) / phValues.length || 0,
            avgTurbidity: turbidityValues.reduce((a: number, b: number) => a + b, 0) / turbidityValues.length || 0,
            avgTds: tdsValues.reduce((a: number, b: number) => a + b, 0) / tdsValues.length || 0,
            minPh: Math.min(...phValues) || 0,
            maxPh: Math.max(...phValues) || 0,
            minTurbidity: Math.min(...turbidityValues) || 0,
            maxTurbidity: Math.max(...turbidityValues) || 0,
            minTds: Math.min(...tdsValues) || 0,
            maxTds: Math.max(...tdsValues) || 0,
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

