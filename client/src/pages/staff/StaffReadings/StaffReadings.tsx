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
  Statistic,
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
  CloseCircleOutlined,
} from '@ant-design/icons';
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { useThemeToken } from '../../../theme';
import { useDevices } from '../../../hooks';
import { calculateReadingStatus } from '../../../utils/waterQualityUtils';
import { WATER_QUALITY_THRESHOLDS } from '../../../constants/waterQualityStandards';
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
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ✅ GLOBAL HOOK - Real-time device data with SWR polling
  const { devices: realtimeDevices, isLoading, refetch } = useDevices({ 
    pollInterval: 10000 // Poll every 10 seconds for readings
  });

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
        ph: reading.ph || 0,
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

  // Get parameter status (color, icon, and text)
  const getParamStatus = (value: number, type: 'ph' | 'tds' | 'turbidity') => {
    // Import from centralized constants
    const { WATER_QUALITY_THRESHOLDS } = require('../../../constants/waterQualityStandards');
    
    // Check pH status
    if (type === 'ph') {
      if (value < WATER_QUALITY_THRESHOLDS.pH.critical_min || value > WATER_QUALITY_THRESHOLDS.pH.critical_max) {
        return {
          icon: <CloseCircleOutlined />,
          color: token.colorError,
          status: 'critical',
        };
      }
      if (value < WATER_QUALITY_THRESHOLDS.pH.min || value > WATER_QUALITY_THRESHOLDS.pH.max) {
        return {
          icon: <WarningOutlined />,
          color: token.colorWarning,
          status: 'warning',
        };
      }
      return {
        icon: <CheckCircleOutlined />,
        color: token.colorSuccess,
        status: 'normal',
      };
    }
    
    // Check TDS status
    if (type === 'tds') {
      if (value > WATER_QUALITY_THRESHOLDS.tds.critical) {
        return {
          icon: <CloseCircleOutlined />,
          color: token.colorError,
          status: 'critical',
        };
      }
      if (value > WATER_QUALITY_THRESHOLDS.tds.warning) {
        return {
          icon: <WarningOutlined />,
          color: token.colorWarning,
          status: 'warning',
        };
      }
      return {
        icon: <CheckCircleOutlined />,
        color: token.colorSuccess,
        status: 'normal',
      };
    }
    
    // Check Turbidity status
    if (type === 'turbidity') {
      if (value > WATER_QUALITY_THRESHOLDS.turbidity.critical) {
        return {
          icon: <CloseCircleOutlined />,
          color: token.colorError,
          status: 'critical',
        };
      }
      if (value > WATER_QUALITY_THRESHOLDS.turbidity.warning) {
        return {
          icon: <WarningOutlined />,
          color: token.colorWarning,
          status: 'warning',
        };
      }
      return {
        icon: <CheckCircleOutlined />,
        color: token.colorSuccess,
        status: 'normal',
      };
    }
    
    return {
      icon: <CheckCircleOutlined />,
      color: token.colorSuccess,
      status: 'normal',
    };
  };

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
      render: (value: number) => {
        const paramStatus = getParamStatus(value, 'ph');
        return (
          <Space>
            <span style={{ color: paramStatus.color, fontSize: '16px' }}>
              {paramStatus.icon}
            </span>
            <Text strong style={{ color: paramStatus.color }}>
              {value.toFixed(2)}
            </Text>
          </Space>
        );
      },
      sorter: (a, b) => a.ph - b.ph,
    },
    {
      title: 'TDS (ppm)',
      dataIndex: 'tds',
      key: 'tds',
      render: (value: number) => {
        const paramStatus = getParamStatus(value, 'tds');
        return (
          <Space>
            <span style={{ color: paramStatus.color, fontSize: '16px' }}>
              {paramStatus.icon}
            </span>
            <Text strong style={{ color: paramStatus.color }}>
              {value.toFixed(1)}
            </Text>
          </Space>
        );
      },
      sorter: (a, b) => a.tds - b.tds,
    },
    {
      title: 'Turbidity (NTU)',
      dataIndex: 'turbidity',
      key: 'turbidity',
      render: (value: number) => {
        const paramStatus = getParamStatus(value, 'turbidity');
        return (
          <Space>
            <span style={{ color: paramStatus.color, fontSize: '16px' }}>
              {paramStatus.icon}
            </span>
            <Text strong style={{ color: paramStatus.color }}>
              {value.toFixed(2)}
            </Text>
          </Space>
        );
      },
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
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <Card>
              <Statistic
                title="Total Readings"
                value={stats.total}
                prefix={<LineChartOutlined />}
                valueStyle={{ color: token.colorInfo }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <Card>
              <Statistic
                title="Normal"
                value={stats.normal}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: token.colorSuccess }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <Card>
              <Statistic
                title="Warnings"
                value={stats.warning}
                prefix={<WarningOutlined />}
                valueStyle={{ color: token.colorWarning }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <Card>
              <Statistic
                title="Critical"
                value={stats.critical}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: token.colorError }}
              />
            </Card>
          </Col>
        </Row>

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
                <Text type="secondary">Normal: 0 - {WATER_QUALITY_THRESHOLDS.tds.warning} ppm</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>Critical: {`>${WATER_QUALITY_THRESHOLDS.tds.critical} ${WATER_QUALITY_THRESHOLDS.tds.unit}`}</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" size={0}>
                <Text strong>Turbidity</Text>
                <Text type="secondary">Normal: 0 - {WATER_QUALITY_THRESHOLDS.turbidity.warning} {WATER_QUALITY_THRESHOLDS.turbidity.unit}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>Critical: {`>${WATER_QUALITY_THRESHOLDS.turbidity.critical} ${WATER_QUALITY_THRESHOLDS.turbidity.unit}`}</Text>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Readings Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredReadings}
            pagination={{
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
