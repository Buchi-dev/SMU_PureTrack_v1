import { useState, useMemo } from 'react';
import {
  Layout,
  Space,
  Alert,
  Spin,
  Empty,
  Card,
  Divider,
  Typography,
  message,
} from 'antd';
import {
  LineChartOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import { PageHeader } from '../../../components/PageHeader';
import { useDevices, useAlerts } from '../../../hooks';
import { useDeviceSeverityCalculator } from './hooks/useDeviceSeverityCalculator';
import { StatsOverview, DeviceTable, FilterControls } from './components';
import { sendDeviceCommand } from '../../../utils/mqtt';

const { Content } = Layout;
const { Text } = Typography;

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

  const handleForceDeviceSendData = () => {
    // Send "send_now" command to all online devices
    enrichedDevices.forEach((device) => {
      if (device.status === 'online') {
        sendDeviceCommand(device.deviceId, 'send_now');
      }
    });
    message.success(`Send Now command sent to ${enrichedDevices.filter(d => d.status === 'online').length} online device(s)`);
  };

  // Manual refresh handler
  const handleRefresh = () => {
    refetchDevices();
    refetchAlerts();
    handleForceDeviceSendData();
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
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Text type="secondary">
                  Showing {filteredDevices.length} of {enrichedDevices.length} device{enrichedDevices.length !== 1 ? 's' : ''}
                </Text>
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

          {/* Table View - Shows all devices in a single table */}
          {filteredDevices.length > 0 && (
            <Card>
              <DeviceTable devices={filteredDevices} />
            </Card>
          )}
        </Space>
      </Content>
    </AdminLayout>
  );
};
