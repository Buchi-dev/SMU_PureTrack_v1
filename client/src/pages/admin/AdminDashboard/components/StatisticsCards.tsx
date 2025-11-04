import { Row, Col, Card, Statistic } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';

interface StatisticsCardsProps {
  totalDevices: number;
  onlineDevices: number;
  activeAlerts: number;
  criticalAlerts: number;
}

export const StatisticsCards = ({
  totalDevices,
  onlineDevices,
  activeAlerts,
  criticalAlerts,
}: StatisticsCardsProps) => {
  const token = useThemeToken();

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false}>
          <Statistic
            title="Total Devices"
            value={totalDevices}
            prefix={<ApiOutlined />}
            valueStyle={{ color: token.colorPrimary }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false}>
          <Statistic
            title="Online Devices"
            value={onlineDevices}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: token.colorSuccess }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false}>
          <Statistic
            title="Active Alerts"
            value={activeAlerts}
            prefix={<WarningOutlined />}
            valueStyle={{ color: token.colorWarning }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false}>
          <Statistic
            title="Critical Alerts"
            value={criticalAlerts}
            prefix={<ThunderboltOutlined />}
            valueStyle={{ color: token.colorError }}
          />
        </Card>
      </Col>
    </Row>
  );
};
