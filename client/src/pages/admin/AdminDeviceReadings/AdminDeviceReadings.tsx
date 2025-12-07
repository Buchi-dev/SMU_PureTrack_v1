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
  WifiOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import { PageHeader } from '../../../components/PageHeader';
import { useDevices, useAlerts, useRealtimeSensorData, useResponsive } from '../../../hooks';
import { useDeviceSeverityCalculator } from './hooks/useDeviceSeverityCalculator';
import { CompactStatsOverview, DeviceTable, FilterControls } from './components';
import { devicesService } from '../../../services/devices.Service';

const { Content } = Layout;
const { Text } = Typography;

export const AdminDeviceReadings = () => {
  const { isMobile } = useResponsive();
  
  // ✅ DEVICE LIST: Fetch once on mount, no polling needed
  const { devices: devicesData, isLoading: devicesLoading, error: devicesError } = useDevices(); // 🔥 NO POLLING
  
  const { alerts, isLoading: alertsLoading, error: alertsError, refetch: refetchAlerts } = useAlerts(); // 🔥 NO POLLING
  
  // ✅ REAL-TIME SENSOR DATA: WebSocket connection for instant updates
  const deviceIds = useMemo(() => devicesData.map(d => d.deviceId), [devicesData]);
  const { sensorData, connectionState } = useRealtimeSensorData({
    deviceIds,
    autoConnect: true,
  });
  
  // ✅ LOCAL UI HOOK: Severity calculation logic only
  const { enrichDeviceWithSeverity, sortBySeverity } = useDeviceSeverityCalculator();
  
  // Filter states (UI-specific state management)
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Combine loading and error states
  const loading = devicesLoading || alertsLoading;
  const error = devicesError || alertsError;

  // ✅ MERGE DEVICE DATA WITH REAL-TIME SENSOR DATA
  const devicesWithLiveData = useMemo(() => {
    const merged = devicesData.map(device => {
      const wsData = sensorData.get(device.deviceId);
      const result = {
        ...device,
        // Override latestReading with WebSocket data if available
        latestReading: wsData || device.latestReading,
      };
      
      // Debug logging
      if (import.meta.env.DEV) {
        console.log(`[AdminDeviceReadings] Device ${device.deviceId}:`, {
          name: device.name,
          status: device.status,
          hasInitialReading: !!device.latestReading,
          hasWebSocketReading: !!wsData,
          finalReading: result.latestReading,
          readingValues: result.latestReading ? {
            pH: result.latestReading.pH,
            tds: result.latestReading.tds,
            turbidity: result.latestReading.turbidity,
            timestamp: result.latestReading.timestamp,
          } : 'NO DATA',
        });
      }
      
      return result;
    });
    
    if (import.meta.env.DEV) {
      console.log(`[AdminDeviceReadings] Total devices: ${merged.length}, With readings: ${merged.filter(d => d.latestReading).length}`);
    }
    
    return merged;
  }, [devicesData, sensorData]);

  // Enrich devices with severity information and sort by severity
  const enrichedDevices = useMemo(() => {
    const enriched = devicesWithLiveData.map((device) => enrichDeviceWithSeverity(device, alerts));
    return sortBySeverity(enriched);
  }, [devicesWithLiveData, alerts, enrichDeviceWithSeverity, sortBySeverity]);

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

  const handleForceDeviceSendData = async () => {
    const onlineDevices = enrichedDevices.filter(d => d.status === 'online');
    
    if (onlineDevices.length === 0) {
      message.warning('No online devices available to send command');
      return;
    }

    try {
      const promises = onlineDevices.map(device => 
        devicesService.sendDeviceCommand(device.deviceId, 'send_now')
      );
      
      await Promise.all(promises);
      message.success(`Send Now command sent to ${onlineDevices.length} online device(s) - Data will appear instantly via WebSocket`);
      
      // ✅ NO DELAY NEEDED - WebSocket pushes data instantly when device publishes
    } catch (error) {
      message.error(`Failed to send command: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Manual refresh handler with loading state
  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent spam clicks
    
    setIsRefreshing(true);
    try {
      await refetchAlerts(); // Only refresh alerts
      handleForceDeviceSendData(); // Send command to devices
      setTimeout(() => setIsRefreshing(false), 500);
    } catch (error) {
      console.error('Refresh error:', error);
      setIsRefreshing(false);
    }
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
              icon: <ReloadOutlined spin={isRefreshing} />,
              onClick: handleRefresh,
              disabled: isRefreshing,
              loading: isRefreshing,
            }
          ]}
        />

        <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>

          {/* WebSocket Connection Status */}
          {connectionState.isConnected ? (
            <Alert
              message="Real-Time Mode Active"
              description={isMobile ? "Connected via WebSocket" : "Connected via WebSocket - Sensor data updates instantly without polling"}
              type="success"
              icon={<WifiOutlined />}
              showIcon
              closable
              style={{ fontSize: isMobile ? '12px' : '14px' }}
            />
          ) : (
            <Alert
              message={isMobile ? "Connecting..." : "Connecting to Real-Time Server..."}
              description={connectionState.error || "Establishing WebSocket connection"}
              type="warning"
              icon={<WifiOutlined spin />}
              showIcon
              style={{ fontSize: isMobile ? '12px' : '14px' }}
            />
          )}

          {/* No Data Warning */}
          {enrichedDevices.length > 0 && enrichedDevices.filter(d => !d.latestReading).length > 0 && (
            <Alert
              message="No Sensor Data Available"
              description={isMobile 
                ? `${enrichedDevices.filter(d => !d.latestReading).length} device(s) have no readings`
                : `${enrichedDevices.filter(d => !d.latestReading).length} device(s) have no sensor readings yet. Data will appear automatically when devices publish their first readings.`
              }
              type="warning"
              icon={<InfoCircleOutlined />}
              showIcon
              closable
              style={{ fontSize: isMobile ? '12px' : '14px' }}
            />
          )}

          {/* Info Alert */}
          <Alert
            message="Smart Severity Sorting"
            description={isMobile 
              ? "Devices sorted by severity level"
              : "Devices are automatically sorted by severity level. Critical issues appear first for immediate attention."
            }
            type="info"
            icon={<InfoCircleOutlined />}
            showIcon
            closable
            style={{ fontSize: isMobile ? '12px' : '14px' }}
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
          <CompactStatsOverview stats={stats} />

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
