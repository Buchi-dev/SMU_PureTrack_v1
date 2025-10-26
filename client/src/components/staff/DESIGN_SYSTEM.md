# Staff Pages Design System

## Overview
Consistent design pattern for all Staff pages in the Water Quality Monitoring System.

## Design Principles
- **Consistency**: Same layout structure across all pages
- **Hierarchy**: Clear visual hierarchy with primary and secondary content
- **Responsiveness**: Mobile-first responsive design
- **Accessibility**: Proper color contrast and semantic HTML
- **Performance**: Minimal components, maximum reusability

## Layout Structure

### 1. Page Layout
```
┌─────────────────────────────────────┐
│         StaffLayout Wrapper         │
├─────────────────────────────────────┤
│      PageHeader (Title, Actions)    │
├─────────────────────────────────────┤
│         PageContainer               │
│  ┌────────────────────────────────┐ │
│  │   Stats Cards Row (4-6 cards)  │ │
│  ├────────────────────────────────┤ │
│  │   Main Content (Tables/Charts) │ │
│  ├────────────────────────────────┤ │
│  │   Additional Insights          │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. Responsive Grid System
- **Desktop (xl)**: 4 columns for cards, 16/8 split for main content
- **Tablet (lg)**: 3 columns for cards, full width
- **Mobile (sm)**: 2 columns for cards, full width
- **Small Mobile (xs)**: 1 column, full width

## Components

### PageHeader
**Purpose**: Display page title, subtitle, actions, and refresh button
**Props**:
- `title` (string) - Page title
- `subtitle` (string) - Page subtitle
- `icon` (ReactNode) - Icon before title
- `actions` (object[]) - Action buttons
- `badge` (number) - Notification badge
- `loading` (boolean) - Loading state
- `onRefresh` (function) - Refresh handler

**Usage**:
```tsx
<PageHeader
  title="Dashboard"
  subtitle="Monitor your system"
  icon={<DashboardOutlined />}
  badge={recentAlerts.length}
  loading={loading}
  onRefresh={handleRefresh}
  actions={[
    { label: 'Export', icon: <DownloadOutlined />, onClick: handleExport }
  ]}
/>
```

### StatsCard
**Purpose**: Display key metrics in card format
**Props**:
- `title` (string) - Metric title
- `value` (string/number) - Metric value
- `icon` (ReactNode) - Icon for metric
- `color` (string) - Primary color
- `progress` (number) - Progress bar percentage
- `description` (string) - Additional text
- `trend` ('up'|'down'|'neutral') - Trend indicator
- `trendValue` (number) - Trend percentage

**Usage**:
```tsx
<StatsCard
  title="Online Devices"
  value={deviceStats.online}
  icon={<CheckCircleOutlined />}
  color={token.colorSuccess}
  progress={85}
  description="Currently active"
  trend="up"
  trendValue={5}
/>
```

### PageContainer
**Purpose**: Wrapper for page content with consistent spacing
**Props**:
- `children` (ReactNode) - Page content
- `loading` (boolean) - Loading state
- `isEmpty` (boolean) - Empty state
- `maxWidth` (string/number) - Max container width
- `spacing` ('large'|'middle'|'small') - Content spacing
- `direction` ('vertical'|'horizontal') - Layout direction

**Usage**:
```tsx
<PageContainer loading={loading} spacing="large">
  <Row gutter={[16, 16]}>
    {/* Stats Cards */}
  </Row>
  <DataCard title="Readings">
    {/* Content */}
  </DataCard>
</PageContainer>
```

### DataCard
**Purpose**: Display organized data sections
**Props**:
- `title` (string) - Card title
- `icon` (ReactNode) - Card icon
- `children` (ReactNode) - Card content
- `actionLabel` (string) - Action button label
- `onAction` (function) - Action button handler
- `size` ('large'|'medium'|'small') - Card size

**Usage**:
```tsx
<DataCard
  title="Recent Readings"
  icon={<LineChartOutlined />}
  actionLabel="View All"
  onAction={() => navigate('/staff/readings')}
>
  <Table {...tableProps} />
</DataCard>
```

## Color Scheme

### Status Colors
- **Success**: `token.colorSuccess` (#52c41a) - Online, Normal
- **Warning**: `token.colorWarning` (#faad14) - Warning, Caution
- **Error**: `token.colorError` (#ff4d4f) - Offline, Critical
- **Info**: `token.colorInfo` (#1890ff) - Neutral, Information
- **Primary**: `token.colorPrimary` (#001f3f) - Navy Blue

### Usage Guidelines
- **Online Devices**: `colorSuccess` - Green
- **Warning/Caution**: `colorWarning` - Orange/Yellow
- **Offline/Critical**: `colorError` - Red
- **Info/Neutral**: `colorInfo` - Blue

## Spacing Guidelines

### Vertical Spacing
- **Large**: 24px - Between major sections
- **Middle**: 16px - Between cards/components
- **Small**: 8px - Within components

### Horizontal Spacing
- **Gutter**: [16, 16] - Between grid columns
- **Inner Padding**: 16-24px - Inside cards

## Typography

### Headings
- **Page Title**: `<Title level={2}>` (24px, bold)
- **Section Title**: `<Title level={3}>` (20px, bold)
- **Card Title**: Text with icon (16px, bold)

### Text
- **Primary**: `<Text>` - Regular content (14px)
- **Secondary**: `<Text type="secondary">` - Meta info (12px)
- **Tertiary**: `<Text type="secondary" style={{ fontSize: '11px' }}>` - Small labels (11px)

## Icons

### Page Icons
- Dashboard: `<DashboardOutlined />`
- Devices: `<ApiOutlined />`
- Analytics: `<BarChartOutlined />`
- Readings: `<LineChartOutlined />`

### Status Icons
- Online: `<CheckCircleOutlined />` + `colorSuccess`
- Offline: `<ClockCircleOutlined />` + `colorTextSecondary`
- Warning: `<WarningOutlined />` + `colorWarning`
- Alert: `<AlertOutlined />` + `colorError`

### Action Icons
- View: `<EyeOutlined />`
- Refresh: `<ReloadOutlined />`
- Export: `<DownloadOutlined />`
- Settings: `<SettingOutlined />`

## Page Structure Examples

### Dashboard Page
1. PageHeader with title and refresh
2. 4 StatsCards (Total, Online, Warnings, Offline)
3. Alert Banner (if alerts exist)
4. RealtimeAlertMonitor
5. 2-column layout:
   - Left: Recent Alerts + Device Status Table
   - Right: Quick Actions + System Health

### Analytics Page
1. PageHeader with title
2. 3 StatsCards (Avg pH, Avg Turbidity, Avg TDS)
3. Line Charts (pH & Turbidity trends)
4. Bar Chart (Device comparison)
5. 2-column info cards

### Devices Page
1. PageHeader with title
2. Stats Cards (Total, Online, Offline, Warnings)
3. Filters Row (Search, Status, Location)
4. Devices Table with actions

### Readings Page
1. PageHeader with title and badge
2. Filters Row (Device, Status, Date Range)
3. Readings Table with status indicators
4. Export option

## Implementation Checklist

- [ ] Use PageHeader for every page
- [ ] Use StatsCard for all metrics (4-6 cards)
- [ ] Wrap content in PageContainer
- [ ] Use DataCard for organized sections
- [ ] Apply consistent spacing (16px gutter)
- [ ] Use theme tokens for colors
- [ ] Add icons to all titles
- [ ] Implement responsive design
- [ ] Use Ant Design components (Table, Card, Badge, etc.)
- [ ] Add loading states
- [ ] Handle empty states
- [ ] Include refresh buttons on data pages
