const Report = require('./report.Model');
const { Device, SensorReading } = require('../devices/device.Model');
const Alert = require('../alerts/alert.Model');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const gridFSService = require('../utils/gridfs.service');
const { generateWaterQualityReportPDF } = require('../utils/pdfGenerator');
const crypto = require('crypto');

/**
 * Generate Water Quality Report
 * Aggregates sensor readings, alerts, and compliance metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateWaterQualityReport = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { startDate, endDate, deviceIds } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Create report document
    const reportId = uuidv4();
    const report = new Report({
      reportId,
      type: 'water-quality',
      title: `Water Quality Report (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`,
      generatedBy: req.user._id,
      startDate: start,
      endDate: end,
      status: 'generating',
    });
    await report.save();

    // Build device filter
    const deviceFilter = deviceIds && deviceIds.length > 0 
      ? { deviceId: { $in: deviceIds } }
      : {};

    // Get devices
    const devices = await Device.find(deviceFilter);
    const deviceIdList = devices.map(d => d.deviceId);

    // Aggregate sensor readings by device
    const readingsAggregation = await SensorReading.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIdList },
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$deviceId',
          count: { $sum: 1 },
          avgPH: { $avg: '$pH' },
          minPH: { $min: '$pH' },
          maxPH: { $max: '$pH' },
          avgTurbidity: { $avg: '$turbidity' },
          minTurbidity: { $min: '$turbidity' },
          maxTurbidity: { $max: '$turbidity' },
          avgTDS: { $avg: '$tds' },
          minTDS: { $min: '$tds' },
          maxTDS: { $max: '$tds' },
        },
      },
    ]);

    // Get alerts for period
    const alerts = await Alert.find({
      deviceId: { $in: deviceIdList },
      timestamp: { $gte: start, $lte: end },
    });

    // Calculate compliance metrics (WHO guidelines)
    const complianceMetrics = {
      pH: {
        guideline: '6.5 - 8.5',
        minAcceptable: 6.5,
        maxAcceptable: 8.5,
      },
      turbidity: {
        guideline: '< 5 NTU',
        maxAcceptable: 5,
      },
      tds: {
        guideline: '< 500 ppm',
        maxAcceptable: 500,
      },
    };

    // Build device reports
    const deviceReports = readingsAggregation.map(agg => {
      const device = devices.find(d => d.deviceId === agg._id);
      const deviceAlerts = alerts.filter(a => a.deviceId === agg._id);

      // Calculate compliance
      const pHCompliant = agg.avgPH >= complianceMetrics.pH.minAcceptable && 
                          agg.avgPH <= complianceMetrics.pH.maxAcceptable;
      const turbidityCompliant = agg.avgTurbidity < complianceMetrics.turbidity.maxAcceptable;
      const tdsCompliant = agg.avgTDS < complianceMetrics.tds.maxAcceptable;

      return {
        deviceId: agg._id,
        deviceName: device?.location || agg._id,
        readingCount: agg.count,
        parameters: {
          pH: {
            avg: parseFloat(agg.avgPH.toFixed(2)),
            min: parseFloat(agg.minPH.toFixed(2)),
            max: parseFloat(agg.maxPH.toFixed(2)),
            compliant: pHCompliant,
          },
          turbidity: {
            avg: parseFloat(agg.avgTurbidity.toFixed(2)),
            min: parseFloat(agg.minTurbidity.toFixed(2)),
            max: parseFloat(agg.maxTurbidity.toFixed(2)),
            compliant: turbidityCompliant,
          },
          tds: {
            avg: parseFloat(agg.avgTDS.toFixed(2)),
            min: parseFloat(agg.minTDS.toFixed(2)),
            max: parseFloat(agg.maxTDS.toFixed(2)),
            compliant: tdsCompliant,
          },
        },
        alerts: {
          total: deviceAlerts.length,
          critical: deviceAlerts.filter(a => a.severity === 'Critical').length,
          warning: deviceAlerts.filter(a => a.severity === 'Warning').length,
          advisory: deviceAlerts.filter(a => a.severity === 'Advisory').length,
        },
        overallCompliance: pHCompliant && turbidityCompliant && tdsCompliant,
      };
    });

    // Calculate summary statistics
    const totalReadings = readingsAggregation.reduce((sum, agg) => sum + agg.count, 0);
    const compliantDevices = deviceReports.filter(d => d.overallCompliance).length;
    const complianceRate = devices.length > 0 
      ? parseFloat(((compliantDevices / devices.length) * 100).toFixed(2))
      : 0;

    const summary = {
      totalDevices: devices.length,
      totalReadings,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'Critical').length,
      warningAlerts: alerts.filter(a => a.severity === 'Warning').length,
      advisoryAlerts: alerts.filter(a => a.severity === 'Advisory').length,
      compliantDevices,
      complianceRate,
    };

    // Update report
    report.status = 'completed';
    report.data = {
      devices: deviceReports,
      complianceGuidelines: complianceMetrics,
    };
    report.summary = summary;
    report.metadata = {
      deviceCount: devices.length,
      alertCount: alerts.length,
      readingCount: totalReadings,
      processingTime: Date.now() - startTime,
    };

    // Generate PDF and store in GridFS
    try {
      logger.info('[Report Controller] Generating PDF for report', { reportId: report.reportId });

      // Prepare data for PDF generation (transform to match client-side format)
      const pdfReportData = {
        devices: deviceReports.map(device => ({
          device: { deviceId: device.deviceId, name: device.deviceName },
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          location: device.deviceName, // Using deviceName as location for now
          readingCount: device.readingCount,
          metrics: {
            turbidity: { value: device.parameters.turbidity.avg, status: device.parameters.turbidity.compliant ? 'good' : 'poor' },
            tds: { value: device.parameters.tds.avg, status: device.parameters.tds.compliant ? 'good' : 'poor' },
            ph: { value: device.parameters.pH.avg, status: device.parameters.pH.compliant ? 'good' : 'poor' },
            totalReadings: device.readingCount,
            avgTurbidity: device.parameters.turbidity.avg,
            avgTDS: device.parameters.tds.avg,
            avgPH: device.parameters.pH.avg,
            minTurbidity: device.parameters.turbidity.min,
            maxTurbidity: device.parameters.turbidity.max,
            minTDS: device.parameters.tds.min,
            maxTDS: device.parameters.tds.max,
            minPH: device.parameters.pH.min,
            maxPH: device.parameters.pH.max,
          },
          alerts: [], // Could populate with actual alerts if needed
        })),
        summary: {
          totalReadings: summary.totalReadings,
          avgTurbidity: summary.avgTurbidity,
          avgTDS: summary.avgTDS,
          avgPH: summary.avgPH,
          averageTurbidity: summary.avgTurbidity,
          averageTDS: summary.avgTDS,
          averagePH: summary.avgPH,
        }
      };

      // Create report config for PDF generation
      const reportConfig = {
        type: 'water_quality',
        title: report.title,
        deviceIds: deviceIdList,
        dateRange: [start, end],
        generatedBy: 'System',
        notes: '',
        includeStatistics: true,
        includeRawData: false,
        includeCharts: false,
      };

      // Generate PDF buffer
      const pdfBuffer = generateWaterQualityReportPDF(reportConfig, pdfReportData);

      // Calculate checksum
      const checksum = crypto.createHash('md5').update(pdfBuffer).digest('hex');

      // Store PDF in GridFS
      const filename = `water_quality_report_${reportId}.pdf`;
      const gridFSResult = await gridFSService.storeFile(pdfBuffer, {
        filename,
        contentType: 'application/pdf',
        metadata: {
          reportId: report.reportId,
          reportType: report.type,
          generatedBy: req.user._id.toString(),
          checksum,
          deviceCount: devices.length,
          readingCount: totalReadings,
        }
      });

      // Update report with GridFS information
      report.gridFsFileId = gridFSResult.fileId;
      report.fileSize = gridFSResult.size;
      report.fileChecksum = checksum;

      logger.info('[Report Controller] PDF stored in GridFS', {
        reportId: report.reportId,
        gridFsFileId: gridFSResult.fileId,
        fileSize: gridFSResult.size
      });

    } catch (pdfError) {
      logger.error('[Report Controller] Error generating/storing PDF', {
        reportId: report.reportId,
        error: pdfError.message,
        stack: pdfError.stack
      });
      // Don't fail the entire report generation if PDF fails
      report.error = `Report generated but PDF creation failed: ${pdfError.message}`;
    }

    await report.save();

    // Populate generatedBy
    await report.populate('generatedBy', 'displayName email');

    res.json({
      success: true,
      message: 'Water quality report generated successfully',
      data: report.toPublicProfile(),
    });
  } catch (error) {
    logger.error('[Report Controller] Error generating water quality report', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    
    // Try to update report status to failed if it exists
    try {
      const failedReport = await Report.findOne({ reportId: req.body.reportId || '' });
      if (failedReport) {
        failedReport.status = 'failed';
        failedReport.error = error.message;
        await failedReport.save();
      }
    } catch (updateError) {
      logger.error('[Report Controller] Error updating failed report', {
        error: updateError.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error generating water quality report',
      error: error.message,
    });
  }
};

/**
 * Generate Device Status Report
 * Aggregates device health metrics, uptime, and connectivity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateDeviceStatusReport = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { startDate, endDate, deviceIds } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Create report document
    const reportId = uuidv4();
    const report = new Report({
      reportId,
      type: 'device-status',
      title: `Device Status Report (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`,
      generatedBy: req.user._id,
      startDate: start,
      endDate: end,
      status: 'generating',
    });
    await report.save();

    // Build device filter
    const deviceFilter = deviceIds && deviceIds.length > 0 
      ? { deviceId: { $in: deviceIds } }
      : {};

    // Get devices
    const devices = await Device.find(deviceFilter);
    const deviceIdList = devices.map(d => d.deviceId);

    // Get reading counts per device
    const readingCounts = await SensorReading.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIdList },
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$deviceId',
          count: { $sum: 1 },
          firstReading: { $min: '$timestamp' },
          lastReading: { $max: '$timestamp' },
        },
      },
    ]);

    // Get alerts per device
    const alertCounts = await Alert.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIdList },
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$deviceId',
          totalAlerts: { $sum: 1 },
          criticalAlerts: {
            $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] },
          },
        },
      },
    ]);

    // Build device status reports
    const deviceReports = devices.map(device => {
      const readings = readingCounts.find(r => r._id === device.deviceId);
      const alerts = alertCounts.find(a => a._id === device.deviceId);

      // Calculate uptime (simplified - based on reading frequency)
      const periodMs = end.getTime() - start.getTime();
      const expectedReadings = periodMs / (60 * 1000); // Assuming 1 reading per minute
      const actualReadings = readings?.count || 0;
      const uptimePercentage = readings 
        ? parseFloat(Math.min((actualReadings / expectedReadings) * 100, 100).toFixed(2))
        : 0;

      return {
        deviceId: device.deviceId,
        location: device.location,
        status: device.status,
        registrationStatus: device.registrationStatus,
        lastSeen: device.lastSeen,
        metrics: {
          totalReadings: actualReadings,
          firstReading: readings?.firstReading || null,
          lastReading: readings?.lastReading || null,
          uptimePercentage,
        },
        alerts: {
          total: alerts?.totalAlerts || 0,
          critical: alerts?.criticalAlerts || 0,
        },
        healthScore: calculateHealthScore(uptimePercentage, alerts?.criticalAlerts || 0),
      };
    });

    // Calculate summary
    const totalReadings = readingCounts.reduce((sum, r) => sum + r.count, 0);
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const avgUptime = deviceReports.length > 0
      ? parseFloat((deviceReports.reduce((sum, d) => sum + d.metrics.uptimePercentage, 0) / deviceReports.length).toFixed(2))
      : 0;

    const summary = {
      totalDevices: devices.length,
      onlineDevices,
      offlineDevices: devices.length - onlineDevices,
      totalReadings,
      avgUptimePercentage: avgUptime,
      devicesWithCriticalAlerts: deviceReports.filter(d => d.alerts.critical > 0).length,
    };

    // Update report
    report.status = 'completed';
    report.data = {
      devices: deviceReports,
    };
    report.summary = summary;
    report.metadata = {
      deviceCount: devices.length,
      alertCount: alertCounts.reduce((sum, a) => sum + a.totalAlerts, 0),
      readingCount: totalReadings,
      processingTime: Date.now() - startTime,
    };
    await report.save();

    // Populate generatedBy
    await report.populate('generatedBy', 'displayName email');

    res.json({
      success: true,
      message: 'Device status report generated successfully',
      data: report.toPublicProfile(),
    });
  } catch (error) {
    logger.error('[Report Controller] Error generating device status report', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    
    res.status(500).json({
      success: false,
      message: 'Error generating device status report',
      error: error.message,
    });
  }
};

/**
 * Get all reports
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllReports = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate('generatedBy', 'displayName email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Report.countDocuments(filter);

    res.json({
      success: true,
      data: reports.map(r => r.toPublicProfile()),
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error('[Report Controller] Error fetching reports', {
      error: error.message,
      userId: req.user?._id,
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message,
    });
  }
};

/**
 * Get report by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('generatedBy', 'displayName email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    res.json({
      success: true,
      data: report.toPublicProfile(),
    });
  } catch (error) {
    logger.error('[Report Controller] Error fetching report', {
      error: error.message,
      reportId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching report',
      error: error.message,
    });
  }
};

/**
 * Delete report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    logger.error('[Report Controller] Error deleting report', {
      error: error.message,
      reportId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: 'Error deleting report',
      error: error.message,
    });
  }
};

/**
 * Helper function to calculate device health score
 * @param {number} uptimePercentage - Device uptime percentage
 * @param {number} criticalAlerts - Number of critical alerts
 * @returns {number} Health score (0-100)
 */
