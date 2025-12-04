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
  Spin,
  Popconfirm
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  SearchOutlined,
  CalendarOutlined,
  FilterOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { reportsService } from '../../../services/reports.Service';
import { getReportTypeColor, getReportTypeLabel } from '../../../constants';

// Extend dayjs with relativeTime plugin for fromNow() function
dayjs.extend(relativeTime);

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
  const [isRefreshing, setIsRefreshing] = useState(false);
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
      if (import.meta.env.DEV) {
        console.error('Failed to load report history:', error);
      }
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

  // Handle manual refresh with loading state
  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent spam clicks
    
    setIsRefreshing(true);
    try {
      await loadReports(pagination.current, pagination.pageSize);
      setTimeout(() => setIsRefreshing(false), 500);
    } catch (error) {
      console.error('Refresh error:', error);
      setIsRefreshing(false);
    }
  };

  // Handle download
  const handleDownload = async (record: ReportHistoryItem) => {
    try {
      message.loading({ content: 'Downloading report...', key: 'download', duration: 0 });
      
      // Extract fileId from downloadUrl or use it directly
      const fileId = record.downloadUrl.split('/').pop() || record.id;
      const blob = await reportsService.downloadReport(fileId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${record.reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success({ content: 'Download completed successfully', key: 'download' });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Download failed:', error);
      }
      message.error({ 
        content: error instanceof Error ? error.message : 'Download failed', 
        key: 'download' 
      });
    }
  };

  // Handle delete
  const handleDelete = async (record: ReportHistoryItem) => {
    try {
      await reportsService.deleteReport(record.id);
      message.success('Report deleted successfully');
      // Reload the reports list
      loadReports(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('Delete failed:', error);
      message.error(
        error instanceof Error ? error.message : 'Failed to delete report'
      );
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

  // Table columns - Compact version with merged columns
  const columns = [
    {
      title: 'Report',
      key: 'report',
      width: '35%',
      render: (record: ReportHistoryItem) => (
        <Space direction="vertical" size={2}>
          <Space size={8}>
            <Text strong>{record.title}</Text>
            <Tag color={getReportTypeColor(record.type)} style={{ margin: 0 }}>
              {getReportTypeLabel(record.type).toUpperCase()}
            </Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.reportId}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Date Range',
      key: 'dateRange',
      width: '25%',
      render: (record: ReportHistoryItem) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: '13px' }}>
            {dayjs(record.startDate).format('MMM DD, YYYY')}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            to {dayjs(record.endDate).format('Dec 01, 2025')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Devices',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      width: '10%',
      align: 'center' as const,
      render: (count: number) => (
        <Text strong style={{ fontSize: '14px' }}>
          {count} <Text type="secondary" style={{ fontSize: '12px' }}>devices</Text>
        </Text>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: '10%',
      align: 'center' as const,
      render: (size: number) => <Text style={{ fontSize: '13px' }}>{formatFileSize(size)}</Text>,
    },
    {
      title: 'Downloads',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
      width: '8%',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color={count > 0 ? 'green' : 'default'} style={{ margin: 0 }}>
          {count || 0}
        </Tag>
      ),
    },
    {
      title: 'Generated',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '12%',
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          <Text style={{ fontSize: '13px' }}>{dayjs(date).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      render: (record: ReportHistoryItem) => (
        <Space size="small">
          <Tooltip title="Download Report">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
              size="small"
            >
              Download
            </Button>
          </Tooltip>
          <Popconfirm
            title="Delete Report"
            description="Are you sure you want to delete this report? This action cannot be undone."
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete Report">
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              >
                Delete
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
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
                icon={<ReloadOutlined spin={isRefreshing} />}
                onClick={handleRefresh}
                loading={isRefreshing}
                disabled={isRefreshing}
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
                size="middle"
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  pageSizeOptions: ['10', '20', '50'],
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
  );
};

export default ReportHistory;