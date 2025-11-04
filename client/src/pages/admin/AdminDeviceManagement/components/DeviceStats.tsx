import { Card, Statistic, Badge } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ToolOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';

interface DeviceStatsProps {
  stats: {
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    registered: number;
    unregistered: number;
  };
}

export const DeviceStats = ({ stats }: DeviceStatsProps) => {
  const token = useThemeToken();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '16px',
      }}
    >
      <Card size="small" bodyStyle={{ padding: '16px' }} style={{ borderRadius: '8px' }}>
        <Statistic
          title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Total Devices</span>}
          value={stats.total}
          valueStyle={{ fontSize: '28px', fontWeight: 600 }}
          prefix={<Badge status="processing" />}
        />
      </Card>
      <Card size="small" bodyStyle={{ padding: '16px' }} style={{ borderRadius: '8px' }}>
        <Statistic
          title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Online</span>}
          value={stats.online}
          valueStyle={{ color: token.colorSuccess, fontSize: '28px', fontWeight: 600 }}
          prefix={<CheckCircleOutlined />}
        />
      </Card>
      <Card size="small" bodyStyle={{ padding: '16px' }} style={{ borderRadius: '8px' }}>
        <Statistic
          title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Offline</span>}
          value={stats.offline}
          valueStyle={{ color: token.colorTextSecondary, fontSize: '28px', fontWeight: 600 }}
          prefix={<CloseCircleOutlined />}
        />
      </Card>
      <Card size="small" bodyStyle={{ padding: '16px' }} style={{ borderRadius: '8px' }}>
        <Statistic
          title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Maintenance</span>}
          value={stats.maintenance}
          valueStyle={{ color: token.colorWarning, fontSize: '28px', fontWeight: 600 }}
          prefix={<ToolOutlined />}
        />
      </Card>
      <Card size="small" bodyStyle={{ padding: '16px' }} style={{ borderRadius: '8px' }}>
        <Statistic
          title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Registered</span>}
          value={stats.registered}
          valueStyle={{ color: token.colorSuccess, fontSize: '28px', fontWeight: 600 }}
          prefix={<CheckCircleOutlined />}
        />
      </Card>
      <Card size="small" bodyStyle={{ padding: '16px' }} style={{ borderRadius: '8px' }}>
        <Statistic
          title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Unregistered</span>}
          value={stats.unregistered}
          valueStyle={{ color: token.colorWarning, fontSize: '28px', fontWeight: 600 }}
          prefix={<InfoCircleOutlined />}
        />
      </Card>
    </div>
  );
};
