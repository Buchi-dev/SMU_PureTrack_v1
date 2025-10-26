import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Space,
  Typography,
  Badge,
  Empty,
  Skeleton,
  Button,
  Divider,
} from 'antd';
import {
  AlertOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  RiseOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useThemeToken } from '../theme';

const { Text } = Typography;

// Types
interface DeviceAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  location: string;
  parameter: string;
  currentValue: number;
  threshold: number;
  severity: 'high' | 'medium' | 'low';
  createdAt: Date;
  resolved: boolean;
}

interface DeviceBySeverity {
  device: string;
  location: string;
  alerts: DeviceAlert[];
  highestSeverity: 'high' | 'medium' | 'low';
}

export const RealtimeAlertMonitor = () => {
  const token = useThemeToken();
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [devicesBySeverity, setDevicesBySeverity] = useState<{
    high: DeviceBySeverity[];
    medium: DeviceBySeverity[];
    low: DeviceBySeverity[];
  }>({
    high: [],
    medium: [],
    low: [],
  });

  // Real-time listener for alerts
  useEffect(() => {
    const alertsRef = collection(db, 'alerts');
    const alertsQuery = query(
      alertsRef,
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      alertsQuery,
      (snapshot) => {
        const fetchedAlerts = snapshot.docs
          .filter((doc) => {
            const data = doc.data();
            // Only show unresolved and active alerts
            return (data.resolved === false || data.status === 'Active') && 
                   (data.severity === 'high' || data.severity === 'medium' || data.severity === 'low');
          })
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              deviceId: data.deviceId || '',
              deviceName: data.deviceName || 'Unknown Device',
              location: typeof data.metadata?.location === 'string' 
                ? data.metadata.location 
                : data.metadata?.location?.building || 'Unknown Location',
              parameter: data.parameter || 'Unknown',
              currentValue: data.currentValue || 0,
              threshold: data.threshold || 0,
              severity: data.severity || 'low',
              createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date(),
              resolved: data.resolved || false,
            };
          });

        // Group alerts by device and organize by severity
        const groupedByDevice: Record<string, DeviceBySeverity> = {};

        fetchedAlerts.forEach((alert) => {
          const deviceKey = alert.deviceName;
          
          if (!groupedByDevice[deviceKey]) {
            groupedByDevice[deviceKey] = {
              device: alert.deviceName,
              location: alert.location,
              alerts: [],
              highestSeverity: 'low',
            };
          }

          groupedByDevice[deviceKey].alerts.push(alert);

          // Update highest severity for this device
          const severityOrder: Record<'high' | 'medium' | 'low', number> = { high: 3, medium: 2, low: 1 };
          const alertSeverity = alert.severity as 'high' | 'medium' | 'low';
          const currentSeverity = groupedByDevice[deviceKey].highestSeverity as 'high' | 'medium' | 'low';
          if (severityOrder[alertSeverity] > severityOrder[currentSeverity]) {
            groupedByDevice[deviceKey].highestSeverity = alertSeverity;
          }
        });

        // Separate devices by highest severity level
        const bySeverity = {
          high: [] as DeviceBySeverity[],
          medium: [] as DeviceBySeverity[],
          low: [] as DeviceBySeverity[],
        };

        Object.values(groupedByDevice).forEach((device) => {
          bySeverity[device.highestSeverity].push(device);
        });

        // Sort each severity level by most recent alert
        Object.keys(bySeverity).forEach((key) => {
          bySeverity[key as keyof typeof bySeverity].sort((a, b) => {
            const aLatest = Math.max(...a.alerts.map(al => al.createdAt.getTime()));
            const bLatest = Math.max(...b.alerts.map(al => al.createdAt.getTime()));
            return bLatest - aLatest;
          });
        });

        setAlerts(fetchedAlerts);
        setDevicesBySeverity(bySeverity);
      },
      (error) => {
        console.error('Error fetching alerts:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  if (!token) {
    return <Skeleton active paragraph={{ rows: 5 }} />;
  }

  // Severity configuration
  const severityConfig = {
    high: {
      color: token.colorError,
      bgColor: '#fff2f0',
      borderColor: '#ffccc7',
      icon: <AlertOutlined />,
      label: 'Critical',
      textColor: token.colorError,
    },
    medium: {
      color: token.colorWarning,
      bgColor: '#fffbe6',
      borderColor: '#ffe58f',
      icon: <ExclamationCircleOutlined />,
      label: 'Warning',
      textColor: token.colorWarning,
    },
    low: {
      color: token.colorInfo,
      bgColor: '#e6f7ff',
      borderColor: '#91d5ff',
      icon: <InfoCircleOutlined />,
      label: 'Info',
      textColor: token.colorInfo,
    },
  };

  // Render device card
  const renderDeviceCard = (device: DeviceBySeverity, severity: 'high' | 'medium' | 'low') => {
    const config = severityConfig[severity];
    const latestAlert = device.alerts[0];

    // Get device color based on severity
    const getDeviceColor = () => {
      switch (severity) {
        case 'high':
          return '#ff4d4f'; // Red
        case 'medium':
          return '#faad14'; // Yellow
        case 'low':
          return '#f5f5f5'; // White/Light Gray
        default:
          return '#ffffff';
      }
    };

    const deviceColor = getDeviceColor();

    return (
      <div
        key={`${device.device}-${severity}`}
        style={{
          background: config.bgColor,
          border: `2px solid ${config.borderColor}`,
          borderRadius: token.borderRadius,
          padding: '12px 16px',
          marginBottom: '8px',
          display: 'flex',
          gap: '12px',
        }}
      >
        {/* Left Color Indicator */}
        <div
          style={{
            width: '6px',
            height: '100%',
            minHeight: '100px',
            backgroundColor: deviceColor,
            borderRadius: '4px',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ color: config.textColor, fontSize: '16px' }}>{config.icon}</span>
            <Text strong style={{ fontSize: '14px', color: token.colorTextBase }}>
              {device.device}
            </Text>
            <Badge
              count={device.alerts.length}
              style={{
                backgroundColor: config.color,
                color: '#fff',
                fontSize: '10px',
                padding: '0 4px',
              }}
            />
          </div>

            <div style={{ marginBottom: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <EnvironmentOutlined style={{ marginRight: '4px' }} />
                {device.location}
              </Text>
            </div>

            <Divider style={{ margin: '8px 0' }} />

            {/* Show affected parameters */}
            <div style={{ marginBottom: '8px' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Affected Parameters:
              </Text>
              <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {device.alerts.map((alert, idx) => (
                  <Tag
                    key={idx}
                    color={
                      alert.severity === 'high'
                        ? 'red'
                        : alert.severity === 'medium'
                        ? 'orange'
                        : 'blue'
                    }
                    style={{ fontSize: '10px' }}
                  >
                    {alert.parameter}
                  </Tag>
                ))}
              </div>
            </div>

            {/* Latest alert details */}
            {latestAlert && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              >
                <Text type="secondary">
                  Latest: <strong>{latestAlert.parameter}</strong> = {latestAlert.currentValue.toFixed(2)}{' '}
                  (Threshold: {latestAlert.threshold.toFixed(2)})
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  {latestAlert.createdAt.toLocaleTimeString()}
                </Text>
              </div>
            )}
        </div>
      </div>
    );
  };

  const totalAlerts = alerts.length;
  const totalDevicesWithAlerts = Object.keys(
    Object.values(devicesBySeverity)
      .flat()
      .reduce((acc, device) => {
        acc[device.device] = true;
        return acc;
      }, {} as Record<string, boolean>)
  ).length;

  return (
    <Card
      title={
        <Space>
          <RiseOutlined style={{ color: token.colorWarning }} />
          <Text strong>Real-Time Alert Monitor</Text>
          <Badge
            count={totalAlerts}
            style={{
              backgroundColor: totalAlerts > 0 ? token.colorError : token.colorSuccess,
              color: '#fff',
            }}
          />
        </Space>
      }
      extra={
        <Button 
          type="text" 
          size="small" 
          icon={<ReloadOutlined />}
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      }
      style={{ marginBottom: '16px' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Summary stats */}
        <Row gutter={[12, 12]}>
          <Col span={8}>
            <div
              style={{
                background: severityConfig.high.bgColor,
                padding: '8px 12px',
                borderRadius: token.borderRadius,
                textAlign: 'center',
                border: `1px solid ${severityConfig.high.borderColor}`,
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: severityConfig.high.textColor }}>
                {devicesBySeverity.high.length}
              </div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Critical Devices
              </Text>
            </div>
          </Col>
          <Col span={8}>
            <div
              style={{
                background: severityConfig.medium.bgColor,
                padding: '8px 12px',
                borderRadius: token.borderRadius,
                textAlign: 'center',
                border: `1px solid ${severityConfig.medium.borderColor}`,
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: severityConfig.medium.textColor }}>
                {devicesBySeverity.medium.length}
              </div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Warning Devices
              </Text>
            </div>
          </Col>
          <Col span={8}>
            <div
              style={{
                background: severityConfig.low.bgColor,
                padding: '8px 12px',
                borderRadius: token.borderRadius,
                textAlign: 'center',
                border: `1px solid ${severityConfig.low.borderColor}`,
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: severityConfig.low.textColor }}>
                {devicesBySeverity.low.length}
              </div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Info Devices
              </Text>
            </div>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        {/* Alert sections by severity */}
        {totalAlerts === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={4}>
                <Text type="secondary">No Active Alerts</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  All devices are operating normally
                </Text>
              </Space>
            }
          />
        ) : (
          <div>
            {/* Critical Alerts */}
            {devicesBySeverity.high.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <AlertOutlined style={{ color: severityConfig.high.textColor, fontSize: '16px' }} />
                  <Text strong style={{ color: severityConfig.high.textColor }}>
                    Critical Alerts ({devicesBySeverity.high.length})
                  </Text>
                </div>
                <div>
                  {devicesBySeverity.high.map((device) => renderDeviceCard(device, 'high'))}
                </div>
              </div>
            )}

            {/* Warning Alerts */}
            {devicesBySeverity.medium.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <ExclamationCircleOutlined
                    style={{ color: severityConfig.medium.textColor, fontSize: '16px' }}
                  />
                  <Text strong style={{ color: severityConfig.medium.textColor }}>
                    Warning Alerts ({devicesBySeverity.medium.length})
                  </Text>
                </div>
                <div>
                  {devicesBySeverity.medium.map((device) => renderDeviceCard(device, 'medium'))}
                </div>
              </div>
            )}

            {/* Info Alerts */}
            {devicesBySeverity.low.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <InfoCircleOutlined style={{ color: severityConfig.low.textColor, fontSize: '16px' }} />
                  <Text strong style={{ color: severityConfig.low.textColor }}>
                    Info Alerts ({devicesBySeverity.low.length})
                  </Text>
                </div>
                <div>
                  {devicesBySeverity.low.map((device) => renderDeviceCard(device, 'low'))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Last updated info */}
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Last updated: {new Date().toLocaleTimeString()} • Monitoring {totalDevicesWithAlerts} device
            {totalDevicesWithAlerts !== 1 ? 's' : ''}
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default RealtimeAlertMonitor;
