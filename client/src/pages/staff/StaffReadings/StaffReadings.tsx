/**
 * StaffReadings - Sensor Readings View for Staff Role
 * Displays real-time sensor readings from all devices
 * 
 * Architecture: Uses global hook useDevices()
 */

import { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Select,
  DatePicker,
  Typography,
  Row,
  Col,
  Alert,
  Skeleton,
} from 'antd';
import {
  LineChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { useThemeToken } from '../../../theme';
import { useDevices, useResponsive } from '../../../hooks';
import CompactReadingStats from './components/CompactReadingStats';
import { calculateReadingStatus } from '../../../utils/waterQualityUtils';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface Reading {
  key: string;
  timestamp: string;
  device: string;
  location: string;
  ph: number;
  tds: number;
  turbidity: number;
  status: 'normal' | 'warning' | 'critical';
}

/**
 * StaffReadings component - displays sensor readings from all devices
 */
export const StaffReadings = () => {
  const token = useThemeToken();
  const { isMobile } = useResponsive();
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ✅ GLOBAL HOOK - Real-time device data via WebSocket
  const { devices: realtimeDevices, isLoading, refetch } = useDevices(); // 🔥 NO POLLING - WebSocket provides real-time updates

  // Handle refresh with loading state
  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent spam clicks
    
    setIsRefreshing(true);
    try {
      await refetch();
      setTimeout(() => setIsRefreshing(false), 500);
    } catch (error) {
      console.error('Refresh error:', error);
      setIsRefreshing(false);
    }
  };

  // Transform devices to readings format using utility function
  const readings: Reading[] = useMemo(() => {
    const allReadings: Reading[] = [];
    
    realtimeDevices.forEach((device) => {
      const reading = device.latestReading;
      if (!reading) return;
      
      // Use utility function to determine status
      const status = calculateReadingStatus(reading);
      
      allReadings.push({
        key: device.deviceId,
        timestamp: reading.timestamp 
          ? dayjs(reading.timestamp).format('YYYY-MM-DD HH:mm:ss')
          : dayjs().format('YYYY-MM-DD HH:mm:ss'),
        device: device.name || device.deviceId,
        location: device.metadata?.location 
          ? `${device.metadata.location.building}, ${device.metadata.location.floor}`
          : 'Unknown',
        ph: reading.pH ?? reading.ph ?? 0,
        tds: reading.tds || 0,
        turbidity: reading.turbidity || 0,
        status,
      });
    });
    
    // Sort by timestamp (most recent first)
    allReadings.sort((a, b) => dayjs(b.timestamp).unix() - dayjs(a.timestamp).unix());
    
    return allReadings;
  }, [realtimeDevices]);

  // Get unique device names
  const devices = useMemo(() => {
    return Array.from(new Set(readings.map(r => r.device)));
  }, [readings]);

  // Filter readings
  const filteredReadings = useMemo(() => {
    return readings.filter(reading => {
      const matchesDevice = deviceFilter === 'all' || reading.device === deviceFilter;
      const matchesStatus = statusFilter === 'all' || reading.status === statusFilter;
      return matchesDevice && matchesStatus;
    });
  }, [readings, deviceFilter, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: readings.length,
    normal: readings.filter(r => r.status === 'normal').length,
    warning: readings.filter(r => r.status === 'warning').length,
    critical: readings.filter(r => r.status === 'critical').length,
  }), [readings]);

  // Get parameter status color
  const getParamColor = (value: number, type: 'ph' | 'tds' | 'turbidity') => {
    const ranges = {
      ph: { min: 6.5, max: 8.5 },
      tds: { min: 0, max: 500 },
      turbidity: { min: 0, max: 5 },
    };
    
    const range = ranges[type];
    if (value < range.min || value > range.max) return token.colorError;
    if (value < range.min + 0.5 || value > range.max - 50) return token.colorWarning;
    return token.colorSuccess;
  };

  const mobileColumns: ColumnsType<Reading> = useMemo(() => [
    {
      title: 'Reading',
      key: 'reading',
      ellipsis: false,
      render: (_, record: Reading) => {
        const statusConfig = {
          normal: { color: 'success', icon: <CheckCircleOutlined />, text: 'Normal' },
          warning: { color: 'warning', icon: <WarningOutlined />, text: 'Warning' },
          critical: { color: 'error', icon: <ExclamationCircleOutlined />, text: 'Critical' },
        };
        const config = statusConfig[record.status as keyof typeof statusConfig];
        
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Space size={4} wrap>
              <Text strong style={{ fontSize: '12px', wordBreak: 'break-word' }}>
                {record.device}
              </Text>
              <Tag icon={config.icon} color={config.color} style={{ fontSize: '9px', margin: 0 }}>
                {config.text}
              </Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              📍 {record.location}
            </Text>
            <Space size={4} wrap>
              <Tag 
                color={getParamColor(record.ph, 'ph') === token.colorSuccess ? 'success' : 'error'}
                style={{ fontSize: '10px', margin: 0 }}
              >
                pH: {record.ph.toFixed(2)}
              </Tag>
              <Tag 
                color={getParamColor(record.tds, 'tds') === token.colorSuccess ? 'success' : 'warning'}
                style={{ fontSize: '10px', margin: 0 }}
              >
                TDS: {record.tds.toFixed(1)}
              </Tag>
              <Tag 
                color={getParamColor(record.turbidity, 'turbidity') === token.colorSuccess ? 'success' : 'warning'}
                style={{ fontSize: '10px', margin: 0 }}
              >
                Turb: {record.turbidity.toFixed(2)}
              </Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {record.timestamp}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 50,
      align: 'center' as const,
      render: (_, record: Reading) => {
        const statusConfig = {
          normal: { color: token.colorSuccess, icon: <CheckCircleOutlined /> },
          warning: { color: token.colorWarning, icon: <WarningOutlined /> },
          critical: { color: token.colorError, icon: <ExclamationCircleOutlined /> },
        };
        const config = statusConfig[record.status as keyof typeof statusConfig];
        
        return (
          <div style={{ fontSize: '24px', color: config.color }}>
            {config.icon}
          </div>
        );
      },
    },
  ], [token]);

  const columns: ColumnsType<Reading> = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Device',
      dataIndex: 'device',
      key: 'device',
      render: (text: string, record: Reading) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.location}
          </Text>
        </Space>
      ),
    },
    {
      title: 'pH',
      dataIndex: 'ph',
      key: 'ph',
      render: (value: number) => (
        <Tag color={getParamColor(value, 'ph') === token.colorSuccess ? 'success' : 'error'}>
          {value.toFixed(2)}
        </Tag>
      ),
      sorter: (a, b) => a.ph - b.ph,
    },
    {
      title: 'TDS (ppm)',
      dataIndex: 'tds',
      key: 'tds',
      render: (value: number) => (
        <Tag color={getParamColor(value, 'tds') === token.colorSuccess ? 'success' : 'warning'}>
          {value.toFixed(1)}
        </Tag>
      ),
      sorter: (a, b) => a.tds - b.tds,
    },
    {
      title: 'Turbidity (NTU)',
      dataIndex: 'turbidity',
      key: 'turbidity',
      render: (value: number) => (
        <Tag color={getParamColor(value, 'turbidity') === token.colorSuccess ? 'success' : 'warning'}>
          {value.toFixed(2)}
        </Tag>
      ),
      sorter: (a, b) => a.turbidity - b.turbidity,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = {
          normal: { color: 'success', icon: <CheckCircleOutlined />, text: 'Normal' },
          warning: { color: 'warning', icon: <WarningOutlined />, text: 'Warning' },
          critical: { color: 'error', icon: <ExclamationCircleOutlined />, text: 'Critical' },
        };
        const statusConfig = config[status as keyof typeof config];
        return (
          <Tag icon={statusConfig.icon} color={statusConfig.color}>
            {statusConfig.text}
          </Tag>
        );
      },
    },
  ];

  return (
    <StaffLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <Space direction="vertical" size={0}>
                <Title level={2} style={{ margin: 0 }}>
                  <LineChartOutlined /> Sensor Readings
                </Title>
                <Text type="secondary">
                  Real-time water quality sensor data and measurements
                </Text>
              </Space>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={isRefreshing ? <SyncOutlined spin /> : <ReloadOutlined />}
                onClick={handleRefresh}
                loading={isRefreshing}
                disabled={isRefreshing}
                size="large"
              >
                Refresh Data
              </Button>
            </Col>
          </Row>
        </Card>

        {isLoading ? (
          <>
            {/* Alert Skeleton */}
            <Card>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>

            {/* Statistics Skeleton */}
            <Row gutter={[16, 16]}>
              {[1, 2, 3, 4].map((i) => (
                <Col xs={24} sm={12} md={8} lg={6} xl={6} key={i}>
                  <Card>
                    <Skeleton active paragraph={{ rows: 1 }} />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Filters Skeleton */}
            <Card>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>

            {/* Table Skeleton */}
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </>
        ) : (
          <>
        {/* Alerts */}
        {stats.critical > 0 && (
          <Alert
            message="Critical Readings Detected"
            description={`${stats.critical} reading(s) have critical parameter values that require immediate attention.`}
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            closable
          />
        )}

        {/* Statistics */}
        <CompactReadingStats stats={stats} />

        {/* Filters */}
        <Card>
          <Space wrap size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>Device: </Text>
              <Select
                style={{ width: 200 }}
                value={deviceFilter}
                onChange={setDeviceFilter}
                options={[
                  { label: 'All Devices', value: 'all' },
                  ...devices.map(device => ({ label: device, value: device })),
                ]}
              />
            </div>
            <div>
              <Text strong>Status: </Text>
              <Select
                style={{ width: 200 }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: 'All Status', value: 'all' },
                  { label: 'Normal', value: 'normal' },
                  { label: 'Warning', value: 'warning' },
                  { label: 'Critical', value: 'critical' },
                ]}
              />
            </div>
            <div>
              <Text strong>Date Range: </Text>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                showTime
                format="YYYY-MM-DD HH:mm"
              />
            </div>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
            >
              Export Data
            </Button>
          </Space>
        </Card>

        {/* Parameter Reference */}
        <Card title="Parameter Reference Ranges">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" size={0}>
                <Text strong>pH Level</Text>
                <Text type="secondary">Normal: 6.5 - 8.5</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>Critical: {`<6.0 or >9.0`}</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" size={0}>
                <Text strong>TDS (Total Dissolved Solids)</Text>
                <Text type="secondary">Normal: 0 - 500 ppm</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>Critical: {`>1000 ppm`}</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" size={0}>
                <Text strong>Turbidity</Text>
                <Text type="secondary">Normal: 0 - 5 NTU</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>Critical: {`>10 NTU`}</Text>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Readings Table */}
        <Card>
          <Table
            columns={isMobile ? mobileColumns : columns}
            dataSource={filteredReadings}
            size={isMobile ? 'small' : 'middle'}
            bordered={!isMobile}
            scroll={isMobile ? undefined : { x: 1000 }}
            pagination={isMobile ? {
              pageSize: 5,
              simple: true,
            } : {
              pageSize: 20,
              showTotal: (total) => `Total ${total} readings`,
            }}
          />
        </Card>
        </>
        )}
      </Space>
    </StaffLayout>
  );
};
