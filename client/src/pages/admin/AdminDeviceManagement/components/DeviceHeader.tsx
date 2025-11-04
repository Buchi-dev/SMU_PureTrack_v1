import { Typography, Input, Space, Button } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

interface DeviceHeaderProps {
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
}

export const DeviceHeader = ({ onRefresh, onSearchChange }: DeviceHeaderProps) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}
    >
      <div>
        <Title level={2} style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          Device Management
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          Manage and monitor all your IoT devices
        </Text>
      </div>
      <Space size="middle">
        <Button icon={<ReloadOutlined />} onClick={onRefresh} size="middle">
          Refresh
        </Button>
        <Search
          placeholder="Search devices by name, ID, type, or IP..."
          allowClear
          prefix={<SearchOutlined />}
          style={{ width: '320px' }}
          onChange={(e) => onSearchChange(e.target.value)}
          size="middle"
        />
      </Space>
    </div>
  );
};
