import { Card, Row, Col, Progress, Typography, Space, Badge } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  HddOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import type { SystemHealthMetrics, HealthStatus } from '../../../../services/health.Service';
import { HEALTH_COLORS } from '../config/healthThresholds';

const { Text } = Typography;

interface SystemHealthCardProps {
  systemHealth: SystemHealthMetrics | null;
  loading: boolean;
}

const getStatusColor = (status: HealthStatus) => {
  switch (status) {
    case 'ok':
      return HEALTH_COLORS.EXCELLENT;
    case 'warning':
      return HEALTH_COLORS.WARNING;
    case 'critical':
      return HEALTH_COLORS.CRITICAL;
    case 'error':
      return HEALTH_COLORS.ERROR;
    default:
      return '#d9d9d9';
  }
};

const getStatusIcon = (status: HealthStatus) => {
  switch (status) {
    case 'ok':
      return <CheckCircleOutlined style={{ color: HEALTH_COLORS.EXCELLENT, fontSize: 20 }} />;
    case 'warning':
      return <WarningOutlined style={{ color: HEALTH_COLORS.WARNING, fontSize: 20 }} />;
    case 'critical':
    case 'error':
      return <CloseCircleOutlined style={{ color: HEALTH_COLORS.ERROR, fontSize: 20 }} />;
    default:
      return <WarningOutlined style={{ color: '#d9d9d9', fontSize: 20 }} />;
  }
};

const getStatusText = (status: HealthStatus): string => {
  return status.toUpperCase();
};

