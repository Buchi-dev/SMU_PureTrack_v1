/**
 * Alert Service
 * 
 * Business logic for alert management:
 * - Threshold checking with WHO/EPA guidelines
 * - Alert creation with deduplication
 * - Cooldown validation to prevent alert spam
 * - Email notification triggering
 * - Alert lifecycle management (acknowledge, resolve)
 * - Statistics and analytics
 * 
 * @module feature/alerts/alert.service
 */

import Alert from './alert.model';
import {
  IAlertDocument,
  ICreateAlertData,
  IAlertCooldownResult,
  IAlertFilters,
  AlertSeverity,
  AlertStatus,
  AlertParameter,
} from './alert.types';
import { CRUDOperations } from '@utils/queryBuilder.util';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '@utils/errors.util';
import {
  SENSOR_THRESHOLDS,
  ALERT,
  TIME,
} from '@core/configs/constants.config';
import { ERROR_MESSAGES, LOG_MESSAGES } from '@core/configs/messages.config';
import { Types, Document } from 'mongoose';
import logger from '@utils/logger.util';
import websocketService from '@utils/websocket.service';

/**
 * Alert Service Class
 * Handles all alert-related business logic
 */
export class AlertService {
  private crud: CRUDOperations<IAlertDocument & Document>;

  constructor() {
    this.crud = new CRUDOperations<IAlertDocument & Document>(Alert as any);
  }

  /**
   * Check sensor thresholds and create/update alerts
   * Main entry point for MQTT sensor data processing
   * @param deviceId - Device identifier
   * @param deviceName - Device name
   * @param reading - Sensor reading data
   * @returns Array of created/updated alerts
   */
  async checkThresholdsAndCreateAlerts(
    deviceId: string,
    deviceName: string,
    reading: {
      pH?: number;
      turbidity?: number;
      tds?: number;
      timestamp: Date;
    }
  ): Promise<IAlertDocument[]> {
    const alerts: IAlertDocument[] = [];

    try {
      // Fetch device details to get location
      let deviceLocation = '';
      try {
        const { default: deviceService } = await import('@feature/devices/device.service');
        const device = await deviceService.getDeviceById(deviceId);
        deviceLocation = device.location || '';
      } catch (error) {
        logger.warn(`Could not fetch device location for ${deviceId}`);
      }

      // Check pH thresholds
      if (reading.pH !== undefined && reading.pH !== null) {
        const pHAlert = await this.checkpHThreshold(deviceId, deviceName, deviceLocation, reading.pH, reading.timestamp);
        if (pHAlert) alerts.push(pHAlert);
      }

      // Check turbidity thresholds
      if (reading.turbidity !== undefined && reading.turbidity !== null) {
        const turbidityAlert = await this.checkTurbidityThreshold(
          deviceId,
          deviceName,
          deviceLocation,
          reading.turbidity,
          reading.timestamp
        );
        if (turbidityAlert) alerts.push(turbidityAlert);
      }

      // Check TDS thresholds
      if (reading.tds !== undefined && reading.tds !== null) {
        const tdsAlert = await this.checkTDSThreshold(
          deviceId,
          deviceName,
          deviceLocation,
          reading.tds,
          reading.timestamp
        );
        if (tdsAlert) alerts.push(tdsAlert);
      }

      return alerts;
    } catch (error: any) {
      logger.error(LOG_MESSAGES.ALERT.THRESHOLD_CHECK_FAILED(deviceId, error.message));
      return alerts; // Return partial results
    }
  }

  /**
   * Check pH threshold
   * @private
   */
  private async checkpHThreshold(
    deviceId: string,
    deviceName: string,
    deviceLocation: string,
    value: number,
    timestamp: Date
  ): Promise<IAlertDocument | null> {
    const { critical, min, max } = SENSOR_THRESHOLDS.pH;

    // Check critical range
    if (value < critical.min || value > critical.max) {
      return this.createOrUpdateAlert(
        deviceId,
        deviceName,
        deviceLocation,
        AlertParameter.PH,
        value,
        value < critical.min ? critical.min : critical.max,
        AlertSeverity.CRITICAL,
        timestamp
      );
    }

    // Check warning range
    if (value < min || value > max) {
      return this.createOrUpdateAlert(
        deviceId,
        deviceName,
        deviceLocation,
        AlertParameter.PH,
        value,
        value < min ? min : max,
        AlertSeverity.WARNING,
        timestamp
      );
    }

    return null;
  }

