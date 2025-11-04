import { useState } from 'react';
import { Row, Col, Typography, Alert } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import type { ReportType } from '../../../schemas';
import { useThemeToken } from '../../../theme';
import { Form } from 'antd';

// Components
import {
  ReportTypeSelection,
  getReportTypes,
  ReportConfigForm,
  ReportHistorySidebar,
} from './components';

// Hooks
import {
  useDevices,
  useReportHistory,
  useReportGeneration,
} from './hooks';

const { Title, Text } = Typography;

export const AdminReports = () => {
  const token = useThemeToken();
  const [selectedType, setSelectedType] = useState<ReportType>('water_quality');
  const [form] = Form.useForm();

  // Custom hooks
  const { devices, loading } = useDevices();
  const { reportHistory, addReportToHistory } = useReportHistory();
  const { generating, handleGenerateReport } = useReportGeneration(devices, addReportToHistory);

  const reportTypes = getReportTypes(token);

  const onFinish = (values: any) => {
    handleGenerateReport(selectedType, values);
  };

  return (
    <AdminLayout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2}>
              <FileTextOutlined /> Report Management
            </Title>
            <Text type="secondary">
              Generate professional PDF reports for water quality analysis and device monitoring
            </Text>
          </Col>
        </Row>

        {/* Report Type Selection */}
        <ReportTypeSelection
          selectedType={selectedType}
          onSelectType={setSelectedType}
          reportTypes={reportTypes}
        />

        {/* Report Configuration */}
        <Row gutter={16}>
          <Col xs={24} lg={16}>
            <ReportConfigForm
              form={form}
              devices={devices}
              loading={loading}
              generating={generating}
              onFinish={onFinish}
            />
          </Col>

          {/* Report Preview & History */}
          <Col xs={24} lg={8}>
            <ReportHistorySidebar
              reportHistory={reportHistory}
              token={token}
            />
            
            {/* Help Card */}
            <Alert
              style={{ marginTop: 16 }}
              message="Report Generation Tips"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Select relevant devices for focused reports</li>
                  <li>Use date ranges for specific time periods</li>
                  <li>Include statistics for executive summaries</li>
                  <li>Add notes for context and observations</li>
                </ul>
              }
              type="info"
              showIcon
            />
          </Col>
        </Row>
      </div>
    </AdminLayout>
  );
};
