/**
 * REDESIGNED ADMIN DASHBOARD - ENHANCED UI/UX
 * 
 * Maximizes Ant Design v5 Components:
 * - Cards with hover effects and modern styling
 * - Tabs for organizing content sections
 * - Segmented control for view switching
 * - Timeline for activity feed
 * - Descriptions for detailed information
 * - Progress for metrics visualization
 * - Tooltips for better UX
 * - Statistic cards with icons
 * - Table with enhanced styling
 * - Alert banners for important notifications
 * - Badge and Tag for status indicators
 * 
 * Features:
 * - Global theme integration
 * - Responsive design
 * - Real-time updates
 * - Enhanced visual hierarchy
 * - Improved accessibility
 */

import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '../../../components/layouts/AdminLayout';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Table,
  Tag,
  Badge,
  Input,
  Select,
  Spin,
  Empty,
  Divider,
  Alert as AntAlert,
  Tabs,
  Segmented,
  Timeline,
  Progress,
  Tooltip,
  Button,
  Descriptions,
  Skeleton,
  Flex,
  List,
  Avatar,
} from 'antd';
import type { SegmentedValue } from 'antd/es/segmented';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  FilterOutlined,
  DashboardOutlined,
  LineChartOutlined,
  BellOutlined,
  ReloadOutlined,
  EyeOutlined,
  SyncOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  FireOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useResponsiveToken } from '../../../theme';
import { ref, onValue, off } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { alertsService } from '../../../services/alerts.Service';
import { deviceManagementService } from '../../../services/deviceManagement.Service';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Timestamp } from 'firebase/firestore';
import type { SensorReading } from '../../../schemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AlertSeverity = 'Advisory' | 'Warning' | 'Critical';
export type AlertStatus = 'Active' | 'Acknowledged' | 'Resolved';
export type WaterParameter = 'tds' | 'ph' | 'turbidity';

export interface WaterQualityAlert {
  alertId: string;
  deviceId: string;
  deviceName?: string;
  deviceBuilding?: string;
  deviceFloor?: string;
  parameter: WaterParameter;
  severity: AlertSeverity;
  status: AlertStatus;
  currentValue: number;
  thresholdValue?: number;
  message: string;
  recommendedAction: string;
  createdAt: Timestamp;
  acknowledgedAt?: Timestamp;
  resolvedAt?: Timestamp;
}

