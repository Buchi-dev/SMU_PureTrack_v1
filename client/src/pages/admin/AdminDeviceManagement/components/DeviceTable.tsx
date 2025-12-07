import { Card, Tabs, Badge, Space, Typography, Table } from 'antd';
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { DeviceWithReadings } from '../../../../schemas';
import { useThemeToken } from '../../../../theme';
import { useDeviceColumns } from './DeviceTableColumns';
import { UnregisteredDevicesGrid } from './UnregisteredDevicesGrid';
import { useTableScroll, useResponsive } from '../../../../hooks';

const { Text } = Typography;

interface DeviceTableProps {
  activeTab: 'registered' | 'unregistered' | 'deleted';
  onTabChange: (key: 'registered' | 'unregistered' | 'deleted') => void;
  filteredDevices: DeviceWithReadings[];
  loading: boolean;
  stats: {
    registered: number;
    unregistered: number;
    deleted?: number;
  };
  onView: (device: DeviceWithReadings) => void;
  onDelete: (device: DeviceWithReadings) => void;
  onRegister: (device: DeviceWithReadings) => void;
  onRecover?: (device: DeviceWithReadings) => void;
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
  onRecover,
}: DeviceTableProps) => {
  const token = useThemeToken();
  const { isMobile } = useResponsive();
  
  // Get responsive scroll configuration
  const tableScroll = useTableScroll({ offsetHeight: 520 });
  
  const columns = useDeviceColumns({
    activeTab: activeTab === 'deleted' ? 'registered' : activeTab, // Use registered columns for deleted
    token,
    onView,
    onDelete: activeTab === 'deleted' ? undefined : onDelete,
    onRegister,
    onRecover: activeTab === 'deleted' ? onRecover : undefined,
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
        onChange={(key) => onTabChange(key as 'registered' | 'unregistered' | 'deleted')}
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
              <div style={{ padding: isMobile ? '8px' : token.padding }}>
                <Table
                  className="device-table"
                  columns={columns}
                  dataSource={filteredDevices}
                  rowKey="deviceId"
                  loading={loading}
                  size={isMobile ? 'small' : 'middle'}
                  pagination={{
                    pageSize: isMobile ? 5 : 10,
                    showSizeChanger: !isMobile,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total) => (
                      <Text strong style={{ fontSize: isMobile ? '13px' : '13px' }}>
                        {isMobile ? `${total} devices` : `Total ${total} registered device${total !== 1 ? 's' : ''}`}
                      </Text>
                    ),
                    size: isMobile ? 'small' : 'default',
                    position: ['bottomCenter'],
                  }}
                  scroll={isMobile ? undefined : { x: tableScroll.x, y: tableScroll.y }}
                  bordered={!isMobile}
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
          {
            key: 'deleted',
            label: (
              <Space size="middle">
                <DeleteOutlined style={{ fontSize: '16px' }} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Deleted Devices</span>
                <Badge
                  count={stats.deleted || 0}
                  style={{
                    backgroundColor: token.colorError,
                    fontWeight: 600,
                  }}
                />
              </Space>
            ),
            children: (
              <div style={{ padding: isMobile ? '8px' : token.padding }}>
                <Table
                  className="device-table"
                  columns={columns}
                  dataSource={filteredDevices}
                  rowKey="deviceId"
                  loading={loading}
                  size={isMobile ? 'small' : 'middle'}
                  pagination={{
                    pageSize: isMobile ? 5 : 10,
                    showSizeChanger: !isMobile,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total) => (
                      <Text strong style={{ fontSize: isMobile ? '13px' : '13px' }}>
                        {isMobile ? `${total} deleted` : `Total ${total} deleted device${total !== 1 ? 's' : ''}`}
                      </Text>
                    ),
                    size: isMobile ? 'small' : 'default',
                    position: ['bottomCenter'],
                  }}
                  scroll={isMobile ? undefined : { x: tableScroll.x, y: tableScroll.y }}
                  bordered={!isMobile}
                  rowClassName={(_, index) => (index % 2 === 0 ? '' : 'ant-table-row-striped')}
                  style={{
                    backgroundColor: token.colorBgContainer,
                  }}
                />
              </div>
            ),
            style: { height: '100%' },
          },
        ]}
      />
    </Card>
  );
};
