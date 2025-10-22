import { AdminLayout } from '../../components/layouts/AdminLayout';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Progress,
  Table,
  Tag,
} from 'antd';
import {
  UserOutlined,
  ApiOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../theme';

const { Title, Text } = Typography;

// Sample data for the devices table
const devicesData = [
  {
    key: '1',
    deviceId: 'DEV-001',
    name: 'Temperature Sensor',
    status: 'online',
    location: 'Room A',
    lastUpdate: '2 mins ago',
  },
  {
    key: '2',
    deviceId: 'DEV-002',
    name: 'Humidity Sensor',
    status: 'online',
    location: 'Room B',
    lastUpdate: '5 mins ago',
  },
  {
    key: '3',
    deviceId: 'DEV-003',
    name: 'Motion Detector',
    status: 'offline',
    location: 'Hallway',
    lastUpdate: '1 hour ago',
  },
  {
    key: '4',
    deviceId: 'DEV-004',
    name: 'Light Controller',
    status: 'online',
    location: 'Room C',
    lastUpdate: 'Just now',
  },
];

const columns = [
  {
    title: 'Device ID',
    dataIndex: 'deviceId',
    key: 'deviceId',
  },
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => (
      <Tag
        icon={status === 'online' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        color={status === 'online' ? 'success' : 'error'}
      >
        {status.toUpperCase()}
      </Tag>
    ),
  },
  {
    title: 'Location',
    dataIndex: 'location',
    key: 'location',
  },
  {
    title: 'Last Update',
    dataIndex: 'lastUpdate',
    key: 'lastUpdate',
  },
];

const AdminDashboard = () => {
  const token = useThemeToken();
  
  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Page Title */}
        <div>
          <Title level={2}>Dashboard</Title>
          <Text type="secondary">Welcome back! Here's what's happening today.</Text>
        </div>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="Total Devices"
                value={24}
                prefix={<ApiOutlined />}
                suffix={
                  <span style={{ fontSize: '14px' }}>
                    <ArrowUpOutlined style={{ color: token.colorSuccess }} /> 12%
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="Active Users"
                value={156}
                prefix={<UserOutlined />}
                suffix={
                  <span style={{ fontSize: '14px' }}>
                    <ArrowUpOutlined style={{ color: token.colorSuccess }} /> 8%
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="Online Devices"
                value={21}
                valueStyle={{ color: token.colorSuccess }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="Offline Devices"
                value={3}
                valueStyle={{ color: token.colorError }}
                prefix={<CloseCircleOutlined />}
                suffix={
                  <span style={{ fontSize: '14px' }}>
                    <ArrowDownOutlined style={{ color: token.colorError }} /> 2
                  </span>
                }
              />
            </Card>
          </Col>
        </Row>

        {/* System Health */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="System Health" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text>CPU Usage</Text>
                  <Progress percent={45} status="active" />
                </div>
                <div>
                  <Text>Memory Usage</Text>
                  <Progress percent={68} status="active" />
                </div>
                <div>
                  <Text>Storage</Text>
                  <Progress percent={35} />
                </div>
                <div>
                  <Text>Network</Text>
                  <Progress percent={90} status="active" strokeColor={token.colorSuccess} />
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Quick Stats" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Data Points Today"
                      value={1893}
                      valueStyle={{ color: '#001f3f' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Alerts"
                      value={7}
                      valueStyle={{ color: token.colorWarning }}
                    />
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Avg Response Time"
                      value={127}
                      suffix="ms"
                      valueStyle={{ color: token.colorSuccess }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Success Rate"
                      value={99.8}
                      suffix="%"
                      valueStyle={{ color: token.colorSuccess }}
                    />
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Devices Table */}
        <Card title="Recent Devices" bordered={false}>
          <Table
            columns={columns}
            dataSource={devicesData}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 800 }}
          />
        </Card>
      </Space>
    </AdminLayout>
  );
};

export default AdminDashboard;
