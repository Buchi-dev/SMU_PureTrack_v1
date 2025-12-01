const Report = require('./report.Model');
const { Device, SensorReading } = require('../devices/device.Model');
const Alert = require('../alerts/alert.Model');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const gridFSService = require('../utils/gridfs.service');
const { generateWaterQualityReportPDF } = require('../utils/pdfGenerator');
const crypto = require('crypto');
const asyncHandler = require('../middleware/asyncHandler');
const { NotFoundError } = require('../errors');
const ResponseHelper = require('../utils/responses');
const CacheService = require('../utils/cache.service');

/**
 * Generate Water Quality Report
 * Aggregates sensor readings, alerts, and compliance metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateWaterQualityReport = async (req, res) => {
  const startTime = Date.now();
  let reportId; // Declare outside try block for catch access
  
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
    reportId = uuidv4();
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

      // Calculate overall summary values from device reports
      const totalDeviceReadings = deviceReports.reduce((sum, d) => sum + d.readingCount, 0);
      const avgTurbidity = totalDeviceReadings > 0 
        ? deviceReports.reduce((sum, d) => sum + (d.parameters.turbidity.avg * d.readingCount), 0) / totalDeviceReadings
        : 0;
      const avgTDS = totalDeviceReadings > 0
        ? deviceReports.reduce((sum, d) => sum + (d.parameters.tds.avg * d.readingCount), 0) / totalDeviceReadings
        : 0;
      const avgPH = totalDeviceReadings > 0
        ? deviceReports.reduce((sum, d) => sum + (d.parameters.pH.avg * d.readingCount), 0) / totalDeviceReadings
        : 0;

      // Calculate min/max across all devices
      const minTurbidity = Math.min(...deviceReports.map(d => d.parameters.turbidity.min));
      const maxTurbidity = Math.max(...deviceReports.map(d => d.parameters.turbidity.max));
      const minTDS = Math.min(...deviceReports.map(d => d.parameters.tds.min));
      const maxTDS = Math.max(...deviceReports.map(d => d.parameters.tds.max));
      const minPH = Math.min(...deviceReports.map(d => d.parameters.pH.min));
      const maxPH = Math.max(...deviceReports.map(d => d.parameters.pH.max));

      // Prepare data for PDF generation (transform to match PDF generator expectations)
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
          avgTurbidity: parseFloat(avgTurbidity.toFixed(2)),
          avgTDS: parseFloat(avgTDS.toFixed(2)),
          avgPH: parseFloat(avgPH.toFixed(2)),
          averageTurbidity: parseFloat(avgTurbidity.toFixed(2)),
          averageTDS: parseFloat(avgTDS.toFixed(2)),
          averagePH: parseFloat(avgPH.toFixed(2)),
          minTurbidity: parseFloat(minTurbidity.toFixed(2)),
          maxTurbidity: parseFloat(maxTurbidity.toFixed(2)),
          minTDS: parseFloat(minTDS.toFixed(2)),
          maxTDS: parseFloat(maxTDS.toFixed(2)),
          minPH: parseFloat(minPH.toFixed(2)),
          maxPH: parseFloat(maxPH.toFixed(2)),
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

    // Prepare response with report data
    const responseData = {
      success: true,
      message: 'Water quality report generated successfully',
      data: report.toPublicProfile(),
    };

    // If PDF was generated successfully, include it in the response for instant download
    if (report.gridFsFileId && !report.error) {
      try {
        const { fileInfo, stream } = await gridFSService.getFile(report.gridFsFileId);
        
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const pdfBuffer = Buffer.concat(chunks);
        
        // Add PDF to response
        responseData.pdfBlob = pdfBuffer.toString('base64');
        responseData.pdfContentType = 'application/pdf';
        responseData.pdfFilename = `water_quality_report_${report.reportId}.pdf`;
        
        logger.info('[Report Controller] PDF included in response for instant download', {
          reportId: report.reportId,
          fileSize: pdfBuffer.length
        });
      } catch (streamError) {
        logger.warn('[Report Controller] Could not include PDF in response', {
          reportId: report.reportId,
          error: streamError.message
        });
        // Continue without PDF in response - user can still download from history
      }
    }

    res.json(responseData);
  } catch (error) {
    logger.error('[Report Controller] Error generating water quality report', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    
    // Try to update report status to failed if it exists
    if (reportId) {
      try {
        const failedReport = await Report.findOne({ reportId });
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
  let reportId; // Declare outside try block for catch access
  
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
    reportId = uuidv4();
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
const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);

  if (!report) {
    throw new NotFoundError('Report', req.params.id);
  }

  // Delete PDF from GridFS if it exists
  if (report.fileId) {
    try {
      await gridFSService.deleteFile(report.fileId);
      logger.info('[Report Controller] PDF deleted from GridFS', { 
        reportId: report._id,
        fileId: report.fileId 
      });
    } catch (gridFSError) {
      logger.warn('[Report Controller] Failed to delete PDF from GridFS', { 
        reportId: report._id,
        fileId: report.fileId,
        error: gridFSError.message 
      });
      // Continue with report deletion even if GridFS deletion fails
    }
  }

  // Delete the report document
  await Report.findByIdAndDelete(req.params.id);

  // Invalidate cache
  await CacheService.delPattern('reports:*');
  logger.debug('[Report Controller] Cache invalidated for reports');

  ResponseHelper.success(res, null, 'Report deleted successfully');
});

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

    // Convert string fileId to ObjectId
    let gridFsFileObjectId;
    try {
      gridFsFileObjectId = new mongoose.Types.ObjectId(fileId);
    } catch (conversionError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID format',
      });
    }

    // Find the report to verify ownership and get metadata
    let report = await Report.findOne({
      gridFsFileId: gridFsFileObjectId,
      generatedBy: req.user._id,
    });

    if (!report) {
      // Also check if user is admin (admins can download all reports)
      const isAdmin = req.user.role === 'admin';
      const reportAdmin = isAdmin ? await Report.findOne({ gridFsFileId: gridFsFileObjectId }) : null;
      
      if (!reportAdmin) {
        return res.status(404).json({
          success: false,
          message: 'Report not found or access denied',
        });
      }
      
      // Use admin report for download
      report = reportAdmin;
    }

    // Get file from GridFS using ObjectId
    const { fileInfo, stream } = await gridFSService.getFile(gridFsFileObjectId);

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
      fileId: fileId,
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
        message: 'Report file not found in GridFS',
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
