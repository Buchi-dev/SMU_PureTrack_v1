# 📱 Responsive Theme Implementation Guide

## Overview

Complete guide for implementing Ant Design v5 responsive theme system with device-adaptive tokens optimized for all screen resolutions (mobile, tablet, desktop).

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Breakpoint System](#breakpoint-system)
4. [Core Concepts](#core-concepts)
5. [Implementation Examples](#implementation-examples)
6. [Mobile Optimization](#mobile-optimization)
7. [Performance Best Practices](#performance-best-practices)
8. [Migration Guide](#migration-guide)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Step 1: Wrap Your App with Responsive Theme

```typescript
// src/App.tsx
import { useResponsiveTheme } from './theme';
import { themeConfig } from './theme/themeConfig';
import { ConfigProvider } from 'antd';

function App() {
  const { responsiveTheme } = useResponsiveTheme(themeConfig);

  return (
    <ConfigProvider theme={responsiveTheme}>
      {/* Your app components */}
    </ConfigProvider>
  );
}
```

### Step 2: Use Responsive Hooks in Components

```typescript
import { useResponsiveToken, useResponsiveColSpan } from './theme';

function MyComponent() {
  const { isMobile, token } = useResponsiveToken();
  
  const colSpan = useResponsiveColSpan({
    xs: 24,  // Full width on phones
    md: 12,  // Half width on tablets
    lg: 8,   // Third width on desktop
  });

  return (
    <Card 
      style={{ 
        padding: token.padding,
        fontSize: token.fontSize 
      }}
    >
      {/* Content automatically adapts */}
    </Card>
  );
}
```

---

## 🏗️ Architecture Overview

### Design Token Flow

```
Base Theme Config (themeConfig.ts)
          ↓
Device Detection (useBreakpoint)
          ↓
Responsive Spacing Calculation
          ↓
Touch-Friendly Adjustments (if mobile)
          ↓
Final Responsive Theme
          ↓
ConfigProvider → All Components
```

### Three-Layer System

1. **Base Theme** (`themeConfig.ts`)
   - Primary colors (Navy Blue #001f3f)
   - Component defaults (32px buttons)
   - Typography settings

2. **Responsive Layer** (`responsiveTheme.ts`)
   - Device-adaptive spacing
   - Breakpoint-based token adjustments
   - Performance optimizations

3. **Touch-Friendly Layer** (mobile only)
   - 40px+ control heights
   - 16px minimum font size (iOS zoom prevention)
   - Larger tap targets

---

## 📐 Breakpoint System

### Official Ant Design Breakpoints

| Breakpoint | Min Width | Max Width | Device Type | Columns |
|------------|-----------|-----------|-------------|---------|
| **xs**     | 0px       | 479px     | Small Phone | 1-2     |
| **sm**     | 480px     | 575px     | Large Phone | 2-3     |
| **md**     | 576px     | 767px     | Tablet      | 3-4     |
| **lg**     | 768px     | 991px     | Small Desktop | 4-6   |
| **xl**     | 992px     | 1199px    | Desktop     | 6-8     |
| **xxl**    | 1200px+   | ∞         | Large Desktop | 8-12  |

### Usage

```typescript
import { BREAKPOINTS } from './theme';

// Access breakpoint values
console.log(BREAKPOINTS.md); // 768

// Responsive component
const { currentBreakpoint, isMobile } = useResponsiveTheme(themeConfig);
```

---

## 💡 Core Concepts

### 1. Device-Adaptive Spacing

Spacing automatically scales based on screen size:

```typescript
// XS (Phone): Compact spacing
padding: 12px, margin: 8px, fontSize: 13px

// MD (Tablet): Balanced spacing
padding: 16px, margin: 12px, fontSize: 14px

// XXL (Large Desktop): Generous spacing
padding: 20px, margin: 16px, fontSize: 15px
```

**Implementation:**

```typescript
const token = useResponsiveToken();

<Card style={{ 
  padding: token.token.padding,  // Auto-adapts
  margin: token.token.margin      // Auto-adapts
}}>
```

### 2. Responsive Grid System

**24-Column Responsive Grid:**

```typescript
const colSpan = useResponsiveColSpan({
  xs: 24,  // 1 column (100%)
  sm: 12,  // 2 columns (50%)
  md: 8,   // 3 columns (33.3%)
  lg: 6,   // 4 columns (25%)
  xl: 4,   // 6 columns (16.6%)
  xxl: 3,  // 8 columns (12.5%)
});

<Col span={colSpan}>
  <Card>Responsive card</Card>
</Col>
```

### 3. Responsive Gutter

Dynamic spacing between grid columns:

```typescript
const { screens } = useResponsiveTheme(themeConfig);
const gutter = getResponsiveGutter(screens);

<Row gutter={gutter}>  {/* [8,8] on xs → [32,32] on xxl */}
  <Col span={12}>...</Col>
  <Col span={12}>...</Col>
</Row>
```

### 4. Conditional Rendering by Device

```typescript
const { isMobile, isTablet, isDesktop } = useResponsiveTheme(themeConfig);

return (
  <>
    {isMobile && <MobileMenu />}
    {isTablet && <TabletMenu />}
    {isDesktop && <DesktopMenu />}
  </>
);
```

---

## 📱 Implementation Examples

### Example 1: Responsive Dashboard

```typescript
import { Row, Col, Card, Statistic } from 'antd';
import { useResponsiveToken, useResponsiveColSpan } from './theme';

export const Dashboard = () => {
  const { isMobile, token } = useResponsiveToken();
  const colSpan = useResponsiveColSpan({
    xs: 24, sm: 12, md: 12, lg: 6
  });

  return (
    <Row gutter={[16, 16]}>
      {stats.map(stat => (
        <Col key={stat.id} span={colSpan}>
          <Card>
            <Statistic
              title={stat.title}
              value={stat.value}
              valueStyle={{ 
                fontSize: isMobile ? '24px' : '32px',
                color: token.colorPrimary 
              }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};
```

### Example 2: Adaptive Layout with Sidebar

```typescript
import { Layout } from 'antd';
import { useResponsiveTheme, getResponsiveSiderProps } from './theme';

const { Sider, Content } = Layout;

export const AppLayout = ({ children }) => {
  const { isMobile } = useResponsiveTheme(themeConfig);
  const [collapsed, setCollapsed] = useState(isMobile);
  const siderProps = getResponsiveSiderProps(isMobile);

  return (
    <Layout>
      <Sider
        {...siderProps}
        collapsed={collapsed}
        onCollapse={setCollapsed}
      >
        {/* Menu */}
      </Sider>
      <Content style={{ padding: isMobile ? '16px' : '24px' }}>
        {children}
      </Content>
    </Layout>
  );
};
```

### Example 3: Responsive Data Table

```typescript
import { Table } from 'antd';
import { useResponsiveValue } from './theme';

export const DataTable = ({ data }) => {
  const pageSize = useResponsiveValue(
    { xs: 5, sm: 10, md: 20, lg: 50 },
    20
  );

  const scroll = useResponsiveValue(
    { xs: { x: 800 }, md: undefined },
    undefined
  );

  return (
    <Table
      dataSource={data}
      pagination={{ pageSize }}
      scroll={scroll}
      size={useResponsiveValue({ xs: 'small', md: 'middle' }, 'middle')}
    />
  );
};
```

### Example 4: Touch-Friendly Form

```typescript
import { Form, Input, Button } from 'antd';
import { useResponsiveToken } from './theme';

export const ContactForm = () => {
  const { isMobile, token } = useResponsiveToken();

  return (
    <Form layout={isMobile ? 'vertical' : 'horizontal'}>
      <Form.Item label="Email">
        <Input
          type="email"
          size={isMobile ? 'large' : 'middle'}
          style={{
            fontSize: isMobile ? '16px' : '14px', // Prevent iOS zoom
            height: isMobile ? '44px' : undefined, // Touch-friendly
          }}
        />
      </Form.Item>
      
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size={isMobile ? 'large' : 'middle'}
          block={isMobile}
          style={{
            height: isMobile ? '48px' : undefined,
          }}
        >
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};
```

---

## 📱 Mobile Optimization

### iOS-Specific Fixes

```typescript
// Prevent auto-zoom on input focus (iOS Safari)
<Input 
  style={{ fontSize: '16px' }}  // Must be >= 16px
/>

// Touch-friendly tap targets (iOS HIG)
<Button 
  style={{ 
    minHeight: '44px',  // Apple's recommended minimum
    minWidth: '44px' 
  }}
/>
```

### Touch-Friendly Token Overrides

```typescript
const { isMobile } = useResponsiveToken();

// Automatic mobile adjustments:
// - controlHeight: 40px (vs 32px desktop)
// - fontSize: 16px (prevents zoom)
// - padding: 12px-16px (easier tapping)
```

### Responsive Modal

```typescript
import { Modal } from 'antd';

<Modal
  width={isMobile ? '100%' : '80%'}
  style={{ 
    top: isMobile ? 0 : 20,
    maxWidth: isMobile ? '100vw' : '720px' 
  }}
  bodyStyle={{
    padding: isMobile ? '16px' : '24px'
  }}
>
  {/* Content */}
</Modal>
```

---

## ⚡ Performance Best Practices

### 1. Debounced Breakpoint Detection

```typescript
// Prevents excessive re-renders during window resize
const currentBreakpoint = useDebouncedBreakpoint(200); // 200ms delay
```

### 2. Memoized Theme Generation

```typescript
// Theme is automatically memoized and only regenerates when:
// - Base theme changes
// - Breakpoint changes
// - Device type changes
const { responsiveTheme } = useResponsiveTheme(themeConfig);
```

### 3. Conditional Component Loading

```typescript
// Lazy load heavy components by device type
const { isDesktop } = useResponsiveTheme(themeConfig);

const AdvancedChart = lazy(() => import('./AdvancedChart'));

{isDesktop && <Suspense fallback={<Spin />}><AdvancedChart /></Suspense>}
```

### 4. Optimize Media Queries

```typescript
import { mediaQueries } from './theme';

const StyledCard = styled(Card)`
  ${mediaQueries.mobile} {
    padding: 12px;
  }
  
  ${mediaQueries.desktop} {
    padding: 24px;
  }
`;
```

---

## 🔄 Migration Guide

### Step 1: Update Main App

**Before:**
```typescript
<ConfigProvider theme={themeConfig}>
  <App />
</ConfigProvider>
```

**After:**
```typescript
const { responsiveTheme } = useResponsiveTheme(themeConfig);

<ConfigProvider theme={responsiveTheme}>
  <App />
</ConfigProvider>
```

### Step 2: Replace Hardcoded Breakpoints

**Before:**
```typescript
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  const handler = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

**After:**
```typescript
const { isMobile } = useResponsiveTheme(themeConfig);
// Done! Automatic and performant
```

### Step 3: Convert Static Col Spans

**Before:**
```typescript
<Col xs={24} sm={12} md={8} lg={6}>
```

**After (Option 1 - Keep as is):**
```typescript
<Col xs={24} sm={12} md={8} lg={6}>  // Still works!
```

**After (Option 2 - Use Hook):**
```typescript
const colSpan = useResponsiveColSpan({ xs: 24, sm: 12, md: 8, lg: 6 });
<Col span={colSpan}>
```

### Step 4: Update Theme Tokens

**Before:**
```typescript
<Card style={{ padding: '24px', borderRadius: '8px' }}>
```

**After:**
```typescript
const { token } = useResponsiveToken();
<Card style={{ 
  padding: token.padding,           // Auto-adapts to screen
  borderRadius: token.borderRadiusLG 
}}>
```

---

## 🐛 Troubleshooting

### Issue 1: Theme Not Updating on Resize

**Problem:** Components not re-rendering when breakpoint changes.

**Solution:**
```typescript
// Ensure useResponsiveTheme is called at top level
const App = () => {
  const { responsiveTheme } = useResponsiveTheme(themeConfig); // ✅ Top level
  
  return <ConfigProvider theme={responsiveTheme}>...</ConfigProvider>;
};
```

### Issue 2: Inputs Causing Zoom on iOS

**Problem:** iOS Safari zooms in when focusing inputs.

**Solution:**
```typescript
// Font size must be >= 16px
<Input style={{ fontSize: '16px' }} />

// Or use responsive token (automatically sets 16px on mobile)
const { token } = useResponsiveToken();
<Input style={{ fontSize: token.fontSize }} />
```

### Issue 3: Performance Issues on Resize

**Problem:** Too many re-renders during window resize.

**Solution:**
```typescript
// Use debounced version
const breakpoint = useDebouncedBreakpoint(300); // 300ms delay
```

### Issue 4: Incorrect Device Detection

**Problem:** Tablet detected as desktop or mobile.

**Solution:**
```typescript
// Check device type explicitly
const { deviceType } = useResponsiveTheme(themeConfig);

if (deviceType === 'tablet') {
  // Tablet-specific logic
}

// Device classification:
// mobile: 0-767px
// tablet: 768-991px
// desktop: 992px+
```

### Issue 5: Col Span Not Working

**Problem:** `useResponsiveColSpan` returns incorrect values.

**Solution:**
```typescript
// Ensure all breakpoints are defined
const colSpan = useResponsiveColSpan({
  xs: 24,
  sm: 12,
  md: 8,
  lg: 6,
  xl: 4,
  xxl: 3,
});

// Missing breakpoints will use previous breakpoint value
```

---

## 📚 API Reference

### Hooks

#### `useResponsiveTheme(baseTheme)`
Returns complete responsive theme with device detection.

```typescript
const {
  responsiveTheme,      // ConfigProvider-ready theme
  currentBreakpoint,    // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  isMobile,            // boolean (xs, sm)
  isTablet,            // boolean (md, lg)
  isDesktop,           // boolean (xl, xxl)
  deviceType,          // 'mobile' | 'tablet' | 'desktop'
  windowWidth,         // number (px)
  screens,             // { xs: boolean, sm: boolean, ... }
  token,               // Ant Design token object
} = useResponsiveTheme(themeConfig);
```

#### `useResponsiveToken()`
Simplified token access with device detection.

```typescript
const { 
  token,      // Responsive tokens
  isMobile,   // boolean
  isTablet,   // boolean
  isDesktop,  // boolean
} = useResponsiveToken();
```

#### `useResponsiveColSpan(spans)`
Calculate responsive column spans.

```typescript
const colSpan = useResponsiveColSpan({
  xs: 24,
  sm: 12,
  md: 8,
  lg: 6,
  xl: 4,
  xxl: 3,
});
```

#### `useResponsiveValue<T>(values, defaultValue)`
Generic responsive value selector.

```typescript
const padding = useResponsiveValue(
  { xs: 12, md: 16, lg: 24 },
  16
);
```

### Utility Functions

#### `getResponsiveGutter(screens)`
Returns responsive gutter for Row component.

```typescript
const gutter = getResponsiveGutter(screens);
<Row gutter={gutter}>...</Row>
```

#### `getResponsiveSiderProps(isMobile)`
Returns optimal Sider configuration.

```typescript
const siderProps = getResponsiveSiderProps(isMobile);
<Sider {...siderProps} />
```

---

## 🎯 Best Practices Summary

✅ **DO:**
- Use `useResponsiveTheme` at app root level
- Set input font size to 16px+ on mobile (prevents iOS zoom)
- Use 44px+ tap targets for mobile buttons
- Leverage `useResponsiveColSpan` for consistent grids
- Debounce breakpoint detection for performance
- Test on real devices (iOS Safari, Android Chrome)

❌ **DON'T:**
- Create custom window.innerWidth listeners (use hooks)
- Hardcode breakpoint values (use BREAKPOINTS constant)
- Forget to memoize expensive responsive calculations
- Use < 16px font size on mobile inputs
- Ignore touch-friendly sizing on mobile

---

## 📊 Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| iOS Safari | 14+ | ✅ Full |
| Android Chrome | 90+ | ✅ Full |

---

## 🔗 Related Documentation

- [THEME_IMPLEMENTATION.md](./THEME_IMPLEMENTATION.md) - Basic theme migration
- [THEME_QUICK_REF.md](./THEME_QUICK_REF.md) - Quick reference snippets
- [Ant Design Theme Docs](https://ant.design/docs/react/customize-theme)
- [Ant Design Grid Docs](https://ant.design/components/grid)

---

**Created:** 2025  
**Version:** 1.0.0  
**Ant Design:** v5.27.6
