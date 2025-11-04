import { Card, Statistic, Space, Progress, Typography, Divider } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  ExperimentOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';

const { Text } = Typography;

type SensorType = 'turbidity' | 'tds' | 'ph';
type StatusType = 'success' | 'warning' | 'error';

interface SensorThreshold {
  min: number;
  max: number;
  unit: string;
  label: string;
}

interface SensorMetricCardProps {
  type: SensorType;
  value: number;
  threshold: SensorThreshold;
}

const SENSOR_ICONS = {
  turbidity: FireOutlined,
  tds: ExperimentOutlined,
  ph: LineChartOutlined,
};

const getStatusColor = (value: number, threshold: SensorThreshold): StatusType => {
  if (value < threshold.min || value > threshold.max) return 'error';
  if (value < threshold.min * 1.2 || value > threshold.max * 0.8) return 'warning';
  return 'success';
};

interface ThemeToken {
  colorSuccess: string;
  colorWarning: string;
  colorError: string;
}

const getStatusIcon = (status: StatusType, token: ThemeToken) => {
  switch (status) {
    case 'success':
      return <CheckCircleOutlined style={{ color: token.colorSuccess }} />;
    case 'warning':
      return <WarningOutlined style={{ color: token.colorWarning }} />;
    case 'error':
      return <ExclamationCircleOutlined style={{ color: token.colorError }} />;
  }
};

const getStatusColorValue = (status: StatusType, token: ThemeToken): string => {
  switch (status) {
    case 'success':
      return token.colorSuccess;
    case 'warning':
      return token.colorWarning;
    case 'error':
      return token.colorError;
  }
};

export const SensorMetricCard = ({ type, value, threshold }: SensorMetricCardProps) => {
  const token = useThemeToken();
  const status = getStatusColor(value, threshold);
  const statusColor = getStatusColorValue(status, token);
  const Icon = SENSOR_ICONS[type];

  // Calculate percentage for progress bar
  const getProgressPercent = () => {
    if (type === 'ph') {
      return (value / 14) * 100;
    }
    return (value / threshold.max) * 100;
  };

  return (
    <Card
      hoverable
      style={{
        borderLeft: `4px solid ${statusColor}`,
        height: '100%',
      }}
    >
      <Statistic
        title={
          <Space>
            <Icon />
            {threshold.label}
          </Space>
        }
        value={value}
        suffix={threshold.unit}
        prefix={getStatusIcon(status, token)}
        precision={type === 'ph' ? 2 : 0}
        valueStyle={{ color: statusColor }}
      />
      <Divider style={{ margin: '12px 0' }} />
      <Progress
        percent={getProgressPercent()}
        status={status === 'error' ? 'exception' : 'active'}
        showInfo={false}
      />
      <Text type="secondary" style={{ fontSize: 12 }}>
        Safe range: {threshold.min} - {threshold.max} {threshold.unit}
      </Text>
    </Card>
  );
};
