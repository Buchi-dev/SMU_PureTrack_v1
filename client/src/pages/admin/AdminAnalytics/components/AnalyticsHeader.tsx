import { Typography } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export const AnalyticsHeader = () => {
  return (
    <div>
      <Title level={2}>
        <BarChartOutlined /> Analytics Dashboard
      </Title>
      <Paragraph type="secondary">
        Comprehensive analytics and insights about water quality monitoring system
      </Paragraph>
    </div>
  );
};
