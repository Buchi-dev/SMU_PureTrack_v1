# Bundle Size & Performance Optimization Guide

Complete guide for analyzing and optimizing bundle size, implementing performance monitoring, and achieving target Core Web Vitals.

---

## 1. Bundle Analysis Setup

### Install Bundle Analyzer

```bash
cd client
npm install --save-dev rollup-plugin-visualizer
```

### Update Vite Config

Create/update `client/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'antd-vendor': ['antd', '@ant-design/icons'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          'chart-vendor': ['recharts', '@ant-design/plots'],
          
          // Feature chunks
          'admin': [
            './src/pages/admin/AdminDashboard',
            './src/pages/admin/AdminDeviceManagement',
            './src/pages/admin/AdminUserManagement',
            './src/pages/admin/AdminAlerts',
            './src/pages/admin/AdminReports',
            './src/pages/admin/AdminAnalytics',
            './src/pages/admin/AdminSettings',
          ],
          'staff': [
            './src/pages/staff/StaffDashboard',
            './src/pages/staff/StaffDevices',
            './src/pages/staff/StaffReadings',
            './src/pages/staff/StaffAnalysis',
            './src/pages/staff/StaffSettings',
          ],
        },
      },
    },
    // Enable source maps for debugging
    sourcemap: true,
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
  },
});
```

### Run Bundle Analysis

```bash
npm run build
# Opens stats.html in browser showing bundle composition
```

---

## 2. Current Bundle Size Baseline

### Expected Initial Sizes (Before Optimization)

| Chunk | Size (KB) | Gzipped (KB) | Notes |
|-------|-----------|--------------|-------|
| **index.js** | 600-700 | 180-220 | Main bundle |
| **React vendor** | 150-180 | 45-55 | React + Router |
| **Ant Design vendor** | 350-400 | 90-110 | UI library |
| **Firebase vendor** | 200-250 | 60-75 | Firebase SDK |
| **Chart vendor** | 150-200 | 50-65 | Recharts |
| **Admin pages** | 80-100 | 25-30 | Lazy loaded |
| **Staff pages** | 60-80 | 18-25 | Lazy loaded |
| **Total Initial Load** | ~1200 | ~320 | ⚠️ Over target |

### Target Sizes (After Optimization)

| Metric | Target | Status |
|--------|--------|--------|
| Initial JS (gzipped) | <200KB | 🎯 Goal |
| First Paint | <1.8s | 🎯 Goal |
| Largest Contentful Paint | <2.5s | 🎯 Goal |
| Time to Interactive | <3.8s | 🎯 Goal |

---

## 3. Optimization Strategies

### Strategy 1: Aggressive Code Splitting

**Impact:** Reduce initial bundle by 40-50%

```typescript
// client/src/router/index.tsx
import { lazy } from 'react';

// Split ALL page components
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminDeviceManagement = lazy(() => import('../pages/admin/AdminDeviceManagement'));
const AdminUserManagement = lazy(() => import('../pages/admin/AdminUserManagement'));
const AdminAlerts = lazy(() => import('../pages/admin/AdminAlerts'));
const AdminReports = lazy(() => import('../pages/admin/AdminReports'));
const AdminAnalytics = lazy(() => import('../pages/admin/AdminAnalytics'));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));

const StaffDashboard = lazy(() => import('../pages/staff/StaffDashboard'));
const StaffDevices = lazy(() => import('../pages/staff/StaffDevices'));
const StaffReadings = lazy(() => import('../pages/staff/StaffReadings'));
const StaffAnalysis = lazy(() => import('../pages/staff/StaffAnalysis'));
const StaffSettings = lazy(() => import('../pages/staff/StaffSettings'));

// Even split auth pages
const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
```

### Strategy 2: Conditional Chart Loading

**Impact:** Reduce initial bundle by 50-65KB

```typescript
// client/src/components/ChartWrapper.tsx
import { lazy, Suspense } from 'react';
import { Skeleton } from 'antd';

const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
const AreaChart = lazy(() => import('recharts').then(m => ({ default: m.AreaChart })));

export const ChartWrapper = ({ type, ...props }) => {
  const Chart = type === 'line' ? LineChart : AreaChart;
  
  return (
    <Suspense fallback={<Skeleton.Graph active />}>
      <Chart {...props} />
    </Suspense>
  );
};
```

### Strategy 3: Tree-Shake Ant Design Icons

**Impact:** Reduce bundle by 20-30KB

```typescript
// ❌ BAD: Imports all icons
import * as Icons from '@ant-design/icons';

// ✅ GOOD: Import only what you need
import {
  DashboardOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
```

### Strategy 4: Dynamic Firebase Imports

**Impact:** Reduce initial bundle by 30-40KB

```typescript
// client/src/utils/firebaseLoader.ts
export const loadFirebaseAnalytics = async () => {
  const { getAnalytics } = await import('firebase/analytics');
  return getAnalytics();
};

export const loadFirebasePerformance = async () => {
  const { getPerformance } = await import('firebase/performance');
  return getPerformance();
};

// Use only when needed
const analytics = await loadFirebaseAnalytics();
```

### Strategy 5: Remove Development Dependencies

**Impact:** Reduce bundle by 5-10KB

```typescript
// client/vite.config.ts
export default defineConfig({
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
  build: {
    terserOptions: {
      compress: {
        drop_console: true,
        dead_code: true,
        conditionals: true,
      },
    },
  },
});

// In code:
if (__DEV__) {
  console.log('Debug info'); // Removed in production
}
```

---

## 4. Performance Monitoring Setup

### Firebase Performance Monitoring