  /**
   * Check turbidity threshold
   * @private
   */
  private async checkTurbidityThreshold(
    deviceId: string,
    deviceName: string,
    deviceLocation: string,
    value: number,
    timestamp: Date
  ): Promise<IAlertDocument | null> {
    const { critical, warning } = SENSOR_THRESHOLDS.turbidity;

    // Check critical level
    if (value > critical) {
      return this.createOrUpdateAlert(
        deviceId,
        deviceName,
        deviceLocation,
        AlertParameter.TURBIDITY,
        value,
        critical,
        AlertSeverity.CRITICAL,
        timestamp
      );
    }

    // Check warning level
    if (value > warning) {
      return this.createOrUpdateAlert(
        deviceId,
        deviceName,
        deviceLocation,
        AlertParameter.TURBIDITY,
        value,
        warning,
        AlertSeverity.WARNING,
        timestamp
      );
    }

    return null;
  }

  /**
   * Check TDS threshold
   * @private
   */
  private async checkTDSThreshold(
    deviceId: string,
    deviceName: string,
    deviceLocation: string,
    value: number,
    timestamp: Date
  ): Promise<IAlertDocument | null> {
    const { critical, warning } = SENSOR_THRESHOLDS.tds;

    // Check critical level
    if (value > critical) {
      return this.createOrUpdateAlert(
        deviceId,
        deviceName,
        deviceLocation,
        AlertParameter.TDS,
        value,
        critical,
        AlertSeverity.CRITICAL,
        timestamp
      );
    }

    // Check warning level
    if (value > warning) {
      return this.createOrUpdateAlert(
        deviceId,
        deviceName,
        deviceLocation,
        AlertParameter.TDS,
        value,
        warning,
        AlertSeverity.WARNING,
        timestamp
      );
    }

    return null;
  }

  /**
   * Create or update alert with cooldown and deduplication
   * Uses atomic operations to prevent race conditions
   * @private
   */
  private async createOrUpdateAlert(
    deviceId: string,
    deviceName: string,
    deviceLocation: string,
    parameter: AlertParameter,
    value: number,
    threshold: number,
    severity: AlertSeverity,
    timestamp: Date
  ): Promise<IAlertDocument | null> {
    // Check cooldown
    const cooldownResult = await this.checkAlertCooldown(deviceId, parameter, severity);

    if (!cooldownResult.canCreateAlert && cooldownResult.activeAlert) {
      // Update existing alert occurrence count atomically
      const updatedAlert = await Alert.findByIdAndUpdate(
        cooldownResult.activeAlert._id,
        {
          $set: {
            lastOccurrence: timestamp,
            currentValue: value,
            updatedAt: new Date(),
          },
          $inc: { occurrenceCount: 1 },
        },
        { new: true } // Return updated document
      );

      return updatedAlert;
    }

    // Create new alert
    const message = this.generateAlertMessage(parameter, value, threshold, severity);

    const alertData: ICreateAlertData = {
      deviceId,
      deviceName,
      deviceLocation,
      severity,
      parameter,
      value,
      threshold,
      message,
      timestamp,
      currentValue: value,
    };

    const newAlert = await this.crud.create(alertData as any);

    // 🔥 Broadcast new alert via WebSocket for real-time notifications
    websocketService.broadcastNewAlert(newAlert);
    logger.info(`📡 WebSocket: Broadcasted new ${severity} alert for ${deviceId}`);

    // Trigger email notification asynchronously (don't await to avoid blocking)
    this.triggerEmailNotification(newAlert).catch((error) => {
      logger.error(LOG_MESSAGES.EMAIL.SEND_FAILED(error.message));
    });

    return newAlert;
  }

  /**
   * Check if alert can be created based on cooldown period
   * Prevents alert spam for the same issue
   */
  async checkAlertCooldown(
    deviceId: string,
    parameter: AlertParameter,
    severity: AlertSeverity
  ): Promise<IAlertCooldownResult> {
    const cooldownMinutes = ALERT.COOLDOWN[severity] || ALERT.DEFAULT_COOLDOWN;
    const cooldownMs = cooldownMinutes * TIME.ONE_MINUTE;

    // Find active alert within cooldown period (exclude soft-deleted)
    const activeAlert = await Alert.findOne({
      deviceId,
      parameter,
      acknowledged: false, // Only check unacknowledged alerts
      isDeleted: { $ne: true }, // Exclude soft-deleted alerts
      createdAt: { $gte: new Date(Date.now() - cooldownMs) },
    }).sort({ createdAt: -1 }); // Get most recent

    if (activeAlert) {
      const timeElapsed = Date.now() - activeAlert.createdAt.getTime();
      const timeRemaining = cooldownMs - timeElapsed;
      const minutesRemaining = Math.ceil(timeRemaining / TIME.ONE_MINUTE);

      return {
        canCreateAlert: false,
        existingAlertId: activeAlert._id,
        minutesRemaining,
        message: `Alert cooldown active. ${minutesRemaining} minutes remaining.`,
        activeAlert: activeAlert as IAlertDocument,
      };
    }

    return { canCreateAlert: true };
  }

