import { Card, Space, Input, Select, Button, Typography, Tag, Divider, Row, Col } from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  FilterOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { AlertFiltersExtended } from '../../../../schemas';

const { Text } = Typography;

interface AlertFiltersProps {
  filters: AlertFiltersExtended;
  onFiltersChange: (filters: AlertFiltersExtended) => void;
  onClearFilters: () => void;
  totalAlerts: number;
  filteredCount: number;
}

/**
 * Alert Filters Component
 * Provides advanced filter controls with quick presets
 */
export const AlertFilters: React.FC<AlertFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  totalAlerts,
  filteredCount,
}) => {
  const hasActiveFilters = !!(
    filters.searchTerm ||
    filters.severity?.length ||
    filters.status?.length ||
    filters.parameter?.length
  );

  // Quick filter presets for common admin tasks
  const applyQuickFilter = (preset: string) => {
    switch (preset) {
      case 'critical-active':
        onFiltersChange({ severity: ['Critical'], status: ['Active'] });
        break;
      case 'needs-attention':
        onFiltersChange({ status: ['Active', 'Acknowledged'] });
        break;
      case 'today-resolved':
        onFiltersChange({ status: ['Resolved'] });
        break;
      default:
        break;
    }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Main Filter Row */}
        <Row gutter={[8, 8]} align="middle" wrap>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="Search alerts..."
              prefix={<SearchOutlined />}
              value={filters.searchTerm}
              onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
              allowClear
            />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Select
              mode="multiple"
              placeholder="Severity"
              style={{ width: '100%' }}
              value={filters.severity}
              onChange={(value) => onFiltersChange({ ...filters, severity: value })}
              options={[
                { 
                  label: (
                    <Space size={4}>
                      <ExclamationCircleOutlined />
                      <span>Critical</span>
                    </Space>
                  ), 
                  value: 'Critical' 
                },
                { 
                  label: (
                    <Space size={4}>
                      <WarningOutlined />
                      <span>Warning</span>
                    </Space>
                  ), 
                  value: 'Warning' 
                },
                { 
                  label: (
                    <Space size={4}>
                      <InfoCircleOutlined />
                      <span>Advisory</span>
                    </Space>
                  ), 
                  value: 'Advisory' 
                },
              ]}
              maxTagCount="responsive"
            />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Select
              mode="multiple"
              placeholder="Status"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => onFiltersChange({ ...filters, status: value })}
              options={[
                { 
                  label: (
                    <Space size={4}>
                      <ExclamationCircleOutlined />
                      <span>Active</span>
                    </Space>
                  ), 
                  value: 'Active' 
                },
                { 
                  label: (
                    <Space size={4}>
                      <WarningOutlined />
                      <span>Acknowledged</span>
                    </Space>
                  ), 
                  value: 'Acknowledged' 
                },
                { 
                  label: (
                    <Space size={4}>
                      <CheckCircleOutlined />
                      <span>Resolved</span>
                    </Space>
                  ), 
                  value: 'Resolved' 
                },
              ]}
              maxTagCount="responsive"
            />
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Select
              mode="multiple"
              placeholder="Parameter"
              style={{ width: '100%' }}
              value={filters.parameter}
              onChange={(value) => onFiltersChange({ ...filters, parameter: value })}
              options={[
                { label: 'TDS', value: 'tds' },
                { label: 'pH', value: 'ph' },
                { label: 'Turbidity', value: 'turbidity' },
              ]}
              maxTagCount="responsive"
            />
          </Col>
          <Col xs={12} sm={8} md={6} lg={6}>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
              >
                Clear
              </Button>
              <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
                {filteredCount} of {totalAlerts}
              </Text>
            </Space>
          </Col>
        </Row>

        {/* Quick Filter Presets */}
        <div>
          <Space size={4}>
            <FilterOutlined style={{ fontSize: 12, color: '#999' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>Quick Filters:</Text>
          </Space>
          <Space wrap style={{ marginTop: 8 }}>
            <Button 
              size="small" 
              onClick={() => applyQuickFilter('critical-active')}
              icon={<CheckCircleOutlined />}
            >
              Critical & Active
            </Button>
            <Button 
              size="small" 
              onClick={() => applyQuickFilter('needs-attention')}
            >
              Needs Attention
            </Button>
            <Button 
              size="small" 
              onClick={() => applyQuickFilter('today-resolved')}
            >
              Recently Resolved
            </Button>
          </Space>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div>
              <Space size={4} wrap>
                <Text type="secondary" style={{ fontSize: 12 }}>Active Filters:</Text>
                {filters.severity?.map((s) => (
                  <Tag
                    key={s}
                    closable
                    onClose={() =>
                      onFiltersChange({
                        ...filters,
                        severity: filters.severity?.filter((v) => v !== s),
                      })
                    }
                    color="blue"
                  >
                    {s}
                  </Tag>
                ))}
                {filters.status?.map((s) => (
                  <Tag
                    key={s}
                    closable
                    onClose={() =>
                      onFiltersChange({
                        ...filters,
                        status: filters.status?.filter((v) => v !== s),
                      })
                    }
                    color="orange"
                  >
                    {s}
                  </Tag>
                ))}
                {filters.parameter?.map((p) => (
                  <Tag
                    key={p}
                    closable
                    onClose={() =>
                      onFiltersChange({
                        ...filters,
                        parameter: filters.parameter?.filter((v) => v !== p),
                      })
                    }
                    color="green"
                  >
                    {p.toUpperCase()}
                  </Tag>
                ))}
                {filters.searchTerm && (
                  <Tag
                    closable
                    onClose={() => onFiltersChange({ ...filters, searchTerm: '' })}
                    color="purple"
                  >
                    Search: "{filters.searchTerm}"
                  </Tag>
                )}
              </Space>
            </div>
          </>
        )}
      </Space>
    </Card>
  );
};