```bash
cd client
npm install firebase-performance
```

```typescript
// client/src/config/firebasePerformance.ts
import { initializeApp } from 'firebase/app';
import { getPerformance, trace } from 'firebase/performance';
import type { FirebasePerformance } from 'firebase/performance';

let performance: FirebasePerformance | null = null;

export const initializePerformanceMonitoring = async (app: FirebaseApp) => {
  if (import.meta.env.PROD) {
    try {
      performance = getPerformance(app);
      console.log('✓ Firebase Performance Monitoring enabled');
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }
};

// Trace custom metrics
export const measurePerformance = async (
  name: string,
  operation: () => Promise<any>
) => {
  if (!performance) return operation();

  const t = trace(performance, name);
  t.start();
  
  try {
    const result = await operation();
    t.stop();
    return result;
  } catch (error) {
    t.stop();
    throw error;
  }
};

// Usage in components:
import { measurePerformance } from '../config/firebasePerformance';

const fetchData = async () => {
  return measurePerformance('dashboard_fetch_data', async () => {
    const data = await deviceManagementService.listDevices();
    return data;
  });
};
```

### Web Vitals Monitoring

```bash
cd client
npm install web-vitals
```

```typescript
// client/src/utils/webVitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry);
    onFID(onPerfEntry);
    onFCP(onPerfEntry);
    onLCP(onPerfEntry);
    onTTFB(onPerfEntry);
  }
};

// Send to analytics
export const initWebVitals = () => {
  reportWebVitals((metric) => {
    console.log(metric);
    
    // Send to Firebase Analytics (if enabled)
    // logEvent(analytics, 'web_vitals', {
    //   metric_name: metric.name,
    //   metric_value: metric.value,
    //   metric_rating: metric.rating,
    // });
  });
};
```

```typescript
// client/src/main.tsx
import { initWebVitals } from './utils/webVitals';

createRoot(document.getElementById('root')!).render(/* ... */);

// Initialize web vitals monitoring
if (import.meta.env.PROD) {
  initWebVitals();
}
```

---

## 5. Lighthouse CI Integration

### Setup Lighthouse CI

```bash
cd client
npm install --save-dev @lhci/cli
```

### Create Configuration

```json
// client/lighthouserc.json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run preview",
      "url": ["http://localhost:4173"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Add Scripts

```json
// client/package.json
{
  "scripts": {
    "lighthouse": "lhci autorun",
    "lighthouse:ci": "npm run build && npm run lighthouse"
  }
}
```

---

## 6. Build Optimization Checklist

### Pre-Build Optimizations
- [ ] Remove unused imports (run ESLint autofix)
- [ ] Remove console.log statements (or use terser to strip)
- [ ] Optimize images (use WebP, compress PNGs)
- [ ] Enable gzip/brotli compression on server

### Build Configuration
- [ ] Enable code splitting (done in vite.config.ts)
- [ ] Configure chunk splitting (manual chunks)
- [ ] Enable tree-shaking (automatic in Vite)
- [ ] Minify code (terser configured)
- [ ] Generate source maps (for debugging)

### Post-Build Analysis
- [ ] Run bundle analyzer (npm run build)
- [ ] Check chunk sizes (dist/ folder)
- [ ] Verify lazy loading works (Network tab)
- [ ] Test production build locally (npm run preview)

---

## 7. Monitoring Dashboard

### Key Metrics to Track

```typescript
// client/src/utils/performanceMetrics.ts
export interface PerformanceMetrics {
  // Bundle Size
  bundleSize: {
    total: number;
    gzipped: number;
    chunks: Record<string, number>;
  };
  
  // Core Web Vitals
  webVitals: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    fcp: number; // First Contentful Paint
    ttfb: number; // Time to First Byte
  };
  
  // Custom Metrics
  customMetrics: {
    firebaseInitTime: number;
    authLoadTime: number;
    dashboardLoadTime: number;
  };
}

export const logPerformanceMetrics = (metrics: Partial<PerformanceMetrics>) => {
  if (import.meta.env.PROD) {
    console.table(metrics);
    // Send to analytics service
  }
};
```

---

## 8. Expected Results

### Before Optimization
| Metric | Value | Status |
|--------|-------|--------|
| Initial Bundle (gzipped) | 320KB | ❌ Over target |
| LCP | 3.2s | ❌ Poor |
| FID | 80ms | ✅ Good |
| CLS | 0.08 | ✅ Good |
| Performance Score | 75 | ⚠️ Needs improvement |

### After Optimization
| Metric | Value | Status |
|--------|-------|--------|
| Initial Bundle (gzipped) | 185KB | ✅ Under target |
| LCP | 2.1s | ✅ Good |
| FID | 65ms | ✅ Good |
| CLS | 0.05 | ✅ Good |
| Performance Score | 92 | ✅ Excellent |

---

## 9. Continuous Monitoring

### GitHub Actions Workflow

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        working-directory: ./client
        run: npm ci
      - name: Build
        working-directory: ./client
        run: npm run build
      - name: Run Lighthouse CI
        working-directory: ./client
        run: npm run lighthouse
```

---

## 10. Quick Reference Commands

```bash
# Analyze bundle
npm run build
# Opens stats.html automatically

# Run Lighthouse audit
npm run lighthouse:ci

# Check gzipped sizes
ls -lh dist/assets/*.js | awk '{print $5, $9}'

# Test production build locally
npm run preview

# Analyze with source-map-explorer (alternative)
npm install -g source-map-explorer
source-map-explorer dist/assets/*.js --gzip
```

---

*Generated by Ant Design v5 + Firebase v9+ Optimization Agent*
