import { Space, Empty, Skeleton, Card, Row } from 'antd';
import type { ReactNode } from 'react';

interface PageContainerProps {
  children?: ReactNode;
  loading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  maxWidth?: string | number;
  gutter?: [number, number];
  direction?: 'vertical' | 'horizontal';
  spacing?: 'large' | 'middle' | 'small';
}

export const PageContainer = ({
  children,
  loading = false,
  isEmpty = false,
  emptyMessage = 'No data available',
  maxWidth = '1600px',
  gutter = [16, 16],
  direction = 'vertical',
  spacing = 'large',
}: PageContainerProps) => {

  // Handle loading state
  if (loading) {
    return (
      <div style={{ maxWidth, margin: '0 auto' }}>
        <Space direction="vertical" size={spacing} style={{ width: '100%' }}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Space>
      </div>
    );
  }

  // Handle empty state
  if (isEmpty) {
    return (
      <div style={{ maxWidth, margin: '0 auto' }}>
        <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Empty description={emptyMessage} />
        </Card>
      </div>
    );
  }

  // Render grid or vertical layout
  if (direction === 'horizontal') {
    return (
      <div style={{ maxWidth, margin: '0 auto' }}>
        <Row gutter={gutter}>{children}</Row>
      </div>
    );
  }

  return (
    <div style={{ maxWidth, margin: '0 auto' }}>
      <Space direction="vertical" size={spacing} style={{ width: '100%' }}>
        {children}
      </Space>
    </div>
  );
};

export default PageContainer;