export const SystemHealthCard = memo<SystemHealthCardProps>(({ systemHealth, loading }) => {
  if (!systemHealth) {
    return (
      <Card 
        loading={loading} 
        title={
          <Space>
            <CloudServerOutlined />
            <span>System Health Monitor</span>
          </Space>
        }
        bordered={false}
        style={{ 
          background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
          borderRadius: 12 
        }}
      >
        <Text type="secondary">No health data available</Text>
      </Card>
    );
  }

  const { cpu, memory, storage, database, overallStatus } = systemHealth;
  const memoryPercent = memory.usagePercent || 0;
  const cpuPercent = cpu.usagePercent || 0;
  const storagePercent = storage.usagePercent || 0;

  return (
    <Card
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <CloudServerOutlined style={{ fontSize: 20 }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>System Health Monitor</span>
          </Space>
          <Badge
            status={overallStatus === 'ok' ? 'success' : overallStatus === 'warning' ? 'warning' : 'error'}
            text={<span style={{ fontWeight: 500 }}>{getStatusText(overallStatus)}</span>}
          />
        </Space>
      }
      bordered={false}
      loading={loading}
      style={{ 
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      <Row gutter={[16, 16]}>
        {/* CPU Metrics */}
        <Col xs={24} sm={12} lg={8}>
          <Card 
            hoverable
            style={{ 
              height: '100%',
              minHeight: 200,
              borderRadius: 8,
              border: `1px solid ${getStatusColor(cpu.status)}20`,
              background: `linear-gradient(135deg, ${getStatusColor(cpu.status)}08 0%, #ffffff 100%)`,
              transition: 'all 0.3s ease',
            }}
            bodyStyle={{ 
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 12, 
                  background: `${getStatusColor(cpu.status)}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ThunderboltOutlined style={{ fontSize: 24, color: getStatusColor(cpu.status) }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 16, display: 'block' }}>CPU Usage</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{cpu.cores} cores</Text>
                </div>
              </div>
              {getStatusIcon(cpu.status)}
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Text strong style={{ fontSize: 36, color: getStatusColor(cpu.status), lineHeight: 1 }}>
                {cpuPercent.toFixed(1)}%
              </Text>
              <Progress
                percent={cpuPercent}
                status={cpuPercent > 90 ? 'exception' : cpuPercent > 80 ? 'normal' : 'success'}
                strokeColor={getStatusColor(cpu.status)}
                showInfo={false}
                strokeWidth={8}
                style={{ marginTop: 12 }}
              />
            </div>
          </Card>
        </Col>

        {/* Memory Usage */}
        <Col xs={24} sm={12} lg={8}>
          <Card 
            hoverable
            style={{ 
              height: '100%',
              minHeight: 200,
              borderRadius: 8,
              border: `1px solid ${getStatusColor(memory.status)}20`,
              background: `linear-gradient(135deg, ${getStatusColor(memory.status)}08 0%, #ffffff 100%)`,
              transition: 'all 0.3s ease',
            }}
            bodyStyle={{ 
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 12, 
                  background: `${getStatusColor(memory.status)}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CloudServerOutlined style={{ fontSize: 24, color: getStatusColor(memory.status) }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 16, display: 'block' }}>Memory Usage</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {memory.usedGB.toFixed(2)} / {memory.totalGB.toFixed(2)} GB
                  </Text>
                </div>
              </div>
              {getStatusIcon(memory.status)}
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Text strong style={{ fontSize: 36, color: getStatusColor(memory.status), lineHeight: 1 }}>
                {memoryPercent.toFixed(1)}%
              </Text>
              <Progress
                percent={memoryPercent}
                status={memoryPercent > 95 ? 'exception' : memoryPercent > 85 ? 'normal' : 'success'}
                strokeColor={getStatusColor(memory.status)}
                showInfo={false}
                strokeWidth={8}
                style={{ marginTop: 12 }}
              />
            </div>
          </Card>
        </Col>

        {/* Storage Usage */}
        <Col xs={24} sm={12} lg={8}>
          <Card 
            hoverable
            style={{ 
              height: '100%',
              minHeight: 200,
              borderRadius: 8,
              border: `1px solid ${getStatusColor(storage.status)}20`,
              background: `linear-gradient(135deg, ${getStatusColor(storage.status)}08 0%, #ffffff 100%)`,
              transition: 'all 0.3s ease',
            }}
            bodyStyle={{ 
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 12, 
                  background: `${getStatusColor(storage.status)}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <HddOutlined style={{ fontSize: 24, color: getStatusColor(storage.status) }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 16, display: 'block' }}>Storage Usage</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {storage.usedGB.toFixed(2)} / {storage.totalGB.toFixed(2)} GB
                  </Text>
                </div>
              </div>
              {getStatusIcon(storage.status)}
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Text strong style={{ fontSize: 36, color: getStatusColor(storage.status), lineHeight: 1 }}>
                {storagePercent.toFixed(1)}%
              </Text>
              <Progress
                percent={storagePercent}
                status={storagePercent > 90 ? 'exception' : storagePercent > 80 ? 'normal' : 'success'}
                strokeColor={getStatusColor(storage.status)}
                showInfo={false}
                strokeWidth={8}
                style={{ marginTop: 12 }}
              />
            </div>
          </Card>
        </Col>

        {/* Database Status */}
        <Col xs={24} sm={12} lg={8}>
          <Card 
            hoverable
            style={{ 
              height: '100%',
              minHeight: 200,
              borderRadius: 8,
              border: `1px solid ${getStatusColor(database.status)}20`,
              background: `linear-gradient(135deg, ${getStatusColor(database.status)}08 0%, #ffffff 100%)`,
              transition: 'all 0.3s ease',
            }}
            bodyStyle={{ 
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 12, 
                  background: `${getStatusColor(database.status)}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <DatabaseOutlined style={{ fontSize: 24, color: getStatusColor(database.status) }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 16, display: 'block' }}>Database</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>MongoDB</Text>
                </div>
              </div>
              {getStatusIcon(database.status)}
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Text 
                strong 
                style={{ 
                  fontSize: 20, 
                  color: getStatusColor(database.status), 
                  lineHeight: 1.2,
                  marginBottom: 8 
                }}
              >
                {database.connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </Text>
              <div style={{ 
                padding: '8px 12px', 
                borderRadius: 6, 
                background: '#f5f5f5',
                display: 'inline-block',
                width: 'fit-content'
              }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Response Time</Text>
                <br />
                <Text strong style={{ fontSize: 16 }}>{database.responseTime}ms</Text>
              </div>
            </div>
          </Card>
        </Col>

        {/* Database Storage */}
        <Col xs={24} sm={12} lg={8}>
          <Card 
            hoverable
            style={{ 
              height: '100%',
              minHeight: 200,
              borderRadius: 8,
              border: '1px solid #1890ff20',
              background: 'linear-gradient(135deg, #1890ff08 0%, #ffffff 100%)',
              transition: 'all 0.3s ease',
            }}
            bodyStyle={{ 
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: '#1890ff15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DatabaseOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              </div>
              <div>
                <Text strong style={{ fontSize: 16, display: 'block' }}>Database Storage</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>MongoDB Metrics</Text>
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: 8, 
                background: '#f0f5ff',
                border: '1px solid #d6e4ff'
              }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Data Size
                </Text>
                <Text strong style={{ fontSize: 24, color: '#1890ff' }}>
                  {(database.storageSize / (1024 ** 2)).toFixed(2)} MB
                </Text>
              </div>
              
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: 8, 
                background: '#f0f5ff',
                border: '1px solid #d6e4ff'
              }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Index Size
                </Text>
                <Text strong style={{ fontSize: 24, color: '#1890ff' }}>
                  {(database.indexSize / (1024 ** 2)).toFixed(2)} MB
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        {/* System Info */}
        <Col xs={24} sm={12} lg={8}>
          <Card 
            hoverable
            style={{ 
              height: '100%',
              minHeight: 200,
              borderRadius: 8,
              border: '1px solid #722ed120',
              background: 'linear-gradient(135deg, #722ed108 0%, #ffffff 100%)',
              transition: 'all 0.3s ease',
            }}
            bodyStyle={{ 
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 12, 
                background: '#722ed115',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CloudServerOutlined style={{ fontSize: 24, color: '#722ed1' }} />
              </div>
              <div>
                <Text strong style={{ fontSize: 16, display: 'block' }}>System Info</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>Server Status</Text>
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: 8, 
                background: '#f9f0ff',
                border: '1px solid #efdbff'
              }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Last Updated
                </Text>
                <Text strong style={{ fontSize: 16, color: '#722ed1' }}>
                  {new Date(systemHealth.timestamp).toLocaleTimeString()}
                </Text>
              </div>
              
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: 8, 
                background: `${getStatusColor(overallStatus)}15`,
                border: `1px solid ${getStatusColor(overallStatus)}30`
              }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Overall Status
                </Text>
                <Text strong style={{ fontSize: 20, color: getStatusColor(overallStatus) }}>
                  {getStatusText(overallStatus)}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </Card>
  );
});

SystemHealthCard.displayName = 'SystemHealthCard';
