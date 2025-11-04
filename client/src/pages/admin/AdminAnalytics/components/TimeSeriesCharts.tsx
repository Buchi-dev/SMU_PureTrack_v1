import { Row, Col, Card } from 'antd';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useThemeToken } from '../../../../theme';

interface TimeSeriesDataPoint {
  time: string;
  pH: number;
  TDS: number;
  Turbidity: number;
}

interface ParameterComparisonPoint {
  parameter: string;
  Average: number;
  Maximum: number;
  Minimum: number;
}

interface ParameterDistributionPoint {
  name: string;
  value: number;
  max: number;
}

interface TimeSeriesChartsProps {
  timeSeriesData: TimeSeriesDataPoint[];
  parameterComparisonData: ParameterComparisonPoint[];
  parameterDistribution: ParameterDistributionPoint[];
}

export const TimeSeriesCharts = ({ 
  timeSeriesData, 
  parameterComparisonData,
  parameterDistribution 
}: TimeSeriesChartsProps) => {
  const token = useThemeToken();

  return (
    <>
      {/* pH and TDS Trends */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="pH Level Trend (Last 24 Hours)">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[6, 14]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="pH" 
                  stroke={token.colorSuccess} 
                  strokeWidth={2}
                  dot={{ fill: token.colorSuccess }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="TDS Trend (Last 24 Hours)">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="TDS" 
                  stroke={token.colorInfo} 
                  fill={token.colorInfo}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Turbidity Trend and Parameter Comparison */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Turbidity Trend (Last 24 Hours)">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="Turbidity" 
                  stroke={token.colorWarning} 
                  fill={token.colorWarning}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Parameter Comparison (Min/Avg/Max)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={parameterComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="parameter" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Minimum" fill="#8884d8" />
                <Bar dataKey="Average" fill="#82ca9d" />
                <Bar dataKey="Maximum" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Radar Chart */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Water Quality Parameters Overview">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={parameterDistribution}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis />
                <Radar 
                  name="Current Values" 
                  dataKey="value" 
                  stroke={token.colorPrimary} 
                  fill={token.colorPrimary} 
                  fillOpacity={0.6} 
                />
                <Radar 
                  name="Maximum Range" 
                  dataKey="max" 
                  stroke={token.colorError} 
                  fill={token.colorError} 
                  fillOpacity={0.2} 
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </>
  );
};
