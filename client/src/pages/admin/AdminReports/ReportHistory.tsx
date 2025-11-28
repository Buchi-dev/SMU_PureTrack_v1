/**
 * ReportHistory Page - View and Download Stored PDF Reports
 *
 * Displays historical reports stored in GridFS with filtering and download capabilities.
 * Separate from the report generation page.
 */
import { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Table,
  Space,
  Button,
  Tag,
  Typography,
  DatePicker,
  Select,
  Input,
  Empty,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Spin
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  SearchOutlined,
  CalendarOutlined,
  FilterOutlined,
  ReloadOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AdminLayout } from '../../../components/layouts';
import { reportsService } from '../../../services/reports.Service';

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface ReportHistoryItem {
  id: string;
  reportId: string;
  type: string;
  title: string;
  createdAt: string;
  fileSize: number;
  downloadCount: number;
  startDate: string;
  endDate: string;
  deviceCount: number;
  downloadUrl: string;
}

const ReportHistory: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Filters
  const [filters, setFilters] = useState<{
    type: string;
    dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
    search: string;
  }>({
    type: '',
    dateRange: null,
    search: '',
  });

  // Load reports
  const loadReports = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await reportsService.getReportHistory({
        type: filters.type || undefined,
        startDate: filters.dateRange ? filters.dateRange[0].format('YYYY-MM-DD') : undefined,
        endDate: filters.dateRange ? filters.dateRange[1].format('YYYY-MM-DD') : undefined,
        page,
        limit: pageSize,
      });

      setReports(response.data);
      setPagination({
        current: page,
        pageSize,
        total: response.pagination.total,
      });
    } catch (error) {
      console.error('Failed to load report history:', error);
      message.error('Failed to load report history');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadReports();
  }, []);

  // Handle filter changes
  const handleFilterChange = () => {
    loadReports(1, pagination.pageSize);
  };

  // Handle download
  const handleDownload = async (record: ReportHistoryItem) => {
    try {
      const blob = await reportsService.downloadReport(record.id);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${record.reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      message.error('Download failed');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Table columns
  const columns = [
    {
      title: 'Report',
      key: 'report',
      render: (record: ReportHistoryItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.title}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.reportId}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'water-quality' ? 'blue' : 'green'}>
          {type.replace('-', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Date Range',
      key: 'dateRange',
      render: (record: ReportHistoryItem) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(record.startDate).format('MMM DD, YYYY')}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            to {dayjs(record.endDate).format('MMM DD, YYYY')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Devices',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      render: (count: number) => <Statistic value={count} suffix="devices" valueStyle={{ fontSize: '14px' }} />,
    },
    {
      title: 'Size',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => <Text>{formatFileSize(size)}</Text>,
    },
    {
      title: 'Downloads',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
      render: (count: number) => <Text>{count || 0}</Text>,
    },
    {
      title: 'Generated',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          <Text>{dayjs(date).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: ReportHistoryItem) => (
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => handleDownload(record)}
          size="small"
        >
          Download
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <Content style={{ padding: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                <FileTextOutlined style={{ marginRight: 8 }} />
                Report History
              </Title>
              <Text type="secondary">
                View and download your previously generated PDF reports
              </Text>
            </Col>
            <Col>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadReports(pagination.current, pagination.pageSize)}
                loading={loading}
              >
                Refresh
              </Button>
            </Col>
          </Row>

          {/* Stats */}
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Reports"
                  value={pagination.total}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="This Month"
                  value={reports.filter(r => dayjs(r.createdAt).isAfter(dayjs().startOf('month'))).length}
                  prefix={<CalendarOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Downloads"
                  value={reports.reduce((sum, r) => sum + (r.downloadCount || 0), 0)}
                  prefix={<DownloadOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Storage Used"
                  value={formatFileSize(reports.reduce((sum, r) => sum + r.fileSize, 0))}
                  prefix={<DatabaseOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Card title={<><FilterOutlined /> Filters</>}>
            <Row gutter={16} align="middle">
              <Col span={6}>
                <Select
                  placeholder="Report Type"
                  style={{ width: '100%' }}
                  allowClear
                  value={filters.type || undefined}
                  onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                >
                  <Option value="water-quality">Water Quality</Option>
                  <Option value="device-status">Device Status</Option>
                  <Option value="compliance">Compliance</Option>
                </Select>
              </Col>
              <Col span={8}>
                <RangePicker
                  style={{ width: '100%' }}
                  value={filters.dateRange}
                  onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates as [dayjs.Dayjs, dayjs.Dayjs] | null }))}
                  placeholder={['Start Date', 'End Date']}
                />
              </Col>
              <Col span={6}>
                <Input
                  placeholder="Search reports..."
                  prefix={<SearchOutlined />}
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </Col>
              <Col span={4}>
                <Button type="primary" onClick={handleFilterChange} style={{ width: '100%' }}>
                  Apply Filters
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Reports Table */}
          <Card>
            {loading && reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text>Loading reports...</Text>
                </div>
              </div>
            ) : reports.length === 0 ? (
              <Empty
                description="No reports found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Table
                columns={columns}
                dataSource={reports}
                rowKey="id"
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} reports`,
                  onChange: (page, pageSize) => loadReports(page, pageSize),
                  onShowSizeChange: (size) => loadReports(1, size),
                }}
                loading={loading}
              />
            )}
          </Card>
        </Space>
      </Content>
    </AdminLayout>
  );
};

export default ReportHistory;