const Alert = require('./alert.Model');
const logger = require('../utils/logger');
const { NotFoundError, ConflictError, ValidationError } = require('../errors');
const ResponseHelper = require('../utils/responses');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Get all alerts with filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllAlerts = asyncHandler(async (req, res) => {
  const { 
    deviceId, 
    severity, 
    status, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 50 
  } = req.query;

  // Build filter object
  const filter = {};
  if (deviceId) filter.deviceId = deviceId;
  if (severity) filter.severity = severity;
  if (status) filter.status = status;

  // Date range filter
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const alerts = await Alert.find(filter)
    .populate('acknowledgedBy', 'displayName email')
    .populate('resolvedBy', 'displayName email')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ timestamp: -1 });

  const count = await Alert.countDocuments(filter);

  ResponseHelper.paginated(res, alerts.map(alert => alert.toPublicProfile()), {
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit),
    limit: parseInt(limit),
  });
});

/**
 * Get alert by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAlertById = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id)
    .populate('acknowledgedBy', 'displayName email')
    .populate('resolvedBy', 'displayName email');

  if (!alert) {
    throw new NotFoundError('Alert', req.params.id);
  }

  ResponseHelper.success(res, alert.toPublicProfile());
});

/**
 * Acknowledge alert
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const acknowledgeAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);

  if (!alert) {
    throw new NotFoundError('Alert', req.params.id);
  }

  // Check if already acknowledged or resolved
  if (alert.status === 'Acknowledged') {
    throw ConflictError.alertAlreadyAcknowledged();
  }

  if (alert.status === 'Resolved') {
    throw ConflictError.alertAlreadyResolved();
  }

  // Update alert
  alert.status = 'Acknowledged';
  alert.acknowledged = true;  // ✅ Set boolean flag for deduplication
  alert.acknowledgedAt = new Date();
  alert.acknowledgedBy = req.user._id;
  await alert.save();

  // Populate user data
  await alert.populate('acknowledgedBy', 'displayName email');

  ResponseHelper.success(res, alert.toPublicProfile(), 'Alert acknowledged successfully');
});

/**
 * Resolve alert
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resolveAlert = asyncHandler(async (req, res) => {
  const { resolutionNotes } = req.body;

  const alert = await Alert.findById(req.params.id);

  if (!alert) {
    throw new NotFoundError('Alert', req.params.id);
  }

  // Check if already resolved
  if (alert.status === 'Resolved') {
    throw ConflictError.alertAlreadyResolved();
  }

  // Update alert
  alert.status = 'Resolved';
  alert.acknowledged = true;  // ✅ Set boolean flag for deduplication
  alert.resolvedAt = new Date();
  alert.resolvedBy = req.user._id;
  if (resolutionNotes) {
    alert.resolutionNotes = resolutionNotes;
  }
  await alert.save();

  // Populate user data
  await alert.populate('acknowledgedBy', 'displayName email');
  await alert.populate('resolvedBy', 'displayName email');

  ResponseHelper.success(res, alert.toPublicProfile(), 'Alert resolved successfully');
});

/**
 * Create alert (called by sensor data processor)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createAlert = asyncHandler(async (req, res) => {
  const {
    alertId,
    deviceId,
    deviceName,
    severity,
    parameter,
    value,
    threshold,
    message,
    timestamp,
  } = req.body;

  // Validate required fields
  if (!alertId || !deviceId || !deviceName || !severity || !parameter || value === undefined || !threshold || !message || !timestamp) {
    throw new ValidationError('Missing required fields for alert creation');
  }

  // Check if alert already exists
  const existingAlert = await Alert.findOne({ alertId });
  if (existingAlert) {
    throw ConflictError.alertAlreadyExists(alertId);
  }

  // Create new alert
  const alert = new Alert({
    alertId,
    deviceId,
    deviceName,
    severity,
    parameter,
    value,
    threshold,
    message,
    timestamp: new Date(timestamp),
  });

  await alert.save();

  ResponseHelper.created(res, alert.toPublicProfile(), 'Alert created successfully');
});

/**
 * Delete alert (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findByIdAndDelete(req.params.id);

  if (!alert) {
    throw new NotFoundError('Alert', req.params.id);
  }

  ResponseHelper.success(res, null, 'Alert deleted successfully');
});

/**
 * Get alert statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAlertStats = asyncHandler(async (req, res) => {
  const stats = await Alert.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const severityStats = await Alert.aggregate([
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 },
      },
    },
  ]);

  ResponseHelper.success(res, {
    byStatus: stats,
    bySeverity: severityStats,
  });
});

module.exports = {
  getAllAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  createAlert,
  deleteAlert,
  getAlertStats,
};