  /**
   * Generate alert message based on parameter and severity
   * @private
   */
  private generateAlertMessage(
    parameter: AlertParameter,
    value: number,
    threshold: number,
    severity: AlertSeverity
  ): string {
    const parameterName = parameter === AlertParameter.PH ? 'pH' : parameter;
    const comparison = value > threshold ? 'above' : 'below';
    
    return `${severity} Alert: ${parameterName} level ${comparison} threshold. Current: ${value.toFixed(2)}, Threshold: ${threshold.toFixed(2)}`;
  }

  /**
   * Trigger email notification for alert
   * Queues email for async processing
   * @private
   */
  private async triggerEmailNotification(alert: IAlertDocument): Promise<void> {
    logger.info(LOG_MESSAGES.EMAIL.QUEUED(alert.alertId));
    
    // Send email notification via email service
    const emailService = (await import('@utils/email.service')).default;
    await emailService.sendAlertNotification(alert);
  }

  /**
   * Get alert by ID
   */
  async getAlertById(id: string): Promise<IAlertDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('Alert ID'));
    }

    const alert = await this.crud.findById(id, {
      populate: ['acknowledgedBy', 'resolvedBy'] as any,
    });

    if (!alert) {
      throw new NotFoundError(ERROR_MESSAGES.RESOURCES.NOT_FOUND('Alert', id));
    }

    return alert;
  }

  /**
   * Get all alerts with filters and pagination
   * Excludes soft-deleted alerts by default
   */
  async getAllAlerts(filters: IAlertFilters, page = 1, limit = 50) {
    const query = this.crud.query();

    // Exclude soft-deleted alerts
    query.filter({ isDeleted: { $ne: true } });

    // Apply filters
    if (filters.deviceId) query.filter({ deviceId: filters.deviceId });
    if (filters.severity) query.filter({ severity: filters.severity });
    if (filters.status) query.filter({ status: filters.status });
    if (filters.parameter) query.filter({ parameter: filters.parameter });
    if (filters.acknowledged !== undefined) query.filter({ acknowledged: filters.acknowledged });

    // Date range
    if (filters.startDate || filters.endDate) {
      query.dateRange('timestamp', filters.startDate, filters.endDate);
    }

    // Pagination and sorting
    query.paginate(page, limit).sortBy('-timestamp');

    // Populate user references
    query.populateFields(['acknowledgedBy', 'resolvedBy'] as any);

    return query.execute();
  }

  /**
   * Acknowledge alert
   * Uses atomic operation to prevent race conditions
   */
  async acknowledgeAlert(id: string, userId: Types.ObjectId): Promise<IAlertDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('Alert ID'));
    }

    // Check if alert exists and validate status
    const alert = await this.crud.findById(id);
    if (!alert) {
      throw new NotFoundError(ERROR_MESSAGES.RESOURCES.NOT_FOUND('Alert', id));
    }

    if (alert.status === AlertStatus.ACKNOWLEDGED) {
      throw new ConflictError(ERROR_MESSAGES.ALERT.ALREADY_ACKNOWLEDGED(id));
    }

    if (alert.status === AlertStatus.RESOLVED) {
      throw new ConflictError(ERROR_MESSAGES.ALERT.ALREADY_RESOLVED(id));
    }

    // Atomic update
    const updatedAlert = await Alert.findByIdAndUpdate(
      id,
      {
        $set: {
          status: AlertStatus.ACKNOWLEDGED,
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
        },
      },
      {
        new: true,
        populate: [
          { path: 'acknowledgedBy', select: 'displayName email' },
          { path: 'resolvedBy', select: 'displayName email' },
        ],
      }
    );

    if (!updatedAlert) {
      throw new NotFoundError(ERROR_MESSAGES.RESOURCES.NOT_FOUND('Alert', id));
    }

    return updatedAlert;
  }

  /**
   * Resolve alert
   * Uses atomic operation to prevent race conditions
   */
  async resolveAlert(
    id: string,
    userId: Types.ObjectId,
    resolutionNotes?: string
  ): Promise<IAlertDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('Alert ID'));
    }

    // Check if alert exists and validate status
    const alert = await this.crud.findById(id);
    if (!alert) {
      throw new NotFoundError(ERROR_MESSAGES.RESOURCES.NOT_FOUND('Alert', id));
    }

    if (alert.status === AlertStatus.RESOLVED) {
      throw new ConflictError(ERROR_MESSAGES.ALERT.ALREADY_RESOLVED(id));
    }

    // Atomic update
    const updatedAlert = await Alert.findByIdAndUpdate(
      id,
      {
        $set: {
          status: AlertStatus.RESOLVED,
          acknowledged: true, // Resolved implies acknowledged
          resolvedAt: new Date(),
          resolvedBy: userId,
          ...(resolutionNotes && { resolutionNotes }),
          // Set acknowledgedAt/By if not already set
          ...((!alert.acknowledgedAt) && {
            acknowledgedAt: new Date(),
            acknowledgedBy: userId,
          }),
        },
      },
      {
        new: true,
        populate: [
          { path: 'acknowledgedBy', select: 'displayName email' },
          { path: 'resolvedBy', select: 'displayName email' },
        ],
      }
    );

    if (!updatedAlert) {
      throw new NotFoundError(ERROR_MESSAGES.RESOURCES.NOT_FOUND('Alert', id));
    }

    // 🔥 Broadcast alert resolution via WebSocket
    websocketService.broadcastAlertResolved(id, updatedAlert.deviceId);
    logger.info(`📡 WebSocket: Broadcasted alert resolution for ${updatedAlert.deviceId}`);

    return updatedAlert;
  }

  /**
   * Resolve all unresolved alerts (unacknowledged or acknowledged)
   * @param userId - User performing the bulk resolve
   * @param resolutionNotes - Optional notes for bulk resolution
   * @param filters - Optional filters to limit which alerts to resolve
   * @returns Number of alerts resolved
   */
  async resolveAllAlerts(
    userId: Types.ObjectId,
    resolutionNotes?: string,
    filters?: Partial<IAlertFilters>
  ): Promise<{ resolvedCount: number; alerts: IAlertDocument[] }> {
    // Build query to find all unresolved alerts
    const query: any = {
      status: { $in: [AlertStatus.UNACKNOWLEDGED, AlertStatus.ACKNOWLEDGED] },
    };

    // Apply optional filters
    if (filters?.severity) {
      query.severity = filters.severity;
    }
    if (filters?.parameter) {
      query.parameter = filters.parameter;
    }
    if (filters?.deviceId) {
      query.deviceId = filters.deviceId;
    }

    // Find all matching alerts
    const alertsToResolve = await Alert.find(query);
    
    if (alertsToResolve.length === 0) {
      return { resolvedCount: 0, alerts: [] };
    }

    // Bulk update all alerts
    const now = new Date();
    const updateResult = await Alert.updateMany(
      query,
      {
        $set: {
          status: AlertStatus.RESOLVED,
          acknowledged: true,
          resolvedAt: now,
          resolvedBy: userId,
          ...(resolutionNotes && { resolutionNotes }),
          // Set acknowledgedAt/By if not already set
          acknowledgedAt: now,
          acknowledgedBy: userId,
        },
      }
    );

    // Fetch and return updated alerts
    const updatedAlerts = await Alert.find({ _id: { $in: alertsToResolve.map(a => a._id) } })
      .populate('acknowledgedBy', 'displayName email')
      .populate('resolvedBy', 'displayName email');

    logger.info(`Bulk resolve: ${updateResult.modifiedCount} alerts resolved by user ${userId}`);

    return {
      resolvedCount: updateResult.modifiedCount,
      alerts: updatedAlerts,
    };
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(deviceId?: string): Promise<any> {
    const matchStage: any = {};
    if (deviceId) matchStage.deviceId = deviceId;

    const stats = await Alert.aggregate([
      { $match: matchStage },
      {
        $facet: {
          bySeverity: [
            {
              $group: {
                _id: '$severity',
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
          byParameter: [
            {
              $group: {
                _id: '$parameter',
                count: { $sum: 1 },
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const result = stats[0];

    // Return data in the format the frontend expects (arrays)
    return {
      total: result.total[0]?.count || 0,
      bySeverity: result.bySeverity || [],
      byStatus: result.byStatus || [],
      byParameter: result.byParameter || [],
    };
  }

  /**
   * Delete alert (soft delete recommended, but implementing hard delete as per V1)
   */
  async deleteAlert(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('Alert ID'));
    }

    const deleted = await this.crud.deleteById(id);
    if (!deleted) {
      throw new NotFoundError(ERROR_MESSAGES.RESOURCES.NOT_FOUND('Alert', id));
    }
  }
}

export default new AlertService();