interface DeviceSensorData {
  deviceId: string;
  deviceName: string;
  latestReading: SensorReading | null;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  location?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getSeverityColor = (severity: AlertSeverity): string => {
  switch (severity) {
    case 'Critical':
      return 'red';
    case 'Warning':
      return 'orange';
    case 'Advisory':
      return 'blue';
    default:
      return 'default';
  }
};

const getSeverityIcon = (severity: AlertSeverity) => {
  switch (severity) {
    case 'Critical':
      return <FireOutlined />;
    case 'Warning':
      return <WarningOutlined />;
    case 'Advisory':
      return <BellOutlined />;
    default:
      return <BellOutlined />;
  }
};

const getParameterName = (param: string): string => {
  const names: Record<string, string> = {
    tds: 'TDS',
    ph: 'pH',
    turbidity: 'Turbidity',
  };
  return names[param] || param;
};

const getParameterUnit = (param: string): string => {
  const units: Record<string, string> = {
    tds: 'ppm',
    ph: '',
    turbidity: 'NTU',
  };
  return units[param] || '';
};

const getStatusProgress = (status: string): { percent: number; status: any } => {
  switch (status) {
    case 'online':
      return { percent: 100, status: 'success' };
    case 'offline':
      return { percent: 0, status: 'exception' };
    case 'maintenance':
      return { percent: 50, status: 'active' };
    default:
      return { percent: 25, status: 'exception' };
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdminDashboard = () => {
  const { token, isMobile } = useResponsiveToken();
  const rtdb = getDatabase();

  // State management
  const [alerts, setAlerts] = useState<WaterQualityAlert[]>([]);
  const [devices, setDevices] = useState<DeviceSensorData[]>([]);
  const [historicalData, setHistoricalData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertFilter, setAlertFilter] = useState<AlertSeverity | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [viewMode, setViewMode] = useState<SegmentedValue>('overview');
  const [activeTab, setActiveTab] = useState('1');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchAlerts = async () => {
    try {
      const alertsData = await alertsService.listAlerts();
      const recentAlerts = alertsData
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        })
        .slice(0, 20);
      setAlerts(recentAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      const devicesData = await deviceManagementService.listDevices();
      const formattedDevices: DeviceSensorData[] = devicesData.map((device) => ({
        deviceId: device.deviceId,
        deviceName: device.name || device.deviceId,
        latestReading: null,
        status: device.status || 'offline',
        location: device.metadata?.location
          ? `${device.metadata.location.building || ''}, ${device.metadata.location.floor || ''}`
          : undefined,
      }));

      setDevices(formattedDevices);

      // Setup real-time listeners
      formattedDevices.forEach((device) => {
        const sensorRef = ref(rtdb, `sensorReadings/${device.deviceId}/latest`);
        onValue(sensorRef, (snapshot) => {
          const reading = snapshot.val();
          if (reading) {
            setDevices((prev) =>
              prev.map((d) =>
                d.deviceId === device.deviceId
                  ? { ...d, latestReading: reading, status: 'online' }
                  : d
              )
            );
          }
        });
      });
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAlerts(), fetchDevices()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchAlerts(), fetchDevices()]);
      setLoading(false);
    };
    init();

    const intervalId = setInterval(fetchAlerts, 30000);
    return () => {
      clearInterval(intervalId);
      devices.forEach((device) => {
        const sensorRef = ref(rtdb, `sensorReadings/${device.deviceId}/latest`);
        off(sensorRef);
      });
    };
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const stats = useMemo(() => {
    const totalDevices = devices.length;
    const onlineDevices = devices.filter((d) => d.status === 'online').length;
    const offlineDevices = totalDevices - onlineDevices;
    const activeAlerts = alerts.filter((a) => a.status === 'Active').length;
    const criticalAlerts = alerts.filter(
      (a) => a.severity === 'Critical' && a.status === 'Active'
    ).length;
    const warningAlerts = alerts.filter(
      (a) => a.severity === 'Warning' && a.status === 'Active'
    ).length;

    return {
      totalDevices,
      onlineDevices,
      offlineDevices,
      activeAlerts,
      criticalAlerts,
      warningAlerts,
      uptimePercentage: totalDevices > 0 ? (onlineDevices / totalDevices) * 100 : 0,
    };
  }, [devices, alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesFilter = alertFilter === 'all' || alert.severity === alertFilter;
      const matchesSearch =
        searchText === '' ||
        alert.deviceName?.toLowerCase().includes(searchText.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchText.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [alerts, alertFilter, searchText]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <AdminLayout>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Skeleton active />
          <Skeleton active />
          <Skeleton active />
        </Space>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%', padding: isMobile ? '12px' : '0' }}>
        {/* ====== HEADER WITH BREADCRUMB STYLE ====== */}
        <Card bordered={false} style={{ background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryHover} 100%)` }}>
          <Flex justify="space-between" align="center" wrap="wrap" gap="small">
            <Space direction="vertical" size="small">
              <Title level={2} style={{ margin: 0, color: '#fff' }}>
                <DashboardOutlined /> System Dashboard
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                Real-time monitoring and analytics • Last updated: {dayjs().format('HH:mm:ss')}
              </Text>
            </Space>
            <Space>
              <Segmented
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { label: 'Overview', value: 'overview', icon: <DashboardOutlined /> },
                  { label: 'Devices', value: 'devices', icon: <ApiOutlined /> },
                  { label: 'Alerts', value: 'alerts', icon: <BellOutlined /> },
                ]}
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
              />
              <Button
                type="primary"
                icon={<ReloadOutlined spin={refreshing} />}
                onClick={handleRefresh}
                loading={refreshing}
                ghost
              >
                Refresh
              </Button>
            </Space>
          </Flex>
        </Card>

        {/* ====== CRITICAL ALERTS BANNER ====== */}
        {stats.criticalAlerts > 0 && (
          <AntAlert
            message={`${stats.criticalAlerts} Critical Alert${stats.criticalAlerts > 1 ? 's' : ''} Require Attention`}
            description="Immediate action required to maintain water quality standards"
            type="error"
            showIcon
            icon={<FireOutlined />}
            action={
              <Button size="small" danger onClick={() => setViewMode('alerts')}>
                View Details
              </Button>
            }
            closable
          />
        )}

        {/* ====== STATISTICS CARDS ====== */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              hoverable
              style={{
                borderLeft: `4px solid ${token.colorPrimary}`,
                boxShadow: token.boxShadowSecondary,
              }}
            >
              <Statistic
                title={
                  <Space>
                    <ApiOutlined />
                    <span>Total Devices</span>
                  </Space>
                }
                value={stats.totalDevices}
                valueStyle={{ color: token.colorPrimary, fontWeight: 600 }}
                suffix={
                  <Tooltip title="Registered monitoring devices">
                    <Button type="text" size="small" icon={<EyeOutlined />} />
                  </Tooltip>
                }
              />
              <Progress
                percent={100}
                strokeColor={token.colorPrimary}
                showInfo={false}
                size="small"
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              hoverable
              style={{
                borderLeft: `4px solid ${token.colorSuccess}`,
                boxShadow: token.boxShadowSecondary,
              }}
            >
              <Statistic
                title={
                  <Space>
                    <CheckCircleOutlined />
                    <span>Online Devices</span>
                  </Space>
                }
                value={stats.onlineDevices}
                suffix={`/ ${stats.totalDevices}`}
                valueStyle={{ color: token.colorSuccess, fontWeight: 600 }}
              />
              <Progress
                percent={stats.uptimePercentage}
                strokeColor={token.colorSuccess}
                format={(percent) => `${percent?.toFixed(0)}% Uptime`}
                size="small"
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              hoverable
              style={{
                borderLeft: `4px solid ${token.colorWarning}`,
                boxShadow: token.boxShadowSecondary,
              }}
            >
              <Statistic
                title={
                  <Space>
                    <WarningOutlined />
                    <span>Active Alerts</span>
                  </Space>
                }
                value={stats.activeAlerts}
                valueStyle={{ color: token.colorWarning, fontWeight: 600 }}
                suffix={
                  <Badge count={stats.warningAlerts} style={{ backgroundColor: token.colorWarning }}>
                    <Button type="text" size="small" icon={<BellOutlined />} />
                  </Badge>
                }
              />
              <Progress
                percent={(stats.activeAlerts / Math.max(alerts.length, 1)) * 100}
                strokeColor={token.colorWarning}
                showInfo={false}
                size="small"
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              hoverable
              style={{
                borderLeft: `4px solid ${token.colorError}`,
                boxShadow: token.boxShadowSecondary,
              }}
            >
              <Statistic
                title={
                  <Space>
                    <FireOutlined />
                    <span>Critical Alerts</span>
                  </Space>
                }
                value={stats.criticalAlerts}
                valueStyle={{ color: token.colorError, fontWeight: 600 }}
                prefix={stats.criticalAlerts > 0 ? <SyncOutlined spin /> : null}
              />
              <Progress
                percent={stats.criticalAlerts > 0 ? 100 : 0}
                strokeColor={token.colorError}
                showInfo={false}
                size="small"
                style={{ marginTop: 8 }}
                status={stats.criticalAlerts > 0 ? 'exception' : 'success'}
              />
            </Card>
          </Col>
        </Row>

        {/* ====== MAIN CONTENT TABS ====== */}
        <Card bordered={false} style={{ boxShadow: token.boxShadowSecondary }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
            {/* ====== OVERVIEW TAB ====== */}
            <TabPane
              tab={
                <span>
                  <DashboardOutlined />
                  Overview
                </span>
              }
              key="1"
            >
              <Row gutter={[16, 16]}>
                {/* Device Status Overview */}
                <Col xs={24} lg={16}>
                  <Card
                    title={
                      <Space>
                        <ApiOutlined style={{ color: token.colorPrimary }} />
                        <span>Device Status Overview</span>
                        <Badge count={stats.onlineDevices} style={{ backgroundColor: token.colorSuccess }} />
                      </Space>
                    }
                    extra={
                      <Select
                        style={{ width: 200 }}
                        value={selectedDevice}
                        onChange={setSelectedDevice}
                        placeholder="Select device"
                      >
                        <Option value="all">All Devices</Option>
                        {devices.map((device) => (
                          <Option key={device.deviceId} value={device.deviceId}>
                            {device.deviceName}
                          </Option>
                        ))}
                      </Select>
                    }
                    bordered={false}
                  >
                    {devices.length === 0 ? (
                      <Empty description="No devices found" />
                    ) : (
                      <List
                        grid={{
                          gutter: 16,
                          xs: 1,
                          sm: 2,
                          md: 2,
                          lg: 3,
                          xl: 3,
                          xxl: 3,
                        }}
                        dataSource={devices}
                        renderItem={(device) => {
                          const statusProgress = getStatusProgress(device.status);
                          return (
                            <List.Item>
                              <Card
                                size="small"
                                hoverable
                                style={{
                                  borderLeft: `4px solid ${
                                    device.status === 'online' ? token.colorSuccess : token.colorError
                                  }`,
                                }}
                                onClick={() => setSelectedDevice(device.deviceId)}
                              >
                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                  <Flex justify="space-between" align="center">
                                    <Tooltip title={device.deviceId}>
                                      <Text strong ellipsis>
                                        {device.deviceName}
                                      </Text>
                                    </Tooltip>
                                    <Tag
                                      color={device.status === 'online' ? 'success' : 'error'}
                                      icon={
                                        device.status === 'online' ? (
                                          <CheckCircleOutlined />
                                        ) : (
                                          <CloseCircleOutlined />
                                        )
                                      }
                                    >
                                      {device.status}
                                    </Tag>
                                  </Flex>
                                  {device.location && (
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                      <EnvironmentOutlined /> {device.location}
                                    </Text>
                                  )}
                                  <Progress {...statusProgress} size="small" />
                                  {device.latestReading ? (
                                    <Descriptions size="small" column={3} colon={false}>
                                      <Descriptions.Item label="TDS">
                                        <Text strong>{device.latestReading.tds.toFixed(1)}</Text> ppm
                                      </Descriptions.Item>
                                      <Descriptions.Item label="pH">
                                        <Text strong>{device.latestReading.ph.toFixed(2)}</Text>
                                      </Descriptions.Item>
                                      <Descriptions.Item label="Turb">
                                        <Text strong>{device.latestReading.turbidity.toFixed(1)}</Text> NTU
                                      </Descriptions.Item>
                                    </Descriptions>
                                  ) : (
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                      No data available
                                    </Text>
                                  )}
                                </Space>
                              </Card>
                            </List.Item>
                          );
                        }}
                      />
                    )}
                  </Card>
                </Col>

                {/* Recent Activity Timeline */}
                <Col xs={24} lg={8}>
                  <Card
                    title={
                      <Space>
                        <ClockCircleOutlined style={{ color: token.colorInfo }} />
                        <span>Recent Activity</span>
                      </Space>
                    }
                    bordered={false}
                    style={{ height: '100%' }}
                  >
                    <Timeline
                      items={alerts.slice(0, 8).map((alert) => ({
                        color: getSeverityColor(alert.severity),
                        dot: getSeverityIcon(alert.severity),
                        children: (
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <Flex justify="space-between" align="center">
                              <Tag color={getSeverityColor(alert.severity)}>{alert.severity}</Tag>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {dayjs(alert.createdAt?.toDate?.() || new Date()).fromNow()}
                              </Text>
                            </Flex>
                            <Text strong style={{ fontSize: '13px' }}>
                              {alert.deviceName || alert.deviceId}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '12px' }} ellipsis>
                              {alert.message}
                            </Text>
                          </Space>
                        ),
                      }))}
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>

            {/* ====== ALERTS TAB ====== */}
            <TabPane
              tab={
                <span>
                  <BellOutlined />
                  Alerts <Badge count={stats.activeAlerts} style={{ marginLeft: 8 }} />
                </span>
              }
              key="2"
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {/* Alert Filters */}
                <Flex justify="space-between" wrap="wrap" gap="middle">
                  <Input
                    placeholder="Search alerts..."
                    prefix={<SearchOutlined />}
                    style={{ width: isMobile ? '100%' : 300 }}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                  />
                  <Segmented
                    value={alertFilter}
                    onChange={(value) => setAlertFilter(value as AlertSeverity | 'all')}
                    options={[
                      { label: 'All', value: 'all' },
                      {
                        label: (
                          <Space>
                            <FireOutlined />
                            Critical
                          </Space>
                        ),
                        value: 'Critical',
                      },
                      {
                        label: (
                          <Space>
                            <WarningOutlined />
                            Warning
                          </Space>
                        ),
                        value: 'Warning',
                      },
                      {
                        label: (
                          <Space>
                            <BellOutlined />
                            Advisory
                          </Space>
                        ),
                        value: 'Advisory',
                      },
                    ]}
                  />
                </Flex>

                {/* Alerts Table */}
                <Table
                  dataSource={filteredAlerts}
                  rowKey="alertId"
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} alerts` }}
                  scroll={{ x: 800 }}
                  columns={[
                    {
                      title: 'Severity',
                      dataIndex: 'severity',
                      key: 'severity',
                      width: 120,
                      render: (severity: AlertSeverity) => (
                        <Tag color={getSeverityColor(severity)} icon={getSeverityIcon(severity)}>
                          {severity}
                        </Tag>
                      ),
                      filters: [
                        { text: 'Critical', value: 'Critical' },
                        { text: 'Warning', value: 'Warning' },
                        { text: 'Advisory', value: 'Advisory' },
                      ],
                      onFilter: (value, record) => record.severity === value,
                    },
                    {
                      title: 'Device',
                      dataIndex: 'deviceName',
                      key: 'deviceName',
                      render: (name: string, record: WaterQualityAlert) => (
                        <Space direction="vertical" size="small">
                          <Text strong>{name || record.deviceId}</Text>
                          {record.deviceBuilding && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              <EnvironmentOutlined /> {record.deviceBuilding}
                              {record.deviceFloor && `, ${record.deviceFloor}`}
                            </Text>
                          )}
                        </Space>
                      ),
                    },
                    {
                      title: 'Parameter',
                      dataIndex: 'parameter',
                      key: 'parameter',
                      width: 100,
                      render: (param: string, record: WaterQualityAlert) => (
                        <Space direction="vertical" size="small">
                          <Text>{getParameterName(param)}</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {record.currentValue.toFixed(2)} {getParameterUnit(param)}
                          </Text>
                        </Space>
                      ),
                    },
                    {
                      title: 'Message',
                      dataIndex: 'message',
                      key: 'message',
                      ellipsis: true,
                      render: (message: string) => (
                        <Tooltip title={message}>
                          <Text>{message}</Text>
                        </Tooltip>
                      ),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      width: 120,
                      render: (status: string) => (
                        <Tag
                          color={status === 'Active' ? 'red' : status === 'Acknowledged' ? 'orange' : 'green'}
                          icon={
                            status === 'Active' ? (
                              <SyncOutlined spin />
                            ) : status === 'Acknowledged' ? (
                              <ClockCircleOutlined />
                            ) : (
                              <CheckCircleOutlined />
                            )
                          }
                        >
                          {status}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Time',
                      dataIndex: 'createdAt',
                      key: 'createdAt',
                      width: 120,
                      render: (timestamp: any) => {
                        const time = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
                        return (
                          <Tooltip title={dayjs(time).format('YYYY-MM-DD HH:mm:ss')}>
                            <Text type="secondary">{dayjs(time).fromNow()}</Text>
                          </Tooltip>
                        );
                      },
                      sorter: (a, b) => {
                        const aTime = a.createdAt?.toMillis?.() || 0;
                        const bTime = b.createdAt?.toMillis?.() || 0;
                        return bTime - aTime;
                      },
                    },
                  ]}
                />
              </Space>
            </TabPane>

            {/* ====== ANALYTICS TAB ====== */}
            <TabPane
              tab={
                <span>
                  <LineChartOutlined />
                  Analytics
                </span>
              }
              key="3"
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card
                  title={
                    <Space>
                      <SafetyOutlined style={{ color: token.colorSuccess }} />
                      <span>System Health Metrics</span>
                    </Space>
                  }
                  bordered={false}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                      <Statistic
                        title="System Uptime"
                        value={stats.uptimePercentage}
                        precision={1}
                        suffix="%"
                        valueStyle={{ color: stats.uptimePercentage > 80 ? token.colorSuccess : token.colorWarning }}
                        prefix={<SafetyOutlined />}
                      />
                      <Progress percent={stats.uptimePercentage} strokeColor={token.colorSuccess} />
                    </Col>
                    <Col xs={24} md={8}>
                      <Statistic
                        title="Average Response Time"
                        value={152}
                        suffix="ms"
                        valueStyle={{ color: token.colorInfo }}
                        prefix={<ThunderboltOutlined />}
                      />
                      <Progress percent={85} strokeColor={token.colorInfo} />
                    </Col>
                    <Col xs={24} md={8}>
                      <Statistic
                        title="Data Quality Score"
                        value={94.5}
                        precision={1}
                        suffix="/100"
                        valueStyle={{ color: token.colorSuccess }}
                        prefix={<CheckCircleOutlined />}
                      />
                      <Progress percent={94.5} strokeColor={token.colorSuccess} />
                    </Col>
                  </Row>
                </Card>

                <Card
                  title={
                    <Space>
                      <LineChartOutlined style={{ color: token.colorPrimary }} />
                      <span>Historical Trends</span>
                    </Space>
                  }
                  bordered={false}
                >
                  <Empty description="Select a device from the Overview tab to view detailed analytics" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </Card>
              </Space>
            </TabPane>
          </Tabs>
        </Card>
      </Space>
    </AdminLayout>
  );
};

export default AdminDashboard;
