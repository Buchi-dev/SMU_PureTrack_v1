import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import type { ReportConfig } from '../../../../schemas';

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

// Type extension for jsPDF with autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

// Type definitions for report data
interface WaterQualityMetrics {
  turbidity?: { value: number; status: string };
  tds?: { value: number; status: string };
  ph?: { value: number; status: string };
  totalReadings?: number;
  avgTurbidity?: number;
  avgTDS?: number;
  avgPH?: number;
  minTurbidity?: number;
  maxTurbidity?: number;
  minTDS?: number;
  maxTDS?: number;
  minPH?: number;
  maxPH?: number;
}

interface AlertData {
  severity: string;
  parameter: string;
  value: number;
  timestamp: string | Date;
  message?: string;
  description?: string;
  location?: string;
}

interface DeviceReport {
  device: { deviceId: string; name: string };
  deviceId?: string;
  deviceName?: string;
  location?: string;
  readingCount: number;
  metrics?: WaterQualityMetrics;
  alerts?: AlertData[];
  readings?: { timestamp: string | Date; turbidity?: number; tds?: number; ph?: number }[];
}

interface ReportSummary {
  totalReadings?: number;
  avgTurbidity?: number;
  avgTDS?: number;
  avgPH?: number;
  averageTurbidity?: number;
  averageTDS?: number;
  averagePH?: number;
  turbidity?: { value: number; status: string };
  tds?: { value: number; status: string };
  ph?: { value: number; status: string };
}

interface WaterQualityReportData {
  devices?: DeviceReport[];
  summary?: ReportSummary;
  period?: { start: string | Date; end: string | Date } | string;
}

