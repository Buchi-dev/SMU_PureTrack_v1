/**
 * Alert Controller
 * HTTP request handlers for alert management endpoints
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '@core/middlewares';
import alertService from './alert.service';
import { ResponseHandler } from '@utils/response.util';
import { asyncHandler } from '@utils/asyncHandler.util';
import { SUCCESS_MESSAGES } from '@core/configs/messages.config';

/**
 * Get all alerts with filters
 * @route GET /api/v1/alerts
 */
export const getAllAlerts = asyncHandler(async (req: Request, res: Response) => {
  const {
    deviceId,
    severity,
    status,
    parameter,
    acknowledged,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = req.query;

  const filters = {
    ...(deviceId && { deviceId: deviceId as string }),
    ...(severity && { severity: severity as any }),
    ...(status && { status: status as any }),
    ...(parameter && { parameter: parameter as any }),
    ...(acknowledged !== undefined && { acknowledged: acknowledged === 'true' }),
    ...(startDate && { startDate: new Date(startDate as string) }),
    ...(endDate && { endDate: new Date(endDate as string) }),
  };

  const result = await alertService.getAllAlerts(
    filters,
    Number(page),
    Number(limit)
  );

  const alertsData = result.data.map((alert) => alert.toPublicProfile());

  ResponseHandler.paginated(res, alertsData, result.pagination);
});

/**
 * Get alert by ID
 * @route GET /api/v1/alerts/:id
 */
export const getAlertById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    throw new Error('Alert ID is required');
  }

  const alert = await alertService.getAlertById(id);

  ResponseHandler.success(res, alert.toPublicProfile());
});

/**
 * Acknowledge alert
 * @route PATCH /api/v1/alerts/:id/acknowledge
 */
export const acknowledgeAlert = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    throw new Error('Alert ID is required');
  }
  
  const userId = new Types.ObjectId(req.user!.userId);

  const alert = await alertService.acknowledgeAlert(id, userId);

  ResponseHandler.success(
    res,
    alert.toPublicProfile(),
    SUCCESS_MESSAGES.ALERT.ACKNOWLEDGED(id)
  );
});

/**
 * Resolve alert
 * @route PATCH /api/v1/alerts/:id/resolve
 */
export const resolveAlert = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    throw new Error('Alert ID is required');
  }
  
  const { resolutionNotes } = req.body;
  const userId = new Types.ObjectId(req.user!.userId);

  const alert = await alertService.resolveAlert(id, userId, resolutionNotes);

  ResponseHandler.success(
    res,
    alert.toPublicProfile(),
    SUCCESS_MESSAGES.ALERT.RESOLVED(id)
  );
});

/**
 * Resolve all alerts
 * @route PATCH /api/v1/alerts/resolve-all
 */
export const resolveAllAlerts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { resolutionNotes, filters } = req.body;
  const userId = new Types.ObjectId(req.user!.userId);

  const result = await alertService.resolveAllAlerts(userId, resolutionNotes, filters);

  ResponseHandler.success(
    res,
    {
      resolvedCount: result.resolvedCount,
      alerts: result.alerts.map(alert => alert.toPublicProfile()),
    },
    `Successfully resolved ${result.resolvedCount} alert(s)`
  );
});

/**
 * Get alert statistics
 * @route GET /api/v1/alerts/statistics
 */
export const getAlertStatistics = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.query;

  const stats = await alertService.getAlertStatistics(deviceId as string | undefined);

  ResponseHandler.success(res, stats);
});

/**
 * Delete alert
 * @route DELETE /api/v1/alerts/:id
 */
export const deleteAlert = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    throw new Error('Alert ID is required');
  }

  await alertService.deleteAlert(id);

  ResponseHandler.success(res, null, SUCCESS_MESSAGES.ALERT.DELETED(id));
});

/**
 * Get alerts by device
 * @route GET /api/v1/alerts/device/:deviceId
 */
export const getAlertsByDevice = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const result = await alertService.getAllAlerts(
    { deviceId },
    Number(page),
    Number(limit)
  );

  const alertsData = result.data.map((alert) => alert.toPublicProfile());

  ResponseHandler.paginated(res, alertsData, result.pagination);
});

/**
 * Get unacknowledged alerts count
 * @route GET /api/v1/alerts/unacknowledged/count
 */
export const getUnacknowledgedCount = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.query;

  const stats = await alertService.getAlertStatistics(deviceId as string | undefined);

  ResponseHandler.success(res, {
    count: stats.byStatus.unacknowledged,
    deviceId: deviceId || 'all',
  });
});
