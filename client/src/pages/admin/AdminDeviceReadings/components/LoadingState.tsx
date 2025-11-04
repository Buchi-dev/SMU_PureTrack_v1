import { Card, Spin, Empty, Typography } from 'antd';

const { Text } = Typography;

interface LoadingStateProps {
  message?: string;
}

export const LoadingState = ({ message = 'Loading sensor data...' }: LoadingStateProps) => {
  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>{message}</Text>
        </div>
      </div>
    </Card>
  );
};

interface EmptyStateProps {
  description?: string;
}

export const EmptyState = ({ description = 'Please select a device to view sensor readings' }: EmptyStateProps) => {
  return (
    <Card>
      <Empty
        description={description}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    </Card>
  );
};
