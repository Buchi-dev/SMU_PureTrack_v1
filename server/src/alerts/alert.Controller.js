const Alert = require('./alert.Model');

/**
 * Get all alerts with filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllAlerts = async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: alerts.map(alert => alert.toPublicProfile()),
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('[Alert Controller] Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message,
    });
  }
};

/**
 * Get alert by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('acknowledgedBy', 'displayName email')
      .populate('resolvedBy', 'displayName email');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    res.json({
      success: true,
      data: alert.toPublicProfile(),
    });
  } catch (error) {
    console.error('[Alert Controller] Error fetching alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alert',
      error: error.message,
    });
  }
};

/**
 * Acknowledge alert
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const acknowledgeAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    // Check if already acknowledged or resolved
    if (alert.status === 'Acknowledged') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already acknowledged',
      });
    }

    if (alert.status === 'Resolved') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already resolved',
      });
    }

    // Update alert
    alert.status = 'Acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = req.user._id;
    await alert.save();

    // Populate user data
    await alert.populate('acknowledgedBy', 'displayName email');

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: alert.toPublicProfile(),
    });
  } catch (error) {
    console.error('[Alert Controller] Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error acknowledging alert',
      error: error.message,
    });
  }
};

/**
 * Resolve alert
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resolveAlert = async (req, res) => {
  try {
    const { resolutionNotes } = req.body;

    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    // Check if already resolved
    if (alert.status === 'Resolved') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already resolved',
      });
    }

    // Update alert
    alert.status = 'Resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = req.user._id;
    if (resolutionNotes) {
      alert.resolutionNotes = resolutionNotes;
    }
    await alert.save();

    // Populate user data
    await alert.populate('acknowledgedBy', 'displayName email');
    await alert.populate('resolvedBy', 'displayName email');

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      data: alert.toPublicProfile(),
    });
  } catch (error) {
    console.error('[Alert Controller] Error resolving alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving alert',
      error: error.message,
    });
  }
};

/**
 * Create alert (called by sensor data processor)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createAlert = async (req, res) => {
  try {
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
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Check if alert already exists
    const existingAlert = await Alert.findOne({ alertId });
    if (existingAlert) {
      return res.status(409).json({
        success: false,
        message: 'Alert already exists',
        data: existingAlert.toPublicProfile(),
      });
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

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: alert.toPublicProfile(),
    });
  } catch (error) {
    console.error('[Alert Controller] Error creating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating alert',
      error: error.message,
    });
  }
};

/**
 * Delete alert (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    console.error('[Alert Controller] Error deleting alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting alert',
      error: error.message,
    });
  }
};

/**
 * Get alert statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAlertStats = async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: {
        byStatus: stats,
        bySeverity: severityStats,
      },
    });
  } catch (error) {
    console.error('[Alert Controller] Error fetching alert stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alert statistics',
      error: error.message,
    });
  }
};

module.exports = {
  getAllAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  createAlert,
  deleteAlert,
  getAlertStats,
};
