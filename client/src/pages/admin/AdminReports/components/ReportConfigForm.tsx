import { Form, Input, Select, DatePicker, Checkbox, Button, Space, Card } from 'antd';
import { DownloadOutlined, PrinterOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { Device } from '../../../../schemas';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface ReportConfigFormProps {
  form: FormInstance;
  devices: Device[];
  loading: boolean;
  generating: boolean;
  onFinish: (values: any) => void;
}

export const ReportConfigForm = ({
  form,
  devices,
  loading,
  generating,
  onFinish,
}: ReportConfigFormProps) => {
  return (
    <Card
      title={
        <Space>
          <FilePdfOutlined />
          <span>Report Configuration</span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          includeStatistics: true,
          includeRawData: true,
          includeCharts: false,
        }}
      >
        <Form.Item
          label="Report Title"
          name="title"
          rules={[{ required: true, message: 'Please enter report title' }]}
        >
          <Input placeholder="e.g., Monthly Water Quality Report" />
        </Form.Item>

        <Form.Item
          label="Select Devices"
          name="devices"
          rules={[{ required: true, message: 'Please select at least one device' }]}
        >
          <Select
            mode="multiple"
            placeholder="Select devices to include"
            loading={loading}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={devices.map(device => ({
              value: device.deviceId,
              label: `${device.name} (${device.deviceId})`,
            }))}
          />
        </Form.Item>

        <Form.Item label="Date Range" name="dateRange">
          <RangePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
            presets={[
              { label: 'Last 7 Days', value: [dayjs().subtract(7, 'd'), dayjs()] },
              { label: 'Last 30 Days', value: [dayjs().subtract(30, 'd'), dayjs()] },
              { label: 'Last 90 Days', value: [dayjs().subtract(90, 'd'), dayjs()] },
              { label: 'This Year', value: [dayjs().startOf('year'), dayjs()] },
            ]}
          />
        </Form.Item>

        <Form.Item label="Report Options">
          <Space direction="vertical">
            <Form.Item name="includeStatistics" valuePropName="checked" noStyle>
              <Checkbox>Include Statistical Summary</Checkbox>
            </Form.Item>
            <Form.Item name="includeRawData" valuePropName="checked" noStyle>
              <Checkbox>Include Detailed Data Tables</Checkbox>
            </Form.Item>
            <Form.Item name="includeCharts" valuePropName="checked" noStyle>
              <Checkbox disabled>Include Charts & Graphs (Coming Soon)</Checkbox>
            </Form.Item>
          </Space>
        </Form.Item>

        <Form.Item label="Additional Notes" name="notes">
          <TextArea
            rows={4}
            placeholder="Add any additional notes or observations to include in the report..."
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<DownloadOutlined />}
              loading={generating}
              size="large"
            >
              Generate PDF Report
            </Button>
            <Button icon={<PrinterOutlined />} disabled>
              Print Preview
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};
