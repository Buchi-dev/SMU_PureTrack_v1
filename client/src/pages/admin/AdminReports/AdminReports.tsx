/**
 * AdminReports Page - Simplified Water Quality Report Generation
 * 
 * Clean, user-friendly interface for generating water quality reports
 * with compliance assessment.
 * 
 * Architecture:
 * - Global hooks: useDevices (device data), useReportMutations (report generation)
 * - Local hook: useReportHistory (localStorage UI state)
 * 
 * @module pages/admin/AdminReports
 */
import { useState, useMemo } from 'react';
import { 
  Layout,
  Row, 
  Col, 
  Typography, 
  Card, 
  Space, 
  Button,
  Divider,
  Statistic,
  Form,
  Select,
  DatePicker,
  Input,
  Switch,
  Alert,
  List,
  Tag,
  Empty,
  message
} from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  FileTextOutlined, 
  HistoryOutlined,
  DownloadOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

dayjs.extend(relativeTime);
import { AdminLayout } from '../../../components/layouts';
import { PageHeader } from '../../../components/PageHeader';
import type { Device } from '../../../schemas';
import { useThemeToken } from '../../../theme';

// Global Hooks
import { useDevices, useReportMutations } from '../../../hooks';

// Local UI Hooks
import { useReportHistory } from './hooks';

// PDF Templates
import { generateWaterQualityReport } from './templates';

