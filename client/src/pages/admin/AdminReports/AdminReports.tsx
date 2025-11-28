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
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { 
  Row, 
  Col, 
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
  Tag,
  message,
  Layout
} from 'antd';
import {
  FileTextOutlined,
  HistoryOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  DownloadOutlined
} from '@ant-design/icons';

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

// Types
import type { Device, DeviceWithReadings } from '../../../schemas';

/**
 * Simplified Water Quality Report Generation Interface
 */
export const AdminReports = () => {
  const navigate = useNavigate();
  const token = useThemeToken();
  const [form] = Form.useForm();

  // Global hooks
  const { devices: devicesWithReadings, isLoading: devicesLoading } = useDevices({ pollInterval: 0 });
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
      const { dateRange, devices: deviceIds } = values;
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || '';
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || '';

      message.loading({ content: 'Generating report...', key: 'report', duration: 0 });

      console.log('[AdminReports] Generating report with params:', {
        startDate,
        endDate,
        deviceIds,
        deviceCount: deviceIds?.length || 0,
      });

      // Call backend API to generate report and store PDF
      const response = await reportsService.generateWaterQualityReport({
        startDate,
        endDate,
        deviceIds: deviceIds || [],
      });

      if (response.success) {
        message.success({
          content: 'Report generated successfully! You can download it from the Report History page.',
          key: 'report',
          duration: 5
        });

        // Optionally redirect to history page or show download link
        // For now, just show success message

        form.resetFields();
      } else {
        throw new Error(response.message || 'Failed to generate report');
      }
    } catch (error) {
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
          actions={[
            {
              key: 'history',
              label: 'View Report History',
              icon: <HistoryOutlined />,
              onClick: () => navigate('/admin/reports/history'),
              type: 'default',
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

        <Row gutter={16}>
          {/* Main Form Section */}
          <Col xs={24} lg={24}>
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
                          value={0}
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

        </Row>
      </Content>
    </AdminLayout>
  );
};
