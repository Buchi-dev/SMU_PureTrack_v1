import { Card, Row, Col, Space, Typography, Tag } from 'antd';
import {
  ExperimentOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ReportType } from '../../../../schemas';

const { Text } = Typography;

export interface ReportTypeOption {
  key: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface ReportTypeSelectionProps {
  selectedType: ReportType;
  onSelectType: (type: ReportType) => void;
  reportTypes: ReportTypeOption[];
}

export const ReportTypeSelection = ({
  selectedType,
  onSelectType,
  reportTypes,
}: ReportTypeSelectionProps) => {
  return (
    <Card title="Select Report Type" style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        {reportTypes.map(type => (
          <Col xs={24} sm={12} lg={6} key={type.key}>
            <Card
              hoverable
              onClick={() => onSelectType(type.key)}
              style={{
                borderColor: selectedType === type.key ? type.color : undefined,
                borderWidth: selectedType === type.key ? 2 : 1,
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }} align="center">
                <div style={{ fontSize: 32, color: type.color }}>
                  {type.icon}
                </div>
                <Text strong>{type.title}</Text>
                <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                  {type.description}
                </Text>
                {selectedType === type.key && (
                  <Tag color={type.color}>Selected</Tag>
                )}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export const getReportTypes = (token: any): ReportTypeOption[] => [
  {
    key: 'water_quality',
    title: 'Water Quality Report',
    description: 'Comprehensive analysis of water quality parameters including turbidity, TDS, and pH levels',
    icon: <ExperimentOutlined />,
    color: token.colorInfo,
  },
  {
    key: 'device_status',
    title: 'Device Status Report',
    description: 'Overview of all device statuses, connectivity, and operational health',
    icon: <DatabaseOutlined />,
    color: token.colorSuccess,
  },
  {
    key: 'data_summary',
    title: 'Data Summary Report',
    description: 'Statistical summary of sensor data over selected time period',
    icon: <BarChartOutlined />,
    color: token.colorPrimary,
  },
  {
    key: 'compliance',
    title: 'Compliance Report',
    description: 'Regulatory compliance assessment and quality standards verification',
    icon: <CheckCircleOutlined />,
    color: token.colorWarning,
  },
];
