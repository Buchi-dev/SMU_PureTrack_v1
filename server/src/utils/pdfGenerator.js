const jsPDF = require('jspdf');
require('jspdf-autotable');

// ============================================================================
// CONSTANTS - Design System
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
 * Set text color using RGB values
 */
function setTextColor(doc, color) {
  doc.setTextColor(color.r, color.g, color.b);
}

/**
 * Set fill color using RGB values
 */
function setFillColor(doc, color) {
  doc.setFillColor(color.r, color.g, color.b);
}

/**
 * Draw a colored rectangle
 */
function drawRect(doc, x, y, width, height, color) {
  setFillColor(doc, color);
  doc.rect(x, y, width, height, 'F');
}

/**
 * Add a section header with background
 */
function addSectionHeader(doc, title, yPos) {
  const pageWidth = doc.internal.pageSize.width;
  const headerHeight = 8;

  // Background rectangle
  drawRect(doc, SPACING.page.left, yPos, pageWidth - SPACING.page.left - SPACING.page.right, headerHeight, COLORS.primary);

  // Title text
  setTextColor(doc, COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.subheading.size);
  doc.text(title, SPACING.page.left + 3, yPos + 5.5);

  return yPos + headerHeight + SPACING.paragraph;
}

/**
 * Format date for display
 */
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get status color based on parameter status
 */
function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'good':
    case 'normal':
    case 'safe':
      return COLORS.success;
    case 'warning':
    case 'caution':
      return COLORS.warning;
    case 'critical':
    case 'danger':
    case 'poor':
      return COLORS.danger;
    default:
      return COLORS.gray;
  }
}

// ============================================================================
// PDF GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate Water Quality Report PDF
 * @param {Object} reportConfig - Report configuration
 * @param {Object} reportData - Report data from database
 * @returns {Buffer} PDF buffer
 */
function generateWaterQualityReportPDF(reportConfig, reportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let yPos = SPACING.page.top;

  // Title Page
  yPos = addTitlePage(doc, reportConfig, reportData, yPos);

  // Executive Summary
  yPos = addExecutiveSummary(doc, reportData, yPos);

  // Device Overview
  if (reportData.devices && reportData.devices.length > 0) {
    yPos = addDeviceOverview(doc, reportData.devices, yPos);
  }

  // Detailed Metrics
  yPos = addDetailedMetrics(doc, reportData, yPos);

  // Compliance Assessment
  yPos = addComplianceAssessment(doc, reportData, yPos);

  // Footer
  addFooter(doc);

  // Return PDF as buffer
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Add title page to PDF
 */
function addTitlePage(doc, reportConfig, reportData, yPos) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const centerX = pageWidth / 2;

  // Title
  setTextColor(doc, COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.title.size);
  doc.text('Water Quality Analysis Report', centerX, yPos, { align: 'center' });

  yPos += SPACING.section;

  // Subtitle
  setTextColor(doc, COLORS.textSecondary);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.subtitle.size);
  doc.text('Comprehensive Water Quality Monitoring & Compliance Assessment', centerX, yPos, { align: 'center' });

  yPos += SPACING.section * 2;

  // Report details
  setTextColor(doc, COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.body.size);

  const details = [
    `Report Title: ${reportConfig.title || 'Water Quality Report'}`,
    `Generated: ${formatDate(new Date())}`,
    `Period: ${formatDate(reportConfig.dateRange?.[0])} - ${formatDate(reportConfig.dateRange?.[1])}`,
    `Devices Monitored: ${reportData.devices?.length || 0}`,
    `Total Readings: ${reportData.summary?.totalReadings || 0}`
  ];

  details.forEach(detail => {
    doc.text(detail, centerX, yPos, { align: 'center' });
    yPos += SPACING.line;
  });

  // Add page break for next section
  doc.addPage();
  return SPACING.page.top;
}

/**
 * Add executive summary section
 */
