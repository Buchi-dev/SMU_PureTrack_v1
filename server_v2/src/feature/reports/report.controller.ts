/**
 * Report Controller
 * 
 * Handles HTTP requests for report generation and management
 * 
 * @module feature/reports/report.controller
 */

import { Response } from 'express';
import reportService from './report.service';
import { asyncHandler } from '@utils/asyncHandler.util';
import { ResponseHandler } from '@utils/response.util';
import { BadRequestError, UnauthorizedError } from '@utils/errors.util';
import { IReportFilters, ReportType, ReportFormat } from './report.types';
import { Types } from 'mongoose';
import { AuthRequest } from '@core/middlewares';

/**
 * Create report request
 */
export const createReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type, title, description, format, parameters, expiresAt } = req.body;

  // Get user ID from auth middleware
  if (!req.user?.userId) {
    throw new UnauthorizedError('User authentication required');
  }

  const generatedBy = new Types.ObjectId(req.user.userId);

  const report = await reportService.createReport({
    type,
    title,
    description,
    format,
    parameters,
    generatedBy,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
  });

  ResponseHandler.created(res, report, 'Report generation started');
});

/**
 * Get all reports with filters
 */
export const getAllReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20 } = req.query;

  const filters: IReportFilters = {
    type: req.query.type as ReportType,
    status: req.query.status as any,
    format: req.query.format as ReportFormat,
    generatedBy: req.query.generatedBy as string,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
  };

  const result = await reportService.getAllReports(filters, Number(page), Number(limit));

  ResponseHandler.paginated(
    res,
    result.data,
    result.pagination,
    'Reports retrieved successfully'
  );
});

/**
 * Get current user's reports
 */
export const getMyReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20 } = req.query;

  // Get user ID from auth middleware
  if (!req.user?.userId) {
    throw new UnauthorizedError('User authentication required');
  }

  const result = await reportService.getUserReports(req.user.userId, Number(page), Number(limit));

  ResponseHandler.paginated(
    res,
    result.data,
    result.pagination,
    'Your reports retrieved successfully'
  );
});

/**
 * Get report by ID
 */
export const getReportById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Report ID is required');
  }

  const report = await reportService.getReportById(id);

  ResponseHandler.success(res, report, 'Report retrieved successfully');
});

/**
 * Download report file
 */
export const downloadReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Report ID is required');
  }

  const report = await reportService.getReportById(id);

  if (!report.file?.fileId) {
    throw new BadRequestError('Report file not available yet');
  }

  // Stream file from GridFS
  const { gridfsService } = await import('@utils');
  const stream = gridfsService.downloadFile(report.file.fileId);
  
  res.setHeader('Content-Type', report.file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${report.file.filename}"`);
  res.setHeader('Content-Length', report.file.size.toString());
  
  stream.pipe(res);
});

/**
 * Delete report
 */
export const deleteReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Report ID is required');
  }

  await reportService.deleteReport(id);

  ResponseHandler.success(res, null, 'Report deleted successfully');
});

/**
 * Get report statistics
 */
export const getReportStatistics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.query;

  const stats = await reportService.getReportStatistics(userId as string);

  ResponseHandler.success(res, stats, 'Report statistics retrieved successfully');
});

/**
 * Delete expired reports (Admin only)
 */
export const deleteExpiredReports = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const count = await reportService.deleteExpiredReports();

  ResponseHandler.success(
    res,
    { deletedCount: count },
    `${count} expired reports deleted successfully`
  );
});