function calculateHealthScore(uptimePercentage, criticalAlerts) {
  let score = uptimePercentage;
  
  // Deduct points for critical alerts
  score -= criticalAlerts * 5;
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, parseFloat(score.toFixed(2))));
}

/**
 * Get report history for the authenticated user
 * Returns metadata for all reports with GridFS files
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getReportHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {
      generatedBy: req.user._id,
      gridFsFileId: { $exists: true }, // Only reports with stored PDFs
    };

    if (type) {
      filter.type = type;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Get reports with pagination
    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('reportId type title createdAt fileSize downloadCount gridFsFileId startDate endDate metadata');

    const count = await Report.countDocuments(filter);

    // Transform response to include download URLs
    const reportHistory = reports.map(report => ({
      id: report._id,
      reportId: report.reportId,
      type: report.type,
      title: report.title,
      createdAt: report.createdAt,
      fileSize: report.fileSize,
      downloadCount: report.downloadCount,
      startDate: report.startDate,
      endDate: report.endDate,
      deviceCount: report.metadata?.deviceCount || 0,
      downloadUrl: `/api/v1/reports/download/${report.gridFsFileId}`,
    }));

    res.json({
      success: true,
      data: reportHistory,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    logger.error('[Report Controller] Error fetching report history', {
      error: error.message,
      userId: req.user?._id,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report history',
      error: error.message,
    });
  }
};

/**
 * Download a report PDF from GridFS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const downloadReport = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required',
      });
    }

    // Find the report to verify ownership and get metadata
    const report = await Report.findOne({
      gridFsFileId: fileId,
      generatedBy: req.user._id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or access denied',
      });
    }

    // Get file from GridFS
    const { fileInfo, stream } = await gridFSService.getFile(fileId);

    // Set response headers
    const filename = `report_${report.reportId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileInfo.length);

    // Update download count
    report.downloadCount = (report.downloadCount || 0) + 1;
    report.lastDownloadedAt = new Date();
    await report.save();

    // Stream file to response
    stream.pipe(res);

    logger.info('[Report Controller] Report downloaded', {
      reportId: report.reportId,
      fileId,
      userId: req.user._id,
    });

  } catch (error) {
    logger.error('[Report Controller] Error downloading report', {
      error: error.message,
      fileId: req.params.fileId,
      userId: req.user?._id,
    });

    if (error.message === 'File not found') {
      return res.status(404).json({
        success: false,
        message: 'Report file not found',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to download report',
      error: error.message,
    });
  }
};

module.exports = {
  generateWaterQualityReport,
  generateDeviceStatusReport,
  getAllReports,
  getReportById,
  deleteReport,
  getReportHistory,
  downloadReport,
};