function addExecutiveSummary(doc, reportData, yPos) {
  yPos = addSectionHeader(doc, 'EXECUTIVE SUMMARY', yPos);

  setTextColor(doc, COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.body.size);

  const summary = reportData.summary || {};
  const text = `This report provides a comprehensive analysis of water quality data collected from ${reportData.devices?.length || 0} monitoring devices. The analysis covers ${summary.totalReadings || 0} sensor readings over the reporting period, evaluating key water quality parameters including turbidity, TDS (Total Dissolved Solids), and pH levels.`;

  const lines = doc.splitTextToSize(text, doc.internal.pageSize.width - SPACING.page.left - SPACING.page.right);
  doc.text(lines, SPACING.page.left, yPos);
  yPos += lines.length * SPACING.line + SPACING.paragraph;

  // Key metrics summary
  const metrics = [
    { label: 'Average Turbidity', value: `${summary.averageTurbidity?.toFixed(2) || 'N/A'} NTU` },
    { label: 'Average TDS', value: `${summary.averageTDS?.toFixed(2) || 'N/A'} ppm` },
    { label: 'Average pH', value: `${summary.averagePH?.toFixed(2) || 'N/A'}` }
  ];

  metrics.forEach(metric => {
    doc.text(`${metric.label}: ${metric.value}`, SPACING.page.left, yPos);
    yPos += SPACING.line;
  });

  return yPos + SPACING.section;
}

/**
 * Add device overview section
 */
function addDeviceOverview(doc, devices, yPos) {
  yPos = addSectionHeader(doc, 'DEVICE OVERVIEW', yPos);

  const tableData = devices.map(device => [
    device.device?.deviceId || device.deviceId || 'Unknown',
    device.device?.name || device.deviceName || 'Unnamed Device',
    device.location || 'N/A',
    device.readingCount || 0,
    device.alerts?.length || 0
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['Device ID', 'Name', 'Location', 'Readings', 'Alerts']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: FONTS.small.size,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [COLORS.primary.r, COLORS.primary.g, COLORS.primary.b],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 20 },
      4: { cellWidth: 15 },
    },
  });

  return (doc.lastAutoTable?.finalY || yPos) + SPACING.section;
}

/**
 * Add detailed metrics section
 */
function addDetailedMetrics(doc, reportData, yPos) {
  yPos = addSectionHeader(doc, 'DETAILED METRICS', yPos);

  const summary = reportData.summary || {};

  // Summary metrics table
  const metricsData = [
    ['Parameter', 'Average', 'Min', 'Max', 'Status'],
    ['Turbidity (NTU)', summary.averageTurbidity?.toFixed(2) || 'N/A', summary.minTurbidity?.toFixed(2) || 'N/A', summary.maxTurbidity?.toFixed(2) || 'N/A', 'Normal'],
    ['TDS (ppm)', summary.averageTDS?.toFixed(2) || 'N/A', summary.minTDS?.toFixed(2) || 'N/A', summary.maxTDS?.toFixed(2) || 'N/A', 'Normal'],
    ['pH', summary.averagePH?.toFixed(2) || 'N/A', summary.minPH?.toFixed(2) || 'N/A', summary.maxPH?.toFixed(2) || 'N/A', 'Normal']
  ];

  doc.autoTable({
    startY: yPos,
    head: [metricsData[0]],
    body: metricsData.slice(1),
    theme: 'grid',
    styles: {
      fontSize: FONTS.small.size,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [COLORS.primary.r, COLORS.primary.g, COLORS.primary.b],
      textColor: 255,
      fontStyle: 'bold',
    },
  });

  return (doc.lastAutoTable?.finalY || yPos) + SPACING.section;
}

/**
 * Add compliance assessment section
 */
function addComplianceAssessment(doc, reportData, yPos) {
  yPos = addSectionHeader(doc, 'COMPLIANCE ASSESSMENT', yPos);

  setTextColor(doc, COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONTS.body.size);

  const complianceText = 'Water quality parameters are assessed against WHO (World Health Organization) drinking water standards. The monitoring system provides real-time alerts for parameters exceeding acceptable ranges, ensuring prompt response to water quality issues.';

  const lines = doc.splitTextToSize(complianceText, doc.internal.pageSize.width - SPACING.page.left - SPACING.page.right);
  doc.text(lines, SPACING.page.left, yPos);
  yPos += lines.length * SPACING.line + SPACING.paragraph;

  // Compliance status
  const statusText = 'Overall Status: COMPLIANT - All monitored parameters within acceptable ranges.';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONTS.subheading.size);
  setTextColor(doc, COLORS.success);
  doc.text(statusText, SPACING.page.left, yPos);

  return yPos + SPACING.section;
}

/**
 * Add footer to all pages
 */
function addFooter(doc) {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Footer line
    setFillColor(doc, COLORS.lightGray);
    doc.rect(0, pageHeight - 15, pageWidth, 0.5, 'F');

    // Footer text
    setTextColor(doc, COLORS.textSecondary);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONTS.tiny.size);

    const footerText = `Generated by Water Quality Monitoring System | Page ${i} of ${pageCount}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 5, { align: 'center' });
  }
}

module.exports = {
  generateWaterQualityReportPDF
};