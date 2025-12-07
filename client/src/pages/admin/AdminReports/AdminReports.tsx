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
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { 
  Row, 
  Col, 
  Card, 
  Space, 
  Button,
  Divider,
  Form,
  Select,
  DatePicker,
  Input,
  Switch,
  Alert,
  Tag,
  message,
  Layout,
  Tabs,
  Progress
} from 'antd';
import {
  FileTextOutlined,
  HistoryOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { Typography } from 'antd';
const { Text } = Typography;

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Content } = Layout;

// Hooks
import { useThemeToken } from '../../../theme';
import { useDevices, useReportMutations } from '../../../hooks';

// Services
import { reportsService } from '../../../services/reports.Service';

// Components
import { AdminLayout } from '../../../components/layouts';
import { PageHeader } from '../../../components';
import { CompactReportStats } from './components';
import ReportHistory from './ReportHistory';

// Types
import type { Device, DeviceWithReadings } from '../../../schemas';

/**
 * Simplified Water Quality Report Generation Interface
 */
export const AdminReports = () => {
  const token = useThemeToken();
  const [form] = Form.useForm();

  // State for triggering history refresh
  const [refreshHistoryKey, setRefreshHistoryKey] = useState(0);
  const [activeTab, setActiveTab] = useState('generation');

  // Backup progress state
  const [backupProgress, setBackupProgress] = useState<{
    status: 'idle' | 'saving' | 'completed' | 'failed';
    message: string;
    percent: number;
  }>({
    status: 'idle',
    message: '',
    percent: 0
  });

  // Global hooks
  const { devices: devicesWithReadings, isLoading: devicesLoading } = useDevices(); // 🔥 NO POLLING
  const { 
    isLoading: generating,
  } = useReportMutations();

  // Transform devices to Device type for component compatibility
  const devices: Device[] = useMemo(() => {
    return devicesWithReadings.map((d: DeviceWithReadings) => ({
      id: d.deviceId,
      deviceId: d.deviceId,
      name: d.name,
      type: d.type || 'ESP32',
      firmwareVersion: d.firmwareVersion || '1.0.0',
      macAddress: d.macAddress || 'N/A',
      ipAddress: d.ipAddress || 'N/A',
      sensors: d.sensors || ['tds', 'ph', 'turbidity'],
      location: d.location || 'Unknown',
      status: d.status,
      registrationStatus: d.isRegistered ? 'registered' : 'pending',
      isRegistered: d.isRegistered ?? true,
      registeredAt: d.registeredAt,
      lastSeen: d.lastSeen,
      createdAt: d.createdAt || d.registeredAt,
      updatedAt: d.updatedAt || d.lastSeen,
      metadata: d.metadata
    }));
  }, [devicesWithReadings]);

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
      const { dateRange, devices: deviceIds } = values;
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || '';
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || '';

      // Step 1: Start generating
      message.loading({ content: 'Generating report...', key: 'report', duration: 0 });
      setBackupProgress({ 
        status: 'saving', 
        message: 'Generating report...', 
        percent: 20 
      });

      if (import.meta.env.DEV) {
        console.log('[AdminReports] Generating report with params:', {
          startDate,
          endDate,
          deviceIds,
          deviceCount: deviceIds?.length || 0,
        });
      }

      if (import.meta.env.DEV) {
        // DEBUG: Log device data being sent
        const selectedDevices = deviceIds?.map(id => {
          const device = devicesWithReadings.find(d => d.deviceId === id);
          return {
            deviceId: id,
            name: device?.name,
            hasReadings: device?.latestReading ? true : false,
            latestReading: device?.latestReading,
          };
        }) || [];
        
        console.log('[AdminReports] DEBUG - Selected devices with readings:', selectedDevices);
        console.log('[AdminReports] DEBUG - Total devices available:', devicesWithReadings.length);
      }

      // Step 2: Update message - generating report
      setTimeout(() => {
        message.loading({ content: 'Processing data...', key: 'report', duration: 0 });
        setBackupProgress({ 
          status: 'saving', 
          message: 'Processing data...', 
          percent: 40 
        });
      }, 500);

      // Call backend API to generate report and store PDF
      const response = await reportsService.generateWaterQualityReport({
        startDate,
        endDate,
        deviceIds: deviceIds || [],
      });

      if (import.meta.env.DEV) {
        // DEBUG: Log response data
        console.log('[AdminReports] DEBUG - Response received:', {
          success: response.success,
          hasPdfBlob: !!response.pdfBlob,
          pdfBlobSize: response.pdfBlob?.length,
          hasGridFsFileId: !!response.data?.gridFsFileId,
          reportData: response.data,
        });
      }

      if (response.success) {
        // Step 3: Update progress - saving to database
        message.loading({ content: 'Saving to database...', key: 'report', duration: 0 });
        setBackupProgress({ 
          status: 'saving', 
          message: 'Saving to database...', 
          percent: 70 
        });

        // Check if PDF blob is included in response for instant download
        if (response.pdfBlob) {
          try {
            // Convert base64 to blob
            const pdfBlob = new Blob(
              [Uint8Array.from(atob(response.pdfBlob), c => c.charCodeAt(0))],
              { type: response.pdfContentType || 'application/pdf' }
            );

            // Step 4: Update progress - preparing download
            message.loading({ content: 'Preparing download...', key: 'report', duration: 0 });
            setBackupProgress({ 
              status: 'saving', 
              message: 'Preparing download...', 
              percent: 90 
            });

            // Create download link and trigger download
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = response.pdfFilename || `water_quality_report_${response.data.reportId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Step 5: Update progress - completed
            setBackupProgress({ 
              status: 'completed', 
              message: 'Report generated, saved, and downloaded successfully!', 
              percent: 100 
            });

            message.success({
              content: 'Report generated, saved to database, and downloaded!',
              key: 'report',
              duration: 5
            });

            // Trigger history refresh
            setRefreshHistoryKey(prev => prev + 1);
          } catch (downloadError) {
            console.error('[AdminReports] Instant download failed:', downloadError);
            // Fallback to separate download call using report ID
            const reportId = (response.data as any)._id || response.data.id;
            if (reportId) {
              try {
                const blob = await reportsService.downloadReport(reportId);
                
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `water_quality_report_${reportId}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                setBackupProgress({ 
                  status: 'completed', 
                  message: 'Report downloaded and saved to database successfully!', 
                  percent: 100 
                });

                message.success({
                  content: 'Report generated, downloaded, and saved to database!',
                  key: 'report',
                  duration: 5
                });

                // Trigger history refresh
                setRefreshHistoryKey(prev => prev + 1);
              } catch (fallbackError) {
                console.error('[AdminReports] Fallback download failed:', fallbackError);
                setBackupProgress({ 
                  status: 'completed', 
                  message: 'Report saved to database successfully! Download from Report History.', 
                  percent: 100 
                });
                
                message.success({
                  content: 'Report saved to database successfully! You can download it from Report History.',
                  key: 'report',
                  duration: 5
                });

                // Trigger history refresh
                setRefreshHistoryKey(prev => prev + 1);
              }
            } else {
              setBackupProgress({ 
                status: 'completed', 
                message: 'Report saved to database successfully! Download from Report History.', 
                percent: 100 
              });

              message.success({
                content: 'Report saved to database successfully! You can download it from Report History.',
                key: 'report',
                duration: 5
              });

              // Trigger history refresh
              setRefreshHistoryKey(prev => prev + 1);
            }
          }
        } else {
          // PDF not included in response, report is being generated asynchronously
          // Wait a moment and try to download
          const reportId = (response.data as any)._id || response.data.id;
          if (reportId) {
            try {
              // Wait a bit for the report to be generated
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const blob = await reportsService.downloadReport(reportId);
              
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `water_quality_report_${reportId}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);

              setBackupProgress({ 
                status: 'completed', 
                message: 'Report downloaded and saved to database successfully!', 
                percent: 100 
              });

              message.success({
                content: 'Report generated, downloaded, and saved to database!',
                key: 'report',
                duration: 5
              });

              // Trigger history refresh
              setRefreshHistoryKey(prev => prev + 1);
            } catch (downloadError) {
              console.error('[AdminReports] Download failed:', downloadError);
              setBackupProgress({ 
                status: 'failed', 
                message: 'Report saved to database but download failed', 
                percent: 100 
              });
              
              message.warning({
                content: 'Report saved to database successfully, but instant download failed. You can download it from Report History.',
                key: 'report',
                duration: 5
              });

              // Trigger history refresh
              setRefreshHistoryKey(prev => prev + 1);
            }
          } else {
            // No reportId available, but report was generated
            setBackupProgress({ 
              status: 'completed', 
              message: 'Report generated and saved to database successfully!', 
              percent: 100 
            });

            message.success({
              content: 'Report generated and saved to database successfully! You can download it from Report History.',
              key: 'report',
              duration: 5
            });

            // Trigger history refresh
            setRefreshHistoryKey(prev => prev + 1);
          }
        }

        form.resetFields();
      } else {
        throw new Error(response.message || 'Failed to generate report');
      }
    } catch (error) {
      setBackupProgress({ 
        status: 'failed', 
        message: 'Report generation failed', 
        percent: 0 
      });
      
      message.error({
        content: error instanceof Error ? error.message : 'Failed to generate report',
        key: 'report'
      });
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
          
        />

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
          items={[
            {
              key: 'generation',
              label: (
                <Space>
                  <ExperimentOutlined />
                  Report Generation
                </Space>
              ),
              children: (
                <Row gutter={16}>
                  {/* Main Form Section */}
                  <Col xs={24} lg={24}>
                    {/* Compact Statistics */}
                    <div style={{ marginBottom: 16 }}>
                      <CompactReportStats devices={devices} />
                    </div>

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

                      {/* Report Generation Progress Indicator */}
                      {backupProgress.status !== 'idle' && (
                        <Card size="small" style={{ marginBottom: 20 }}>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Text strong>Report Generation Progress</Text>
                            <Progress 
                              percent={backupProgress.percent} 
                              status={
                                backupProgress.status === 'failed' ? 'exception' :
                                backupProgress.status === 'completed' ? 'success' : 'active'
                              }
                              strokeColor={
                                backupProgress.status === 'completed' ? token.colorSuccess :
                                backupProgress.status === 'failed' ? token.colorError : token.colorPrimary
                              }
                            />
                            <Text type={
                              backupProgress.status === 'failed' ? 'danger' :
                              backupProgress.status === 'completed' ? 'success' : 'secondary'
                            }>
                              {backupProgress.message}
                            </Text>
                          </Space>
                        </Card>
                      )}

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
                          <Col xs={24}>
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
                        </Row>
                      </Form>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'history',
              label: (
                <Space>
                  <HistoryOutlined />
                  Report History
                </Space>
              ),
              children: <ReportHistory key={refreshHistoryKey} />,
            },
          ]}
        />
      </Content>
    </AdminLayout>
  );
};
