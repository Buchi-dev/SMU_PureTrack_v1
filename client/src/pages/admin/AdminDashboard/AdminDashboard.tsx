import { Space, Row, Col, Typography, Alert, Divider } from 'antd';
import { memo, useMemo } from 'react';
import { AdminLayout } from "../../../components/layouts";
import { useMqttBridgeStatus } from './hooks';
import {
  HealthOverview,
  MetricsGrid,
  MemoryMonitor,
  BufferMonitor,
  SystemInfo,
  RefreshControl
} from './components';

const { Title } = Typography;

export const AdminDashboard = memo(() => {
  const { health, status, loading, error, lastUpdate, refresh } = useMqttBridgeStatus();

  // Memoize static styles
  const containerStyle = useMemo(() => ({ 
    width: '100%', 
    padding: '24px' 
  }), []);

  const headerStyle = useMemo(() => ({ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '16px'
  }), []);

  const dividerStyle = useMemo(() => ({ 
    margin: '8px 0' 
  }), []);

  const titleStyle = useMemo(() => ({ 
    margin: 0 
  }), []);

  const sectionTitleStyle = useMemo(() => ({ 
    marginBottom: '16px' 
  }), []);

  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={containerStyle}>
        {/* Header Section */}
        <div style={headerStyle}>
          <Title level={2} style={titleStyle}>
            Admin Dashboard
          </Title>
          <RefreshControl 
            onRefresh={refresh} 
            loading={loading} 
            lastUpdate={lastUpdate} 
          />
        </div>

        <Divider style={dividerStyle} />

        {/* Error Alert */}
        {error && (
          <Alert
            message="Connection Error"
            description={error}
            type="error"
            showIcon
            closable
          />
        )}

        {/* Health Overview - Full Width Hero Section */}
        <HealthOverview health={health} loading={loading} />

        {/* Metrics Grid - Primary Metrics */}
        <div>
          <Title level={4} style={sectionTitleStyle}>
            Real-time Metrics
          </Title>
          <MetricsGrid status={status} loading={loading} />
        </div>

        {/* Detailed Monitoring Section */}
        <div>
          <Title level={4} style={sectionTitleStyle}>
            System Monitoring
          </Title>
          <Row gutter={[16, 16]}>
            {/* Memory Monitor - Takes 2/3 width on desktop */}
            <Col xs={24} lg={16}>
              <MemoryMonitor health={health} loading={loading} />
            </Col>

            {/* System Info - Takes 1/3 width on desktop */}
            <Col xs={24} lg={8}>
              <SystemInfo status={status} loading={loading} />
            </Col>

            {/* Buffer Monitor - Full Width */}
            <Col span={24}>
              <BufferMonitor health={health} loading={loading} />
            </Col>
          </Row>
        </div>
      </Space>
    </AdminLayout>
  );
});