export const generateWaterQualityReport = async (
  config: ReportConfig,
  reportData: WaterQualityReportData
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const reportId = `WQR-${dayjs().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
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
  doc.text(config.title || 'Comprehensive Water Quality Assessment', 105, 32, { align: 'center' });
  
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
  doc.text(`Generated: ${dayjs().format('MMMM D, YYYY [at] h:mm A')}`, col1X, yPos);
  doc.text(`Generated By: ${config.generatedBy || 'System Administrator'}`, col1X, yPos + 5);
  doc.text(`Devices Monitored: ${reportData.devices?.length || config.deviceIds.length}`, col1X, yPos + 10);
  
  // Column 2
  if (reportData.period && typeof reportData.period !== 'string') {
    doc.text(`Report Period:`, col2X, yPos);
    doc.text(`${dayjs(reportData.period.start).format('MMM D, YYYY')} - ${dayjs(reportData.period.end).format('MMM D, YYYY')}`, col2X, yPos + 5);
  }
  doc.text(`Total Readings: ${reportData.summary?.totalReadings || 0}`, col2X, yPos + 10);
  
  yPos += 17;
  
  // Notes section (if present)
  if (config.notes) {
    doc.setFont('helvetica', FONTS.small.style);
    doc.setFontSize(FONTS.small.size);
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    const notesText = `Notes: ${config.notes}`;
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

  // Section header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text('Regulatory Standards Reference', SPACING.page.left, yPos);
  
  // Decorative underline
  doc.setDrawColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
  doc.setLineWidth(0.8);
  doc.line(SPACING.page.left, yPos + 2, SPACING.page.left + 70, yPos + 2);
  
  yPos += 10;

  // Standards table with WHO guidelines
  const standardsData = [
    ['Turbidity', '< 5 NTU', 'WHO Guidelines for Drinking Water', 'Aesthetic quality indicator'],
    ['TDS (Total Dissolved Solids)', '< 500 ppm', 'WHO Guidelines for Drinking Water', 'Taste and health indicator'],
    ['pH Level', '6.5 - 8.5', 'WHO Guidelines for Drinking Water', 'Acidity/alkalinity balance'],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Parameter', 'Standard Limit', 'Reference', 'Description']],
    body: standardsData,
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
  
  yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 10;
  yPos += SPACING.section;

  // ============================================================================
  // EXECUTIVE SUMMARY WITH COMPLIANCE METRICS
  // ============================================================================
  if (reportData.summary) {
    if (yPos > 220) {
      doc.addPage();
      yPos = SPACING.page.top;
    }

    // Section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text('Executive Summary & Compliance Overview', SPACING.page.left, yPos);
    
    // Decorative underline
    doc.setDrawColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    doc.setLineWidth(0.8);
    doc.line(SPACING.page.left, yPos + 2, SPACING.page.left + 70, yPos + 2);
    
    yPos += 12;

    const summary = reportData.summary;
    const overallStatus = getOverallStatus(summary);
    const complianceMetrics = calculateComplianceMetrics(summary);

    // Check if we have actual data
    const hasData = summary.averageTurbidity !== undefined && 
                    (summary.totalReadings || 0) > 0;

    // Status badge with rounded corners and improved layout
    const badgeHeight = 45;
    doc.setFillColor(overallStatus.color[0], overallStatus.color[1], overallStatus.color[2]);
    doc.roundedRect(SPACING.page.left, yPos, 180, badgeHeight, 3, 3, 'F');
    
    // Status title (larger, bolder)
    doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Overall Water Quality: ${overallStatus.status}`, SPACING.page.left + 8, yPos + 12);
    
    // Add summary stats in badge with better formatting
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    if (hasData) {
      // Row 1: Water Quality Parameters
      const turbidity = (summary.averageTurbidity || 0).toFixed(2);
      const tds = (summary.averageTDS || 0).toFixed(0);
      const ph = (summary.averagePH || 0).toFixed(2);
      
      doc.text(
        `Water Quality: Turbidity ${turbidity} NTU  •  TDS ${tds} ppm  •  pH ${ph}`,
        SPACING.page.left + 8,
        yPos + 21
      );
      
      // Row 2: Monitoring Information
      let periodStart = 'N/A';
      let periodEnd = 'N/A';
      
      if (reportData.period && typeof reportData.period !== 'string') {
        periodStart = dayjs(reportData.period.start).format('MMM D, YYYY');
        periodEnd = dayjs(reportData.period.end).format('MMM D, YYYY');
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
      
      const turbStatus = (summary.averageTurbidity || 0) <= 5 ? '✓ Compliant' : '✗ Non-Compliant';
      const turbColor = (summary.averageTurbidity || 0) <= 5 ? COLORS.success : COLORS.danger;
      doc.setTextColor(turbColor.r, turbColor.g, turbColor.b);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`${(summary.averageTurbidity || 0).toFixed(2)}`, card1X + 3, yPos + 16);
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
      
      const tdsStatus = (summary.averageTDS || 0) <= 500 ? '✓ Compliant' : '✗ Non-Compliant';
      const tdsColor = (summary.averageTDS || 0) <= 500 ? COLORS.success : COLORS.danger;
      doc.setTextColor(tdsColor.r, tdsColor.g, tdsColor.b);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`${(summary.averageTDS || 0).toFixed(0)}`, card2X + 3, yPos + 16);
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
      
      const phValue = summary.averagePH || 0;
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
      
      yPos += cardHeight + 10;
    }
    
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  }

  // ============================================================================
  // DEVICE ANALYSIS - Detailed Metrics Per Device
  // ============================================================================
  if (reportData.devices && reportData.devices.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = SPACING.page.top;
    }

    // Section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text('Device Analysis', SPACING.page.left, yPos);
    
    // Decorative underline
    doc.setDrawColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    doc.setLineWidth(0.8);
    doc.line(SPACING.page.left, yPos + 2, SPACING.page.left + 40, yPos + 2);
    
    yPos += 10;

    for (const deviceReport of reportData.devices) {
      if (yPos > 240) {
        doc.addPage();
        yPos = SPACING.page.top;
      }

      // Device header card with proper height
      const deviceHeaderHeight = 12;
      doc.setFillColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
      doc.roundedRect(SPACING.page.left, yPos, 180, deviceHeaderHeight, 2, 2, 'F');
      doc.setDrawColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      doc.setLineWidth(0.2);
      doc.roundedRect(SPACING.page.left, yPos, 180, deviceHeaderHeight, 2, 2, 'S');
      
      // Device name (left side)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONTS.subheading.size);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      const deviceName = deviceReport.deviceName || deviceReport.deviceId || 'Unknown Device';
      doc.text(`Device: ${deviceName}`, SPACING.page.left + 3, yPos + 7.5);
      
      // Location (right side) with proper text wrapping
      if (deviceReport.location) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONTS.small.size);
        doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
        const locationText = `Location: ${deviceReport.location}`;
        const maxLocationWidth = 70;
        const wrappedLocation = doc.splitTextToSize(locationText, maxLocationWidth);
        doc.text(wrappedLocation[0], SPACING.page.left + 105, yPos + 7.5);
      }
      
      yPos += deviceHeaderHeight + 5;

      // Check if device has any readings
      if (!deviceReport.metrics || deviceReport.metrics.totalReadings === 0) {
        // Show warning card for no data
        doc.setFillColor(255, 250, 230); // Light yellow background
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
        continue; // Skip to next device
      }

      // OPTIMIZED Metrics table - Maximizes PDF space (180mm full width)
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
            0: { fontStyle: 'bold', cellWidth: 32, halign: 'left' },    // Parameter - wider
            1: { cellWidth: 35, halign: 'center' },                      // Average - wider
            2: { cellWidth: 40, halign: 'center' },                      // Min/Max - wider for ranges
            3: { cellWidth: 35, halign: 'center' },                      // Safe Range - wider
            4: { 
              cellWidth: 38,                                              // Status - wider for full text
              fontStyle: 'bold',
              halign: 'center',
            }
          },
          didParseCell: function(data) {
            // Color-code Status column
            if (data.column.index === 4) {
              const status = String(data.cell.raw || '').toUpperCase();
              if (status.includes('GOOD')) {
                data.cell.styles.textColor = [COLORS.success.r, COLORS.success.g, COLORS.success.b];
                data.cell.styles.fillColor = [240, 255, 240]; // Light green background
              } else if (status.includes('WARNING')) {
                data.cell.styles.textColor = [COLORS.warning.r, COLORS.warning.g, COLORS.warning.b];
                data.cell.styles.fillColor = [255, 250, 230]; // Light yellow background
              } else {
                data.cell.styles.textColor = [COLORS.danger.r, COLORS.danger.g, COLORS.danger.b];
                data.cell.styles.fillColor = [255, 240, 240]; // Light red background
              }
            }
          },
          margin: { left: SPACING.page.left, right: SPACING.page.right },
          tableWidth: 'auto',
        });

        yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 10;
        yPos += 5;
      }

      // ========================================================================
      // COMPLIANCE DETAILS TABLE - Per-Parameter Compliance Percentages
      // ========================================================================
      if (deviceReport.metrics) {
        if (yPos > 230) {
          doc.addPage();
          yPos = SPACING.page.top;
        }

        const metrics = deviceReport.metrics;
        const complianceDetails = calculateDeviceCompliance(metrics);

        // Compliance section sub-header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONTS.subheading.size);
        doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
        doc.text('Compliance Analysis', SPACING.page.left, yPos);
        yPos += 6;

        // Compliance details table
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
            // Color-code Status column (index 3)
            if (data.column.index === 3) {
              const status = String(data.cell.raw || '').toLowerCase();
              if (status === 'compliant') {
                data.cell.styles.textColor = [COLORS.success.r, COLORS.success.g, COLORS.success.b];
              } else if (status === 'non-compliant') {
                data.cell.styles.textColor = [COLORS.danger.r, COLORS.danger.g, COLORS.danger.b];
              } else {
                data.cell.styles.textColor = [COLORS.gray.r, COLORS.gray.g, COLORS.gray.b];
              }
            }
            // Color-code Compliance % column (index 4)
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

        yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 10;
        yPos += 8;
      }

      // OPTIMIZED Alerts section - Organized by severity (CRITICAL → HIGH → MEDIUM → LOW)
      if (deviceReport.alerts && deviceReport.alerts.length > 0) {
        if (yPos > 230) {
          doc.addPage();
          yPos = SPACING.page.top;
        }

        // Sort alerts by severity priority
        const severityOrder: { [key: string]: number } = { 
          'critical': 1, 
          'high': 2, 
          'medium': 3, 
          'low': 4 
        };
        const sortedAlerts = [...deviceReport.alerts].sort((a, b) => {
          const severityA = (a.severity || 'low').toLowerCase();
          const severityB = (b.severity || 'low').toLowerCase();
          return (severityOrder[severityA] || 5) - (severityOrder[severityB] || 5);
        });

        // Count alerts by severity
        const criticalCount = sortedAlerts.filter(a => a.severity?.toLowerCase() === 'critical').length;
        const highCount = sortedAlerts.filter(a => a.severity?.toLowerCase() === 'high').length;
        const mediumCount = sortedAlerts.filter(a => a.severity?.toLowerCase() === 'medium').length;
        const lowCount = sortedAlerts.filter(a => a.severity?.toLowerCase() === 'low').length;

        // Alert section header with severity breakdown
        const alertHeaderHeight = 12;
        doc.setFillColor(255, 250, 240); // Light orange background
        doc.roundedRect(SPACING.page.left, yPos, 180, alertHeaderHeight, 2, 2, 'F');
        doc.setDrawColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
        doc.setLineWidth(0.3);
        doc.roundedRect(SPACING.page.left, yPos, 180, alertHeaderHeight, 2, 2, 'S');
        
        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONTS.subheading.size);
        doc.setTextColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
        doc.text(`Active Alerts: ${deviceReport.alerts.length}`, SPACING.page.left + 3, yPos + 5);
        
        // Severity breakdown (smaller text on second line)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONTS.tiny.size);
        doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
        const breakdownText = `Critical: ${criticalCount} | High: ${highCount} | Medium: ${mediumCount} | Low: ${lowCount}`;
        doc.text(breakdownText, SPACING.page.left + 3, yPos + 9);
        
        yPos += alertHeaderHeight + 5;

        // Display alerts in organized table format (max 10 alerts)
        const alertsToShow = sortedAlerts.slice(0, 10);
        const alertTableData = alertsToShow.map((alert) => {
          const severity = (alert.severity || 'low').toUpperCase();
          
          // Get message with fallback to description or location info
          let message = alert.message || alert.description || 'Alert triggered';
          if (alert.location && message.indexOf(alert.location) === -1) {
            message = `[${alert.location}] ${message}`;
          }
          
          // Format timestamp properly
          let timestamp = 'Just now';
          if (alert.timestamp) {
            try {
              timestamp = dayjs(alert.timestamp).format('MMM D, HH:mm');
            } catch {
              timestamp = 'Recent';
            }
          }
          
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
          alternateRowStyles: {
            fillColor: [252, 252, 252] // Very light gray for alternating rows
          },
          columnStyles: {
            0: { 
              cellWidth: 28, 
              fontStyle: 'bold', 
              halign: 'center',
              fontSize: FONTS.small.size,
            },
            1: { 
              cellWidth: 117,  // Slightly adjusted for better fit
              halign: 'left',
              fontSize: FONTS.small.size,
            },
            2: { 
              cellWidth: 35, 
              halign: 'center',
              fontSize: FONTS.small.size,
              fontStyle: 'normal',
            }
          },
          didParseCell: function(data) {
            // Color-code Severity column with distinct backgrounds
            if (data.column.index === 0 && data.section === 'body') {
              const severity = String(data.cell.raw || '').toLowerCase();
              if (severity === 'critical') {
                data.cell.styles.fillColor = [255, 230, 230]; // Stronger light red
                data.cell.styles.textColor = [COLORS.danger.r, COLORS.danger.g, COLORS.danger.b];
              } else if (severity === 'high') {
                data.cell.styles.fillColor = [255, 240, 225]; // Stronger light orange
                data.cell.styles.textColor = [255, 87, 34]; // Deep orange
              } else if (severity === 'medium') {
                data.cell.styles.fillColor = [255, 248, 220]; // Stronger light yellow
                data.cell.styles.textColor = [COLORS.warning.r, COLORS.warning.g, COLORS.warning.b];
              } else {
                data.cell.styles.fillColor = [240, 248, 255]; // Stronger light blue
                data.cell.styles.textColor = [COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b];
              }
            }
            
            // Style Time column with gray text
            if (data.column.index === 2 && data.section === 'body') {
              data.cell.styles.textColor = [COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b];
            }
          },
          margin: { left: SPACING.page.left, right: SPACING.page.right },
          tableWidth: 'auto',
        });
        
        yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 10;
        
        // Show remaining alerts count if more than 10
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
  }

  // ============================================================================
  // STATISTICAL ANALYSIS SECTION (if enabled)
  // ============================================================================
  if (config.includeStatistics && reportData.summary && (reportData.summary.totalReadings || 0) > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = SPACING.page.top;
    }

    // Section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text('Statistical Analysis', SPACING.page.left, yPos);
    
    // Decorative underline
    doc.setDrawColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    doc.setLineWidth(0.8);
    doc.line(SPACING.page.left, yPos + 2, SPACING.page.left + 50, yPos + 2);
    
    yPos += 12;

    // Calculate statistical metrics
    const devices = reportData.devices || [];
    const devicesWithData = devices.filter((d: any) => d.readingCount > 0);
    
    // Aggregate all metrics
    let allTurbidity: number[] = [];
    let allTDS: number[] = [];
    let allPH: number[] = [];
    
    devicesWithData.forEach((device: any) => {
      if (device.metrics) {
        if (device.metrics.avgTurbidity) allTurbidity.push(device.metrics.avgTurbidity);
        if (device.metrics.avgTDS) allTDS.push(device.metrics.avgTDS);
        if (device.metrics.avgPH) allPH.push(device.metrics.avgPH);
      }
    });

    // Calculate standard deviation
    const calculateStdDev = (values: number[]) => {
      if (values.length === 0) return 0;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      return Math.sqrt(variance);
    };

    const statsData = [
      [
        'Turbidity',
        reportData.summary.averageTurbidity?.toFixed(2) || 'N/A',
        allTurbidity.length > 0 ? Math.min(...allTurbidity).toFixed(2) : 'N/A',
        allTurbidity.length > 0 ? Math.max(...allTurbidity).toFixed(2) : 'N/A',
        calculateStdDev(allTurbidity).toFixed(2),
        devicesWithData.length.toString()
      ],
      [
        'TDS',
        reportData.summary.averageTDS?.toFixed(2) || 'N/A',
        allTDS.length > 0 ? Math.min(...allTDS).toFixed(2) : 'N/A',
        allTDS.length > 0 ? Math.max(...allTDS).toFixed(2) : 'N/A',
        calculateStdDev(allTDS).toFixed(2),
        devicesWithData.length.toString()
      ],
      [
        'pH',
        reportData.summary.averagePH?.toFixed(2) || 'N/A',
        allPH.length > 0 ? Math.min(...allPH).toFixed(2) : 'N/A',
        allPH.length > 0 ? Math.max(...allPH).toFixed(2) : 'N/A',
        calculateStdDev(allPH).toFixed(2),
        devicesWithData.length.toString()
      ],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Parameter', 'Mean', 'Min', 'Max', 'Std Dev', 'Devices']],
      body: statsData,
      styles: {
        fontSize: FONTS.body.size,
        cellPadding: 4,
        lineColor: [COLORS.gray.r, COLORS.gray.g, COLORS.gray.b],
        lineWidth: 0.15,
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
        0: { fontStyle: 'bold', cellWidth: 35, halign: 'left' },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 25 },
      },
      margin: { left: SPACING.page.left, right: SPACING.page.right },
    });

    yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 10;
    yPos += 10;

    // Statistical insights
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONTS.subheading.size);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text('Key Insights:', SPACING.page.left, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONTS.body.size);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);

    const insights = [];
    
    // Variability insights
    if (calculateStdDev(allTurbidity) > 2) {
      insights.push(`High variability in turbidity (σ=${calculateStdDev(allTurbidity).toFixed(2)} NTU) across devices - indicates inconsistent water sources or filtration.`);
    }
    if (calculateStdDev(allPH) > 0.5) {
      insights.push(`Significant pH variation (σ=${calculateStdDev(allPH).toFixed(2)}) detected - may require zone-specific treatment.`);
    }
    if (calculateStdDev(allTDS) > 50) {
      insights.push(`TDS levels show high variance (σ=${calculateStdDev(allTDS).toFixed(2)} ppm) - suggests different mineral content across zones.`);
    }

    // Data coverage
    const coveragePercent = (devicesWithData.length / devices.length) * 100;
    insights.push(`Data coverage: ${devicesWithData.length}/${devices.length} devices (${coveragePercent.toFixed(0)}%) provided readings during this period.`);
    
    insights.push(`Total readings analyzed: ${reportData.summary.totalReadings} across ${devicesWithData.length} active monitoring points.`);

    insights.forEach((insight) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = SPACING.page.top;
      }
      doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
      doc.text('•', SPACING.page.left, yPos);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      const lines = doc.splitTextToSize(insight, 170);
      doc.text(lines, SPACING.page.left + 5, yPos);
      yPos += (lines.length * 5) + 2;
    });

    yPos += 8;
  }

  // ============================================================================
  // CHARTS & VISUALIZATIONS SECTION (if enabled)
  // ============================================================================
  if (config.includeCharts && reportData.devices && reportData.devices.length > 0) {
    const devicesWithData = reportData.devices.filter((d: any) => d.readingCount > 0);
    
    if (devicesWithData.length > 0) {
      if (yPos > 180) {
        doc.addPage();
        yPos = SPACING.page.top;
      }

      // Section header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text('Visual Analytics', SPACING.page.left, yPos);
      
      // Decorative underline
      doc.setDrawColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
      doc.setLineWidth(0.8);
      doc.line(SPACING.page.left, yPos + 2, SPACING.page.left + 45, yPos + 2);
      
      yPos += 12;

      // Chart 1: Parameter Comparison Bar Chart
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONTS.subheading.size);
      doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      doc.text('Average Water Quality Parameters by Device', SPACING.page.left, yPos);
      yPos += 8;

      // Draw simple bar chart for each parameter
      const chartWidth = 170;
      const barHeight = 12;
      const maxDevicesToShow = 5;
      const devicesToChart = devicesWithData.slice(0, maxDevicesToShow);

      // Draw Turbidity chart
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONTS.small.size);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      doc.text('Turbidity (NTU):', SPACING.page.left, yPos);
      yPos += 5;

      const maxTurbidity = Math.max(...devicesToChart.map((d: any) => d.metrics?.avgTurbidity || 0), 5);
      devicesToChart.forEach((device: any) => {
        const turbValue = device.metrics?.avgTurbidity || 0;
        const barWidth = (turbValue / maxTurbidity) * (chartWidth - 60);
        const isCompliant = turbValue <= 5;
        
        // Device name
        const deviceLabel = (device.deviceName || device.deviceId).substring(0, 15);
        doc.setFontSize(FONTS.tiny.size);
        doc.text(deviceLabel, SPACING.page.left + 2, yPos + 4);
        
        // Bar
        const barColor = isCompliant ? COLORS.success : COLORS.warning;
        doc.setFillColor(barColor.r, barColor.g, barColor.b);
        doc.rect(SPACING.page.left + 45, yPos, Math.max(barWidth, 2), barHeight - 2, 'F');
        
        // Value label
        doc.setFontSize(FONTS.tiny.size);
        doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        doc.text(`${turbValue.toFixed(1)}`, SPACING.page.left + 48 + barWidth, yPos + 4);
        
        yPos += barHeight;
      });

      yPos += 5;

      // Draw pH chart
      if (yPos > 220) {
        doc.addPage();
        yPos = SPACING.page.top;
      }

      doc.setFontSize(FONTS.small.size);
      doc.text('pH Level:', SPACING.page.left, yPos);
      yPos += 5;

      devicesToChart.forEach((device: any) => {
        const phValue = device.metrics?.avgPH || 0;
        const normalizedPH = ((phValue - 6.0) / 2.5) * (chartWidth - 60); // Scale 6.0-8.5 to chart width
        const isCompliant = phValue >= 6.5 && phValue <= 8.5;
        
        // Device name
        const deviceLabel = (device.deviceName || device.deviceId).substring(0, 15);
        doc.setFontSize(FONTS.tiny.size);
        doc.text(deviceLabel, SPACING.page.left + 2, yPos + 4);
        
        // Bar
        const barColor = isCompliant ? COLORS.success : COLORS.danger;
        doc.setFillColor(barColor.r, barColor.g, barColor.b);
        doc.rect(SPACING.page.left + 45, yPos, Math.max(normalizedPH, 2), barHeight - 2, 'F');
        
        // Value label
        doc.setFontSize(FONTS.tiny.size);
        doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        doc.text(`${phValue.toFixed(2)}`, SPACING.page.left + 48 + normalizedPH, yPos + 4);
        
        yPos += barHeight;
      });

      yPos += 5;

      // Draw TDS chart
      if (yPos > 220) {
        doc.addPage();
        yPos = SPACING.page.top;
      }

      doc.setFontSize(FONTS.small.size);
      doc.text('TDS (ppm):', SPACING.page.left, yPos);
      yPos += 5;

      const maxTDS = Math.max(...devicesToChart.map((d: any) => d.metrics?.avgTDS || 0), 500);
      devicesToChart.forEach((device: any) => {
        const tdsValue = device.metrics?.avgTDS || 0;
        const barWidth = (tdsValue / maxTDS) * (chartWidth - 60);
        const isCompliant = tdsValue <= 500;
        
        // Device name
        const deviceLabel = (device.deviceName || device.deviceId).substring(0, 15);
        doc.setFontSize(FONTS.tiny.size);
        doc.text(deviceLabel, SPACING.page.left + 2, yPos + 4);
        
        // Bar
        const barColor = isCompliant ? COLORS.success : COLORS.warning;
        doc.setFillColor(barColor.r, barColor.g, barColor.b);
        doc.rect(SPACING.page.left + 45, yPos, Math.max(barWidth, 2), barHeight - 2, 'F');
        
        // Value label
        doc.setFontSize(FONTS.tiny.size);
        doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
        doc.text(`${tdsValue.toFixed(0)}`, SPACING.page.left + 48 + barWidth, yPos + 4);
        
        yPos += barHeight;
      });

      yPos += 10;

      // Chart legend
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(FONTS.tiny.size);
      doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      doc.text('Note: Green bars indicate compliant values, orange/red bars indicate non-compliant values.', SPACING.page.left, yPos);
      yPos += 10;
    }
  }

  // ============================================================================
  // RECOMMENDATIONS SECTION - Action Items
  // ============================================================================
  const hasIssues = reportData.devices?.some((d) => d.alerts && d.alerts.length > 0);
  if (hasIssues) {
    if (yPos > 220) {
      doc.addPage();
      yPos = SPACING.page.top;
    }

    // Section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text('Recommendations & Action Items', SPACING.page.left, yPos);
    
    // Decorative underline
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
      
      // Numbered recommendation with bullet icon
      doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
      doc.text(`${index + 1}.`, SPACING.page.left, yPos);
      doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
      
      const recLines = doc.splitTextToSize(rec, 170);
      doc.text(recLines, SPACING.page.left + 8, yPos);
      yPos += (recLines.length * 5) + 3;
    });
  }

  // ============================================================================
  // PROFESSIONAL FOOTER - Added to all pages
  // ============================================================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer separator line
    doc.setDrawColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.setLineWidth(0.5);
    doc.line(SPACING.page.left, 280, 195, 280);
    
    // Page number
    doc.setFont('helvetica', FONTS.small.style);
    doc.setFontSize(FONTS.small.size);
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    
    // Footer text with report metadata
    doc.setFontSize(FONTS.tiny.size);
    doc.text(
      `PureTrack © ${dayjs().format('YYYY')} | Report ID: ${reportId}`,
      105,
      289,
      { align: 'center' }
    );
    
    // Generation timestamp
    doc.text(
      `Generated: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
      105,
      293,
      { align: 'center' }
    );
  }

  return doc;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine overall water quality status based on summary metrics
 */
function getOverallStatus(summary: ReportSummary): { status: string; color: [number, number, number] } {
  // Check if summary exists and has numeric values (use !== undefined to handle 0 values)
  if (!summary || 
      (summary.averageTurbidity === undefined && 
       summary.averageTDS === undefined && 
       summary.averagePH === undefined)) {
    return { status: 'NO DATA', color: [128, 128, 128] };
  }

  // If values are all 0, that's also no data
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
    return { status: 'EXCELLENT', color: [82, 196, 26] }; // Green
  } else if (okCount === 2) {
    return { status: 'GOOD', color: [82, 196, 26] }; // Green
  } else if (okCount === 1) {
    return { status: 'FAIR - ATTENTION NEEDED', color: [250, 173, 20] }; // Orange
  } else {
    return { status: 'POOR - IMMEDIATE ACTION REQUIRED', color: [255, 77, 79] }; // Red
  }
}

/**
 * Generate recommendations based on report data
 */
function generateRecommendations(reportData: WaterQualityReportData): string[] {
  const recommendations: string[] = [];
  
  if (!reportData.devices || reportData.devices.length === 0) {
    return ['No devices found. Please check device configuration and connectivity.'];
  }

  const summary = reportData.summary;
  
  // Check for high turbidity
  if (summary?.averageTurbidity && summary.averageTurbidity > 5) {
    recommendations.push(
      `High turbidity detected (${summary.averageTurbidity.toFixed(2)} NTU). ` +
      'Investigate potential contamination sources and consider filtration system maintenance.'
    );
  }

  // Check for high TDS
  if (summary?.averageTDS && summary.averageTDS > 500) {
    recommendations.push(
      `Elevated TDS levels detected (${summary.averageTDS.toFixed(2)} ppm). ` +
      'Consider water treatment to reduce dissolved solids. Schedule pipe system inspection.'
    );
  }

  // Check for pH issues
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

  // Check for devices with no data
  const devicesWithNoData = reportData.devices.filter((d) => 
    !d.metrics || d.metrics.totalReadings === 0
  );
  if (devicesWithNoData.length > 0) {
    recommendations.push(
      `${devicesWithNoData.length} device(s) reported no data during this period. ` +
      'Check device connectivity, power supply, and sensor calibration.'
    );
  }

  // General maintenance
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

/**
 * Calculate overall compliance metrics from summary data
 */
function calculateComplianceMetrics(summary: ReportSummary): { rate: number; compliantCount: number; totalCount: number } {
  if (!summary || (summary.totalReadings === 0 && summary.avgTurbidity === undefined)) {
    return { rate: 0, compliantCount: 0, totalCount: 3 };
  }

  let compliantCount = 0;
  const totalCount = 3; // Turbidity, TDS, pH

  // Check each parameter against WHO guidelines
  if ((summary.averageTurbidity || 0) <= 5) compliantCount++;
  if ((summary.averageTDS || 0) <= 500) compliantCount++;
  if ((summary.averagePH || 0) >= 6.5 && (summary.averagePH || 0) <= 8.5) compliantCount++;

  const rate = Math.round((compliantCount / totalCount) * 100);

  return { rate, compliantCount, totalCount };
}

/**
 * Calculate compliance details for a specific device
 */
function calculateDeviceCompliance(metrics: WaterQualityMetrics): {
  turbidity: { value: string; standard: string; status: string; percentage: string };
  tds: { value: string; standard: string; status: string; percentage: string };
  ph: { value: string; standard: string; status: string; percentage: string };
} {
  const turbidityValue = metrics.avgTurbidity || 0;
  const tdsValue = metrics.avgTDS || 0;
  const phValue = metrics.avgPH || 0;

  // Calculate compliance percentages (100% if compliant, otherwise calculate deviation)
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
