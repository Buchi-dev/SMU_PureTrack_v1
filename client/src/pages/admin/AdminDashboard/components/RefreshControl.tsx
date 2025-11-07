import { Button, Space, Typography, Tag, Tooltip } from 'antd';
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { memo, useMemo } from 'react';

const { Text } = Typography;

interface RefreshControlProps {
  onRefresh: () => void;
  loading: boolean;
  lastUpdate: Date | null;
}

export const RefreshControl = memo(({ onRefresh, loading, lastUpdate }: RefreshControlProps) => {
  const timeSinceUpdate = useMemo(() => {
    if (!lastUpdate) return 'Never';
    
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    
    if (seconds < 2) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }, [lastUpdate]);

  return (
    <Space size="middle">
      <Tag icon={<ThunderboltOutlined />} color="success">
        Real-time Monitoring
      </Tag>
      
      {lastUpdate && (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Last change: {timeSinceUpdate}
        </Text>
      )}
      
      <Tooltip title="Force refresh">
        <Button 
          type="primary"
          icon={<ReloadOutlined spin={loading} />}
          onClick={onRefresh}
          loading={loading}
        >
          Refresh
        </Button>
      </Tooltip>
    </Space>
  );
});
