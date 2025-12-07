/**
 * Compact Report History Statistics Component
 * Mobile-optimized 3x2 grid layout for report history statistics
 */

import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import {
  FileTextOutlined,
  CalendarOutlined,
  DownloadOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import { useResponsive } from '../../../../hooks';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ReportHistoryItem {
  id: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  file?: {
    size: number;
  };
}

interface CompactReportHistoryStatsProps {
  reports: ReportHistoryItem[];
  totalReports: number;
}

interface MetricCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  isMobile: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, value, label, color, isMobile }) => {
  return (
    <Card
      bordered={false}
      style={{
        textAlign: 'center',
        height: '100%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)',
      }}
      bodyStyle={{
        padding: isMobile ? '12px 8px' : '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ color, fontSize: isMobile ? '32px' : '36px', marginBottom: isMobile ? '4px' : '8px' }}>
        {icon}
      </div>
      <Text strong style={{ fontSize: isMobile ? '24px' : '28px', display: 'block', lineHeight: 1.2 }}>
        {value}
      </Text>
      <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '13px', marginTop: '4px' }}>
        {label}
      </Text>
    </Card>
  );
};

// Helper function to convert Firebase Timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }
  
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  return new Date();
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const CompactReportHistoryStats: React.FC<CompactReportHistoryStatsProps> = ({ 
  reports, 
  totalReports 
}) => {
  const token = useThemeToken();
  const { isMobile } = useResponsive();
  
  const thisMonthReports = reports.filter(r => {
    const date = timestampToDate(r.createdAt);
    return dayjs(date).isAfter(dayjs().startOf('month'));
  }).length;
  
  const thisWeekReports = reports.filter(r => {
    const date = timestampToDate(r.createdAt);
    return dayjs(date).isAfter(dayjs().startOf('week'));
  }).length;
  
  const totalStorage = reports.reduce((sum, r) => sum + (r.file?.size || 0), 0);
  const storageFormatted = formatFileSize(totalStorage);
  
  const metrics = [
    {
      key: 'total',
      icon: <FileTextOutlined />,
      label: 'Total Reports',
      value: totalReports,
      color: token.colorPrimary,
    },
    {
      key: 'thisMonth',
      icon: <CalendarOutlined />,
      label: 'This Month',
      value: thisMonthReports,
      color: token.colorSuccess,
    },
    {
      key: 'thisWeek',
      icon: <ClockCircleOutlined />,
      label: 'This Week',
      value: thisWeekReports,
      color: token.colorWarning,
    },
    {
      key: 'storage',
      icon: <DatabaseOutlined />,
      label: 'Storage',
      value: storageFormatted,
      color: token.colorInfo,
    },
    {
      key: 'available',
      icon: <CheckCircleOutlined />,
      label: 'Available',
      value: totalReports,
      color: '#52c41a',
    },
    {
      key: 'downloads',
      icon: <DownloadOutlined />,
      label: 'Downloads',
      value: 'N/A',
      color: '#722ed1',
    },
  ];

  return (
    <Row gutter={isMobile ? [8, 8] : [12, 12]}>
      {metrics.map((metric) => (
        <Col key={metric.key} xs={8} sm={8} md={8} lg={4} xl={4}>
          <MetricCard
            icon={metric.icon}
            value={metric.value}
            label={metric.label}
            color={metric.color}
            isMobile={isMobile}
          />
        </Col>
      ))}
    </Row>
  );
};

export default CompactReportHistoryStats;
