import { Row, Col, Typography, Space, Button, Badge } from 'antd';
import { DashboardOutlined, DownloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface PageHeaderProps {
  lastUpdated: Date | null;
  hasData: boolean;
  onExport: () => void;
}

export const PageHeader = ({ lastUpdated, hasData, onExport }: PageHeaderProps) => {
  return (
    <Row justify="space-between" align="middle" gutter={[16, 16]}>
      <Col xs={24} md={12}>
        <Space direction="vertical" size={0}>
          <Title level={2} style={{ margin: 0 }}>
            <DashboardOutlined /> Sensor Monitoring
          </Title>
          <Text type="secondary">
            Real-time water quality monitoring dashboard
          </Text>
        </Space>
      </Col>
      <Col xs={24} md={12} style={{ textAlign: 'right' }}>
        <Space wrap>
          {lastUpdated && (
            <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
              <Badge status="processing" text="Live Updates" />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Last update: {lastUpdated.toLocaleTimeString()}
              </Text>
            </Space>
          )}
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={onExport}
            disabled={!hasData}
          >
            Export Data
          </Button>
        </Space>
      </Col>
    </Row>
  );
};
