/**
 * ReportPreviewPanel Component
 * 
 * Preview panel for report configuration before generation.
 * Displays selected options and provides final confirmation.
 */
import { 
  Card, 
  Space, 
  Button, 
  Typography, 
  Descriptions, 
  Tag,
  Alert,
  Result,
  Row,
  Col,
  Divider
} from 'antd';
import {
  LeftOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { Device, ReportType } from '../../../../schemas';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface ReportPreviewPanelProps {
  selectedType: ReportType;
  formValues: {
    dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
    devices?: string[];
    title?: string;
    notes?: string;
    includeStatistics?: boolean;
    includeCharts?: boolean;
    includeRawData?: boolean;
  };
  devices: Device[];
  onGenerate: () => void;
  onBack: () => void;
  generating: boolean;
}

/**
 * Report preview with configuration summary
 * 
 * @example
 * <ReportPreviewPanel
 *   selectedType="water_quality"
 *   formValues={form.getFieldsValue()}
 *   devices={devices}
 *   onGenerate={handleGenerate}
 *   onBack={goBack}
 *   generating={false}
 * />
 */
export const ReportPreviewPanel = ({
  formValues,
  devices,
  onGenerate,
  onBack,
  generating,
}: ReportPreviewPanelProps) => {
  const getReportTypeLabel = (/* _type?: ReportType */) => {
    return 'Water Quality Report';
  };

  const getReportTypeColor = (/* _type?: ReportType */) => {
    return 'blue';
  };

  const selectedDevices = devices.filter(d => 
    formValues.devices?.includes(d.deviceId)
  );

  const dateRange = formValues.dateRange;
  const hasDateRange = dateRange && dateRange.length === 2;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Preview Header */}
      <Card variant="borderless">
        <Result
          status="info"
          icon={<FileTextOutlined style={{ color: '#1890ff' }} />}
          title="Review Your Report Configuration"
          subTitle="Please review the details below before generating your report"
        />
      </Card>

      {/* Report Details */}
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <CheckCircleOutlined />
                <span>Report Details</span>
              </Space>
            }
          >
            <Descriptions column={1} bordered>
              <Descriptions.Item 
                label={
                  <Space>
                    <FileTextOutlined />
                    <span>Report Type</span>
                  </Space>
                }
              >
                <Tag color={getReportTypeColor()} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {getReportTypeLabel()}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item 
                label={
                  <Space>
                    <FileTextOutlined />
                    <span>Report Title</span>
                  </Space>
                }
              >
                <Text strong>{formValues.title || 'Untitled Report'}</Text>
              </Descriptions.Item>

              <Descriptions.Item 
                label={
                  <Space>
                    <CalendarOutlined />
                    <span>Date Range</span>
                  </Space>
                }
              >
                {hasDateRange ? (
                  <Space>
                    <Text>{dayjs(dateRange[0]).format('MMM D, YYYY')}</Text>
                    <Text type="secondary">to</Text>
                    <Text>{dayjs(dateRange[1]).format('MMM D, YYYY')}</Text>
                    <Tag color="blue">
                      {dayjs(dateRange[1]).diff(dayjs(dateRange[0]), 'days') + 1} days
                    </Tag>
                  </Space>
                ) : (
                  <Tag color="default">All available data</Tag>
                )}
              </Descriptions.Item>

              <Descriptions.Item 
                label={
                  <Space>
                    <DatabaseOutlined />
                    <span>Selected Devices</span>
                  </Space>
                }
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>{selectedDevices.length} devices selected</Text>
                  <Space size={[8, 8]} wrap>
                    {selectedDevices.map(device => (
                      <Tag key={device.deviceId} color="blue">
                        {device.name}
                      </Tag>
                    ))}
                  </Space>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item 
                label={
                  <Space>
                    <SettingOutlined />
                    <span>Report Options</span>
                  </Space>
                }
              >
                <Space direction="vertical" size="small">
                  {formValues.includeStatistics && (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      Statistical Summary Included
                    </Tag>
                  )}
                  {formValues.includeRawData && (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      Detailed Data Tables Included
                    </Tag>
                  )}
                  {formValues.includeCharts && (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      Charts & Graphs Included
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>

              {formValues.notes && (
                <Descriptions.Item label="Additional Notes">
                  <Paragraph 
                    style={{ 
                      margin: 0, 
                      padding: 12, 
                      backgroundColor: '#fafafa',
                      borderRadius: 4 
                    }}
                  >
                    {formValues.notes}
                  </Paragraph>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Quick Summary */}
            <Card 
              title="Quick Summary"
              size="small"
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">Estimated Pages</Text>
                  <div>
                    <Text strong style={{ fontSize: 20 }}>
                      {selectedDevices.length * 2 + (formValues.includeRawData ? 3 : 1)}
                    </Text>
                  </div>
                </div>

                <Divider style={{ margin: 0 }} />

                <div>
                  <Text type="secondary">Data Points</Text>
                  <div>
                    <Text strong style={{ fontSize: 20 }}>
                      ~{selectedDevices.length * 100}
                    </Text>
                  </div>
                </div>

                <Divider style={{ margin: 0 }} />

                <div>
                  <Text type="secondary">Est. Generation Time</Text>
                  <div>
                    <Text strong style={{ fontSize: 20 }}>
                      {selectedDevices.length * 2 - 5} seconds
                    </Text>
                  </div>
                </div>
              </Space>
            </Card>

            {/* Info Alert */}
            <Alert
              message="Ready to Generate"
              description="Your report is configured and ready. Click the button below to generate your PDF report."
              type="success"
              showIcon
            />
          </Space>
        </Col>
      </Row>

      {/* Action Buttons */}
      <Card variant="borderless">
        <Row justify="space-between" align="middle">
          <Col>
            <Button 
              size="large"
              icon={<LeftOutlined />}
              onClick={onBack}
            >
              Back to Configuration
            </Button>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              onClick={onGenerate}
              loading={generating}
            >
              {generating ? 'Generating Report...' : 'Generate PDF Report'}
            </Button>
          </Col>
        </Row>
      </Card>
    </Space>
  );
};
