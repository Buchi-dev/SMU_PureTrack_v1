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

    // Parse dates and ensure they are at start/end of day to capture full range
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Start of day
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day
    
    // Log the actual date range being queried
    logger.info('[Report Controller] Date range for query', {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      originalStart: startDate,
      originalEnd: endDate
    });

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

    // Build device filter - only include registered devices
    const deviceFilter = {
      isRegistered: true, // Only include registered devices
    };
    
    if (deviceIds && deviceIds.length > 0) {
      deviceFilter.deviceId = { $in: deviceIds };
    }

    // Get devices
    const devices = await Device.find(deviceFilter);
    
    if (devices.length === 0) {
      logger.warn('[Report Controller] No devices found matching filter', {
        reportId,
        deviceFilter,
        requestedDeviceIds: deviceIds
      });
      
      // Update report with no data status
      report.status = 'completed';
      report.data = { devices: [] };
      report.summary = {
        totalDevices: 0,
        totalReadings: 0,
        totalAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        advisoryAlerts: 0,
        compliantDevices: 0,
        complianceRate: 0,
      };
      report.error = 'No registered devices found for the specified criteria';
      await report.save();
      
      return res.status(200).json({
        success: true,
        message: 'Report generated but no devices found',
        data: report.toPublicProfile(),
      });
    }
    
    const deviceIdList = devices.map(d => d.deviceId);

    logger.info('[Report Controller] Fetching data', {
      reportId,
      dateRange: { start, end },
      deviceCount: devices.length,
      deviceIds: deviceIdList,
    });

    // DEBUG: Log incoming request body
    logger.info('[Report Controller] DEBUG - Incoming request:', {
      reportId,
      requestBody: {
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        deviceIds: req.body.deviceIds,
      },
      parsedDates: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      userId: req.user._id,
    });

    // First, check if any readings exist at all for debugging
    const totalReadingsCount = await SensorReading.countDocuments({
      deviceId: { $in: deviceIdList }
    });
    
    logger.info('[Report Controller] Total readings available for devices', {
      reportId,
      totalReadingsInDB: totalReadingsCount,
      deviceCount: deviceIdList.length
    });

    // DEBUG: Get sample readings for each device to verify data availability
    for (const deviceId of deviceIdList) {
      const deviceReadingCount = await SensorReading.countDocuments({ deviceId });
      const latestReading = await SensorReading.findOne({ deviceId })
        .sort({ timestamp: -1 })
        .limit(1);
      
      logger.info('[Report Controller] DEBUG - Device reading status:', {
        reportId,
        deviceId,
        totalReadings: deviceReadingCount,
        latestReading: latestReading ? {
          timestamp: latestReading.timestamp,
          pH: latestReading.pH,
          turbidity: latestReading.turbidity,
          tds: latestReading.tds,
        } : null,
      });
    }

    // Check readings in date range
    const readingsInRange = await SensorReading.countDocuments({
      deviceId: { $in: deviceIdList },
      timestamp: { $gte: start, $lte: end },
    });

    logger.info('[Report Controller] Readings in date range', {
      reportId,
      readingsInRange,
      dateRange: { start: start.toISOString(), end: end.toISOString() }
    });

    // If no readings in range, try without deviceId filter to check timestamp issue
    if (readingsInRange === 0 && totalReadingsCount > 0) {
      const sampleReading = await SensorReading.findOne({ deviceId: { $in: deviceIdList } })
        .sort({ timestamp: -1 })
        .limit(1);
      
      if (sampleReading) {
        logger.warn('[Report Controller] No readings in date range, but readings exist. Sample reading:', {
          reportId,
          sampleTimestamp: sampleReading.timestamp,
          sampleDeviceId: sampleReading.deviceId,
          queryStart: start.toISOString(),
          queryEnd: end.toISOString()
        });
      }
    }

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

    logger.info('[Report Controller] Sensor readings aggregated', {
      reportId,
      readingsFound: readingsAggregation.length,
      totalReadings: readingsAggregation.reduce((sum, agg) => sum + agg.count, 0),
    });

    // DEBUG: Log detailed aggregation results
    logger.info('[Report Controller] DEBUG - Aggregation details:', {
      reportId,
      aggregationResults: readingsAggregation.map(agg => ({
        deviceId: agg._id,
        count: agg.count,
        avgPH: agg.avgPH?.toFixed(2),
        avgTurbidity: agg.avgTurbidity?.toFixed(2),
        avgTDS: agg.avgTDS?.toFixed(2),
      })),
    });

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

    // Build device reports - Include ALL devices, even those with no readings
    const deviceReports = devices.map(device => {
      // Find aggregated data for this device (if any readings exist)
      const agg = readingsAggregation.find(r => r._id === device.deviceId);
      const deviceAlerts = alerts.filter(a => a.deviceId === device.deviceId);

      // If no readings exist for this device, return a report with 0 readings
      if (!agg) {
        return {
          deviceId: device.deviceId,
          deviceName: device.location || device.name || device.deviceId,
          readingCount: 0,
          parameters: null, // No parameters available
          alerts: {
            total: deviceAlerts.length,
            critical: deviceAlerts.filter(a => a.severity === 'Critical').length,
            warning: deviceAlerts.filter(a => a.severity === 'Warning').length,
            advisory: deviceAlerts.filter(a => a.severity === 'Advisory').length,
          },
          overallCompliance: null, // Cannot determine compliance without data
        };
      }

      // Calculate compliance
      const pHCompliant = agg.avgPH >= complianceMetrics.pH.minAcceptable && 
                          agg.avgPH <= complianceMetrics.pH.maxAcceptable;
      const turbidityCompliant = agg.avgTurbidity < complianceMetrics.turbidity.maxAcceptable;
      const tdsCompliant = agg.avgTDS < complianceMetrics.tds.maxAcceptable;

      return {
        deviceId: agg._id,
        deviceName: device.location || device.name || agg._id,
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
    const devicesWithReadings = deviceReports.filter(d => d.readingCount > 0);
    const compliantDevices = deviceReports.filter(d => d.overallCompliance === true).length;
    const complianceRate = devicesWithReadings.length > 0 
      ? parseFloat(((compliantDevices / devicesWithReadings.length) * 100).toFixed(2))
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

    logger.info('[Report Controller] Report statistics calculated', {
      reportId: report.reportId,
      totalDevices: devices.length,
      devicesWithReadings: devicesWithReadings.length,
      totalReadings,
      totalAlerts: alerts.length
    });

    // Log warning if no data found
    if (totalReadings === 0) {
      logger.warn('[Report Controller] No sensor readings found in date range', {
        reportId: report.reportId,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
        deviceCount: devices.length,
        deviceIds: deviceIdList
      });
    }

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

    // VALIDATION: Check data availability BEFORE attempting PDF generation
    // Filter devices that have readings (parameters is not null)
    const devicesWithData = deviceReports.filter(d => d.parameters !== null && d.readingCount > 0);

    logger.info('[Report Controller] Devices with data for PDF', {
      reportId: report.reportId,
      totalDevices: deviceReports.length,
      devicesWithData: devicesWithData.length,
      deviceIdsWithData: devicesWithData.map(d => d.deviceId)
    });

    // DEBUG: Validate data before PDF generation
    logger.info('[Report Controller] DEBUG - Pre-PDF validation:', {
      reportId: report.reportId,
      hasDevices: deviceReports.length > 0,
      hasDevicesWithData: devicesWithData.length > 0,
      totalReadings: summary.totalReadings,
      summaryData: {
        avgTurbidity: summary.totalReadings > 0 ? 'present' : 'missing',
        avgTDS: summary.totalReadings > 0 ? 'present' : 'missing',
        avgPH: summary.totalReadings > 0 ? 'present' : 'missing',
      },
    });

    // VALIDATION: Check if we have any sensor readings data
    if (totalReadings === 0) {
      const errorMsg = 'Cannot generate PDF: No sensor readings found in the specified date range';
      logger.error('[Report Controller] PDF GENERATION ERROR - NO DATA:', {
        reportId: report.reportId,
        error: errorMsg,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
        deviceCount: devices.length,
        deviceIds: deviceIdList,
      });
      
      // Update report status to failed
      report.status = 'failed';
      report.error = errorMsg;
      await report.save();
      
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: report.toPublicProfile(),
      });
    }

    // VALIDATION: Check if devices have actual parameter data
    if (devicesWithData.length === 0) {
      const errorMsg = 'Cannot generate PDF: No devices have valid sensor readings';
      logger.error('[Report Controller] PDF GENERATION ERROR - NO DEVICE DATA:', {
        reportId: report.reportId,
        error: errorMsg,
        totalDevices: deviceReports.length,
        devicesWithData: devicesWithData.length,
      });
      
      // Update report status to failed
      report.status = 'failed';
      report.error = errorMsg;
      await report.save();
      
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: report.toPublicProfile(),
      });
    }

    // Generate PDF and store in GridFS
    try {
      logger.info('[Report Controller] Generating PDF for report', { reportId: report.reportId });

      // Calculate overall summary values from device reports with readings
      const totalDeviceReadings = devicesWithData.reduce((sum, d) => sum + d.readingCount, 0);
      
      // Only calculate averages if we have data, otherwise leave as undefined
      const avgTurbidity = totalDeviceReadings > 0 
        ? devicesWithData.reduce((sum, d) => sum + (d.parameters.turbidity.avg * d.readingCount), 0) / totalDeviceReadings
        : undefined;
      const avgTDS = totalDeviceReadings > 0
        ? devicesWithData.reduce((sum, d) => sum + (d.parameters.tds.avg * d.readingCount), 0) / totalDeviceReadings
        : undefined;
      const avgPH = totalDeviceReadings > 0
        ? devicesWithData.reduce((sum, d) => sum + (d.parameters.pH.avg * d.readingCount), 0) / totalDeviceReadings
        : undefined;

      // Calculate min/max across all devices with data (avoid Infinity on empty arrays)
      // Use undefined instead of 0 when no data available
      const minTurbidity = devicesWithData.length > 0 
        ? Math.min(...devicesWithData.map(d => d.parameters.turbidity.min))
        : undefined;
      const maxTurbidity = devicesWithData.length > 0
        ? Math.max(...devicesWithData.map(d => d.parameters.turbidity.max))
        : undefined;
      const minTDS = devicesWithData.length > 0
        ? Math.min(...devicesWithData.map(d => d.parameters.tds.min))
        : undefined;
      const maxTDS = devicesWithData.length > 0
        ? Math.max(...devicesWithData.map(d => d.parameters.tds.max))
        : undefined;
      const minPH = devicesWithData.length > 0
        ? Math.min(...devicesWithData.map(d => d.parameters.pH.min))
        : undefined;
      const maxPH = devicesWithData.length > 0
        ? Math.max(...devicesWithData.map(d => d.parameters.pH.max))
        : undefined;

      // Prepare data for PDF generation (transform to match PDF generator expectations)
      const pdfReportData = {
        devices: deviceReports.map(device => ({
          device: { deviceId: device.deviceId, name: device.deviceName },
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          location: device.deviceName, // Using deviceName as location for now
          readingCount: device.readingCount,
          metrics: device.parameters ? {
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
          } : null, // No metrics if no readings
          alerts: alerts.filter(a => a.deviceId === device.deviceId).map(alert => ({
            severity: alert.severity,
            parameter: alert.parameter,
            value: alert.value,
            timestamp: alert.timestamp,
            message: alert.message,
            description: alert.description,
            location: device.deviceName,
          })),
        })),
        summary: {
          totalReadings: summary.totalReadings,
          // Only include values if they exist (not undefined)
          avgTurbidity: avgTurbidity !== undefined ? parseFloat(avgTurbidity.toFixed(2)) : undefined,
          avgTDS: avgTDS !== undefined ? parseFloat(avgTDS.toFixed(2)) : undefined,
          avgPH: avgPH !== undefined ? parseFloat(avgPH.toFixed(2)) : undefined,
          averageTurbidity: avgTurbidity !== undefined ? parseFloat(avgTurbidity.toFixed(2)) : undefined,
          averageTDS: avgTDS !== undefined ? parseFloat(avgTDS.toFixed(2)) : undefined,
          averagePH: avgPH !== undefined ? parseFloat(avgPH.toFixed(2)) : undefined,
          minTurbidity: minTurbidity !== undefined ? parseFloat(minTurbidity.toFixed(2)) : undefined,
          maxTurbidity: maxTurbidity !== undefined ? parseFloat(maxTurbidity.toFixed(2)) : undefined,
          minTDS: minTDS !== undefined ? parseFloat(minTDS.toFixed(2)) : undefined,
          maxTDS: maxTDS !== undefined ? parseFloat(maxTDS.toFixed(2)) : undefined,
          minPH: minPH !== undefined ? parseFloat(minPH.toFixed(2)) : undefined,
          maxPH: maxPH !== undefined ? parseFloat(maxPH.toFixed(2)) : undefined,
        },
        period: {
          start: start,
          end: end
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

      // DEBUG: Validate PDF buffer
      logger.info('[Report Controller] DEBUG - PDF buffer generated:', {
        reportId: report.reportId,
        bufferSize: pdfBuffer?.length || 0,
        bufferType: pdfBuffer?.constructor?.name || 'unknown',
        isBuffer: Buffer.isBuffer(pdfBuffer),
        isEmpty: !pdfBuffer || pdfBuffer.length === 0,
      });

      // VALIDATION: Check if PDF buffer is valid
      if (!pdfBuffer || pdfBuffer.length === 0) {
        const errorMsg = 'PDF Generation Error: Generated PDF buffer is empty';
        logger.error('[Report Controller] PDF BUFFER VALIDATION ERROR:', {
          reportId: report.reportId,
          error: errorMsg,
          bufferSize: pdfBuffer?.length || 0,
        });
        throw new Error(errorMsg);
      }

      // VALIDATION: Check minimum PDF size (should be at least a few KB)
      const minPdfSize = 1024; // 1KB minimum
      if (pdfBuffer.length < minPdfSize) {
        const errorMsg = `PDF Generation Error: Generated PDF is too small (${pdfBuffer.length} bytes)`;
        logger.error('[Report Controller] PDF SIZE VALIDATION ERROR:', {
          reportId: report.reportId,
          error: errorMsg,
          bufferSize: pdfBuffer.length,
          minRequired: minPdfSize,
        });
        throw new Error(errorMsg);
      }

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

      // DEBUG: Verify GridFS storage
      logger.info('[Report Controller] DEBUG - GridFS storage verification:', {
        reportId: report.reportId,
        storedSuccessfully: !!gridFSResult.fileId,
        fileId: gridFSResult.fileId,
        originalSize: pdfBuffer.length,
        storedSize: gridFSResult.size,
        sizesMatch: pdfBuffer.length === gridFSResult.size,
        checksum: checksum,
      });

    } catch (pdfError) {
      logger.error('[Report Controller] Error generating/storing PDF', {
        reportId: report.reportId,
        error: pdfError.message,
        stack: pdfError.stack,
        errorType: pdfError.constructor.name,
      });
      // Don't fail the entire report generation if PDF fails
      report.error = `Report generated but PDF creation failed: ${pdfError.message}`;
      
      // DEBUG: Log detailed error information
      // Note: deviceReports is accessible here, devicesWithData is not (in try block scope)
      const devicesWithReadings = deviceReports.filter(d => d.parameters !== null && d.readingCount > 0);
      logger.error('[Report Controller] DEBUG - PDF generation failure details:', {
        reportId: report.reportId,
        errorMessage: pdfError.message,
        errorStack: pdfError.stack,
        reportData: {
          totalDevices: deviceReports.length,
          devicesWithData: devicesWithReadings.length,
          totalReadings: summary.totalReadings,
        },
      });
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

    // DEBUG: Log final report data before sending response
    logger.info('[Report Controller] DEBUG - Final report data:', {
      reportId: report.reportId,
      hasGridFsFileId: !!report.gridFsFileId,
      hasError: !!report.error,
      status: report.status,
      summary: {
        totalDevices: report.summary?.totalDevices,
        totalReadings: report.summary?.totalReadings,
        totalAlerts: report.summary?.totalAlerts,
      },
      metadata: report.metadata,
    });

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

        // DEBUG: Validate base64 encoding
        const base64Size = responseData.pdfBlob.length;
        const expectedBase64Size = Math.ceil((pdfBuffer.length * 4) / 3);
        logger.info('[Report Controller] DEBUG - Base64 encoding validation:', {
          reportId: report.reportId,
          originalBufferSize: pdfBuffer.length,
          base64StringLength: base64Size,
          expectedBase64Size: expectedBase64Size,
          encodingValid: Math.abs(base64Size - expectedBase64Size) < 10,
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

    // Parse dates and ensure they are at start/end of day to capture full range
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Start of day
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day
    
    logger.info('[Report Controller] Device status report date range', {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });

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

/**
 * Get report diagnostics - Check data availability for report generation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getReportDiagnostics = async (req, res) => {
  try {
    const { startDate, endDate, deviceIds } = req.query;

    const diagnostics = {
      timestamp: new Date().toISOString(),
      dateRange: null,
      devices: {
        total: 0,
        registered: 0,
        online: 0,
        requested: deviceIds ? deviceIds.split(',').length : 0
      },
      readings: {
        total: 0,
        inDateRange: 0,
        byDevice: []
      },
      alerts: {
        total: 0,
        inDateRange: 0
      },
      recommendations: []
    };

    // Parse dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      diagnostics.dateRange = {
        start: start.toISOString(),
        end: end.toISOString(),
        days: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      };
    }

    // Check devices
    const deviceFilter = { isRegistered: true };
    if (deviceIds) {
      const deviceIdArray = deviceIds.split(',');
      deviceFilter.deviceId = { $in: deviceIdArray };
    }

    const devices = await Device.find(deviceFilter);
    const allDevices = await Device.countDocuments();
    const registeredDevices = await Device.countDocuments({ isRegistered: true });
    const onlineDevices = await Device.countDocuments({ status: 'online', isRegistered: true });

    diagnostics.devices.total = allDevices;
    diagnostics.devices.registered = registeredDevices;
    diagnostics.devices.online = onlineDevices;
    diagnostics.devices.found = devices.length;
    diagnostics.devices.list = devices.map(d => ({
      deviceId: d.deviceId,
      name: d.name || d.location,
      status: d.status,
      lastSeen: d.lastSeen
    }));

    if (devices.length === 0) {
      diagnostics.recommendations.push('No registered devices found. Please register devices first.');
      return res.json({ success: true, data: diagnostics });
    }

    const deviceIdList = devices.map(d => d.deviceId);

    // Check total readings
    const totalReadings = await SensorReading.countDocuments({
      deviceId: { $in: deviceIdList }
    });
    diagnostics.readings.total = totalReadings;

    // Get sample reading timestamps
    if (totalReadings > 0) {
      const oldestReading = await SensorReading.findOne({ deviceId: { $in: deviceIdList } })
        .sort({ timestamp: 1 })
        .limit(1);
      const newestReading = await SensorReading.findOne({ deviceId: { $in: deviceIdList } })
        .sort({ timestamp: -1 })
        .limit(1);
      
      diagnostics.readings.oldestTimestamp = oldestReading?.timestamp;
      diagnostics.readings.newestTimestamp = newestReading?.timestamp;
    }

    // Check readings in date range if dates provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const readingsInRange = await SensorReading.countDocuments({
        deviceId: { $in: deviceIdList },
        timestamp: { $gte: start, $lte: end }
      });
      diagnostics.readings.inDateRange = readingsInRange;

      // Get readings per device
      const readingsByDevice = await SensorReading.aggregate([
        {
          $match: {
            deviceId: { $in: deviceIdList },
            timestamp: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$deviceId',
            count: { $sum: 1 },
            firstReading: { $min: '$timestamp' },
            lastReading: { $max: '$timestamp' }
          }
        }
      ]);

      diagnostics.readings.byDevice = readingsByDevice.map(r => ({
        deviceId: r._id,
        readingCount: r.count,
        firstReading: r.firstReading,
        lastReading: r.lastReading
      }));

      // Check alerts
      const alertsInRange = await Alert.countDocuments({
        deviceId: { $in: deviceIdList },
        timestamp: { $gte: start, $lte: end }
      });
      diagnostics.alerts.inDateRange = alertsInRange;
    }

    // Generate recommendations
    if (diagnostics.devices.found === 0) {
      diagnostics.recommendations.push('No devices match the specified filter criteria.');
    } else if (totalReadings === 0) {
      diagnostics.recommendations.push('Devices found but no sensor readings exist. Ensure devices are online and transmitting data.');
    } else if (diagnostics.dateRange && diagnostics.readings.inDateRange === 0) {
      diagnostics.recommendations.push(
        `No readings found in the selected date range (${diagnostics.dateRange.start} to ${diagnostics.dateRange.end}). ` +
        `Available data ranges from ${diagnostics.readings.oldestTimestamp} to ${diagnostics.readings.newestTimestamp}.`
      );
      diagnostics.recommendations.push('Try adjusting the date range to include dates when data was collected.');
    } else {
      diagnostics.recommendations.push('Data is available for report generation.');
    }

    res.json({
      success: true,
      data: diagnostics
    });

  } catch (error) {
    logger.error('[Report Controller] Error getting diagnostics', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error getting report diagnostics',
      error: error.message
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
  getReportDiagnostics,
};
