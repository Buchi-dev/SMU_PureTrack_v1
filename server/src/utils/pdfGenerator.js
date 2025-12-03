// Node.js imports - jspdf-autotable doesn't extend prototype in Node.js
const jsPDF = require('jspdf').jsPDF;
const autoTable = require('jspdf-autotable').default;

// ============================================================================
// CONSTANTS - Design System (Matches Frontend Template)
// ============================================================================
const COLORS = {
  primary: { r: 0, g: 31, b: 63 },        // Navy Blue
  secondary: { r: 41, g: 128, b: 185 },   // Light Blue
  success: { r: 82, g: 196, b: 26 },      // Green
  warning: { r: 250, g: 173, b: 20 },     // Orange
  danger: { r: 255, g: 77, b: 79 },       // Red
  gray: { r: 128, g: 128, b: 128 },       // Gray
  lightGray: { r: 245, g: 245, b: 245 },  // Light Gray
  white: { r: 255, g: 255, b: 255 },      // White
  black: { r: 0, g: 0, b: 0 },            // Black
  text: { r: 51, g: 51, b: 51 },          // Dark Gray Text
  textSecondary: { r: 128, g: 128, b: 128 }, // Gray Text
};

const SPACING = {
  page: { top: 20, bottom: 25, left: 15, right: 15 },
  section: 12,
  paragraph: 6,
  line: 5,
};

