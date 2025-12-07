/**
 * DeviceStatusTable Component
 * Displays device status and sensor readings in a table
 */

import { useMemo } from 'react';
import { Card, Table, Space, Tag, Badge, Tooltip, Typography, Button } from 'antd';
import {
  LineChartOutlined,
  ApiOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  DashboardOutlined,
  EyeOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemeToken } from '../../../../theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

/**
 * Device status data structure
 */
export interface DeviceStatus {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  lastUpdate: string;
  ph: number;
  tds: number;
  turbidity: number;
}

interface DeviceStatusTableProps {
  devices: DeviceStatus[];
}

/**
 * Table displaying device status and sensor readings
 * @param props - Component props
 */
export default function DeviceStatusTable({ devices }: DeviceStatusTableProps) {
  const navigate = useNavigate();
  const token = useThemeToken();
  const { isMobile } = useResponsive();

  const mobileColumns = useMemo((): ColumnsType<DeviceStatus> => {
    if (!token) return [];

    return [
      {
        title: 'Device',
        key: 'device',
        ellipsis: false,
        render: (record: DeviceStatus) => {
          const statusConfig = {
            online: { color: token.colorSuccess, icon: <CheckCircleOutlined />, text: 'Online' },
            offline: { color: token.colorTextTertiary, icon: <ClockCircleOutlined />, text: 'Offline' },
            warning: { color: token.colorWarning, icon: <WarningOutlined />, text: 'Warning' },
          };
          const config = statusConfig[record.status as keyof typeof statusConfig];
          
          return (
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: '13px', wordBreak: 'break-word' }}>
                {record.name}
              </Text>
              <Text type="secondary" style={{ fontSize: '10px' }}>
                <EnvironmentOutlined style={{ marginRight: '4px' }} />
                {record.location}
              </Text>
              <Tag icon={config.icon} color={record.status === 'online' ? 'success' : record.status === 'warning' ? 'warning' : 'default'} style={{ fontSize: '10px', margin: 0 }}>
                {config.text}
              </Tag>
            </Space>
          );
        },
      },
      {
        title: 'Status',
        key: 'status',
        width: 50,
        align: 'center' as const,
        render: (record: DeviceStatus) => {
          const statusConfig = {
            online: { color: token.colorSuccess, icon: <CheckCircleOutlined /> },
            offline: { color: token.colorTextTertiary, icon: <CloseCircleOutlined /> },
            warning: { color: token.colorWarning, icon: <WarningOutlined /> },
          };
          const config = statusConfig[record.status as keyof typeof statusConfig];
          
          return (
            <Tooltip title={`${record.status === 'online' ? 'Online' : record.status === 'warning' ? 'Warning' : 'Offline'}`}>
              <div style={{ fontSize: '24px', color: config.color }}>
                {config.icon}
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 70,
        align: 'center' as const,
        render: () => (
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate('/staff/devices')}
            block
            style={{ fontSize: '11px', height: '32px' }}
          >
            View
          </Button>
        ),
      },
    ];
  }, [token, navigate, isMobile]);

  const deviceColumns = useMemo((): ColumnsType<DeviceStatus> => {
    if (!token) return [];

    return [
      {
        title: 'Device',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        width: 200,
        render: (text: string, record: DeviceStatus) => (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: '14px' }}>
              {text}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <EnvironmentOutlined style={{ marginRight: '4px' }} />
              {record.location}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        filters: [
          { text: 'Online', value: 'online' },
          { text: 'Warning', value: 'warning' },
          { text: 'Offline', value: 'offline' },
        ],
        onFilter: (value, record) => record.status === value,
        render: (status: string) => {
          const statusConfig = {
            online: { color: 'success', icon: <CheckCircleOutlined />, text: 'Online' },
            offline: { color: 'default', icon: <ClockCircleOutlined />, text: 'Offline' },
            warning: { color: 'warning', icon: <WarningOutlined />, text: 'Warning' },
          };
          const config = statusConfig[status as keyof typeof statusConfig];
          return (
            <Badge
              status={
                status === 'online' ? 'processing' : status === 'warning' ? 'warning' : 'default'
              }
            >
              <Tag icon={config.icon} color={config.color}>
                {config.text}
              </Tag>
            </Badge>
          );
        },
      },
      {
        title: 'pH Level',
        dataIndex: 'ph',
        key: 'ph',
        width: 150,
        sorter: (a, b) => a.ph - b.ph,
        render: (value: number) => {
          const isOptimal = value >= 6.5 && value <= 8.5;
          const isAcceptable = value >= 6.0 && value <= 9.0;
          const status = isOptimal ? 'optimal' : isAcceptable ? 'acceptable' : 'critical';
          
          const statusConfig = {
            optimal: { 
              icon: <CheckCircleOutlined style={{ color: token.colorSuccess }} />,
              color: token.colorSuccess,
              text: 'Optimal'
            },
            acceptable: { 
              icon: <WarningOutlined style={{ color: token.colorWarning }} />,
              color: token.colorWarning,
              text: 'Acceptable'
            },
            critical: { 
              icon: <CloseCircleOutlined style={{ color: token.colorError }} />,
              color: token.colorError,
              text: 'Critical'
            },
          };
          
          const config = statusConfig[status];
          
          return (
            <Tooltip title={`pH ${config.text} (${isOptimal ? '6.5-8.5' : isAcceptable ? '6.0-9.0' : 'Out of range'})`}>
              <Space direction="vertical" size={2}>
                <Space align="center" size={8}>
                  <ExperimentOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
                  <Text strong style={{ fontSize: '16px', color: config.color }}>
                    {value > 0 ? value.toFixed(2) : '-'}
                  </Text>
                </Space>
                <Space align="center" size={4}>
                  {config.icon}
                  <Tag color={status === 'optimal' ? 'success' : status === 'acceptable' ? 'warning' : 'error'} style={{ margin: 0, fontSize: '11px' }}>
                    {config.text}
                  </Tag>
                </Space>
              </Space>
            </Tooltip>
          );
        },
      },
      {
        title: 'TDS (ppm)',
        dataIndex: 'tds',
        key: 'tds',
        width: 150,
        sorter: (a, b) => a.tds - b.tds,
        render: (value: number) => {
          const isExcellent = value <= 300;
          const isGood = value <= 500;
          const isFair = value <= 1000;
          const status = isExcellent ? 'excellent' : isGood ? 'good' : isFair ? 'fair' : 'poor';
          
          const statusConfig = {
            excellent: { 
              icon: <CheckCircleOutlined style={{ color: token.colorSuccess }} />,
              color: token.colorSuccess,
              text: 'Excellent'
            },
            good: { 
              icon: <CheckCircleOutlined style={{ color: token.colorSuccess }} />,
              color: token.colorSuccess,
              text: 'Good'
            },
            fair: { 
              icon: <WarningOutlined style={{ color: token.colorWarning }} />,
              color: token.colorWarning,
              text: 'Fair'
            },
            poor: { 
              icon: <CloseCircleOutlined style={{ color: token.colorError }} />,
              color: token.colorError,
              text: 'Poor'
            },
          };
          
          const config = statusConfig[status];
          
          return (
            <Tooltip title={`TDS ${config.text} (${isExcellent ? '≤300' : isGood ? '≤500' : isFair ? '≤1000' : '>1000'} ppm)`}>
              <Space direction="vertical" size={2}>
                <Space align="center" size={8}>
                  <DashboardOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
                  <Text strong style={{ fontSize: '16px', color: config.color }}>
                    {value > 0 ? value.toFixed(0) : '-'}
                  </Text>
                </Space>
                <Space align="center" size={4}>
                  {config.icon}
                  <Tag color={status === 'excellent' || status === 'good' ? 'success' : status === 'fair' ? 'warning' : 'error'} style={{ margin: 0, fontSize: '11px' }}>
                    {config.text}
                  </Tag>
                </Space>
              </Space>
            </Tooltip>
          );
        },
      },
      {
        title: 'Turbidity (NTU)',
        dataIndex: 'turbidity',
        key: 'turbidity',
        width: 170,
        sorter: (a, b) => a.turbidity - b.turbidity,
        render: (value: number) => {
          const isExcellent = value <= 1;
          const isGood = value <= 5;
          const status = isExcellent ? 'excellent' : isGood ? 'good' : 'poor';
          
          const statusConfig = {
            excellent: { 
              icon: <CheckCircleOutlined style={{ color: token.colorSuccess }} />,
              color: token.colorSuccess,
              text: 'Excellent'
            },
            good: { 
              icon: <WarningOutlined style={{ color: token.colorWarning }} />,
              color: token.colorWarning,
              text: 'Good'
            },
            poor: { 
              icon: <CloseCircleOutlined style={{ color: token.colorError }} />,
              color: token.colorError,
              text: 'Poor'
            },
          };
          
          const config = statusConfig[status];
          
          return (
            <Tooltip title={`Turbidity ${config.text} (${isExcellent ? '≤1' : isGood ? '≤5' : '>5'} NTU)`}>
              <Space direction="vertical" size={2}>
                <Space align="center" size={8}>
                  <EyeOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
                  <Text strong style={{ fontSize: '16px', color: config.color }}>
                    {value > 0 ? value.toFixed(2) : '-'}
                  </Text>
                </Space>
                <Space align="center" size={4}>
                  {config.icon}
                  <Tag color={status === 'excellent' ? 'success' : status === 'good' ? 'warning' : 'error'} style={{ margin: 0, fontSize: '11px' }}>
                    {config.text}
                  </Tag>
                </Space>
              </Space>
            </Tooltip>
          );
        },
      },
      {
        title: 'Last Update',
        dataIndex: 'lastUpdate',
        key: 'lastUpdate',
        width: 180,
        render: (text: string) => (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {text}
          </Text>
        ),
      },
      {
        title: 'Action',
        key: 'action',
        width: 120,
        render: (_: unknown, record: DeviceStatus) => (
          <Button
            type="link"
            icon={<EnvironmentOutlined />}
            onClick={() => navigate(`/staff/devices/${record.id}/readings`)}
          >
            View
          </Button>
        ),
      },
    ];
  }, [token, navigate]);

  return (
    <Card
      title={
        <Space>
          <LineChartOutlined style={{ color: token.colorPrimary }} />
          <Text strong>Device Status & Readings</Text>
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            onClick={() => navigate('/staff/devices')}
            icon={<ApiOutlined />}
          >
            View All Devices
          </Button>
        </Space>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table
        columns={isMobile ? mobileColumns : deviceColumns}
        dataSource={devices}
        rowKey="id"
        size={isMobile ? 'small' : 'middle'}
        bordered={!isMobile}
        scroll={isMobile ? undefined : { x: 1200 }}
        pagination={{
          pageSize: isMobile ? 5 : 5,
          size: 'small',
          showSizeChanger: false,
          simple: isMobile,
        }}
      />
    </Card>
  );
}