const { Content } = Layout;
const { Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

/**
 * Generate detailed alert messages with actual readings and thresholds
 */
const generateDetailedAlerts = (deviceReport: any, params: any) => {
  const alerts: any[] = [];
  const deviceName = deviceReport.deviceName || deviceReport.deviceId;
  
  // WHO/EPA Water Quality Thresholds
  const thresholds = {
    pH: { min: 6.5, max: 8.5, unit: '' },
    turbidity: { max: 5, unit: 'NTU' },
    tds: { max: 500, unit: 'ppm' }
  };

  // Check pH violations
  if (params.pH?.avg) {
    const phValue = params.pH.avg;
    if (phValue < thresholds.pH.min) {
      alerts.push({
        severity: 'Critical',
        parameter: 'pH',
        value: phValue,
        message: `pH Level TOO LOW: ${phValue.toFixed(2)} (Threshold: ${thresholds.pH.min}-${thresholds.pH.max}). Water is acidic - risk of corrosion and metal leaching.`,
        description: `Device ${deviceName} recorded dangerously low pH levels`,
        timestamp: new Date(),
        location: deviceName
      });
    } else if (phValue > thresholds.pH.max) {
      alerts.push({
        severity: 'Critical',
        parameter: 'pH',
        value: phValue,
        message: `pH Level TOO HIGH: ${phValue.toFixed(2)} (Threshold: ${thresholds.pH.min}-${thresholds.pH.max}). Water is alkaline - taste/scaling issues.`,
        description: `Device ${deviceName} recorded dangerously high pH levels`,
        timestamp: new Date(),
        location: deviceName
      });
    } else if (phValue < 6.8 || phValue > 8.2) {
      alerts.push({
        severity: 'Warning',
        parameter: 'pH',
        value: phValue,
        message: `pH Level BORDERLINE: ${phValue.toFixed(2)} (Optimal: 7.0-7.5). Consider pH adjustment.`,
        description: `Device ${deviceName} approaching pH threshold limits`,
        timestamp: new Date(),
        location: deviceName
      });
    }
  }

  // Check Turbidity violations
  if (params.turbidity?.avg) {
    const turbValue = params.turbidity.avg;
    if (turbValue > thresholds.turbidity.max * 3) {
      alerts.push({
        severity: 'Critical',
        parameter: 'Turbidity',
        value: turbValue,
        message: `Turbidity EXTREMELY HIGH: ${turbValue.toFixed(2)} ${thresholds.turbidity.unit} (Max: ${thresholds.turbidity.max} ${thresholds.turbidity.unit}). Severe contamination detected!`,
        description: `Device ${deviceName} detected dangerous turbidity levels`,
        timestamp: new Date(),
        location: deviceName
      });
    } else if (turbValue > thresholds.turbidity.max) {
      alerts.push({
        severity: 'Warning',
        parameter: 'Turbidity',
        value: turbValue,
        message: `Turbidity ELEVATED: ${turbValue.toFixed(2)} ${thresholds.turbidity.unit} (Max: ${thresholds.turbidity.max} ${thresholds.turbidity.unit}). Check filtration system.`,
        description: `Device ${deviceName} turbidity exceeds safe limits`,
        timestamp: new Date(),
        location: deviceName
      });
    } else if (turbValue > 3) {
      alerts.push({
        severity: 'Advisory',
        parameter: 'Turbidity',
        value: turbValue,
        message: `Turbidity MODERATE: ${turbValue.toFixed(2)} ${thresholds.turbidity.unit} (Optimal: <1 ${thresholds.turbidity.unit}). Monitor closely.`,
        description: `Device ${deviceName} showing moderate turbidity increase`,
        timestamp: new Date(),
        location: deviceName
      });
    }
  }

  // Check TDS violations
  if (params.tds?.avg) {
    const tdsValue = params.tds.avg;
    if (tdsValue > thresholds.tds.max * 1.5) {
      alerts.push({
        severity: 'Critical',
        parameter: 'TDS',
        value: tdsValue,
        message: `TDS EXTREMELY HIGH: ${tdsValue.toFixed(0)} ${thresholds.tds.unit} (Max: ${thresholds.tds.max} ${thresholds.tds.unit}). Excessive dissolved solids - health concern.`,
        description: `Device ${deviceName} detected dangerous TDS levels`,
        timestamp: new Date(),
        location: deviceName
      });
    } else if (tdsValue > thresholds.tds.max) {
      alerts.push({
        severity: 'Warning',
        parameter: 'TDS',
        value: tdsValue,
        message: `TDS ELEVATED: ${tdsValue.toFixed(0)} ${thresholds.tds.unit} (Max: ${thresholds.tds.max} ${thresholds.tds.unit}). Water hardness/mineral content high.`,
        description: `Device ${deviceName} TDS exceeds recommended limits`,
        timestamp: new Date(),
        location: deviceName
      });
    } else if (tdsValue > 400) {
      alerts.push({
        severity: 'Advisory',
        parameter: 'TDS',
        value: tdsValue,
        message: `TDS MODERATE: ${tdsValue.toFixed(0)} ${thresholds.tds.unit} (Optimal: <300 ${thresholds.tds.unit}). Slightly elevated mineral content.`,
        description: `Device ${deviceName} showing moderate TDS increase`,
        timestamp: new Date(),
        location: deviceName
      });
    }
  }

  // If server provided alert counts but we generated fewer, add generic ones
  const serverAlertCount = (deviceReport.alerts?.critical || 0) + 
                          (deviceReport.alerts?.warning || 0) + 
                          (deviceReport.alerts?.advisory || 0);
  
  if (serverAlertCount > alerts.length) {
    const remaining = serverAlertCount - alerts.length;
    for (let i = 0; i < remaining; i++) {
      alerts.push({
        severity: 'Advisory',
        parameter: 'System',
        value: 0,
        message: `System alert triggered for ${deviceName}. Check device logs for details.`,
        description: 'Additional system-level alert',
        timestamp: new Date(),
        location: deviceName
      });
    }
  }

  return alerts;
};

/**
 * Transform server report data to match PDF template structure
 * Server returns: { data: { devices: [...] }, summary: {...} }
 * Template expects: { devices: [...], summary: {...}, period: {...} }
 */
const transformReportData = (serverData: any, startDate: string, endDate: string) => {
  // Extract actual data from nested structure
  const reportData = serverData.data || serverData;
  
  // Transform device data from server format to template format
  const transformedDevices = (reportData.devices || []).map((deviceReport: any) => {
    // Server returns: { deviceId, deviceName, parameters: { pH, turbidity, tds }, ... }
    // Template expects: { device: { deviceId, name }, metrics: { avgPH, avgTurbidity, avgTDS }, ... }
    
    const params = deviceReport.parameters || {};
    
    return {
      device: {
        deviceId: deviceReport.deviceId,
        name: deviceReport.deviceName || deviceReport.deviceId,
      },
      deviceId: deviceReport.deviceId,
      deviceName: deviceReport.deviceName || deviceReport.deviceId,
      location: deviceReport.location || deviceReport.deviceName || deviceReport.deviceId,
      readingCount: deviceReport.readingCount || 0,
      metrics: {
        totalReadings: deviceReport.readingCount || 0,
        // Transform pH
        avgPH: params.pH?.avg || 0,
        minPH: params.pH?.min || 0,
        maxPH: params.pH?.max || 0,
        // Transform turbidity
        avgTurbidity: params.turbidity?.avg || 0,
        minTurbidity: params.turbidity?.min || 0,
        maxTurbidity: params.turbidity?.max || 0,
        // Transform TDS
        avgTDS: params.tds?.avg || 0,
        minTDS: params.tds?.min || 0,
        maxTDS: params.tds?.max || 0,
        // Status indicators
        ph: {
          value: params.pH?.avg || 0,
          status: params.pH?.compliant ? 'GOOD' : 'WARNING',
        },
        turbidity: {
          value: params.turbidity?.avg || 0,
          status: params.turbidity?.compliant ? 'GOOD' : 'WARNING',
        },
        tds: {
          value: params.tds?.avg || 0,
          status: params.tds?.compliant ? 'GOOD' : 'WARNING',
        },
      },
      // Transform alerts with detailed information
      alerts: generateDetailedAlerts(deviceReport, params),
      readings: [], // Can be populated from real-time data if needed
    };
  });

  // Calculate overall summary from device reports
  let totalReadings = 0;
  let sumTurbidity = 0, sumTDS = 0, sumPH = 0;
  let devicesWithData = 0;

  transformedDevices.forEach((device: any) => {
    if (device.metrics.totalReadings > 0) {
      totalReadings += device.metrics.totalReadings;
      sumTurbidity += device.metrics.avgTurbidity;
      sumTDS += device.metrics.avgTDS;
      sumPH += device.metrics.avgPH;
      devicesWithData++;
    }
  });

  const summary = {
    totalReadings,
    averageTurbidity: devicesWithData > 0 ? sumTurbidity / devicesWithData : 0,
    averageTDS: devicesWithData > 0 ? sumTDS / devicesWithData : 0,
    averagePH: devicesWithData > 0 ? sumPH / devicesWithData : 0,
    avgTurbidity: devicesWithData > 0 ? sumTurbidity / devicesWithData : 0,
    avgTDS: devicesWithData > 0 ? sumTDS / devicesWithData : 0,
    avgPH: devicesWithData > 0 ? sumPH / devicesWithData : 0,
    // Status indicators
    turbidity: {
      value: devicesWithData > 0 ? sumTurbidity / devicesWithData : 0,
      status: (devicesWithData > 0 && sumTurbidity / devicesWithData <= 5) ? 'GOOD' : 'WARNING',
    },
    tds: {
      value: devicesWithData > 0 ? sumTDS / devicesWithData : 0,
      status: (devicesWithData > 0 && sumTDS / devicesWithData <= 500) ? 'GOOD' : 'WARNING',
    },
    ph: {
      value: devicesWithData > 0 ? sumPH / devicesWithData : 0,
      status: (devicesWithData > 0 && sumPH / devicesWithData >= 6.5 && sumPH / devicesWithData <= 8.5) ? 'GOOD' : 'WARNING',
    },
  };

  return {
    devices: transformedDevices,
    summary,
    period: {
      start: startDate,
      end: endDate,
    },
  };
};

/**
 * Simplified Water Quality Report Generation Interface
 */
export const AdminReports = () => {
  const token = useThemeToken();
  const [showHistory, setShowHistory] = useState(false);
  const [form] = Form.useForm();

  // Global hooks
  const { devices: devicesWithReadings, isLoading: devicesLoading } = useDevices({ pollInterval: 0 });
  const { 
    generateWaterQualityReport: fetchWaterQualityData,
    isLoading: generating,
  } = useReportMutations();

  // Local UI hooks
  const { reportHistory, addReportToHistory } = useReportHistory();

  // Transform devices to Device type for component compatibility
  const devices: Device[] = useMemo(() => {
    return devicesWithReadings.map((d) => ({
      id: d.deviceId,
      deviceId: d.deviceId,
      name: d.name,
      type: d.type || 'ESP32',
      firmwareVersion: d.firmwareVersion || '1.0.0',
      macAddress: d.macAddress || 'N/A',
      ipAddress: d.ipAddress || 'N/A',
      sensors: d.sensors || ['tds', 'ph', 'turbidity'],
      status: d.status,
      registeredAt: d.registeredAt,
      lastSeen: d.lastSeen,
      metadata: d.metadata
    }));
  }, [devicesWithReadings]);

  // Set default values for form
  useMemo(() => {
    form.setFieldsValue({
      dateRange: [dayjs().subtract(7, 'days'), dayjs()],
      includeStatistics: true,
      includeCharts: true,
    });
  }, [form]);

  interface ReportFormValues {
    dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
    devices?: string[];
    title?: string;
    notes?: string;
    includeStatistics?: boolean;
    includeCharts?: boolean;
  }

  const handleGenerateReport = async (values: ReportFormValues) => {
    try {
      const { dateRange, devices: deviceIds, title, notes, includeStatistics, includeCharts } = values;
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || '';
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || '';

      message.loading({ content: 'Generating report...', key: 'report', duration: 0 });

      console.log('[AdminReports] Generating report with params:', {
        startDate,
        endDate,
        deviceIds,
        deviceCount: deviceIds?.length || 0,
      });

      // Fetch water quality data with compliance information from server
      const reportData = await fetchWaterQualityData({
        startDate,
        endDate,
        deviceIds: deviceIds || [],
      });

      console.log('[AdminReports] Received report data from API:', {
        hasData: !!reportData,
        deviceCount: (reportData as any)?.data?.devices?.length || 0,
        summaryKeys: reportData?.summary ? Object.keys(reportData.summary) : [],
        rawSummary: reportData?.summary,
        rawDevices: (reportData as any)?.data?.devices,
      });

      if (reportData) {
        // Check if we have actual data
        const apiDevices = (reportData as any)?.data?.devices || [];
        const totalReadings = reportData?.summary?.totalReadings || 0;
        
        if (totalReadings === 0 && apiDevices.length === 0) {
          message.warning({
            content: 'No sensor data found for the selected devices and date range. Please check device IDs and try a different date range.',
            key: 'report',
            duration: 5,
          });
          console.warn('[AdminReports] No data available:', {
            selectedDevices: deviceIds,
            dateRange: { startDate, endDate },
            apiResponse: reportData,
          });
        }

        // Transform server response to match PDF template structure
        const transformedReportData = transformReportData(reportData, startDate, endDate);

        console.log('[AdminReports] Transformed report data:', {
          deviceCount: transformedReportData.devices?.length || 0,
          hasSummary: !!transformedReportData.summary,
          summaryTotalReadings: transformedReportData.summary?.totalReadings || 0,
          avgTurbidity: transformedReportData.summary?.averageTurbidity || 0,
          avgTDS: transformedReportData.summary?.averageTDS || 0,
          avgPH: transformedReportData.summary?.averagePH || 0,
          devicesWithData: transformedReportData.devices?.filter((d: any) => d.readingCount > 0).length || 0,
        });

        // Create report configuration
        const reportConfig = {
          type: 'water_quality' as const,
          title: title || 'Water Quality Analysis Report',
          deviceIds: deviceIds || [],
          dateRange: dateRange || null,
          generatedBy: 'Administrator',
          notes: notes || '',
          includeStatistics: includeStatistics !== false,
          includeRawData: false,
          includeCharts: includeCharts !== false,
        };

        // Generate PDF with transformed data
        const pdfDoc = await generateWaterQualityReport(reportConfig, transformedReportData);

        if (pdfDoc) {
          const filename = `water_quality_report_${dayjs().format('YYYY-MM-DD_HHmmss')}.pdf`;
          pdfDoc.save(filename);

          // Add to history
          const historyItem = {
            id: `report-${Date.now()}`,
            type: 'water_quality' as const,
            title: reportConfig.title,
            generatedAt: new Date(),
            devices: deviceIds?.length || 0,
            pages: pdfDoc.getNumberOfPages() || 1,
          };
          addReportToHistory(historyItem);

          message.success({ content: 'Report generated and downloaded successfully!', key: 'report' });
          form.resetFields();
        }
      }
    } catch (error) {
      message.error({ content: error instanceof Error ? error.message : 'Failed to generate report', key: 'report' });
      console.error('[AdminReports] Report generation failed:', error);
    }
  };



  return (
    <AdminLayout>
      <Content style={{ padding: '24px' }}>
        <PageHeader
          title="Reports"
          icon={<FileTextOutlined />}
          description="Generate comprehensive water quality analysis reports with WHO compliance assessment"
          breadcrumbItems={[
            { title: 'Reports', icon: <FileTextOutlined /> }
          ]}
          actions={[
            {
              key: 'history',
              label: `History (${reportHistory.length})`,
              icon: <HistoryOutlined />,
              onClick: () => setShowHistory(!showHistory),
              type: showHistory ? 'primary' : 'default',
            },
            {
              key: 'refresh',
              label: 'Refresh',
              icon: <ReloadOutlined spin={devicesLoading} />,
              onClick: () => window.location.reload(),
              disabled: devicesLoading,
            }
          ]}
        />

        <div style={{ marginTop: 24 }}>

        <Row gutter={16}>
          {/* Main Form Section */}
          <Col xs={24} lg={showHistory ? 16 : 24}>
            <Card
              title={
                <Space>
                  <ExperimentOutlined style={{ color: token.colorPrimary }} />
                  <span>Generate Report</span>
                </Space>
              }
              extra={
                <Tag color="blue" icon={<CheckCircleOutlined />}>
                  Includes Compliance Assessment
                </Tag>
              }
              bodyStyle={{ padding: '20px' }}
            >
              <Alert
                message="Water Quality & Compliance Report"
                description="This report includes comprehensive water quality analysis (pH, TDS, Turbidity) and WHO standards compliance assessment for the selected devices and time period."
                type="info"
                showIcon
                style={{ marginBottom: 20 }}
              />

              <Form
                form={form}
                layout="vertical"
                onFinish={handleGenerateReport}
                initialValues={{
                  dateRange: [dayjs().subtract(7, 'days'), dayjs()],
                  includeStatistics: true,
                  includeCharts: true,
                }}
                size="middle"
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        <Space>
                          <CalendarOutlined />
                          <span>Date Range</span>
                        </Space>
                      }
                      name="dateRange"
                      rules={[{ required: true, message: 'Please select a date range' }]}
                    >
                      <RangePicker 
                        style={{ width: '100%' }}
                        format="YYYY-MM-DD"
                        disabled={generating}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        <Space>
                          <DatabaseOutlined />
                          <span>Select Devices</span>
                        </Space>
                      }
                      name="devices"
                      rules={[{ required: true, message: 'Please select at least one device' }]}
                    >
                      <Select
                        mode="multiple"
                        placeholder="Select devices to include"
                        loading={devicesLoading}
                        disabled={generating}
                        options={devices.map(d => ({
                          label: `${d.name} (${d.deviceId})`,
                          value: d.deviceId,
                        }))}
                        maxTagCount="responsive"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Report Title (Optional)"
                      name="title"
                    >
                      <Input 
                        placeholder="e.g., Weekly Water Quality Report"
                        disabled={generating}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item label="Options">
                      <Space size="large">
                        <Form.Item
                          name="includeStatistics"
                          valuePropName="checked"
                          noStyle
                        >
                          <Switch 
                            checkedChildren="Statistics" 
                            unCheckedChildren="Statistics"
                            disabled={generating}
                          />
                        </Form.Item>
                        <Form.Item
                          name="includeCharts"
                          valuePropName="checked"
                          noStyle
                        >
                          <Switch 
                            checkedChildren="Charts" 
                            unCheckedChildren="Charts"
                            disabled={generating}
                          />
                        </Form.Item>
                      </Space>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="Notes (Optional)"
                  name="notes"
                >
                  <TextArea 
                    rows={2}
                    placeholder="Add any notes or observations to include in the report..."
                    disabled={generating}
                  />
                </Form.Item>

                <Divider style={{ margin: '16px 0' }} />

                <Row gutter={16} align="middle">
                  <Col xs={24} sm={12}>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        icon={<DownloadOutlined />}
                        loading={generating}
                        disabled={devicesLoading}
                        block
                      >
                        {generating ? 'Generating Report...' : 'Generate & Download Report'}
                      </Button>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Row gutter={8}>
                      <Col span={8}>
                        <Statistic
                          title="Devices"
                          value={devices.filter(d => d.status === 'online').length}
                          suffix={`/${devices.length}`}
                          valueStyle={{ color: token.colorSuccess, fontSize: 18 }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Reports"
                          value={reportHistory.length}
                          valueStyle={{ color: token.colorPrimary, fontSize: 18 }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Sensors"
                          value={devices.reduce((acc, d) => acc + (d.sensors?.length || 0), 0)}
                          valueStyle={{ color: token.colorInfo, fontSize: 18 }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Form>
            </Card>
          </Col>

          {/* History Sidebar */}
          {showHistory && (
            <Col xs={24} lg={8}>
              <Card
                title={
                  <Space>
                    <HistoryOutlined />
                    <span>Report History</span>
                  </Space>
                }
                bodyStyle={{ padding: '16px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
              >
                {reportHistory.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No reports generated yet"
                    style={{ padding: '40px 0' }}
                  />
                ) : (
                  <List
                    dataSource={reportHistory.slice(0, 10)}
                    renderItem={(item) => (
                      <List.Item
                        style={{ 
                          padding: '12px',
                          borderRadius: 8,
                          marginBottom: 8,
                          background: '#fafafa'
                        }}
                      >
                        <List.Item.Meta
                          avatar={<FileTextOutlined style={{ fontSize: 20, color: token.colorPrimary }} />}
                          title={
                            <Text strong ellipsis style={{ fontSize: 13 }}>
                              {item.title}
                            </Text>
                          }
                          description={
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                <ClockCircleOutlined /> {dayjs(item.generatedAt).format('MMM D, YYYY h:mm A')}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                <DatabaseOutlined /> {item.devices} device{item.devices !== 1 ? 's' : ''}
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          )}
        </Row>
        </div>
      </Content>
    </AdminLayout>
  );
};
