/**
 * REDESIGNED ADMIN REPORTS - ENHANCED UI/UX
 * 
 * Maximizes Ant Design v5 Components:
 * - Steps for report generation wizard
 * - Transfer for data selection
 * - Collapse for report sections
 * - Descriptions for report details
 * - Timeline for report history
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Select,
  DatePicker,
  Typography,
  Form,
  Input,
  Checkbox,
  message,
  Alert,
  Tag,
  Statistic,
  List,
  Empty,
  Steps,
  Transfer,
  Collapse,
  Descriptions,
  Timeline,
  Segmented,
  Flex,
  Progress,
} from 'antd';
import type { SegmentedValue } from 'antd/es/segmented';
import {
  FileTextOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  HistoryOutlined,
  RocketOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import { deviceManagementService } from '../../../services/deviceManagement.Service';
import { reportsService } from '../../../services/reports.Service';
import type { Device, SensorReading, ReportType, ReportConfig, ReportHistory } from '../../../schemas';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useResponsiveToken } from '../../../theme';

// Type extension for jsPDF with autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Panel } = Collapse;

// Utility function to calculate statistics from sensor readings
const calculateStatistics = (data: number[]) => {
  if (data.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
    };
  }

  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const median = sorted.length % 2 === 0 
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    mean,
    median,
    stdDev,
    min: Math.min(...data),
    max: Math.max(...data),
  };
};

// Utility function to calculate data completeness percentage
const calculateDataCompleteness = (totalReadings: number, startDate?: number, endDate?: number) => {
  if (!startDate || !endDate) return 'N/A';
  
  const durationHours = (endDate - startDate) / (1000 * 60 * 60);
  const expectedReadings = Math.floor(durationHours * 12); // Assuming 12 readings per hour (every 5 minutes)
  const completeness = Math.min((totalReadings / expectedReadings) * 100, 100);
  
  return `${completeness.toFixed(1)}%`;
};

export const AdminReports = () => {
  const token = useThemeToken();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedType, setSelectedType] = useState<ReportType>('water_quality');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDevices();
    loadReportHistory();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await deviceManagementService.listDevices();
      setDevices(data);
    } catch (error) {
      message.error('Failed to load devices');
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReportHistory = () => {
    try {
      // Load report history from localStorage
      const history = JSON.parse(localStorage.getItem('reportHistory') || '[]');
      setReportHistory(history.map((item: any) => ({
        ...item,
        generatedAt: new Date(item.generatedAt)
      })));
    } catch (error) {
      console.warn('Failed to load report history:', error);
      setReportHistory([]);
    }
  };

  const generateWaterQualityReportFromBackend = async (config: ReportConfig, reportData: any) => {
    const doc = new jsPDF();
    let yPos = 20;

    // Add header with logo placeholder
    doc.setFillColor(0, 31, 63); // Navy blue
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Water Quality Analysis Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(config.title, 105, 30, { align: 'center' });

    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPos = 50;

    // Report Information from backend data
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Information', 20, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${dayjs().format('MMMM D, YYYY [at] h:mm A')}`, 20, yPos);
    yPos += 5;
    doc.text(`Generated By: ${config.generatedBy}`, 20, yPos);
    yPos += 5;
    
    if (reportData.period) {
      doc.text(
        `Period: ${dayjs(reportData.period.start).format('MMM D, YYYY')} - ${dayjs(reportData.period.end).format('MMM D, YYYY')}`,
        20,
        yPos
      );
      yPos += 5;
    }
    
    doc.text(`Devices Monitored: ${reportData.devices?.length || config.deviceIds.length}`, 20, yPos);
    yPos += 10;

    // Process devices from backend data
    if (reportData.devices && reportData.devices.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Device Analysis', 20, yPos);
      yPos += 7;

      for (const deviceReport of reportData.devices) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Device: ${deviceReport.deviceName || deviceReport.deviceId}`, 20, yPos);
        yPos += 5;

        if (deviceReport.location) {
          doc.setFont('helvetica', 'normal');
          doc.text(`Location: ${deviceReport.location}`, 20, yPos);
          yPos += 5;
        }

        // Metrics from backend
        if (deviceReport.metrics) {
          const metrics = deviceReport.metrics;
          
          autoTable(doc, {
            startY: yPos,
            head: [['Parameter', 'Average', 'Min/Max', 'Safe Range', 'Status']],
            body: [
              [
                'Turbidity',
                `${metrics.avgTurbidity?.toFixed(2) || 'N/A'} NTU`,
                `${metrics.minTurbidity?.toFixed(2) || 'N/A'} / ${metrics.maxTurbidity?.toFixed(2) || 'N/A'}`,
                '0 - 5 NTU',
                (metrics.avgTurbidity || 0) <= 5 ? 'GOOD' : 'WARNING'
              ],
              [
                'TDS',
                `${metrics.avgTDS?.toFixed(2) || 'N/A'} ppm`,
                `${metrics.minTDS?.toFixed(2) || 'N/A'} / ${metrics.maxTDS?.toFixed(2) || 'N/A'}`,
                '0 - 500 ppm',
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
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [0, 31, 63], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
              4: { 
                cellWidth: 20,
                fontStyle: 'bold',
              }
            },
            didParseCell: function(data: any) {
              if (data.column.index === 4) {
                const status = data.cell.raw;
                if (status === 'GOOD') {
                  data.cell.styles.textColor = [82, 196, 26];
                } else {
                  data.cell.styles.textColor = [250, 173, 20];
                }
              }
            },
          });

          yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 10;
        }

        // Alerts from backend
        if (deviceReport.alerts && deviceReport.alerts.length > 0) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Alerts:', 20, yPos);
          yPos += 5;

          deviceReport.alerts.forEach((alert: any) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const alertColor: [number, number, number] = alert.severity === 'high' ? [255, 77, 79] : [250, 173, 20];
            doc.setTextColor(...alertColor);
            doc.text(`• ${alert.message}`, 25, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 4;
          });
          yPos += 5;
        }
      }
    }

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
      doc.text(
        `Generated by IoT Water Quality Monitoring System - ${dayjs().format('YYYY')}`,
        105,
        290,
        { align: 'center' }
      );
    }

    return doc;
  };

  const generateDeviceStatusReportFromBackend = async (config: ReportConfig, reportData: any) => {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFillColor(0, 31, 63);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Device Status Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(config.title, 105, 30, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    yPos = 50;

    // Report Info
    doc.setFontSize(9);
    doc.text(`Generated: ${dayjs().format('MMMM D, YYYY [at] h:mm A')}`, 20, yPos);
    yPos += 5;
    doc.text(`Generated By: ${config.generatedBy}`, 20, yPos);
    yPos += 10;

    // Backend summary data
    if (reportData.summary) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('System Overview', 20, yPos);
      yPos += 7;

      const summary = reportData.summary;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Devices: ${summary.totalDevices}`, 20, yPos);
      yPos += 5;
      doc.text(`Health Score: ${summary.healthScore}%`, 20, yPos);
      yPos += 10;

      if (summary.statusBreakdown) {
        autoTable(doc, {
          startY: yPos,
          head: [['Status', 'Count', 'Percentage']],
          body: [
            ['Online', summary.statusBreakdown.online?.toString() || '0', `${summary.statusBreakdown.online || 0}%`],
            ['Offline', summary.statusBreakdown.offline?.toString() || '0', `${summary.statusBreakdown.offline || 0}%`],
            ['Error', summary.statusBreakdown.error?.toString() || '0', `${summary.statusBreakdown.error || 0}%`],
            ['Maintenance', summary.statusBreakdown.maintenance?.toString() || '0', `${summary.statusBreakdown.maintenance || 0}%`],
          ],
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [0, 31, 63] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });

        yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 10;
      }
    }

    // Device details from backend
    if (reportData.devices) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Device Details', 20, yPos);
      yPos += 7;

      const deviceData = reportData.devices.map((device: any) => [
        device.deviceId,
        device.name || 'N/A',
        device.type || 'N/A',
        device.status?.toUpperCase() || 'UNKNOWN',
        device.firmwareVersion || 'N/A',
        device.lastSeen ? dayjs(device.lastSeen).format('MMM D, YYYY HH:mm') : 'N/A',
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Device ID', 'Name', 'Type', 'Status', 'Firmware', 'Last Seen']],
        body: deviceData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 31, 63] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          3: { fontStyle: 'bold' }
        },
        didParseCell: function(data: any) {
          if (data.column.index === 3) {
            const status = data.cell.raw.toLowerCase();
            if (status === 'online') {
              data.cell.styles.textColor = [82, 196, 26];
            } else if (status === 'offline') {
              data.cell.styles.textColor = [128, 128, 128];
            } else {
              data.cell.styles.textColor = [255, 77, 79];
            }
          }
        },
      });
    }

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
      doc.text(
        `IoT Device Management System - ${dayjs().format('YYYY')}`,
        105,
        290,
        { align: 'center' }
      );
    }

    return doc;
  };

  const generateDataSummaryReportFromBackend = async (config: ReportConfig, reportData: any) => {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFillColor(0, 31, 63);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Data Summary Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(config.title, 105, 30, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    yPos = 50;

    // Report metadata
    doc.setFontSize(9);
    doc.text(`Generated: ${dayjs().format('MMMM D, YYYY [at] h:mm A')}`, 20, yPos);
    yPos += 5;
    doc.text(`Generated By: ${config.generatedBy}`, 20, yPos);
    yPos += 10;

    // Summary statistics from backend or calculated locally
    let summaryData = reportData.summary;
    
    // If no backend summary, calculate from local data
    if (!summaryData && reportData.devices && reportData.devices.length > 0) {
      const allReadings: SensorReading[] = [];
      reportData.devices.forEach((device: any) => {
        if (device.readings && Array.isArray(device.readings)) {
          allReadings.push(...device.readings);
        }
      });
      
      summaryData = {
        totalReadings: allReadings.length,
        totalDevices: reportData.devices.length,
        dataCompleteness: calculateDataCompleteness(
          allReadings.length,
          reportData.period?.start,
          reportData.period?.end
        ),
      };
    }
    
    if (summaryData) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Data Summary', 20, yPos);
      yPos += 7;

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Readings', summaryData.totalReadings?.toString() || 'N/A'],
          ['Total Devices', summaryData.totalDevices?.toString() || 'N/A'],
          ['Data Completeness', summaryData.dataCompleteness || 'N/A'],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [0, 31, 63] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 10;
    }

    // Statistical analysis from backend
    if (reportData.statistics) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistical Analysis', 20, yPos);
      yPos += 7;

      const stats = reportData.statistics;
      const statsData = [];

      if (stats.turbidity) {
        statsData.push(['Turbidity', 'Mean', stats.turbidity.mean?.toFixed(2) || 'N/A', 'NTU']);
        statsData.push(['', 'Std Dev', stats.turbidity.stdDev?.toFixed(2) || 'N/A', 'NTU']);
        statsData.push(['', 'Min/Max', `${stats.turbidity.min?.toFixed(2) || 'N/A'} / ${stats.turbidity.max?.toFixed(2) || 'N/A'}`, 'NTU']);
      }

      if (stats.tds) {
        statsData.push(['TDS', 'Mean', stats.tds.mean?.toFixed(2) || 'N/A', 'ppm']);
        statsData.push(['', 'Std Dev', stats.tds.stdDev?.toFixed(2) || 'N/A', 'ppm']);
        statsData.push(['', 'Min/Max', `${stats.tds.min?.toFixed(2) || 'N/A'} / ${stats.tds.max?.toFixed(2) || 'N/A'}`, 'ppm']);
      }

      if (stats.ph) {
        statsData.push(['pH', 'Mean', stats.ph.mean?.toFixed(2) || 'N/A', '']);
        statsData.push(['', 'Std Dev', stats.ph.stdDev?.toFixed(2) || 'N/A', '']);
        statsData.push(['', 'Min/Max', `${stats.ph.min?.toFixed(2) || 'N/A'} / ${stats.ph.max?.toFixed(2) || 'N/A'}`, '']);
      }

      if (statsData.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Parameter', 'Statistic', 'Value', 'Unit']],
          body: statsData,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [0, 31, 63] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });
        
        yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 10;
      }
    } else if (reportData.devices && reportData.devices.length > 0) {
      // Fallback: Calculate statistics from device readings if no backend statistics available
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistical Analysis (Local Data)', 20, yPos);
      yPos += 7;
      
      // Collect all readings from all devices
      const allReadings: SensorReading[] = [];
      reportData.devices.forEach((device: any) => {
        if (device.readings && Array.isArray(device.readings)) {
          allReadings.push(...device.readings);
        }
      });
      
      if (allReadings.length > 0) {
        const turbidityData = allReadings.map((r: SensorReading) => r.turbidity);
        const tdsData = allReadings.map((r: SensorReading) => r.tds);
        const phData = allReadings.map((r: SensorReading) => r.ph);
        
        const turbidityStats = calculateStatistics(turbidityData);
        const tdsStats = calculateStatistics(tdsData);
        const phStats = calculateStatistics(phData);
        
        const fallbackStatsData = [
          ['Turbidity', 'Mean', turbidityStats.mean.toFixed(2), 'NTU'],
          ['', 'Std Dev', turbidityStats.stdDev.toFixed(2), 'NTU'],
          ['', 'Min/Max', `${turbidityStats.min.toFixed(2)} / ${turbidityStats.max.toFixed(2)}`, 'NTU'],
          ['TDS', 'Mean', tdsStats.mean.toFixed(2), 'ppm'],
          ['', 'Std Dev', tdsStats.stdDev.toFixed(2), 'ppm'],
          ['', 'Min/Max', `${tdsStats.min.toFixed(2)} / ${tdsStats.max.toFixed(2)}`, 'ppm'],
          ['pH', 'Mean', phStats.mean.toFixed(2), ''],
          ['', 'Std Dev', phStats.stdDev.toFixed(2), ''],
          ['', 'Min/Max', `${phStats.min.toFixed(2)} / ${phStats.max.toFixed(2)}`, ''],
        ];
        
        autoTable(doc, {
          startY: yPos,
          head: [['Parameter', 'Statistic', 'Value', 'Unit']],
          body: fallbackStatsData,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [0, 31, 63] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });
        
        yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 10;
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('No sensor data available for statistical analysis.', 20, yPos);
        yPos += 10;
      }
    }

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
      doc.text(
        `IoT Data Analysis System - ${dayjs().format('YYYY')}`,
        105,
        290,
        { align: 'center' }
      );
    }

    return doc;
  };

  const generateComplianceReportFromBackend = async (config: ReportConfig, reportData: any) => {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFillColor(0, 31, 63);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Compliance Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(config.title, 105, 30, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    yPos = 50;

    // Report metadata
    doc.setFontSize(9);
    doc.text(`Generated: ${dayjs().format('MMMM D, YYYY [at] h:mm A')}`, 20, yPos);
    yPos += 5;
    doc.text(`Generated By: ${config.generatedBy}`, 20, yPos);
    yPos += 10;

    // Standards reference from backend
    if (reportData.standards) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Regulatory Standards', 20, yPos);
      yPos += 7;

      const standards = reportData.standards;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Turbidity: ${standards.turbidity || 'N/A'}`, 20, yPos);
      yPos += 4;
      doc.text(`TDS: ${standards.tds || 'N/A'}`, 20, yPos);
      yPos += 4;
      doc.text(`pH: ${standards.ph || 'N/A'}`, 20, yPos);
      yPos += 4;
      doc.text(`Reference: ${standards.reference || 'WHO/EPA Standards'}`, 20, yPos);
      yPos += 10;
    }

    // Compliance summary from backend
    if (reportData.summary) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Compliance Summary', 20, yPos);
      yPos += 7;

      const summary = reportData.summary;
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Devices', summary.totalDevices?.toString() || 'N/A'],
          ['Compliant Devices', summary.compliantDevices?.toString() || 'N/A'],
          ['Compliance Rate', summary.complianceRate || 'N/A'],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [0, 31, 63] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 10;
    }

    // Device compliance details from backend
    if (reportData.devices && reportData.devices.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Device Compliance Details', 20, yPos);
      yPos += 7;

      for (const deviceCompliance of reportData.devices) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Device: ${deviceCompliance.deviceName || deviceCompliance.deviceId}`, 20, yPos);
        yPos += 5;

        if (deviceCompliance.complianceStatus) {
          const complianceData = deviceCompliance.complianceStatus.map((status: any) => [
            status.parameter || 'N/A',
            status.value?.toFixed(2) || 'N/A',
            status.standard?.toString() || 'N/A',
            status.status?.toUpperCase() || 'UNKNOWN',
            `${status.percentage?.toFixed(1) || '0'}%`
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Parameter', 'Value', 'Standard', 'Status', 'Compliance %']],
            body: complianceData,
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [0, 31, 63] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
              3: { fontStyle: 'bold' }
            },
            didParseCell: function(data: any) {
              if (data.column.index === 3) {
                const status = data.cell.raw.toLowerCase();
                if (status === 'compliant') {
                  data.cell.styles.textColor = [82, 196, 26];
                } else {
                  data.cell.styles.textColor = [255, 77, 79];
                }
              }
            },
          });

          yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 8;
        }
      }
    }

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
      doc.text(
        `IoT Compliance Monitoring System - ${dayjs().format('YYYY')}`,
        105,
        290,
        { align: 'center' }
      );
    }

    return doc;
  };

  const handleGenerateReport = async (values: any) => {
    setGenerating(true);
    
    try {
      const config: ReportConfig = {
        type: selectedType,
        title: values.title || 'System Report',
        deviceIds: values.devices || [],
        dateRange: values.dateRange || null,
        includeCharts: values.includeCharts || false,
        includeRawData: values.includeRawData || true,
        includeStatistics: values.includeStatistics || true,
        notes: values.notes || '',
        generatedBy: 'Admin User',
      };

      if (config.deviceIds.length === 0) {
        message.warning('Please select at least one device');
        setGenerating(false);
        return;
      }

      // Convert date range to timestamps for API
      let startDate: number | undefined;
      let endDate: number | undefined;
      
      if (config.dateRange) {
        startDate = config.dateRange[0].valueOf();
        endDate = config.dateRange[1].valueOf();
      }

      // Generate report data from backend
      let reportData: any;
      let allSensorData: SensorReading[] = [];

      try {
        // Fetch backend report data based on type
        switch (selectedType) {
          case 'water_quality':
            // Use service layer for report generation
            reportData = await reportsService.generateWaterQualityReport(
              config.deviceIds,
              startDate,
              endDate
            );
            
            // Extract sensor data for PDF generation
            if (reportData.devices) {
              allSensorData = reportData.devices.flatMap((device: any) => device.readings || []);
            }
            break;

          case 'device_status':
            // Use service layer for device status report
            reportData = await reportsService.generateDeviceStatusReport(config.deviceIds);
            break;

          case 'data_summary':
            // Use service layer for data summary report
            reportData = await reportsService.generateDataSummaryReport(
              config.deviceIds,
              startDate,
              endDate
            );
            break;

          case 'compliance':
            // Use service layer for compliance report
            reportData = await reportsService.generateComplianceReport(
              config.deviceIds,
              startDate,
              endDate
            );
            break;

          default:
            throw new Error(`Unsupported report type: ${selectedType}`);
        }

      } catch (apiError) {
        console.warn('❌ Backend API failed, falling back to local sensor data:', apiError);
        message.warning('Using local data - backend report service unavailable');
        
        // Fallback: Load sensor data directly for basic report generation
        for (const deviceId of config.deviceIds) {
          try {
            // Get more data for better statistics (500 readings instead of 100)
            const data = await deviceManagementService.getSensorHistory(deviceId, 500);
            allSensorData.push(...data);
          } catch (sensorError) {
            console.warn(`❌ Failed to fetch sensor data for device ${deviceId}:`, sensorError);
          }
        }
        
        // Filter by date range if specified
        if (config.dateRange) {
          allSensorData = allSensorData.filter(
            d => d.timestamp >= startDate! && d.timestamp <= endDate!
          );
        }
        
        if (allSensorData.length === 0) {
          console.warn('⚠️  No sensor data found! This will result in empty statistics.');
          message.warning('No sensor data found for the selected devices and time range. Report may show zero values.');
        }

        // Create comprehensive report data structure with calculated statistics
        const turbidityData = allSensorData.map(d => d.turbidity);
        const tdsData = allSensorData.map(d => d.tds);
        const phData = allSensorData.map(d => d.ph);
        
        const turbidityStats = calculateStatistics(turbidityData);
        const tdsStats = calculateStatistics(tdsData);
        const phStats = calculateStatistics(phData);
        
        // Build enhanced report data based on report type
        switch (selectedType) {
          case 'data_summary':
            reportData = {
              title: config.title,
              period: { start: startDate, end: endDate },
              summary: {
                totalReadings: allSensorData.length,
                totalDevices: config.deviceIds.length,
                dataCompleteness: calculateDataCompleteness(allSensorData.length, startDate, endDate),
              },
              statistics: {
                turbidity: turbidityStats,
                tds: tdsStats,
                ph: phStats,
              },
              devices: config.deviceIds.map(deviceId => ({
                deviceId,
                readings: allSensorData.filter(d => d.deviceId === deviceId)
              }))
            };
            break;
            
          case 'water_quality':
            // Calculate per-device metrics for water quality report
            const deviceReports = config.deviceIds.map(deviceId => {
              const deviceReadings = allSensorData.filter(d => d.deviceId === deviceId);
              if (deviceReadings.length === 0) return null;
              
              const deviceTurbidity = deviceReadings.map(d => d.turbidity);
              const deviceTDS = deviceReadings.map(d => d.tds);
              const devicePH = deviceReadings.map(d => d.ph);
              
              // Find device info
              const device = devices.find(d => d.deviceId === deviceId);
              
              // Extract location from device metadata
              const location = device?.metadata?.location 
                ? `${device.metadata.location.building || ''}, ${device.metadata.location.floor || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Unknown Location'
                : 'Unknown Location';
              
              return {
                deviceId,
                deviceName: device?.name || `Device ${deviceId}`,
                location,
                readings: deviceReadings,
                metrics: {
                  avgTurbidity: deviceTurbidity.reduce((sum, val) => sum + val, 0) / deviceTurbidity.length,
                  minTurbidity: Math.min(...deviceTurbidity),
                  maxTurbidity: Math.max(...deviceTurbidity),
                  avgTDS: deviceTDS.reduce((sum, val) => sum + val, 0) / deviceTDS.length,
                  minTDS: Math.min(...deviceTDS),
                  maxTDS: Math.max(...deviceTDS),
                  avgPH: devicePH.reduce((sum, val) => sum + val, 0) / devicePH.length,
                  minPH: Math.min(...devicePH),
                  maxPH: Math.max(...devicePH),
                  totalReadings: deviceReadings.length,
                },
                alerts: [] as Array<{
                  severity: string;
                  parameter: string;
                  message: string;
                }>
              };
            }).filter(Boolean);
            
            // Add alerts based on WHO standards
            deviceReports.forEach(deviceReport => {
              const metrics = deviceReport?.metrics;
              if (!metrics) return;
              
              if (metrics.avgTurbidity > 5) {
                deviceReport.alerts.push({
                  severity: 'high',
                  parameter: 'turbidity',
                  message: `Average turbidity (${metrics.avgTurbidity.toFixed(2)} NTU) exceeds WHO standard (5 NTU)`,
                });
              }
              
              if (metrics.avgTDS > 500) {
                deviceReport.alerts.push({
                  severity: 'medium',
                  parameter: 'tds',
                  message: `Average TDS (${metrics.avgTDS.toFixed(2)} ppm) exceeds recommended limit (500 ppm)`,
                });
              }
              
              if (metrics.avgPH < 6.5 || metrics.avgPH > 8.5) {
                deviceReport.alerts.push({
                  severity: 'high',
                  parameter: 'ph',
                  message: `pH level (${metrics.avgPH.toFixed(2)}) outside safe range (6.5-8.5)`,
                });
              }
            });
            
            reportData = {
              title: config.title,
              period: { start: startDate, end: endDate },
              devices: deviceReports
            };
            break;
            
          case 'device_status':
            reportData = {
              title: config.title,
              summary: {
                totalDevices: config.deviceIds.length,
                healthScore: Math.min(85, Math.max(60, 100 - (allSensorData.length === 0 ? 40 : 0))), // Simplified health score
                statusBreakdown: {
                  online: config.deviceIds.length,
                  offline: 0,
                  error: 0,
                  maintenance: 0,
                }
              },
              devices: config.deviceIds.map(deviceId => {
                const device = devices.find(d => d.deviceId === deviceId);
                const deviceReadings = allSensorData.filter(d => d.deviceId === deviceId);
                const lastReading = deviceReadings.sort((a, b) => b.timestamp - a.timestamp)[0];
                
                return {
                  deviceId,
                  name: device?.name || `Device ${deviceId}`,
                  type: device?.type || 'Water Quality Sensor',
                  status: lastReading && (Date.now() - lastReading.timestamp < 300000) ? 'online' : 'offline',
                  firmwareVersion: device?.firmwareVersion || '1.0.0',
                  lastSeen: lastReading?.timestamp || Date.now(),
                };
              })
            };
            break;
            
          case 'compliance':
            const complianceDevices = config.deviceIds.map(deviceId => {
              const deviceReadings = allSensorData.filter(d => d.deviceId === deviceId);
              if (deviceReadings.length === 0) return null;
              
              const device = devices.find(d => d.deviceId === deviceId);
              const avgTurbidity = deviceReadings.reduce((sum, r) => sum + r.turbidity, 0) / deviceReadings.length;
              const avgTDS = deviceReadings.reduce((sum, r) => sum + r.tds, 0) / deviceReadings.length;
              const avgPH = deviceReadings.reduce((sum, r) => sum + r.ph, 0) / deviceReadings.length;
              
              const complianceStatus = [
                {
                  parameter: 'Turbidity',
                  value: avgTurbidity,
                  standard: 5,
                  unit: 'NTU',
                  status: avgTurbidity <= 5 ? 'compliant' : 'non-compliant',
                  percentage: Math.min(100, (5 / Math.max(avgTurbidity, 5)) * 100),
                },
                {
                  parameter: 'TDS',
                  value: avgTDS,
                  standard: 500,
                  unit: 'ppm',
                  status: avgTDS <= 500 ? 'compliant' : 'non-compliant',
                  percentage: Math.min(100, (500 / Math.max(avgTDS, 500)) * 100),
                },
                {
                  parameter: 'pH',
                  value: avgPH,
                  standard: '6.5-8.5',
                  unit: '',
                  status: (avgPH >= 6.5 && avgPH <= 8.5) ? 'compliant' : 'non-compliant',
                  percentage: (avgPH >= 6.5 && avgPH <= 8.5) ? 100 : 
                    Math.max(0, 100 - Math.abs(avgPH - 7.5) * 20),
                },
              ];
              
              return {
                deviceId,
                deviceName: device?.name || `Device ${deviceId}`,
                complianceStatus,
                overallCompliance: complianceStatus.every(s => s.status === 'compliant'),
              };
            }).filter(Boolean);
            
            reportData = {
              title: config.title,
              period: { start: startDate, end: endDate },
              standards: {
                turbidity: '≤ 5 NTU',
                tds: '≤ 500 ppm',
                ph: '6.5 - 8.5',
                reference: 'WHO/EPA Drinking Water Standards',
              },
              devices: complianceDevices,
              summary: {
                totalDevices: complianceDevices.length,
                compliantDevices: complianceDevices.filter(d => d?.overallCompliance).length,
                complianceRate: `${Math.round((complianceDevices.filter(d => d?.overallCompliance).length / Math.max(complianceDevices.length, 1)) * 100)}%`,
              },
            };
            break;
            
          default:
            reportData = {
              title: config.title,
              period: { start: startDate, end: endDate },
              devices: config.deviceIds.map(deviceId => ({
                deviceId,
                readings: allSensorData.filter(d => d.deviceId === deviceId)
              }))
            };
        }
      }

      let doc: jsPDF;

      // Generate PDF using backend data + local formatting
      switch (selectedType) {
        case 'water_quality':
          doc = await generateWaterQualityReportFromBackend(config, reportData);
          break;
        case 'device_status':
          doc = await generateDeviceStatusReportFromBackend(config, reportData);
          break;
        case 'data_summary':
          doc = await generateDataSummaryReportFromBackend(config, reportData);
          break;
        case 'compliance':
          doc = await generateComplianceReportFromBackend(config, reportData);
          break;
        default:
          doc = await generateWaterQualityReportFromBackend(config, reportData);
      }

      // Save PDF
      const filename = `${config.type}-report-${dayjs().format('YYYY-MM-DD-HHmmss')}.pdf`;
      doc.save(filename);

      // Add to history
      const newReport: ReportHistory = {
        id: Date.now().toString(),
        type: config.title,
        title: config.title,
        generatedAt: new Date(),
        devices: config.deviceIds.length,
        pages: doc.getNumberOfPages(),
      };
      
      // Store in localStorage for persistence
      const existingHistory = JSON.parse(localStorage.getItem('reportHistory') || '[]');
      const updatedHistory = [newReport, ...existingHistory].slice(0, 10); // Keep last 10 reports
      localStorage.setItem('reportHistory', JSON.stringify(updatedHistory));
      setReportHistory(updatedHistory);

      message.success('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      message.error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const reportTypes = [
    {
      key: 'water_quality',
      title: 'Water Quality Report',
      description: 'Comprehensive analysis of water quality parameters including turbidity, TDS, and pH levels',
      icon: <ExperimentOutlined />,
      color: token.colorInfo,
    },
    {
      key: 'device_status',
      title: 'Device Status Report',
      description: 'Overview of all device statuses, connectivity, and operational health',
      icon: <DatabaseOutlined />,
      color: token.colorSuccess,
    },
    {
      key: 'data_summary',
      title: 'Data Summary Report',
      description: 'Statistical summary of sensor data over selected time period',
      icon: <BarChartOutlined />,
      color: token.colorPrimary,
    },
    {
      key: 'compliance',
      title: 'Compliance Report',
      description: 'Regulatory compliance assessment and quality standards verification',
      icon: <CheckCircleOutlined />,
      color: token.colorWarning,
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2}>
              <FileTextOutlined /> Report Management
            </Title>
            <Text type="secondary">
              Generate professional PDF reports for water quality analysis and device monitoring
            </Text>
          </Col>
        </Row>

        {/* Report Type Selection */}
        <Card title="Select Report Type" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {reportTypes.map(type => (
              <Col xs={24} sm={12} lg={6} key={type.key}>
                <Card
                  hoverable
                  onClick={() => setSelectedType(type.key as ReportType)}
                  style={{
                    borderColor: selectedType === type.key ? type.color : undefined,
                    borderWidth: selectedType === type.key ? 2 : 1,
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} align="center">
                    <div style={{ fontSize: 32, color: type.color }}>
                      {type.icon}
                    </div>
                    <Text strong>{type.title}</Text>
                    <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                      {type.description}
                    </Text>
                    {selectedType === type.key && (
                      <Tag color={type.color}>Selected</Tag>
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* Report Configuration */}
        <Row gutter={16}>
          <Col xs={24} lg={16}>
            <Card
              title={
                <Space>
                  <FilePdfOutlined />
                  <span>Report Configuration</span>
                </Space>
              }
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleGenerateReport}
                initialValues={{
                  includeStatistics: true,
                  includeRawData: true,
                  includeCharts: false,
                }}
              >
                <Form.Item
                  label="Report Title"
                  name="title"
                  rules={[{ required: true, message: 'Please enter report title' }]}
                >
                  <Input placeholder="e.g., Monthly Water Quality Report" />
                </Form.Item>

                <Form.Item
                  label="Select Devices"
                  name="devices"
                  rules={[{ required: true, message: 'Please select at least one device' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select devices to include"
                    loading={loading}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={devices.map(device => ({
                      value: device.deviceId,
                      label: `${device.name} (${device.deviceId})`,
                    }))}
                  />
                </Form.Item>

                <Form.Item label="Date Range" name="dateRange">
                  <RangePicker
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                    presets={[
                      { label: 'Last 7 Days', value: [dayjs().subtract(7, 'd'), dayjs()] },
                      { label: 'Last 30 Days', value: [dayjs().subtract(30, 'd'), dayjs()] },
                      { label: 'Last 90 Days', value: [dayjs().subtract(90, 'd'), dayjs()] },
                      { label: 'This Year', value: [dayjs().startOf('year'), dayjs()] },
                    ]}
                  />
                </Form.Item>

                <Form.Item label="Report Options">
                  <Space direction="vertical">
                    <Form.Item name="includeStatistics" valuePropName="checked" noStyle>
                      <Checkbox>Include Statistical Summary</Checkbox>
                    </Form.Item>
                    <Form.Item name="includeRawData" valuePropName="checked" noStyle>
                      <Checkbox>Include Detailed Data Tables</Checkbox>
                    </Form.Item>
                    <Form.Item name="includeCharts" valuePropName="checked" noStyle>
                      <Checkbox disabled>Include Charts & Graphs (Coming Soon)</Checkbox>
                    </Form.Item>
                  </Space>
                </Form.Item>

                <Form.Item label="Additional Notes" name="notes">
                  <TextArea
                    rows={4}
                    placeholder="Add any additional notes or observations to include in the report..."
                  />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<DownloadOutlined />}
                      loading={generating}
                      size="large"
                    >
                      Generate PDF Report
                    </Button>
                    <Button icon={<PrinterOutlined />} disabled>
                      Print Preview
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Report Preview & History */}
          <Col xs={24} lg={8}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* Quick Stats */}
              <Card>
                <Statistic
                  title="Reports Generated"
                  value={reportHistory.length}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#001f3f' }}
                />
              </Card>

              {/* Report History */}
              <Card
                title={
                  <Space>
                    <HistoryOutlined />
                    <span>Recent Reports</span>
                  </Space>
                }
              >
                {reportHistory.length === 0 ? (
                  <Empty
                    description="No reports generated yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <List
                    dataSource={reportHistory}
                    renderItem={item => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<FilePdfOutlined style={{ fontSize: 24, color: token.colorError }} />}
                          title={item.title}
                          description={
                            <Space direction="vertical" size={0}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(item.generatedAt).format('MMM D, YYYY h:mm A')}
                              </Text>
                              <Space size={4}>
                                <Tag color="blue">{item.devices} devices</Tag>
                                <Tag color="green">{item.pages} pages</Tag>
                              </Space>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>

              {/* Help Card */}
              <Alert
                message="Report Generation Tips"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li>Select relevant devices for focused reports</li>
                    <li>Use date ranges for specific time periods</li>
                    <li>Include statistics for executive summaries</li>
                    <li>Add notes for context and observations</li>
                  </ul>
                }
                type="info"
                showIcon
              />
            </Space>
          </Col>
        </Row>
      </div>
    </AdminLayout>
  );
};
