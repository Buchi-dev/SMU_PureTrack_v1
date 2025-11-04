import { Card, Space, List, Empty, Tag, Typography, Statistic } from 'antd';
import {
  FileTextOutlined,
  FilePdfOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { ReportHistory } from '../../../../schemas';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ReportHistorySidebarProps {
  reportHistory: ReportHistory[];
  token: any;
}

export const ReportHistorySidebar = ({
  reportHistory,
  token,
}: ReportHistorySidebarProps) => {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* Quick Stats */}
      <Card>
        <Statistic
          title="Reports Generated"
          value={reportHistory.length}
          prefix={<FileTextOutlined />}
          valueStyle={{ color: '#001f3f' }}
        />
      </Card>

      {/* Report History */}
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>Recent Reports</span>
          </Space>
        }
      >
        {reportHistory.length === 0 ? (
          <Empty
            description="No reports generated yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={reportHistory}
            renderItem={item => (
              <List.Item>
                <List.Item.Meta
                  avatar={<FilePdfOutlined style={{ fontSize: 24, color: token.colorError }} />}
                  title={item.title}
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.generatedAt).format('MMM D, YYYY h:mm A')}
                      </Text>
                      <Space size={4}>
                        <Tag color="blue">{item.devices} devices</Tag>
                        <Tag color="green">{item.pages} pages</Tag>
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
};
