import { Row, Col, Card, Statistic, Typography, Progress } from 'antd';
import {
  ApiOutlined,
  DashboardOutlined,
  LineChartOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import type { DeviceStatusSummary as DeviceStatusData, AlertData } from '../../../../schemas';

const { Text } = Typography;

interface KeyMetricsProps {
  deviceStatusData: DeviceStatusData | null;
  totalReadings: number;
  alerts: AlertData[];
}

export const KeyMetrics = ({ deviceStatusData, totalReadings, alerts }: KeyMetricsProps) => {
  const token = useThemeToken();

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Total Devices"
            value={deviceStatusData?.totalDevices || 0}
            prefix={<ApiOutlined />}
            valueStyle={{ color: token.colorInfo }}
          />
          <Text type="secondary">Registered in system</Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="System Health"
            value={parseFloat(deviceStatusData?.healthScore || '0')}
            precision={1}
            suffix="%"
            prefix={<DashboardOutlined />}
            valueStyle={{ 
              color: parseFloat(deviceStatusData?.healthScore || '0') > 80 
                ? token.colorSuccess 
                : token.colorWarning 
            }}
          />
          <Progress 
            percent={parseFloat(deviceStatusData?.healthScore || '0')} 
            showInfo={false}
            strokeColor={parseFloat(deviceStatusData?.healthScore || '0') > 80 
              ? token.colorSuccess 
              : token.colorWarning}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Total Readings"
            value={totalReadings || 0}
            prefix={<LineChartOutlined />}
            valueStyle={{ color: token.colorPrimary }}
          />
          <Text type="secondary">Last 7 days</Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Active Alerts"
            value={alerts.length}
            prefix={<WarningOutlined />}
            valueStyle={{ color: alerts.length > 0 ? token.colorError : token.colorSuccess }}
          />
          <Text type="secondary">Requiring attention</Text>
        </Card>
      </Col>
    </Row>
  );
};
