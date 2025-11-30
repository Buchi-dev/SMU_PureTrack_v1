import { useState, useMemo } from 'react';
import {
  Layout,
  Space,
  Alert,
  Row,
  Col,
  Spin,
  Empty,
  Card,
  Divider,
  Segmented,
  Tooltip,
  List,
  Typography,
} from 'antd';
import {
  LineChartOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import { PageHeader } from '../../../components/PageHeader';
import { useDevices, useAlerts } from '../../../hooks';
import { useDeviceSeverityCalculator } from './hooks/useDeviceSeverityCalculator';
import { StatsOverview, DeviceCard, DeviceListItem, FilterControls } from './components';

const { Content } = Layout;
const { Text, Title } = Typography;

export const AdminDeviceReadings = () => {
  // ✅ GLOBAL HOOKS: Real-time data
  const { devices: devicesData, isLoading: devicesLoading, error: devicesError, refetch: refetchDevices } = useDevices({ pollInterval: 10000 });
  const { alerts, isLoading: alertsLoading, error: alertsError, refetch: refetchAlerts } = useAlerts({ pollInterval: 5000 });
  
  // ✅ LOCAL UI HOOK: Severity calculation logic only
  const { enrichDeviceWithSeverity, sortBySeverity } = useDeviceSeverityCalculator();
  
  // Filter states (UI-specific state management)
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');

  // Combine loading and error states
  const loading = devicesLoading || alertsLoading;
  const error = devicesError || alertsError;

  // Enrich devices with severity information and sort by severity
  const enrichedDevices = useMemo(() => {
    const enriched = devicesData.map((device) => enrichDeviceWithSeverity(device, alerts));
    return sortBySeverity(enriched);
  }, [devicesData, alerts, enrichDeviceWithSeverity, sortBySeverity]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: enrichedDevices.length,
      online: enrichedDevices.filter((d) => d.status === 'online').length,
      offline: enrichedDevices.filter((d) => d.status === 'offline').length,
      critical: enrichedDevices.filter((d) => d.severityLevel === 'critical').length,
      warning: enrichedDevices.filter((d) => d.severityLevel === 'warning').length,
      normal: enrichedDevices.filter((d) => d.severityLevel === 'normal').length,
    };
  }, [enrichedDevices]);

  // Manual refresh handler
  const handleRefresh = () => {
    refetchDevices();
    refetchAlerts();
  };

  // Apply filters to enriched devices
  const filteredDevices = useMemo(() => {
    return enrichedDevices.filter((device) => {
      // Severity filter
      if (severityFilter !== 'all' && device.severityLevel !== severityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && device.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = device.name.toLowerCase().includes(searchLower);
        const matchesId = device.deviceId.toLowerCase().includes(searchLower);
        const matchesLocation =
          device.metadata?.location?.building?.toLowerCase().includes(searchLower) ||
          device.metadata?.location?.floor?.toLowerCase().includes(searchLower);
        
        if (!matchesName && !matchesId && !matchesLocation) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedDevices, severityFilter, statusFilter, searchTerm]);

  // Group devices by severity
  const criticalDevices = filteredDevices.filter((d) => d.severityLevel === 'critical');
  const warningDevices = filteredDevices.filter((d) => d.severityLevel === 'warning');
  const normalDevices = filteredDevices.filter((d) => d.severityLevel === 'normal');
  const offlineDevices = filteredDevices.filter((d) => d.severityLevel === 'offline');

  return (
    <AdminLayout>
      <Content style={{ padding: '24px' }}>
        <PageHeader
          title="Sensor Readings"
          icon={<LineChartOutlined />}
          description="Real-time water quality monitoring with automatic severity sorting"
          breadcrumbItems={[
            { title: 'Sensor Readings', icon: <LineChartOutlined /> }
          ]}
          actions={[
            {
              key: 'refresh',
              label: 'Refresh',
              icon: <ReloadOutlined spin={loading} />,
              onClick: handleRefresh,
              disabled: loading,
            }
          ]}
        />

        <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24, maxWidth: '1800px', margin: '24px auto 0' }}>

          {/* Info Alert */}
          <Alert
            message="Smart Severity Sorting"
            description="Devices are automatically sorted by severity level. Critical issues appear first for immediate attention."
            type="info"
            icon={<InfoCircleOutlined />}
            showIcon
            closable
          />

          {/* Error Alert */}
          {error && (
            <Alert
              message="Error Loading Devices"
              description={error.message}
              type="error"
              showIcon
              closable
            />
          )}

          {/* Statistics Overview */}
          <StatsOverview stats={stats} />

          <Divider style={{ margin: '12px 0' }} />

          {/* Filters and View Mode */}
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <FilterControls
                severityFilter={severityFilter}
                statusFilter={statusFilter}
                searchTerm={searchTerm}
                onSeverityChange={setSeverityFilter}
                onStatusChange={setStatusFilter}
                onSearchChange={setSearchTerm}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary">
                  Showing {filteredDevices.length} of {enrichedDevices.length} device{enrichedDevices.length !== 1 ? 's' : ''}
                </Text>
                <Segmented
                  options={[
                    {
                      label: (
                        <Tooltip title="Grid View">
                          <AppstoreOutlined />
                        </Tooltip>
                      ),
                      value: 'grid',
                    },
                    {
                      label: (
                        <Tooltip title="Compact View">
                          <BarChartOutlined />
                        </Tooltip>
                      ),
                      value: 'compact',
                    },
                  ]}
                  value={viewMode}
                  onChange={(value) => setViewMode(value as 'grid' | 'compact')}
                />
              </div>
            </Space>
          </Card>

          {/* Loading State */}
          {loading && enrichedDevices.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredDevices.length === 0 && (
            <Card>
              <Empty
                description={
                  searchTerm || severityFilter !== 'all' || statusFilter !== 'all'
                    ? 'No devices match your filters'
                    : 'No devices found'
                }
              />
            </Card>
          )}

          {/* Critical Devices Section */}
          {criticalDevices.length > 0 && (
            <>
              <div
                style={{
                  background: '#fff2e8',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #ff4d4f',
                }}
              >
                <Title level={4} style={{ margin: 0, color: '#ff4d4f' }}>
                  🚨 Critical Devices ({criticalDevices.length})
                </Title>
                <Text type="secondary">Immediate attention required</Text>
              </div>
              {viewMode === 'grid' ? (
                <Row gutter={[16, 16]}>
                  {criticalDevices.map((device) => (
                    <Col key={device.deviceId} xs={24} sm={24} md={12} lg={8} xl={6}>
                      <DeviceCard device={device} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <List
                  dataSource={criticalDevices}
                  renderItem={(device) => <DeviceListItem key={device.deviceId} device={device} />}
                  bordered
                  style={{ background: '#fff' }}
                />
              )}
            </>
          )}

          {/* Warning Devices Section */}
          {warningDevices.length > 0 && (
            <>
              <div
                style={{
                  background: '#fffbe6',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #faad14',
                }}
              >
                <Title level={4} style={{ margin: 0, color: '#faad14' }}>
                  ⚠️ Warning Devices ({warningDevices.length})
                </Title>
                <Text type="secondary">Monitor closely</Text>
              </div>
              {viewMode === 'grid' ? (
                <Row gutter={[16, 16]}>
                  {warningDevices.map((device) => (
                    <Col key={device.deviceId} xs={24} sm={24} md={12} lg={8} xl={6}>
                      <DeviceCard device={device} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <List
                  dataSource={warningDevices}
                  renderItem={(device) => <DeviceListItem key={device.deviceId} device={device} />}
                  bordered
                  style={{ background: '#fff' }}
                />
              )}
            </>
          )}

          {/* Normal Devices Section */}
          {normalDevices.length > 0 && (
            <>
              <div
                style={{
                  background: '#f6ffed',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #52c41a',
                }}
              >
                <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                  ✅ Normal Operation ({normalDevices.length})
                </Title>
                <Text type="secondary">All parameters within acceptable range</Text>
              </div>
              {viewMode === 'grid' ? (
                <Row gutter={[16, 16]}>
                  {normalDevices.map((device) => (
                    <Col key={device.deviceId} xs={24} sm={24} md={12} lg={8} xl={6}>
                      <DeviceCard device={device} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <List
                  dataSource={normalDevices}
                  renderItem={(device) => <DeviceListItem key={device.deviceId} device={device} />}
                  bordered
                  style={{ background: '#fff' }}
                />
              )}
            </>
          )}

          {/* Offline Devices Section */}
          {offlineDevices.length > 0 && (
            <>
              <div
                style={{
                  background: '#fafafa',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #d9d9d9',
                }}
              >
                <Title level={4} style={{ margin: 0, color: '#8c8c8c' }}>
                  📡 Offline Devices ({offlineDevices.length})
                </Title>
                <Text type="secondary">No recent data available</Text>
              </div>
              {viewMode === 'grid' ? (
                <Row gutter={[16, 16]}>
                  {offlineDevices.map((device) => (
                    <Col key={device.deviceId} xs={24} sm={24} md={12} lg={8} xl={6}>
                      <DeviceCard device={device} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <List
                  dataSource={offlineDevices}
                  renderItem={(device) => <DeviceListItem key={device.deviceId} device={device} />}
                  bordered
                  style={{ background: '#fff' }}
                />
              )}
            </>
          )}
        </Space>
      </Content>
    </AdminLayout>
  );
};
