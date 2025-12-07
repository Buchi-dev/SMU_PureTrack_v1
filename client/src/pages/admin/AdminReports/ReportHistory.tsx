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
  Spin,
  Popconfirm
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { reportsService } from '../../../services/reports.Service';
import { getReportTypeColor, getReportTypeLabel } from '../../../constants';
import { CompactReportHistoryStats } from './components';
import { useResponsive } from '../../../hooks/useResponsive';

// Extend dayjs with relativeTime plugin for fromNow() function
dayjs.extend(relativeTime);

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface ReportHistoryItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  format: string;
  parameters: {
    deviceIds?: string[];
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  };
  file?: {
    fileId: string;
    filename: string;
    format: string;
    size: number;
    mimeType: string;
  };
  generatedBy: string | {
    id: string;
    displayName: string;
    email: string;
  };
  generatedAt?: {
    seconds: number;
    nanoseconds: number;
  };
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  };
}

const ReportHistory: React.FC = () => {
  const { isMobile } = useResponsive();
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

      // Ensure each report has an id field (transform _id to id if needed)
      const normalizedReports = response.data.map((report: any) => ({
        ...report,
        id: report.id || report._id,
      }));

      setReports(normalizedReports);
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

  // Helper function to convert Firebase Timestamp to Date
  const timestampToDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    
    // Handle Firebase Timestamp object
    if (timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000);
    }
    
    // Handle ISO string
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    // Handle Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // Handle timestamp in milliseconds
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    // Fallback
    return new Date();
  };

  // Helper function to get device count from parameters
  const getDeviceCount = (report: ReportHistoryItem): number => {
    return report.parameters?.deviceIds?.length || 0;
  };

  // Helper function to get file size
  const getFileSize = (report: ReportHistoryItem): number => {
    return report.file?.size || 0;
  };

  // Helper function to get date range
  const getDateRange = (report: ReportHistoryItem): { start: string; end: string } => {
    const startDate = report.parameters?.startDate || '';
    const endDate = report.parameters?.endDate || '';
    return { start: startDate, end: endDate };
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
      
      // Use report ID as the file identifier
      // The backend will look up the file.fileId from the report document
      const fileId = record.id;
      const blob = await reportsService.downloadReport(fileId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = record.file?.filename || `report_${record.id}.pdf`;
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

  // Mobile columns (3 columns)
  const mobileColumns = [
    {
      title: 'Report',
      key: 'report',
      ellipsis: false,
      render: (record: ReportHistoryItem) => {
        const dateRange = getDateRange(record);
        const date = timestampToDate(record.createdAt);
        const isValidDate = !isNaN(date.getTime());
        
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Space size={4} wrap style={{ width: '100%' }}>
              <Text strong style={{ fontSize: '12px', wordBreak: 'break-word' }}>
                {record.title}
              </Text>
              <Tag color={getReportTypeColor(record.type)} style={{ margin: 0, fontSize: '9px' }}>
                {getReportTypeLabel(record.type).toUpperCase()}
              </Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {dateRange.start ? dayjs(dateRange.start).format('MMM D') : 'N/A'} - {dateRange.end ? dayjs(dateRange.end).format('MMM D, YYYY') : 'N/A'}
            </Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {getDeviceCount(record)} devices • {formatFileSize(getFileSize(record))}
            </Text>
            {isValidDate && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {dayjs(date).format('MMM D, h:mm A')}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 50,
      align: 'center' as const,
      render: () => (
        <Tooltip title="Ready to download">
          <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      align: 'center' as const,
      render: (record: ReportHistoryItem) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Button
            type="primary"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
            block
            style={{ fontSize: '11px', height: '32px' }}
          >
            Download
          </Button>
          {record.file?.fileId && (
            <Popconfirm
              title="Delete Report"
              description="Are you sure you want to delete this report?"
              onConfirm={() => handleDelete(record)}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                block
                style={{ fontSize: '11px', height: '28px' }}
              >
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Table columns - Compact version with fixed widths for consistency
  const columns = [
    {
      title: 'Report',
      key: 'report',
      width: 300,
      render: (record: ReportHistoryItem) => (
        <Space direction="vertical" size={2}>
          <Space size={8}>
            <Text strong>{record.title}</Text>
            <Tag color={getReportTypeColor(record.type)} style={{ margin: 0 }}>
              {getReportTypeLabel(record.type).toUpperCase()}
            </Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.id}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Date Range',
      key: 'dateRange',
      width: 200,
      render: (record: ReportHistoryItem) => {
        const dateRange = getDateRange(record);
        return (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: '13px' }}>
              {dateRange.start ? dayjs(dateRange.start).format('MMM DD, YYYY') : 'N/A'}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              to {dateRange.end ? dayjs(dateRange.end).format('MMM DD, YYYY') : 'N/A'}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Devices',
      key: 'deviceCount',
      width: 100,
      align: 'center' as const,
      render: (record: ReportHistoryItem) => {
        const count = getDeviceCount(record);
        return (
          <Text strong style={{ fontSize: '14px' }}>
            {count} <Text type="secondary" style={{ fontSize: '12px' }}>devices</Text>
          </Text>
        );
      },
    },
    {
      title: 'Size',
      key: 'fileSize',
      width: 100,
      align: 'center' as const,
      render: (record: ReportHistoryItem) => {
        const size = getFileSize(record);
        return <Text style={{ fontSize: '13px' }}>{formatFileSize(size)}</Text>;
      },
    },
    {
      title: 'Downloads',
      key: 'downloadCount',
      width: 100,
      align: 'center' as const,
      render: () => (
        <Tag color="default" style={{ margin: 0 }}>
          N/A
        </Tag>
      ),
    },
    {
      title: 'Generated By',
      key: 'generatedBy',
      width: '150px',
      render: (record: ReportHistoryItem) => {
        if (typeof record.generatedBy === 'object' && record.generatedBy.displayName) {
          return (
            <Tooltip title={record.generatedBy.email}>
              <Text style={{ fontSize: '13px' }}>{record.generatedBy.displayName}</Text>
            </Tooltip>
          );
        }
        return <Text type="secondary" style={{ fontSize: '13px' }}>N/A</Text>;
      },
    },
    {
      title: 'Generated',
      key: 'createdAt',
      width: '150px',
      render: (record: ReportHistoryItem) => {
        const date = timestampToDate(record.createdAt);
        const isValidDate = !isNaN(date.getTime());
        
        if (!isValidDate) {
          return <Text type="secondary" style={{ fontSize: '13px' }}>N/A</Text>;
        }
        
        return (
          <Tooltip title={dayjs(date).format('MMMM D, YYYY [at] h:mm:ss A')}>
            <Text style={{ fontSize: '13px' }}>{dayjs(date).format('MMM D, YYYY')}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '11px' }}>{dayjs(date).format('h:mm A')}</Text>
          </Tooltip>
        );
      },
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
              disabled={!record.file}
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

          {/* Compact Stats */}
          <div style={{ marginBottom: 16 }}>
            <CompactReportHistoryStats reports={reports} totalReports={pagination.total} />
          </div>

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
                columns={isMobile ? mobileColumns : columns}
                dataSource={reports}
                rowKey="id"
                size={isMobile ? 'small' : 'middle'}
                bordered={!isMobile}
                scroll={isMobile ? undefined : { x: 1200 }}
                pagination={{
                  ...pagination,
                  pageSize: isMobile ? 5 : pagination.pageSize,
                  showSizeChanger: !isMobile,
                  showQuickJumper: !isMobile,
                  simple: isMobile,
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