const FONTS = {
  title: { size: 24, style: 'bold' },
  subtitle: { size: 14, style: 'normal' },
  heading: { size: 12, style: 'bold' },
  subheading: { size: 10, style: 'bold' },
  body: { size: 9, style: 'normal' },
  small: { size: 8, style: 'normal' },
  tiny: { size: 7, style: 'normal' },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format date to YYYYMMDD for ID generation
 */
function formatDateToId(date) {
  if (!date) return 'UNKNOWN';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format date for full display (Month D, YYYY at h:mm AM/PM)
 */
function formatDateFull(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
}

/**
 * Format date for short display (MMM D, YYYY)
 */
function formatDateShort(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * Format date and time (YYYY-MM-DD HH:mm:ss)
 */
function formatDateTime(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Determine overall water quality status based on summary metrics
 */
function getOverallStatus(summary) {
  if (!summary || 
      (summary.averageTurbidity === undefined && 
       summary.averageTDS === undefined && 
       summary.averagePH === undefined)) {
    return { status: 'NO DATA', color: [128, 128, 128] };
  }

  if (summary.averageTurbidity === 0 && 
      summary.averageTDS === 0 && 
      summary.averagePH === 0 &&
      summary.totalReadings === 0) {
    return { status: 'NO DATA', color: [128, 128, 128] };
  }

  const turbidityOk = (summary.averageTurbidity || 0) <= 5;
  const tdsOk = (summary.averageTDS || 0) <= 500;
  const phOk = (summary.averagePH || 0) >= 6.5 && (summary.averagePH || 0) <= 8.5;

  const okCount = [turbidityOk, tdsOk, phOk].filter(Boolean).length;

  if (okCount === 3) {
    return { status: 'EXCELLENT', color: [82, 196, 26] };
  } else if (okCount === 2) {
    return { status: 'GOOD', color: [82, 196, 26] };
  } else if (okCount === 1) {
    return { status: 'FAIR - ATTENTION NEEDED', color: [250, 173, 20] };
  } else {
    return { status: 'POOR - IMMEDIATE ACTION REQUIRED', color: [255, 77, 79] };
  }
}

/**
 * Calculate overall compliance metrics from summary data
 */
function calculateComplianceMetrics(summary) {
  if (!summary || (summary.totalReadings === 0 && summary.avgTurbidity === undefined)) {
    return { rate: 0, compliantCount: 0, totalCount: 3 };
  }

  let compliantCount = 0;
  const totalCount = 3;

  if ((summary.averageTurbidity || 0) <= 5) compliantCount++;
  if ((summary.averageTDS || 0) <= 500) compliantCount++;
  if ((summary.averagePH || 0) >= 6.5 && (summary.averagePH || 0) <= 8.5) compliantCount++;

  const rate = Math.round((compliantCount / totalCount) * 100);

  return { rate, compliantCount, totalCount };
}

/**
 * Calculate compliance details for a specific device
 */
function calculateDeviceCompliance(metrics) {
  const turbidityValue = metrics.avgTurbidity || 0;
  const tdsValue = metrics.avgTDS || 0;
  const phValue = metrics.avgPH || 0;

  const turbidityCompliance = turbidityValue <= 5 ? 100 : Math.max(0, 100 - ((turbidityValue - 5) / 5) * 100);
  const tdsCompliance = tdsValue <= 500 ? 100 : Math.max(0, 100 - ((tdsValue - 500) / 500) * 100);
  const phCompliance = (phValue >= 6.5 && phValue <= 8.5) ? 100 : 
    Math.max(0, 100 - (Math.abs(phValue - 7.0) / 1.5) * 100);

  return {
    turbidity: {
      value: `${turbidityValue.toFixed(2)} NTU`,
      standard: '< 5 NTU',
      status: turbidityValue <= 5 ? 'Compliant' : 'Non-Compliant',
      percentage: `${turbidityCompliance.toFixed(1)}%`
    },
    tds: {
      value: `${tdsValue.toFixed(2)} ppm`,
      standard: '< 500 ppm',
      status: tdsValue <= 500 ? 'Compliant' : 'Non-Compliant',
      percentage: `${tdsCompliance.toFixed(1)}%`
    },
    ph: {
      value: phValue.toFixed(2),
      standard: '6.5 - 8.5',
      status: (phValue >= 6.5 && phValue <= 8.5) ? 'Compliant' : 'Non-Compliant',
      percentage: `${phCompliance.toFixed(1)}%`
    }
  };
}

/**
 * Generate recommendations based on report data
 */
function generateRecommendations(reportData) {
  const recommendations = [];
  
  if (!reportData.devices || reportData.devices.length === 0) {
    return ['No devices found. Please check device configuration and connectivity.'];
  }

  const summary = reportData.summary;
  
  if (summary?.averageTurbidity && summary.averageTurbidity > 5) {
    recommendations.push(
      `High turbidity detected (${summary.averageTurbidity.toFixed(2)} NTU). ` +
      'Investigate potential contamination sources and consider filtration system maintenance.'
    );
  }

  if (summary?.averageTDS && summary.averageTDS > 500) {
    recommendations.push(
      `Elevated TDS levels detected (${summary.averageTDS.toFixed(2)} ppm). ` +
      'Consider water treatment to reduce dissolved solids. Schedule pipe system inspection.'
    );
  }

  if (summary?.averagePH) {
    if (summary.averagePH < 6.5) {
      recommendations.push(
        `Low pH detected (${summary.averagePH.toFixed(2)}). Water is acidic. ` +
        'Install pH adjustment system. Check for corrosion in pipes.'
      );
    } else if (summary.averagePH > 8.5) {
      recommendations.push(
        `High pH detected (${summary.averagePH.toFixed(2)}). Water is alkaline. ` +
        'Install pH adjustment system. Test for mineral buildup.'
      );
    }
  }

  const devicesWithNoData = reportData.devices.filter((d) => 
    !d.metrics || d.metrics.totalReadings === 0
  );
  if (devicesWithNoData.length > 0) {
    recommendations.push(
      `${devicesWithNoData.length} device(s) reported no data during this period. ` +
      'Check device connectivity, power supply, and sensor calibration.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'All parameters are within safe ranges. Continue regular monitoring and maintenance schedule.',
      'Perform sensor calibration as per manufacturer guidelines (typically every 3-6 months).',
      'Review historical trends to identify any gradual changes in water quality.'
    );
  } else {
    recommendations.push(
      'Schedule immediate inspection of flagged devices and water quality parameters.',
      'Increase monitoring frequency until issues are resolved.',
      'Document all corrective actions taken and verify effectiveness.'
    );
  }

  return recommendations;
}

// ============================================================================
// PDF GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate Water Quality Report PDF (Matches Frontend Template)
 * @param {Object} reportConfig - Report configuration
 * @param {Object} reportData - Report data from database
 * @returns {Buffer} PDF buffer
 */
function generateWaterQualityReportPDF(reportConfig, reportData) {
  // ============================================================================
  // VALIDATION: Check for empty or missing data
  // ============================================================================
  const logger = require('./logger');
  
  logger.info('[PDF Generator] Starting PDF generation with data validation');
  
  // Validate reportData exists
  if (!reportData) {
    const error = new Error('PDF Generation Error: reportData is null or undefined');
    logger.error('[PDF Generator] CRITICAL ERROR - No report data:', { error: error.message });
    throw error;
  }

  // Validate devices array exists and has data
  if (!reportData.devices || !Array.isArray(reportData.devices) || reportData.devices.length === 0) {
    const error = new Error('PDF Generation Error: No devices data available');
    logger.error('[PDF Generator] CRITICAL ERROR - No devices:', {
      error: error.message,
      hasDevices: !!reportData.devices,
      isArray: Array.isArray(reportData.devices),
      deviceCount: reportData.devices?.length || 0,
    });
    throw error;
  }

  // Validate at least one device has sensor readings
  const devicesWithReadings = reportData.devices.filter(d => 
    d.metrics && 
    d.metrics.totalReadings > 0 &&
    (d.metrics.avgTurbidity !== undefined || d.metrics.avgTDS !== undefined || d.metrics.avgPH !== undefined)
  );

  if (devicesWithReadings.length === 0) {
    const error = new Error('PDF Generation Error: No devices have valid sensor readings');
    logger.error('[PDF Generator] CRITICAL ERROR - No sensor readings:', {
      error: error.message,
      totalDevices: reportData.devices.length,
      devicesWithReadings: devicesWithReadings.length,
      deviceData: reportData.devices.map(d => ({
        deviceId: d.deviceId,
        hasMetrics: !!d.metrics,
        totalReadings: d.metrics?.totalReadings || 0,
      })),
    });
    throw error;
  }

  // Validate summary data exists
  if (!reportData.summary) {
    const error = new Error('PDF Generation Error: Summary data is missing');
    logger.error('[PDF Generator] CRITICAL ERROR - No summary:', { error: error.message });
    throw error;
  }

  // Validate summary has required readings count
  const totalReadings = reportData.summary.totalReadings || 0;
  if (totalReadings === 0) {
    const error = new Error('PDF Generation Error: Summary shows zero total readings');
    logger.error('[PDF Generator] CRITICAL ERROR - Zero readings in summary:', {
      error: error.message,
      summary: reportData.summary,
    });
    throw error;
  }

  // Log successful validation
  logger.info('[PDF Generator] Data validation passed:', {
    totalDevices: reportData.devices.length,
    devicesWithReadings: devicesWithReadings.length,
    totalReadings: totalReadings,
    hasValidData: true,
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Generate Report ID
  const reportId = `WQR-${formatDateToId(new Date())}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  let yPos = 0;

  // ============================================================================
  // HEADER SECTION - Professional Dark Blue Header
  // ============================================================================
  
  // Main header bar
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.rect(0, 0, 210, 50, 'F');
  
  // Header content
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.setFont('helvetica', FONTS.title.style);
  doc.setFontSize(FONTS.title.size);
  doc.text('Water Quality Analysis Report', 105, 22, { align: 'center' });
  
  doc.setFont('helvetica', FONTS.subtitle.style);
  doc.setFontSize(FONTS.subtitle.size);
  doc.text(reportConfig.title || 'Comprehensive Water Quality Assessment', 105, 32, { align: 'center' });
  
  // Report ID badge
  doc.setFont('helvetica', FONTS.small.style);
  doc.setFontSize(FONTS.small.size);
  doc.text(`Report ID: ${reportId}`, 105, 42, { align: 'center' });

  // Accent line under header
  doc.setFillColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.rect(0, 50, 210, 2, 'F');

  yPos = 60;

  // ============================================================================
  // REPORT INFORMATION CARD - Professional Information Box
  // ============================================================================
  
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  
  // Information card background
  doc.setFillColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
  doc.roundedRect(SPACING.page.left, yPos, 180, 38, 2, 2, 'F');
  
  // Border for card
  doc.setDrawColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(SPACING.page.left, yPos, 180, 38, 2, 2, 'S');
  
  yPos += 7;
  
  // Section title
  doc.setFont('helvetica', FONTS.subheading.style);
  doc.setFontSize(FONTS.subheading.size);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Report Information', SPACING.page.left + 5, yPos);
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  yPos += 7;

  // Two-column layout for information
  doc.setFont('helvetica', FONTS.body.style);
  doc.setFontSize(FONTS.body.size);
  
  const col1X = SPACING.page.left + 5;
  const col2X = 110;
  
  // Column 1
  doc.text(`Generated: ${formatDateFull(new Date())}`, col1X, yPos);
  doc.text(`Generated By: ${reportConfig.generatedBy || 'System Administrator'}`, col1X, yPos + 5);
  doc.text(`Devices Monitored: ${reportData.devices?.length || reportConfig.deviceIds?.length || 0}`, col1X, yPos + 10);
  
  // Column 2
  if (reportConfig.dateRange && reportConfig.dateRange.length === 2) {
    doc.text(`Report Period:`, col2X, yPos);
    doc.text(`${formatDateShort(reportConfig.dateRange[0])} - ${formatDateShort(reportConfig.dateRange[1])}`, col2X, yPos + 5);
  }
  doc.text(`Total Readings: ${reportData.summary?.totalReadings || 0}`, col2X, yPos + 10);
  
  yPos += 17;
  
  // Notes section (if present)
  if (reportConfig.notes) {
    doc.setFont('helvetica', FONTS.small.style);
    doc.setFontSize(FONTS.small.size);
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    const notesText = `Notes: ${reportConfig.notes}`;
    const splitNotes = doc.splitTextToSize(notesText, 170);
    doc.text(splitNotes, col1X, yPos);
    yPos += (splitNotes.length * 4);
  }
  
  yPos += 10;

  // ============================================================================
  // REGULATORY STANDARDS SECTION - WHO Guidelines Reference
  // ============================================================================
  if (yPos > 240) {
    doc.addPage();
    yPos = SPACING.page.top;
  }

  // Section header with decorative underline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Regulatory Standards Reference', SPACING.page.left, yPos);
  doc.setDrawColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.setLineWidth(0.8);
  doc.line(SPACING.page.left, yPos + 2, SPACING.page.left + 70, yPos + 2);
  yPos += 10;

  // Standards table with WHO guidelines
  autoTable(doc, {
    startY: yPos,
    head: [['Parameter', 'Standard Limit', 'Reference', 'Description']],
    body: [
      ['Turbidity', '< 5 NTU', 'WHO Guidelines for Drinking Water', 'Aesthetic quality indicator'],
      ['TDS (Total Dissolved Solids)', '< 500 ppm', 'WHO Guidelines for Drinking Water', 'Taste and health indicator'],
      ['pH Level', '6.5 - 8.5', 'WHO Guidelines for Drinking Water', 'Acidity/alkalinity balance'],
    ],
    styles: { 
      fontSize: FONTS.small.size,
      cellPadding: 3,
      lineColor: [COLORS.gray.r, COLORS.gray.g, COLORS.gray.b],
      lineWidth: 0.1,
    },
    headStyles: { 
      fillColor: [COLORS.primary.r, COLORS.primary.g, COLORS.primary.b],
      textColor: [COLORS.white.r, COLORS.white.g, COLORS.white.b],
      fontStyle: 'bold',
      fontSize: FONTS.body.size,
    },
    alternateRowStyles: { 
      fillColor: [COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 28 },
      2: { cellWidth: 45 },
      3: { cellWidth: 52 },
    },
    margin: { left: SPACING.page.left, right: SPACING.page.right },
  });
  
  // Safely get finalY position after table
  yPos = doc.previousAutoTable && doc.previousAutoTable.finalY 
    ? doc.previousAutoTable.finalY + SPACING.section 
    : yPos + 80; // Fallback if table didn't render

  // ============================================================================
  // EXECUTIVE SUMMARY WITH COMPLIANCE METRICS
  // ============================================================================
  if (reportData.summary) {
    if (yPos > 220) {
      doc.addPage();
      yPos = SPACING.page.top;
    }

    // Section header with decorative underline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text('Executive Summary & Compliance Overview', SPACING.page.left, yPos);
    doc.setDrawColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    doc.setLineWidth(0.8);
    doc.line(SPACING.page.left, yPos + 2, SPACING.page.left + 70, yPos + 2);
    yPos += 12;

    const summary = reportData.summary;
    const overallStatus = getOverallStatus(summary);
    const complianceMetrics = calculateComplianceMetrics(summary);

    // Check if we have actual data - more robust check
    const hasData = summary && 
                    (summary.totalReadings || 0) > 0 && 
                    (summary.averageTurbidity !== undefined || 
                     summary.averageTDS !== undefined || 
                     summary.averagePH !== undefined);

    // Status badge with rounded corners
    const badgeHeight = 45;
    doc.setFillColor(overallStatus.color[0], overallStatus.color[1], overallStatus.color[2]);
    doc.roundedRect(SPACING.page.left, yPos, 180, badgeHeight, 3, 3, 'F');
    
    // Status title
    doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Overall Water Quality: ${overallStatus.status}`, SPACING.page.left + 8, yPos + 12);
    
    // Add summary stats in badge
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    if (hasData) {
      // Row 1: Water Quality Parameters - handle undefined values
      const turbidity = summary.averageTurbidity !== undefined ? summary.averageTurbidity.toFixed(2) : 'N/A';
      const tds = summary.averageTDS !== undefined ? summary.averageTDS.toFixed(0) : 'N/A';
      const ph = summary.averagePH !== undefined ? summary.averagePH.toFixed(2) : 'N/A';
      
      doc.text(
        `Water Quality: Turbidity ${turbidity} NTU  •  TDS ${tds} ppm  •  pH ${ph}`,
        SPACING.page.left + 8,
        yPos + 21
      );
      
      // Row 2: Monitoring Information
      let periodStart = 'N/A';
      let periodEnd = 'N/A';
      
      if (reportConfig.dateRange && reportConfig.dateRange.length === 2) {
        periodStart = formatDateShort(reportConfig.dateRange[0]);
        periodEnd = formatDateShort(reportConfig.dateRange[1]);
      }
      
      const deviceCount = reportData.devices?.length || 0;
      
      doc.text(
        `Monitoring Period: ${periodStart} to ${periodEnd}  •  Devices: ${deviceCount}`,
        SPACING.page.left + 8,
        yPos + 28
      );
      
      // Row 3: Data & Compliance
      const totalReadings = summary.totalReadings || 0;
      const complianceRate = complianceMetrics.rate;
      const compliantParams = complianceMetrics.compliantCount;
      const totalParams = complianceMetrics.totalCount;
      
      doc.setFont('helvetica', 'bold');
      doc.text(
        `Total Readings: ${totalReadings}  •  Compliance Rate: ${complianceRate}%  •  Compliant Parameters: ${compliantParams}/${totalParams}`,
        SPACING.page.left + 8,
        yPos + 35
      );
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(
        'No sensor data available for the selected period',
        SPACING.page.left + 8,
        yPos + 22
      );
      doc.setFontSize(8);
      doc.text(
        'Please ensure devices are online and transmitting data, then regenerate the report.',
        SPACING.page.left + 8,
        yPos + 30
      );
    }

    yPos += badgeHeight + 12;
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);

    // Enhanced Summary Metrics Cards (only if we have data)
    if (hasData) {
      yPos = addMetricCards(doc, summary, yPos);
    }
    
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  }

  // ============================================================================
  // DEVICE ANALYSIS - Detailed Metrics Per Device
  // ============================================================================
  if (reportData.devices && reportData.devices.length > 0) {
    yPos = addDeviceAnalysis(doc, reportData, yPos);
  }

  // ============================================================================
  // RECOMMENDATIONS SECTION
  // ============================================================================
  const hasIssues = reportData.devices?.some((d) => d.alerts && d.alerts.length > 0);
  if (hasIssues || !reportData.summary || (reportData.summary.totalReadings || 0) === 0) {
    yPos = addRecommendations(doc, reportData, yPos);
  }

  // ============================================================================
  // PROFESSIONAL FOOTER - Added to all pages
  // ============================================================================
  addProfessionalFooter(doc, reportId);

  // Generate PDF buffer
  const pdfArrayBuffer = doc.output('arraybuffer');
  const pdfBuffer = Buffer.from(pdfArrayBuffer);

  // DEBUG: Validate PDF output before returning
  logger.info('[PDF Generator] PDF generation completed:', {
    reportId,
    bufferSize: pdfBuffer.length,
    pageCount: doc.internal.getNumberOfPages(),
    hasContent: pdfBuffer.length > 0,
    minSizeCheck: pdfBuffer.length > 1024, // Should be at least 1KB
  });

  // VALIDATION: Final check on PDF buffer
  if (!pdfBuffer || pdfBuffer.length === 0) {
    const error = new Error('PDF Generation Error: Output buffer is empty');
    logger.error('[PDF Generator] CRITICAL ERROR - Empty output buffer:', {
      error: error.message,
      reportId,
    });
    throw error;
  }

  // Return PDF as buffer
  return pdfBuffer;
}

/**
 * Add metric cards section
 */
function addMetricCards(doc, summary, yPos) {
  // Create three metric cards in a row
  const cardWidth = 56;
  const cardHeight = 32;
  const cardSpacing = 6;
  
  // Card 1: Turbidity
  const card1X = SPACING.page.left;
  doc.setFillColor(245, 250, 255); // Light blue
  doc.roundedRect(card1X, yPos, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(card1X, yPos, cardWidth, cardHeight, 2, 2, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.small.size);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('TURBIDITY', card1X + 3, yPos + 6);
  
  const turbValue = summary.averageTurbidity !== undefined ? summary.averageTurbidity : 0;
  const turbStatus = turbValue <= 5 ? '✓ Compliant' : '✗ Non-Compliant';
  const turbColor = turbValue <= 5 ? COLORS.success : COLORS.danger;
  doc.setTextColor(turbColor.r, turbColor.g, turbColor.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${turbValue.toFixed(2)}`, card1X + 3, yPos + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.small.size);
  doc.text('NTU', card1X + 25, yPos + 16);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny.size);
  doc.text(turbStatus, card1X + 3, yPos + 23);
  doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
  doc.text('WHO Limit: <5 NTU', card1X + 3, yPos + 28);
  
  // Card 2: TDS
  const card2X = card1X + cardWidth + cardSpacing;
  doc.setFillColor(245, 255, 245); // Light green
  doc.roundedRect(card2X, yPos, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(card2X, yPos, cardWidth, cardHeight, 2, 2, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.small.size);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('TDS', card2X + 3, yPos + 6);
  
  const tdsValue = summary.averageTDS !== undefined ? summary.averageTDS : 0;
  const tdsStatus = tdsValue <= 500 ? '✓ Compliant' : '✗ Non-Compliant';
  const tdsColor = tdsValue <= 500 ? COLORS.success : COLORS.danger;
  doc.setTextColor(tdsColor.r, tdsColor.g, tdsColor.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${tdsValue.toFixed(0)}`, card2X + 3, yPos + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.small.size);
  doc.text('ppm', card2X + 25, yPos + 16);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny.size);
  doc.text(tdsStatus, card2X + 3, yPos + 23);
  doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
  doc.text('WHO Limit: <500 ppm', card2X + 3, yPos + 28);
  
  // Card 3: pH
  const card3X = card2X + cardWidth + cardSpacing;
  doc.setFillColor(255, 250, 245); // Light orange
  doc.roundedRect(card3X, yPos, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(card3X, yPos, cardWidth, cardHeight, 2, 2, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.small.size);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('pH LEVEL', card3X + 3, yPos + 6);
  
  const phValue = summary.averagePH !== undefined ? summary.averagePH : 0;
  const phStatus = (phValue >= 6.5 && phValue <= 8.5) ? '✓ Compliant' : '✗ Non-Compliant';
  const phColor = (phValue >= 6.5 && phValue <= 8.5) ? COLORS.success : COLORS.danger;
  doc.setTextColor(phColor.r, phColor.g, phColor.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${phValue.toFixed(2)}`, card3X + 3, yPos + 16);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.tiny.size);
  doc.text(phStatus, card3X + 3, yPos + 23);
  doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
  doc.text('WHO Range: 6.5-8.5', card3X + 3, yPos + 28);
  
  return yPos + cardHeight + 10;
}

/**
 * Add device analysis section
 */
function addDeviceAnalysis(doc, reportData, yPos) {
  if (yPos > 240) {
    doc.addPage();
    yPos = SPACING.page.top;
  }

  // Section header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Device Analysis', SPACING.page.left, yPos);
  doc.setDrawColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.setLineWidth(0.8);
  doc.line(SPACING.page.left, yPos + 2, SPACING.page.left + 40, yPos + 2);
  yPos += 10;

  for (const deviceReport of reportData.devices) {
    if (yPos > 240) {
      doc.addPage();
      yPos = SPACING.page.top;
    }

    // Device header card
    const deviceHeaderHeight = 12;
    doc.setFillColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
    doc.roundedRect(SPACING.page.left, yPos, 180, deviceHeaderHeight, 2, 2, 'F');
    doc.setDrawColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.setLineWidth(0.2);
    doc.roundedRect(SPACING.page.left, yPos, 180, deviceHeaderHeight, 2, 2, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONTS.subheading.size);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    const deviceName = deviceReport.deviceName || deviceReport.deviceId || 'Unknown Device';
    doc.text(`Device: ${deviceName}`, SPACING.page.left + 3, yPos + 7.5);
    
    if (deviceReport.location) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONTS.small.size);
      doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
      const locationText = `Location: ${deviceReport.location}`;
      const wrappedLocation = doc.splitTextToSize(locationText, 70);
      doc.text(wrappedLocation[0], SPACING.page.left + 105, yPos + 7.5);
    }
    
    yPos += deviceHeaderHeight + 5;

    // Check if device has readings - check both readingCount and metrics
    const hasNoData = !deviceReport.metrics || 
                      deviceReport.readingCount === 0 || 
                      (deviceReport.metrics && deviceReport.metrics.totalReadings === 0);
    
    if (hasNoData) {
      doc.setFillColor(255, 250, 230);
      doc.roundedRect(SPACING.page.left, yPos, 180, 15, 2, 2, 'F');
      doc.setDrawColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
      doc.setLineWidth(0.3);
      doc.roundedRect(SPACING.page.left, yPos, 180, 15, 2, 2, 'S');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONTS.body.size);
      doc.setTextColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
      doc.text('No sensor data available for this device in the selected period', 
        SPACING.page.left + 5, yPos + 9);
      
      yPos += 20;
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      continue;
    }

    // Metrics table
    if (deviceReport.metrics) {
      const metrics = deviceReport.metrics;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Parameter', 'Average Value', 'Min / Max Range', 'Safe Range', 'Status']],
        body: [
          [
            'Turbidity',
            `${metrics.avgTurbidity?.toFixed(2) || 'N/A'} NTU`,
            `${metrics.minTurbidity?.toFixed(2) || 'N/A'} / ${metrics.maxTurbidity?.toFixed(2) || 'N/A'}`,
            'Max: 5 NTU',
            (metrics.avgTurbidity || 0) <= 5 ? 'GOOD' : 'WARNING'
          ],
          [
            'TDS',
            `${metrics.avgTDS?.toFixed(2) || 'N/A'} ppm`,
            `${metrics.minTDS?.toFixed(2) || 'N/A'} / ${metrics.maxTDS?.toFixed(2) || 'N/A'}`,
            'Max: 500 ppm',
            (metrics.avgTDS || 0) <= 500 ? 'GOOD' : 'WARNING'
          ],
          [
            'pH Level',
            metrics.avgPH?.toFixed(2) || 'N/A',
            `${metrics.minPH?.toFixed(2) || 'N/A'} / ${metrics.maxPH?.toFixed(2) || 'N/A'}`,
            '6.5 - 8.5',
            ((metrics.avgPH || 0) >= 6.5 && (metrics.avgPH || 0) <= 8.5) ? 'GOOD' : 'WARNING'
          ],
        ],
        styles: { 
          fontSize: FONTS.body.size, 
          cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
          lineColor: [COLORS.gray.r, COLORS.gray.g, COLORS.gray.b],
          lineWidth: 0.15,
          halign: 'left',
          valign: 'middle',
          overflow: 'linebreak',
          minCellHeight: 11,
        },
        headStyles: { 
          fillColor: [COLORS.primary.r, COLORS.primary.g, COLORS.primary.b],
          textColor: [COLORS.white.r, COLORS.white.g, COLORS.white.b],
          fontSize: FONTS.body.size,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          minCellHeight: 11,
          cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
        },
        alternateRowStyles: { 
          fillColor: [COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b] 
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 32, halign: 'left' },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 40, halign: 'center' },
          3: { cellWidth: 35, halign: 'center' },
          4: { 
            cellWidth: 38,
            fontStyle: 'bold',
            halign: 'center',
          }
        },
        didParseCell: function(data) {
          if (data.column.index === 4) {
            const status = String(data.cell.raw || '').toUpperCase();
            if (status.includes('GOOD')) {
              data.cell.styles.textColor = [COLORS.success.r, COLORS.success.g, COLORS.success.b];
              data.cell.styles.fillColor = [240, 255, 240];
            } else if (status.includes('WARNING')) {
              data.cell.styles.textColor = [COLORS.warning.r, COLORS.warning.g, COLORS.warning.b];
              data.cell.styles.fillColor = [255, 250, 230];
            } else {
              data.cell.styles.textColor = [COLORS.danger.r, COLORS.danger.g, COLORS.danger.b];
              data.cell.styles.fillColor = [255, 240, 240];
            }
          }
        },
        margin: { left: SPACING.page.left, right: SPACING.page.right },
        tableWidth: 'auto',
      });

      yPos = doc.previousAutoTable && doc.previousAutoTable.finalY 
        ? doc.previousAutoTable.finalY + 5 
        : yPos + 40;
    }

    // Compliance Analysis sub-table
    if (deviceReport.metrics) {
      if (yPos > 230) {
        doc.addPage();
        yPos = SPACING.page.top;
      }

      const metrics = deviceReport.metrics;
      const complianceDetails = calculateDeviceCompliance(metrics);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONTS.subheading.size);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text('Compliance Analysis', SPACING.page.left, yPos);
      yPos += 6;

      const complianceData = [
        [
          'Turbidity',
          complianceDetails.turbidity.value,
          complianceDetails.turbidity.standard,
          complianceDetails.turbidity.status,
          complianceDetails.turbidity.percentage
        ],
        [
          'TDS',
          complianceDetails.tds.value,
          complianceDetails.tds.standard,
          complianceDetails.tds.status,
          complianceDetails.tds.percentage
        ],
        [
          'pH',
          complianceDetails.ph.value,
          complianceDetails.ph.standard,
          complianceDetails.ph.status,
          complianceDetails.ph.percentage
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Parameter', 'Avg Value', 'WHO Standard', 'Status', 'Compliance %']],
        body: complianceData,
        styles: { 
          fontSize: FONTS.small.size,
          cellPadding: 3,
          lineColor: [COLORS.gray.r, COLORS.gray.g, COLORS.gray.b],
          lineWidth: 0.1,
          halign: 'center',
        },
        headStyles: { 
          fillColor: [COLORS.primary.r, COLORS.primary.g, COLORS.primary.b],
          textColor: [COLORS.white.r, COLORS.white.g, COLORS.white.b],
          fontSize: FONTS.body.size,
          fontStyle: 'bold',
        },
        alternateRowStyles: { 
          fillColor: [COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40, halign: 'left' },
          1: { cellWidth: 30 },
          2: { cellWidth: 35 },
          3: { fontStyle: 'bold', cellWidth: 35 },
          4: { fontStyle: 'bold', cellWidth: 35 },
        },
        didParseCell: function(data) {
          if (data.column.index === 3) {
            const status = String(data.cell.raw || '').toLowerCase();
            if (status === 'compliant') {
              data.cell.styles.textColor = [COLORS.success.r, COLORS.success.g, COLORS.success.b];
            } else if (status === 'non-compliant') {
              data.cell.styles.textColor = [COLORS.danger.r, COLORS.danger.g, COLORS.danger.b];
            }
          }
          if (data.column.index === 4) {
            const percentStr = String(data.cell.raw || '0%');
            const percentage = parseFloat(percentStr.replace('%', ''));
            if (percentage >= 90) {
              data.cell.styles.textColor = [COLORS.success.r, COLORS.success.g, COLORS.success.b];
            } else if (percentage >= 70) {
              data.cell.styles.textColor = [COLORS.warning.r, COLORS.warning.g, COLORS.warning.b];
            } else {
              data.cell.styles.textColor = [COLORS.danger.r, COLORS.danger.g, COLORS.danger.b];
            }
          }
        },
        margin: { left: SPACING.page.left, right: SPACING.page.right },
      });

      yPos = doc.previousAutoTable && doc.previousAutoTable.finalY 
        ? doc.previousAutoTable.finalY + 8 
        : yPos + 50;
    }

    // Alerts section
    if (deviceReport.alerts && deviceReport.alerts.length > 0) {
      if (yPos > 230) {
        doc.addPage();
        yPos = SPACING.page.top;
      }

      const severityOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };
      const sortedAlerts = [...deviceReport.alerts].sort((a, b) => {
        const severityA = (a.severity || 'low').toLowerCase();
        const severityB = (b.severity || 'low').toLowerCase();
        return (severityOrder[severityA] || 5) - (severityOrder[severityB] || 5);
      });

      const criticalCount = sortedAlerts.filter(a => a.severity?.toLowerCase() === 'critical').length;
      const highCount = sortedAlerts.filter(a => a.severity?.toLowerCase() === 'high').length;
      const mediumCount = sortedAlerts.filter(a => a.severity?.toLowerCase() === 'medium').length;
      const lowCount = sortedAlerts.filter(a => a.severity?.toLowerCase() === 'low').length;

      const alertHeaderHeight = 12;
      doc.setFillColor(255, 250, 240);
      doc.roundedRect(SPACING.page.left, yPos, 180, alertHeaderHeight, 2, 2, 'F');
      doc.setDrawColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
      doc.setLineWidth(0.3);
      doc.roundedRect(SPACING.page.left, yPos, 180, alertHeaderHeight, 2, 2, 'S');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONTS.subheading.size);
      doc.setTextColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
      doc.text(`Active Alerts: ${deviceReport.alerts.length}`, SPACING.page.left + 3, yPos + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONTS.tiny.size);
      doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
      const breakdownText = `Critical: ${criticalCount} | High: ${highCount} | Medium: ${mediumCount} | Low: ${lowCount}`;
      doc.text(breakdownText, SPACING.page.left + 3, yPos + 9);
      
      yPos += alertHeaderHeight + 5;

      const alertsToShow = sortedAlerts.slice(0, 10);
      const alertTableData = alertsToShow.map((alert) => {
        const severity = (alert.severity || 'low').toUpperCase();
        let message = alert.message || alert.description || 'Alert triggered';
        if (alert.location && message.indexOf(alert.location) === -1) {
          message = `[${alert.location}] ${message}`;
        }
        const timestamp = alert.timestamp ? formatDateShort(alert.timestamp) : 'Recent';
        return [severity, message, timestamp];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Severity', 'Alert Message', 'Time']],
        body: alertTableData,
        styles: { 
          fontSize: FONTS.small.size,
          cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
          lineColor: [COLORS.gray.r, COLORS.gray.g, COLORS.gray.b],
          lineWidth: 0.15,
          halign: 'left',
          valign: 'middle',
          overflow: 'linebreak',
          minCellHeight: 10,
        },
        headStyles: { 
          fillColor: [COLORS.danger.r, COLORS.danger.g, COLORS.danger.b],
          textColor: [COLORS.white.r, COLORS.white.g, COLORS.white.b],
          fontSize: FONTS.body.size,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
          minCellHeight: 11,
        },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: 'bold', halign: 'center', fontSize: FONTS.small.size },
          1: { cellWidth: 117, halign: 'left', fontSize: FONTS.small.size },
          2: { cellWidth: 35, halign: 'center', fontSize: FONTS.small.size, fontStyle: 'normal' }
        },
        didParseCell: function(data) {
          if (data.column.index === 0 && data.section === 'body') {
            const severity = String(data.cell.raw || '').toLowerCase();
            if (severity === 'critical') {
              data.cell.styles.fillColor = [255, 230, 230];
              data.cell.styles.textColor = [COLORS.danger.r, COLORS.danger.g, COLORS.danger.b];
            } else if (severity === 'high') {
              data.cell.styles.fillColor = [255, 240, 225];
              data.cell.styles.textColor = [255, 87, 34];
            } else if (severity === 'medium') {
              data.cell.styles.fillColor = [255, 248, 220];
              data.cell.styles.textColor = [COLORS.warning.r, COLORS.warning.g, COLORS.warning.b];
            } else {
              data.cell.styles.fillColor = [240, 248, 255];
              data.cell.styles.textColor = [COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b];
            }
          }
          if (data.column.index === 2 && data.section === 'body') {
            data.cell.styles.textColor = [COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b];
          }
        },
        margin: { left: SPACING.page.left, right: SPACING.page.right },
        tableWidth: 'auto',
      });
      
      yPos = doc.previousAutoTable && doc.previousAutoTable.finalY 
        ? doc.previousAutoTable.finalY 
        : yPos + 60;
      
      if (sortedAlerts.length > 10) {
        yPos += 3;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(FONTS.small.size);
        doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
        doc.text(`+ ${sortedAlerts.length - 10} more alerts not shown (view in system for full list)`, SPACING.page.left + 5, yPos);
        yPos += 5;
      }
      
      yPos += 8;
    } else {
      yPos += 5;
    }
  }

  return yPos;
}

/**
 * Add recommendations section
 */
function addRecommendations(doc, reportData, yPos) {
  if (yPos > 220) {
    doc.addPage();
    yPos = SPACING.page.top;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Recommendations & Action Items', SPACING.page.left, yPos);
  doc.setDrawColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.setLineWidth(0.8);
  doc.line(SPACING.page.left, yPos + 2, SPACING.page.left + 80, yPos + 2);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  
  const recommendations = generateRecommendations(reportData);
  recommendations.forEach((rec, index) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = SPACING.page.top;
    }
    
    doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    doc.text(`${index + 1}.`, SPACING.page.left, yPos);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    
    const recLines = doc.splitTextToSize(rec, 170);
    doc.text(recLines, SPACING.page.left + 8, yPos);
    yPos += (recLines.length * 5) + 3;
  });

  return yPos;
}

/**
 * Add professional footer to all pages
 */
function addProfessionalFooter(doc, reportId) {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setDrawColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.setLineWidth(0.5);
    doc.line(SPACING.page.left, 280, 195, 280);
    
    doc.setFont('helvetica', FONTS.small.style);
    doc.setFontSize(FONTS.small.size);
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    
    doc.setFontSize(FONTS.tiny.size);
    const currentYear = new Date().getFullYear();
    doc.text(
      `PureTrack © ${currentYear} | Report ID: ${reportId}`,
      105,
      289,
      { align: 'center' }
    );
    
    doc.text(
      `Generated: ${formatDateTime(new Date())}`,
      105,
      293,
      { align: 'center' }
    );
  }
}

module.exports = {
  generateWaterQualityReportPDF
};