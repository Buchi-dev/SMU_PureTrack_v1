/**
 * ReportHistorySidebar Component
 * 
 * Displays report generation history with metadata.
 * Supports sidebar and full-view layouts.
 */
import { 
  Card, 
  Space, 
  List, 
  Empty, 
  Tag, 
  Typography, 
  Statistic, 
  Button,
  Row,
  Col,
  Dropdown,
  Tooltip,
  Modal,
  message
} from 'antd';
import type { GlobalToken } from 'antd/es/theme/interface';
import {
  FileTextOutlined,
  FilePdfOutlined,
  HistoryOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  MoreOutlined,
  RightOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ReportHistory } from '../../../../schemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { reportsService } from '../../../../services/reports.Service';

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;
const { confirm } = Modal;

interface ReportHistorySidebarProps {
  reportHistory: ReportHistory[];
  token: GlobalToken;
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
  fullView?: boolean;
  onDelete?: (reportId: string) => void;
}

/**
 * Report history list with actions
 * 
 * @example
 * <ReportHistorySidebar
 *   reportHistory={reportHistory}
 *   token={token}
 *   fullView={false}
 * />
 */
export const ReportHistorySidebar = ({
  reportHistory,
  token,
  title = "Report History",
  showViewAll = false,
  onViewAll,
  fullView = false,
  onDelete,
}: ReportHistorySidebarProps) => {
  const getReportTypeColor = (/* _type?: string */) => {
    return 'blue';
  };

  const getReportTypeLabel = (/* _type?: string */) => {
    return 'Water Quality';
  };

  const handleDeleteReport = (report: ReportHistory) => {
    confirm({
      title: 'Delete Report',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${report.title}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          await reportsService.deleteReport(report.id);
          message.success('Report deleted successfully');
          if (onDelete) {
            onDelete(report.id);
          }
        } catch (error) {
          message.error('Failed to delete report');
          console.error('Delete report error:', error);
        }
      },
    });
  };

  const handleMenuClick = (key: string, report: ReportHistory) => {
    if (key === 'delete') {
      handleDeleteReport(report);
    }
    // Add other menu actions here (view, download) if needed
  };

  if (fullView) {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Statistics Row */}
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Reports"
                value={reportHistory.length}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: token.colorPrimary as string }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="This Month"
                value={reportHistory.filter(r => 
                  dayjs(r.generatedAt).isAfter(dayjs().startOf('month'))
                ).length}
                prefix={<FilePdfOutlined />}
                valueStyle={{ color: token.colorSuccess as string }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Pages"
                value={reportHistory.reduce((sum, r) => sum + (r.pages || 0), 0)}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: token.colorInfo as string }}
              />
            </Card>
          </Col>
        </Row>

        {/* Full Report List */}
        <Card
          title={
            <Space>
              <HistoryOutlined />
              <span>All Generated Reports</span>
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
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} reports`,
              }}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Tooltip title="Download">
                      <Button type="text" icon={<DownloadOutlined />} />
                    </Tooltip>,
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'view',
                            label: 'View Details',
                            icon: <EyeOutlined />,
                          },
                          {
                            key: 'download',
                            label: 'Download',
                            icon: <DownloadOutlined />,
                          },
                          {
                            type: 'divider',
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: <DeleteOutlined />,
                            danger: true,
                          },
                        ],
                        onClick: ({ key }) => handleMenuClick(key, item),
                      }}
                    >
                      <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{ 
                        fontSize: 32, 
                        color: token.colorError as string,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <FilePdfOutlined />
                      </div>
                    }
                    title={
                      <Space direction="vertical" size={4}>
                        <Text strong>{item.title}</Text>
                        <Space size={4} wrap>
                          <Tag color={getReportTypeColor()}>
                            {getReportTypeLabel()}
                          </Tag>
                          <Tag color="blue">{item.devices} devices</Tag>
                          <Tag color="green">{item.pages} pages</Tag>
                        </Space>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Generated {dayjs(item.generatedAt).format('MMM D, YYYY h:mm A')}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(item.generatedAt).fromNow()}
                        </Text>
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
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* Quick Stats */}
      {!showViewAll && (
        <Card>
          <Statistic
            title="Reports Generated"
            value={reportHistory.length}
            prefix={<FileTextOutlined />}
            valueStyle={{ color: token.colorPrimary as string }}
          />
        </Card>
      )}

      {/* Report History */}
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>{title}</span>
          </Space>
        }
        extra={
          showViewAll && reportHistory.length > 0 ? (
            <Button 
              type="link" 
              icon={<RightOutlined />}
              onClick={onViewAll}
            >
              View All
            </Button>
          ) : null
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
              <List.Item
                extra={
                  <Space>
                    <Tooltip title="Download PDF">
                      <Button 
                        type="text" 
                        icon={<DownloadOutlined />} 
                        size="small"
                      />
                    </Tooltip>
                    <Tooltip title="Delete Report">
                      <Button 
                        type="text" 
                        icon={<DeleteOutlined />} 
                        size="small"
                        danger
                        onClick={() => handleDeleteReport(item)}
                      />
                    </Tooltip>
                  </Space>
                }
              >
                <List.Item.Meta
                  avatar={
                    <FilePdfOutlined 
                      style={{ fontSize: 24, color: token.colorError as string }} 
                    />
                  }
                  title={
                    <Paragraph 
                      ellipsis={{ rows: 1 }} 
                      style={{ marginBottom: 4 }}
                      strong
                    >
                      {item.title}
                    </Paragraph>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.generatedAt).format('MMM D, YYYY h:mm A')}
                      </Text>
                      <Space size={4} wrap>
                        <Tag color={getReportTypeColor()} style={{ fontSize: 11 }}>
                          {getReportTypeLabel()}
                        </Tag>
                        <Tag color="blue" style={{ fontSize: 11 }}>
                          {item.devices} devices
                        </Tag>
                        <Tag color="green" style={{ fontSize: 11 }}>
                          {item.pages} pages
                        </Tag>
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
