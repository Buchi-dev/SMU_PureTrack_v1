import { Card, Tabs, Badge, Space, Typography, Table } from 'antd';
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { DeviceWithReadings } from '../../../../schemas';
import { useThemeToken } from '../../../../theme';
import { useDeviceColumns } from './DeviceTableColumns';
import { UnregisteredDevicesGrid } from './UnregisteredDevicesGrid';

const { Text } = Typography;

interface DeviceTableProps {
  activeTab: 'registered' | 'unregistered';
  onTabChange: (key: 'registered' | 'unregistered') => void;
  filteredDevices: DeviceWithReadings[];
  loading: boolean;
  stats: {
    registered: number;
    unregistered: number;
  };
  onView: (device: DeviceWithReadings) => void;
  onDelete: (device: DeviceWithReadings) => void;
  onRegister: (device: DeviceWithReadings) => void;
}

export const DeviceTable = ({
  activeTab,
  onTabChange,
  filteredDevices,
  loading,
  stats,
  onView,
  onDelete,
  onRegister,
}: DeviceTableProps) => {
  const token = useThemeToken();
  
  const columns = useDeviceColumns({
    activeTab,
    token,
    onView,
    onDelete,
    onRegister,
  });

  return (
    <Card
      size="small"
      styles={{ body: { padding: '0' } }}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => onTabChange(key as 'registered' | 'unregistered')}
        size="large"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
        tabBarStyle={{
          margin: 0,
          padding: '12px 16px 0',
          backgroundColor: token.colorBgContainer,
        }}
        items={[
          {
            key: 'registered',
            label: (
              <Space size="middle">
                <CheckCircleOutlined style={{ fontSize: '16px' }} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Registered Devices</span>
                <Badge
                  count={stats.registered}
                  style={{
                    backgroundColor: token.colorSuccess,
                    fontWeight: 600,
                  }}
                />
              </Space>
            ),
            children: (
              <div style={{ padding: '16px' }}>
                <Table
                  className="device-table"
                  columns={columns}
                  dataSource={filteredDevices}
                  rowKey="deviceId"
                  loading={loading}
                  size="middle"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total) => (
                      <Text strong style={{ fontSize: '13px' }}>
                        Total {total} registered device{total !== 1 ? 's' : ''}
                      </Text>
                    ),
                    size: 'default',
                    position: ['bottomCenter'],
                  }}
                  scroll={{ y: 'calc(100vh - 520px)' }}
                  bordered
                  rowClassName={(_, index) => (index % 2 === 0 ? '' : 'ant-table-row-striped')}
                  style={{
                    backgroundColor: token.colorBgContainer,
                  }}
                />
              </div>
            ),
            style: { height: '100%' },
          },
          {
            key: 'unregistered',
            label: (
              <Space size="middle">
                <InfoCircleOutlined style={{ fontSize: '16px' }} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Unregistered Devices</span>
                <Badge
                  count={stats.unregistered}
                  style={{
                    backgroundColor: token.colorWarning,
                    fontWeight: 600,
                  }}
                />
              </Space>
            ),
            children: (
              <UnregisteredDevicesGrid
                devices={filteredDevices}
                loading={loading}
                onRegister={onRegister}
              />
            ),
            style: { height: '100%' },
          },
        ]}
      />
    </Card>
  );
};
