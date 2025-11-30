/**
 * Historical Trends Component
 * 
 * Displays multi-day/week historical trend charts for water quality parameters.
 * Includes date range selector and aggregation controls.
 */
import { Card, Row, Col, Segmented, DatePicker, Spin, Empty, Typography } from 'antd';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { memo, useState } from 'react';
import { useThemeToken } from '../../../../theme';
import type { AggregatedMetrics } from '../../../../schemas/analytics.schema';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

interface HistoricalTrendsProps {
  aggregatedMetrics: AggregatedMetrics[];
  loading?: boolean;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
}

export const HistoricalTrends = memo<HistoricalTrendsProps>(({ 
  aggregatedMetrics, 
  loading = false,
  onDateRangeChange 
}) => {
  const token = useThemeToken();
  const [selectedParameter, setSelectedParameter] = useState<'ph' | 'tds' | 'turbidity'>('ph');

  const handleDateChange = (dates: null | [Dayjs | null, Dayjs | null]) => {
    if (dates && dates[0] && dates[1] && onDateRangeChange) {
      onDateRangeChange(dates[0].toDate(), dates[1].toDate());
    }
  };

  // Format data for charts
  const chartData = aggregatedMetrics.map(metric => ({
    period: metric.period,
    avgPh: parseFloat(metric.avgPh.toFixed(2)),
    minPh: parseFloat(metric.minPh.toFixed(2)),
    maxPh: parseFloat(metric.maxPh.toFixed(2)),
    avgTds: parseFloat(metric.avgTds.toFixed(2)),
    minTds: parseFloat(metric.minTds.toFixed(2)),
    maxTds: parseFloat(metric.maxTds.toFixed(2)),
    avgTurbidity: parseFloat(metric.avgTurbidity.toFixed(2)),
    minTurbidity: parseFloat(metric.minTurbidity.toFixed(2)),
    maxTurbidity: parseFloat(metric.maxTurbidity.toFixed(2)),
  }));

  // Thresholds
  const thresholds = {
    ph: { min: 6.5, max: 8.5 },
    tds: { max: 500 },
    turbidity: { max: 5 },
  };

  if (loading) {
    return (
      <Card title="Historical Trends">
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card title="Historical Trends">
        <Empty description="No historical data available" />
      </Card>
    );
  }

  return (
    <Card 
      title={<Title level={4}>Historical Water Quality Trends</Title>}
      extra={
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Segmented
            options={[
              { label: 'pH', value: 'ph' },
              { label: 'TDS', value: 'tds' },
              { label: 'Turbidity', value: 'turbidity' },
            ]}
            value={selectedParameter}
            onChange={(value) => setSelectedParameter(value as 'ph' | 'tds' | 'turbidity')}
          />
          {onDateRangeChange && (
            <RangePicker
              onChange={handleDateChange}
              format="YYYY-MM-DD"
              allowClear={false}
            />
          )}
        </div>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          {selectedParameter === 'ph' && (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                WHO Guideline: pH 6.5-8.5 (Safe Drinking Water Range)
              </Text>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis domain={[6, 9]} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={thresholds.ph.min} stroke={token.colorWarning} strokeDasharray="3 3" label="Min (6.5)" />
                  <ReferenceLine y={thresholds.ph.max} stroke={token.colorWarning} strokeDasharray="3 3" label="Max (8.5)" />
                  <Area type="monotone" dataKey="maxPh" stackId="1" stroke={token.colorError} fill={token.colorError} fillOpacity={0.3} name="Max pH" />
                  <Area type="monotone" dataKey="avgPh" stackId="2" stroke={token.colorSuccess} fill={token.colorSuccess} fillOpacity={0.6} name="Avg pH" />
                  <Area type="monotone" dataKey="minPh" stackId="3" stroke={token.colorInfo} fill={token.colorInfo} fillOpacity={0.3} name="Min pH" />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}

          {selectedParameter === 'tds' && (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                WHO Guideline: TDS ≤ 500 ppm (Acceptable for Drinking Water)
              </Text>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={thresholds.tds.max} stroke={token.colorError} strokeDasharray="3 3" label="Threshold (500 ppm)" />
                  <Line type="monotone" dataKey="maxTds" stroke={token.colorError} strokeWidth={2} dot={false} name="Max TDS" />
                  <Line type="monotone" dataKey="avgTds" stroke={token.colorInfo} strokeWidth={3} name="Avg TDS" />
                  <Line type="monotone" dataKey="minTds" stroke={token.colorSuccess} strokeWidth={2} dot={false} name="Min TDS" />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}

          {selectedParameter === 'turbidity' && (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                WHO Guideline: Turbidity ≤ 5 NTU (Clear Water Standard)
              </Text>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={thresholds.turbidity.max} stroke={token.colorError} strokeDasharray="3 3" label="Threshold (5 NTU)" />
                  <Area type="monotone" dataKey="maxTurbidity" stackId="1" stroke={token.colorError} fill={token.colorError} fillOpacity={0.4} name="Max Turbidity" />
                  <Area type="monotone" dataKey="avgTurbidity" stackId="2" stroke={token.colorWarning} fill={token.colorWarning} fillOpacity={0.6} name="Avg Turbidity" />
                  <Area type="monotone" dataKey="minTurbidity" stackId="3" stroke={token.colorSuccess} fill={token.colorSuccess} fillOpacity={0.3} name="Min Turbidity" />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </Col>
      </Row>
    </Card>
  );
});

HistoricalTrends.displayName = 'HistoricalTrends';
