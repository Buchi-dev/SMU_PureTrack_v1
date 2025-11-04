import { Card, Tabs, Badge, Space, Typography, Table } from 'antd';
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { Device } from '../../../../schemas';
import { useThemeToken } from '../../../../theme';
import { useDeviceColumns } from './DeviceTableColumns';

const { TabPane } = Tabs;
const { Text, Title } = Typography;

interface DeviceTableProps {
  activeTab: 'registered' | 'unregistered';
  onTabChange: (key: string) => void;
  filteredDevices: Device[];
  loading: boolean;
  stats: {
    registered: number;
    unregistered: number;
  };
  onView: (device: Device) => void;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
  onRegister: (device: Device) => void;
}

export const DeviceTable = ({
  activeTab,
  onTabChange,
  filteredDevices,
  loading,
  stats,
  onView,
  onEdit,
  onDelete,
  onRegister,
}: DeviceTableProps) => {
  const token = useThemeToken();
  
  const columns = useDeviceColumns({
    activeTab,
    token,
    onView,
    onEdit,
    onDelete,
    onRegister,
  });

  return (
    <Card
      size="small"
      bodyStyle={{ padding: '0' }}
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
        onChange={onTabChange}
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
      >
        <TabPane
          tab={
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
          }
          key="registered"
          style={{ height: '100%' }}
        >
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
              scroll={{ x: 1200, y: 'calc(100vh - 520px)' }}
              bordered
              rowClassName={(_, index) => (index % 2 === 0 ? '' : 'ant-table-row-striped')}
              style={{
                backgroundColor: token.colorBgContainer,
              }}
            />
          </div>
        </TabPane>
        <TabPane
          tab={
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
          }
          key="unregistered"
          style={{ height: '100%' }}
        >
          <div style={{ padding: '16px' }}>
            {/* Info Banner for Unregistered Devices */}
            {filteredDevices.length > 0 && (
              <div
                style={{
                  padding: '16px 20px',
                  marginBottom: '16px',
                  backgroundColor: token.colorWarningBg,
                  border: `1px solid ${token.colorWarningBorder}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <InfoCircleOutlined
                  style={{
                    fontSize: '20px',
                    color: token.colorWarning,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <Text
                    strong
                    style={{
                      fontSize: '14px',
                      color: token.colorWarningText,
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Unregistered Devices Detected
                  </Text>
                  <Text
                    style={{
                      fontSize: '13px',
                      color: token.colorTextSecondary,
                    }}
                  >
                    These devices need to be assigned to a location before they can be used. Click
                    the "Register Now" button to assign a building and floor.
                  </Text>
                </div>
              </div>
            )}

            <Table
              className="device-table unregistered-devices-table"
              columns={columns}
              dataSource={filteredDevices}
              rowKey="deviceId"
              loading={loading}
              size="middle"
              locale={{
                emptyText: (
                  <div
                    style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                    }}
                  >
                    <CheckCircleOutlined
                      style={{
                        fontSize: '64px',
                        color: token.colorSuccess,
                        marginBottom: '16px',
                        display: 'block',
                      }}
                    />
                    <Title
                      level={4}
                      style={{
                        margin: '0 0 8px 0',
                        color: token.colorText,
                      }}
                    >
                      All Devices Registered!
                    </Title>
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                      Great job! All your devices have been assigned to locations.
                    </Text>
                  </div>
                ),
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WarningOutlined style={{ color: token.colorWarning }} />
                    <Text strong style={{ fontSize: '13px' }}>
                      {total} device{total !== 1 ? 's' : ''} pending registration
                    </Text>
                  </div>
                ),
                size: 'default',
                position: ['bottomCenter'],
              }}
              scroll={{
                x: 1300,
                y:
                  filteredDevices.length > 0
                    ? 'calc(100vh - 640px)'
                    : 'calc(100vh - 560px)',
              }}
              bordered
              rowClassName={(_, index) =>
                index % 2 === 0
                  ? 'unregistered-row'
                  : 'unregistered-row ant-table-row-striped'
              }
              style={{
                backgroundColor: token.colorBgContainer,
              }}
            />
          </div>
        </TabPane>
      </Tabs>
    </Card>
  );
};
