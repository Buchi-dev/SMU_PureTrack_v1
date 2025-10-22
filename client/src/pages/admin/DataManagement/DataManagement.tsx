import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Select,
  DatePicker,
  Tag,
  Typography,
  Tabs,
  Progress,
  Alert,
  message,
  Modal,
  Tooltip,
  Badge,
  Empty,
  Divider,
  Radio,
  InputNumber,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RadioChangeEvent } from 'antd';
import {
  DatabaseOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FileTextOutlined,
  CloudDownloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  SafetyOutlined,
  ClearOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import { api } from '../../../services/api';
import type { Device, SensorReading } from '../../../schemas';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useThemeToken } from '../../../theme';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

interface DataStats {
  totalRecords: number;
  devicesWithData: number;
  avgReadingsPerDevice: number;
  oldestRecord: Date | null;
  newestRecord: Date | null;
  totalDataSize: string;
  qualityScore: number;
}

interface DataQuality {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
}

const DataManagement = () => {
  const token = useThemeToken();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('all');
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataStats, setDataStats] = useState<DataStats>({
    totalRecords: 0,
    devicesWithData: 0,
    avgReadingsPerDevice: 0,
    oldestRecord: null,
    newestRecord: null,
    totalDataSize: '0 KB',
    qualityScore: 100,
  });
  const [dataQuality, setDataQuality] = useState<DataQuality>({
    total: 0,
    valid: 0,
    warnings: 0,
    errors: 0,
  });
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [cleanupDays, setCleanupDays] = useState<number>(30);

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  // Load data when device or date range changes
  useEffect(() => {
    if (selectedDeviceId) {
      loadSensorData();
    }
  }, [selectedDeviceId, dateRange]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await api.listDevices();
      setDevices(data);
    } catch (error) {
      message.error('Failed to load devices');
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSensorData = async () => {
    setLoading(true);
    try {
      if (selectedDeviceId === 'all') {
        // Load data from all devices
        const allData: SensorReading[] = [];
        for (const device of devices) {
          const history = await api.getSensorHistory(device.deviceId, 100);
          allData.push(...history);
        }
        setSensorData(allData);
        calculateStats(allData);
      } else {
        // Load data from specific device
        const history = await api.getSensorHistory(selectedDeviceId, 100);
        setSensorData(history);
        calculateStats(history);
      }
    } catch (error) {
      message.error('Failed to load sensor data');
      console.error('Error loading sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: SensorReading[]) => {
    if (data.length === 0) {
      setDataStats({
        totalRecords: 0,
        devicesWithData: 0,
        avgReadingsPerDevice: 0,
        oldestRecord: null,
        newestRecord: null,
        totalDataSize: '0 KB',
        qualityScore: 100,
      });
      setDataQuality({ total: 0, valid: 0, warnings: 0, errors: 0 });
      return;
    }

    // Calculate basic stats
    const timestamps = data.map(d => d.timestamp);
    const oldestRecord = new Date(Math.min(...timestamps));
    const newestRecord = new Date(Math.max(...timestamps));
    
    const uniqueDevices = new Set(data.map(d => d.deviceId)).size;
    const avgReadings = Math.round(data.length / uniqueDevices);
    
    // Estimate data size (rough approximation)
    const dataSize = (JSON.stringify(data).length / 1024).toFixed(2);

    // Calculate data quality
    let valid = 0, warnings = 0, errors = 0;
    
    data.forEach(reading => {
      let hasIssue = false;
      
      // Check turbidity (0-5 NTU is ideal)
      if (reading.turbidity < 0 || reading.turbidity > 10) {
        errors++;
        hasIssue = true;
      } else if (reading.turbidity > 5) {
        warnings++;
        hasIssue = true;
      }
      
      // Check TDS (0-500 ppm is ideal)
      if (reading.tds < 0 || reading.tds > 1000) {
        errors++;
        hasIssue = true;
      } else if (reading.tds > 500) {
        warnings++;
        hasIssue = true;
      }
      
      // Check pH (6.5-8.5 is ideal)
      if (reading.ph < 0 || reading.ph > 14) {
        errors++;
        hasIssue = true;
      } else if (reading.ph < 6.5 || reading.ph > 8.5) {
        warnings++;
        hasIssue = true;
      }
      
      if (!hasIssue) {
        valid++;
      }
    });

    const qualityScore = Math.round((valid / data.length) * 100);

    setDataStats({
      totalRecords: data.length,
      devicesWithData: uniqueDevices,
      avgReadingsPerDevice: avgReadings,
      oldestRecord,
      newestRecord,
      totalDataSize: `${dataSize} KB`,
      qualityScore,
    });

    setDataQuality({
      total: data.length,
      valid,
      warnings,
      errors,
    });
  };

  const handleExport = (format: 'csv' | 'json' | 'all') => {
    if (sensorData.length === 0) {
      message.warning('No data to export');
      return;
    }

    const exportData = (fmt: 'csv' | 'json') => {
      let content: string;
      let mimeType: string;
      let extension: string;

      if (fmt === 'csv') {
        // CSV Export
        const headers = ['Device ID', 'Timestamp', 'Date/Time', 'Turbidity (NTU)', 'TDS (ppm)', 'pH'];
        const rows = sensorData.map(reading => [
          reading.deviceId,
          reading.timestamp,
          new Date(reading.timestamp).toLocaleString(),
          reading.turbidity,
          reading.tds,
          reading.ph,
        ]);
        content = [headers, ...rows].map(row => row.join(',')).join('\n');
        mimeType = 'text/csv';
        extension = 'csv';
      } else {
        // JSON Export
        content = JSON.stringify(sensorData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sensor-data-${selectedDeviceId}-${Date.now()}.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
    };

    if (format === 'all') {
      exportData('csv');
      setTimeout(() => exportData('json'), 100);
      message.success('Data exported in both formats');
    } else {
      exportData(format);
      message.success(`Data exported as ${format.toUpperCase()}`);
    }
  };

  const handleCleanup = () => {
    Modal.confirm({
      title: 'Clean Up Old Data',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>
            This will permanently delete sensor readings older than <strong>{cleanupDays} days</strong>.
          </Paragraph>
          <Alert
            message="Warning"
            description="This action cannot be undone. Make sure you have exported any data you need."
            type="warning"
            showIcon
          />
        </div>
      ),
      okText: 'Delete Old Data',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        // In a real implementation, this would call an API endpoint
        const cutoffDate = Date.now() - (cleanupDays * 24 * 60 * 60 * 1000);
        const remainingData = sensorData.filter(d => d.timestamp > cutoffDate);
        const deletedCount = sensorData.length - remainingData.length;
        
        setSensorData(remainingData);
        calculateStats(remainingData);
        message.success(`Deleted ${deletedCount} old records`);
      },
    });
  };

  const handleBackup = () => {
    Modal.info({
      title: 'Create Data Backup',
      icon: <SafetyOutlined />,
      content: (
        <div>
          <Paragraph>
            Creating a complete backup of all sensor data...
          </Paragraph>
          <Progress percent={100} status="success" />
          <Paragraph type="secondary" style={{ marginTop: 16 }}>
            Backup will be saved with timestamp: {new Date().toLocaleString()}
          </Paragraph>
        </div>
      ),
      onOk: () => {
        handleExport('all');
        message.success('Backup created successfully');
      },
    });
  };

  // Table columns
  const columns: ColumnsType<SensorReading> = [
    {
      title: 'Device ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 120,
      render: (deviceId: string) => (
        <Tag color="blue">{deviceId}</Tag>
      ),
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      sorter: (a, b) => a.timestamp - b.timestamp,
      render: (timestamp: number) => (
        <Space direction="vertical" size={0}>
          <Text>{new Date(timestamp).toLocaleString()}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(timestamp).fromNow()}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Turbidity',
      dataIndex: 'turbidity',
      key: 'turbidity',
      width: 120,
      sorter: (a, b) => a.turbidity - b.turbidity,
      render: (value: number) => {
        const status = value > 5 ? 'error' : value > 4 ? 'warning' : 'success';
        return (
          <Badge
            status={status}
            text={`${value.toFixed(2)} NTU`}
          />
        );
      },
    },
    {
      title: 'TDS',
      dataIndex: 'tds',
      key: 'tds',
      width: 120,
      sorter: (a, b) => a.tds - b.tds,
      render: (value: number) => {
        const status = value > 500 ? 'error' : value > 400 ? 'warning' : 'success';
        return (
          <Badge
            status={status}
            text={`${value.toFixed(2)} ppm`}
          />
        );
      },
    },
    {
      title: 'pH',
      dataIndex: 'ph',
      key: 'ph',
      width: 100,
      sorter: (a, b) => a.ph - b.ph,
      render: (value: number) => {
        const status = (value < 6.5 || value > 8.5) ? 'error' : 
                      (value < 7 || value > 8) ? 'warning' : 'success';
        return (
          <Badge
            status={status}
            text={value.toFixed(2)}
          />
        );
      },
    },
    {
      title: 'Quality',
      key: 'quality',
      width: 100,
      render: (_: any, record: SensorReading) => {
        const issues = [];
        if (record.turbidity > 5) issues.push('turbidity');
        if (record.tds > 500) issues.push('tds');
        if (record.ph < 6.5 || record.ph > 8.5) issues.push('ph');

        if (issues.length === 0) {
          return <Tag color="success" icon={<CheckCircleOutlined />}>Good</Tag>;
        } else if (issues.length === 1) {
          return <Tag color="warning" icon={<WarningOutlined />}>Warning</Tag>;
        } else {
          return <Tag color="error" icon={<ExclamationCircleOutlined />}>Poor</Tag>;
        }
      },
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2}>
              <DatabaseOutlined /> Data Management
            </Title>
            <Text type="secondary">
              Manage, export, and analyze sensor data
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<SafetyOutlined />}
                onClick={handleBackup}
              >
                Backup
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadSensorData}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Records"
                value={dataStats.totalRecords}
                prefix={<DatabaseOutlined />}
                valueStyle={{ color: '#001f3f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Devices with Data"
                value={dataStats.devicesWithData}
                prefix={<BarChartOutlined />}
                suffix={`/ ${devices.length}`}
                valueStyle={{ color: token.colorInfo }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Data Quality Score"
                value={dataStats.qualityScore}
                suffix="%"
                prefix={
                  dataStats.qualityScore >= 90 ? (
                    <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                  ) : dataStats.qualityScore >= 70 ? (
                    <WarningOutlined style={{ color: token.colorWarning }} />
                  ) : (
                    <ExclamationCircleOutlined style={{ color: token.colorError }} />
                  )
                }
                valueStyle={{
                  color:
                    dataStats.qualityScore >= 90
                      ? token.colorSuccess
                      : dataStats.qualityScore >= 70
                      ? token.colorWarning
                      : token.colorError,
                }}
              />
              <Progress
                percent={dataStats.qualityScore}
                showInfo={false}
                strokeColor={
                  dataStats.qualityScore >= 90
                    ? token.colorSuccess
                    : dataStats.qualityScore >= 70
                    ? token.colorWarning
                    : token.colorError
                }
                size="small"
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Storage Used"
                value={dataStats.totalDataSize}
                prefix={<CloudDownloadOutlined />}
                valueStyle={{ color: token.colorPrimary }}
              />
            </Card>
          </Col>
        </Row>

        {/* Data Quality Overview */}
        <Card
          title={
            <Space>
              <CheckCircleOutlined />
              <span>Data Quality Overview</span>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}>
              <Statistic
                title="Valid Records"
                value={dataQuality.valid}
                valueStyle={{ color: token.colorSuccess }}
                suffix={`/ ${dataQuality.total}`}
              />
            </Col>
            <Col xs={24} sm={6}>
              <Statistic
                title="Warnings"
                value={dataQuality.warnings}
                valueStyle={{ color: token.colorWarning }}
              />
            </Col>
            <Col xs={24} sm={6}>
              <Statistic
                title="Errors"
                value={dataQuality.errors}
                valueStyle={{ color: token.colorError }}
              />
            </Col>
            <Col xs={24} sm={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">Time Range</Text>
                {dataStats.oldestRecord && dataStats.newestRecord ? (
                  <>
                    <Text strong>
                      {dayjs(dataStats.oldestRecord).format('MMM D, YYYY')}
                    </Text>
                    <Text type="secondary">to</Text>
                    <Text strong>
                      {dayjs(dataStats.newestRecord).format('MMM D, YYYY')}
                    </Text>
                  </>
                ) : (
                  <Text type="secondary">No data</Text>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Main Content Tabs */}
        <Card>
          <Tabs defaultActiveKey="browser">
            {/* Data Browser Tab */}
            <TabPane
              tab={
                <span>
                  <FileTextOutlined />
                  Data Browser
                </span>
              }
              key="browser"
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* Filters */}
                <Card size="small" title={<><FilterOutlined /> Filters</>}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>Device:</Text>
                        <Select
                          style={{ width: '100%' }}
                          value={selectedDeviceId}
                          onChange={setSelectedDeviceId}
                          placeholder="Select a device"
                        >
                          <Option value="all">All Devices</Option>
                          {devices.map(device => (
                            <Option key={device.deviceId} value={device.deviceId}>
                              <Space>
                                <Badge status={device.status === 'online' ? 'success' : 'default'} />
                                {device.name} ({device.deviceId})
                              </Space>
                            </Option>
                          ))}
                        </Select>
                      </Space>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>Date Range:</Text>
                        <RangePicker
                          style={{ width: '100%' }}
                          value={dateRange}
                          onChange={setDateRange}
                          format="YYYY-MM-DD"
                        />
                      </Space>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>&nbsp;</Text>
                        <Button
                          type="primary"
                          icon={<FilterOutlined />}
                          onClick={loadSensorData}
                          block
                        >
                          Apply Filters
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* Data Table */}
                <Table
                  columns={columns}
                  dataSource={sensorData}
                  rowKey={(record) => `${record.deviceId}-${record.timestamp}`}
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} records`,
                  }}
                  scroll={{ x: 800 }}
                  locale={{
                    emptyText: (
                      <Empty
                        description="No sensor data available"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ),
                  }}
                />
              </Space>
            </TabPane>

            {/* Export Tab */}
            <TabPane
              tab={
                <span>
                  <DownloadOutlined />
                  Export Data
                </span>
              }
              key="export"
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Alert
                  message="Export Sensor Data"
                  description="Download sensor readings in your preferred format for offline analysis, backup, or integration with other tools."
                  type="info"
                  showIcon
                />

                <Card title="Export Options">
                  <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                      <Text strong>Select Format:</Text>
                      <Radio.Group
                        value={exportFormat}
                        onChange={(e: RadioChangeEvent) => setExportFormat(e.target.value)}
                        style={{ display: 'block', marginTop: 12 }}
                      >
                        <Space direction="vertical">
                          <Radio value="csv">
                            <Space>
                              <FileTextOutlined />
                              <div>
                                <Text strong>CSV (Comma-Separated Values)</Text>
                                <br />
                                <Text type="secondary">
                                  Best for Excel, Google Sheets, and data analysis tools
                                </Text>
                              </div>
                            </Space>
                          </Radio>
                          <Radio value="json">
                            <Space>
                              <DatabaseOutlined />
                              <div>
                                <Text strong>JSON (JavaScript Object Notation)</Text>
                                <br />
                                <Text type="secondary">
                                  Best for programming, APIs, and data processing
                                </Text>
                              </div>
                            </Space>
                          </Radio>
                        </Space>
                      </Radio.Group>
                    </div>

                    <Divider />

                    <Row gutter={16}>
                      <Col span={8}>
                        <Button
                          type="primary"
                          icon={<DownloadOutlined />}
                          onClick={() => handleExport(exportFormat)}
                          disabled={sensorData.length === 0}
                          block
                          size="large"
                        >
                          Export as {exportFormat.toUpperCase()}
                        </Button>
                      </Col>
                      <Col span={8}>
                        <Button
                          icon={<CloudDownloadOutlined />}
                          onClick={() => handleExport('all')}
                          disabled={sensorData.length === 0}
                          block
                          size="large"
                        >
                          Export Both Formats
                        </Button>
                      </Col>
                      <Col span={8}>
                        <Tooltip title="Create a complete backup of all data">
                          <Button
                            icon={<SafetyOutlined />}
                            onClick={handleBackup}
                            disabled={sensorData.length === 0}
                            block
                            size="large"
                          >
                            Full Backup
                          </Button>
                        </Tooltip>
                      </Col>
                    </Row>

                    <Alert
                      message={`Ready to export ${sensorData.length} records`}
                      type="success"
                      showIcon
                    />
                  </Space>
                </Card>
              </Space>
            </TabPane>

            {/* Cleanup Tab */}
            <TabPane
              tab={
                <span>
                  <ClearOutlined />
                  Data Cleanup
                </span>
              }
              key="cleanup"
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Alert
                  message="Data Cleanup Tools"
                  description="Remove old or unnecessary data to optimize storage and improve performance. Always export important data before cleanup."
                  type="warning"
                  showIcon
                />

                <Card title="Delete Old Records">
                  <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                      <Text strong>Delete records older than:</Text>
                      <div style={{ marginTop: 12 }}>
                        <Space>
                          <InputNumber
                            min={1}
                            max={365}
                            value={cleanupDays}
                            onChange={(value) => setCleanupDays(value || 30)}
                            style={{ width: 120 }}
                          />
                          <Text>days</Text>
                        </Space>
                      </div>
                      <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                        This will delete sensor readings older than {cleanupDays} days
                        (before {dayjs().subtract(cleanupDays, 'day').format('MMMM D, YYYY')})
                      </Text>
                    </div>

                    <Alert
                      message="Warning"
                      description="Deleted data cannot be recovered. Make sure to export any data you need before proceeding."
                      type="error"
                      showIcon
                    />

                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={handleCleanup}
                      disabled={sensorData.length === 0}
                      size="large"
                    >
                      Delete Old Data
                    </Button>
                  </Space>
                </Card>

                <Card title="Storage Information">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <Statistic
                        title="Current Storage"
                        value={dataStats.totalDataSize}
                        prefix={<DatabaseOutlined />}
                      />
                    </Col>
                    <Col xs={24} sm={12}>
                      <Statistic
                        title="Records Count"
                        value={dataStats.totalRecords}
                        prefix={<ClockCircleOutlined />}
                      />
                    </Col>
                  </Row>
                </Card>
              </Space>
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default DataManagement;
