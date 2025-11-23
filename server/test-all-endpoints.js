const axios = require('axios');
const chalk = require('chalk');

// ============================================
// CONFIGURATION
// ============================================

const BASE_URL = 'http://localhost:5000';
const API_VERSION = '/api/v1';

// Your Firebase JWT token
const AUTH_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ1YTZjMGMyYjgwMDcxN2EzNGQ1Y2JiYmYzOWI4NGI2NzYxMjgyNjUiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSmF5bWVzIEMuIE1FTkRPWkEiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jSnhvbHdIQzNVM3phRjl2WnZfNlVXTFNqSGpsVHlXVEt1ZmhVNzRCMGFpZl9DRWxnPXM5Ni1jIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL3NtdXB1cmV0cmFjayIsImF1ZCI6InNtdXB1cmV0cmFjayIsImF1dGhfdGltZSI6MTc2MzgxNzI1OSwidXNlcl9pZCI6Imc5d3F5b0dyZTNTZHY0QmxicFpiM0dlWmFFYTIiLCJzdWIiOiJnOXdxeW9HcmUzU2R2NEJsYnBaYjNHZVphRWEyIiwiaWF0IjoxNzMyMzU4NTQzLCJleHAiOjE3MzIzNjIxNDMsImVtYWlsIjoiaGVkLWptZW5kb3phQHNtdS5lZHUucGgiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjEwMTk1ODEzNjIyOTQ4OTIxMzE3MSJdLCJlbWFpbCI6WyJoZWQtam1lbmRvemFAc211LmVkdS5waCJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.I2LYajC_5dFdB7I5SgS8wk_2Hvs_3b_583_q-vndMEmfI_Z8DmTH7bRxWDH2LKeEL60L4aeJKoZijyl_1FSDflTSW9Z4h1bFkPp3_5_S_YBZdYHyn1BaFCvFxzU8nziFjTore75JdUyNbMdEp-L_F3MUfBTE5uBIWJhifmuLCtzp4PbCSxhHJhWoTByAWymYGhEqy8ABnoABbhZ6LzR9Jf_rWoq5O5ZiugYEwfz3LKcsfjiQM6JjHSJcPIjSAl_bRyfcq57BSsW_1BndO7VJaWOYl51LNpG5l_NMyNu8oVVu3n2-KRM_z5kxBYly2-yqJTDof33V_5h44l60RU_OUA';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// ============================================
// AXIOS SETUP
// ============================================

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}]`;
  
  switch (type) {
    case 'success':
      console.log(chalk.green(`${prefix} ✓ ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`${prefix} ✗ ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`${prefix} ⚠ ${message}`));
      break;
    case 'info':
      console.log(chalk.blue(`${prefix} ℹ ${message}`));
      break;
    case 'header':
      console.log(chalk.cyan.bold(`\n${'='.repeat(60)}\n${message}\n${'='.repeat(60)}`));
      break;
    case 'section':
      console.log(chalk.magenta.bold(`\n--- ${message} ---`));
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
}

function logResponse(data, indent = 2) {
  console.log(chalk.gray(JSON.stringify(data, null, indent)));
}

async function testEndpoint(config) {
  const { name, method, url, headers = {}, data = null, expectedStatus = 200, skipTest = false } = config;
  
  if (skipTest) {
    log(`SKIPPED: ${name}`, 'warning');
    testResults.skipped++;
    testResults.tests.push({ name, status: 'SKIPPED' });
    return null;
  }

  try {
    log(`Testing: ${name}`, 'info');
    log(`${method.toUpperCase()} ${url}`, 'info');
    
    const response = await apiClient({
      method,
      url,
      headers,
      data,
    });

    if (response.status === expectedStatus) {
      log(`PASSED: ${name} (${response.status})`, 'success');
      testResults.passed++;
      testResults.tests.push({ name, status: 'PASSED', statusCode: response.status });
      
      // Log response data
      if (response.data) {
        logResponse(response.data);
      }
      
      return response.data;
    } else {
      log(`FAILED: ${name} - Expected ${expectedStatus}, got ${response.status}`, 'error');
      testResults.failed++;
      testResults.tests.push({ name, status: 'FAILED', statusCode: response.status });
      return null;
    }
  } catch (error) {
    if (error.response) {
      log(`FAILED: ${name} - ${error.response.status}: ${error.response.statusText}`, 'error');
      if (error.response.data) {
        logResponse(error.response.data);
      }
      testResults.failed++;
      testResults.tests.push({ 
        name, 
        status: 'FAILED', 
        statusCode: error.response.status,
        error: error.response.data?.message || error.message 
      });
    } else {
      log(`FAILED: ${name} - ${error.message}`, 'error');
      testResults.failed++;
      testResults.tests.push({ name, status: 'FAILED', error: error.message });
    }
    return null;
  }
}

// ============================================
// TEST SUITES
// ============================================

async function testHealthEndpoints() {
  log('HEALTH ENDPOINTS', 'section');
  
  await testEndpoint({
    name: 'Health Check',
    method: 'GET',
    url: '/health',
  });
  
  await testEndpoint({
    name: 'Health Diagnostics',
    method: 'GET',
    url: '/health/diagnostics',
  });
}

async function testRootEndpoints() {
  log('ROOT & VERSION ENDPOINTS', 'section');
  
  await testEndpoint({
    name: 'Root Endpoint',
    method: 'GET',
    url: '/',
  });
  
  await testEndpoint({
    name: 'API Versions',
    method: 'GET',
    url: '/api/versions',
  });
}

async function testAlertEndpoints() {
  log('ALERT ENDPOINTS', 'section');
  
  const authHeaders = { Authorization: `Bearer ${AUTH_TOKEN}` };
  
  // GET all alerts
  const alertsData = await testEndpoint({
    name: 'Get All Alerts',
    method: 'GET',
    url: `${API_VERSION}/alerts`,
    headers: authHeaders,
  });
  
  // GET alert statistics
  await testEndpoint({
    name: 'Get Alert Statistics',
    method: 'GET',
    url: `${API_VERSION}/alerts/stats`,
    headers: authHeaders,
  });
  
  // GET alerts with pagination
  await testEndpoint({
    name: 'Get Alerts with Pagination',
    method: 'GET',
    url: `${API_VERSION}/alerts?page=1&limit=10`,
    headers: authHeaders,
  });
  
  // GET alerts with status filter
  await testEndpoint({
    name: 'Get Pending Alerts',
    method: 'GET',
    url: `${API_VERSION}/alerts?status=pending`,
    headers: authHeaders,
  });
  
  await testEndpoint({
    name: 'Get Acknowledged Alerts',
    method: 'GET',
    url: `${API_VERSION}/alerts?status=acknowledged`,
    headers: authHeaders,
  });
  
  await testEndpoint({
    name: 'Get Resolved Alerts',
    method: 'GET',
    url: `${API_VERSION}/alerts?status=resolved`,
    headers: authHeaders,
  });
  
  // GET alerts by severity
  await testEndpoint({
    name: 'Get Critical Alerts',
    method: 'GET',
    url: `${API_VERSION}/alerts?severity=critical`,
    headers: authHeaders,
  });
  
  await testEndpoint({
    name: 'Get Warning Alerts',
    method: 'GET',
    url: `${API_VERSION}/alerts?severity=warning`,
    headers: authHeaders,
  });
  
  // GET alerts by parameter
  await testEndpoint({
    name: 'Get pH Alerts',
    method: 'GET',
    url: `${API_VERSION}/alerts?parameter=pH`,
    headers: authHeaders,
  });
  
  // GET alerts with date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // Last 7 days
  const endDate = new Date();
  
  await testEndpoint({
    name: 'Get Alerts with Date Range',
    method: 'GET',
    url: `${API_VERSION}/alerts?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
    headers: authHeaders,
  });
  
  // Test individual alert operations if alerts exist
  if (alertsData && alertsData.data && alertsData.data.length > 0) {
    const alertId = alertsData.data[0]._id;
    
    // GET alert by ID
    await testEndpoint({
      name: 'Get Alert by ID',
      method: 'GET',
      url: `${API_VERSION}/alerts/${alertId}`,
      headers: authHeaders,
    });
    
    // PATCH acknowledge alert (only if status is pending)
    if (alertsData.data[0].status === 'pending') {
      await testEndpoint({
        name: 'Acknowledge Alert',
        method: 'PATCH',
        url: `${API_VERSION}/alerts/${alertId}/acknowledge`,
        headers: authHeaders,
        data: {
          acknowledgedBy: 'Test User',
          notes: 'Alert acknowledged via API test'
        }
      });
    }
    
    // PATCH resolve alert (test with proper data)
    const pendingAlerts = alertsData.data.filter(a => a.status === 'pending' || a.status === 'acknowledged');
    if (pendingAlerts.length > 0) {
      const alertToResolve = pendingAlerts[0]._id;
      await testEndpoint({
        name: 'Resolve Alert',
        method: 'PATCH',
        url: `${API_VERSION}/alerts/${alertToResolve}/resolve`,
        headers: authHeaders,
        data: {
          resolvedBy: 'Test User',
          resolutionNotes: 'Issue resolved via API test'
        }
      });
    }
  } else {
    log('No alerts found for individual alert tests', 'warning');
  }
  
  // Test CREATE alert (internal endpoint - no auth required)
  await testEndpoint({
    name: 'Create Alert (Internal)',
    method: 'POST',
    url: `${API_VERSION}/alerts`,
    data: {
      deviceId: '673f3d4bd31d9fd03ffeb8bb', // You may need to replace with a valid device ID
      parameter: 'pH',
      value: 9.5,
      threshold: { min: 6.5, max: 8.5 },
      severity: 'warning',
      message: 'pH level above normal range',
    },
    expectedStatus: 201,
    skipTest: false, // Set to true if you don't want to create test alerts
  });
}

async function testDeviceEndpoints() {
  log('DEVICE ENDPOINTS', 'section');
  
  const authHeaders = { Authorization: `Bearer ${AUTH_TOKEN}` };
  
  // GET all devices
  const devicesData = await testEndpoint({
    name: 'Get All Devices',
    method: 'GET',
    url: `${API_VERSION}/devices`,
    headers: authHeaders,
  });
  
  // GET device statistics
  await testEndpoint({
    name: 'Get Device Statistics',
    method: 'GET',
    url: `${API_VERSION}/devices/stats`,
    headers: authHeaders,
  });
  
  // GET devices with pagination
  await testEndpoint({
    name: 'Get Devices with Pagination',
    method: 'GET',
    url: `${API_VERSION}/devices?page=1&limit=10`,
    headers: authHeaders,
  });
  
  // GET devices by status
  await testEndpoint({
    name: 'Get Active Devices',
    method: 'GET',
    url: `${API_VERSION}/devices?status=active`,
    headers: authHeaders,
  });
  
  // Test individual device operations if devices exist
  if (devicesData && devicesData.data && devicesData.data.length > 0) {
    const deviceId = devicesData.data[0]._id;
    
    // GET device by ID
    await testEndpoint({
      name: 'Get Device by ID',
      method: 'GET',
      url: `${API_VERSION}/devices/${deviceId}`,
      headers: authHeaders,
    });
    
    // GET device readings
    await testEndpoint({
      name: 'Get Device Readings',
      method: 'GET',
      url: `${API_VERSION}/devices/${deviceId}/readings`,
      headers: authHeaders,
    });
    
    // GET device readings with pagination
    await testEndpoint({
      name: 'Get Device Readings with Pagination',
      method: 'GET',
      url: `${API_VERSION}/devices/${deviceId}/readings?page=1&limit=20`,
      headers: authHeaders,
    });
    
    // GET device readings with date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1); // Last 24 hours
    const endDate = new Date();
    
    await testEndpoint({
      name: 'Get Device Readings with Date Range',
      method: 'GET',
      url: `${API_VERSION}/devices/${deviceId}/readings?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      headers: authHeaders,
    });
  } else {
    log('No devices found for individual device tests', 'warning');
  }
}

async function testAnalyticsEndpoints() {
  log('ANALYTICS ENDPOINTS', 'section');
  
  const authHeaders = { Authorization: `Bearer ${AUTH_TOKEN}` };
  
  // GET analytics summary
  await testEndpoint({
    name: 'Get Analytics Summary',
    method: 'GET',
    url: `${API_VERSION}/analytics/summary`,
    headers: authHeaders,
  });
  
  // GET analytics trends
  await testEndpoint({
    name: 'Get Analytics Trends',
    method: 'GET',
    url: `${API_VERSION}/analytics/trends`,
    headers: authHeaders,
  });
  
  // GET analytics trends with time range
  await testEndpoint({
    name: 'Get Analytics Trends (7 days)',
    method: 'GET',
    url: `${API_VERSION}/analytics/trends?days=7`,
    headers: authHeaders,
  });
  
  await testEndpoint({
    name: 'Get Analytics Trends (30 days)',
    method: 'GET',
    url: `${API_VERSION}/analytics/trends?days=30`,
    headers: authHeaders,
  });
  
  // GET parameter analytics
  await testEndpoint({
    name: 'Get Parameter Analytics',
    method: 'GET',
    url: `${API_VERSION}/analytics/parameters`,
    headers: authHeaders,
  });
  
  // GET parameter analytics for specific parameter
  await testEndpoint({
    name: 'Get pH Parameter Analytics',
    method: 'GET',
    url: `${API_VERSION}/analytics/parameters?parameter=pH`,
    headers: authHeaders,
  });
  
  await testEndpoint({
    name: 'Get TDS Parameter Analytics',
    method: 'GET',
    url: `${API_VERSION}/analytics/parameters?parameter=TDS`,
    headers: authHeaders,
  });
}

async function testReportEndpoints() {
  log('REPORT ENDPOINTS', 'section');
  
  const authHeaders = { Authorization: `Bearer ${AUTH_TOKEN}` };
  
  // GET all reports
  const reportsData = await testEndpoint({
    name: 'Get All Reports',
    method: 'GET',
    url: `${API_VERSION}/reports`,
    headers: authHeaders,
  });
  
  // GET reports with pagination
  await testEndpoint({
    name: 'Get Reports with Pagination',
    method: 'GET',
    url: `${API_VERSION}/reports?page=1&limit=10`,
    headers: authHeaders,
  });
  
  // POST generate water quality report
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date();
  
  await testEndpoint({
    name: 'Generate Water Quality Report',
    method: 'POST',
    url: `${API_VERSION}/reports/water-quality`,
    headers: authHeaders,
    data: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      format: 'json'
    },
    expectedStatus: 201,
    skipTest: false, // Set to true if you don't want to generate test reports
  });
  
  // POST generate device status report
  await testEndpoint({
    name: 'Generate Device Status Report',
    method: 'POST',
    url: `${API_VERSION}/reports/device-status`,
    headers: authHeaders,
    data: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      format: 'json'
    },
    expectedStatus: 201,
    skipTest: false,
  });
  
  // Test individual report operations if reports exist
  if (reportsData && reportsData.data && reportsData.data.length > 0) {
    const reportId = reportsData.data[0]._id;
    
    // GET report by ID
    await testEndpoint({
      name: 'Get Report by ID',
      method: 'GET',
      url: `${API_VERSION}/reports/${reportId}`,
      headers: authHeaders,
    });
  } else {
    log('No reports found for individual report tests', 'warning');
  }
}

async function testUserEndpoints() {
  log('USER ENDPOINTS', 'section');
  
  const authHeaders = { Authorization: `Bearer ${AUTH_TOKEN}` };
  
  // Note: Most user endpoints require admin access
  // Testing what's accessible with current token
  
  // GET all users (Admin only)
  await testEndpoint({
    name: 'Get All Users (Admin)',
    method: 'GET',
    url: `${API_VERSION}/users`,
    headers: authHeaders,
  });
  
  // You can add user ID specific tests here if you have access
}

async function testAuthEndpoints() {
  log('AUTH ENDPOINTS', 'section');
  
  // POST verify token
  await testEndpoint({
    name: 'Verify Firebase Token',
    method: 'POST',
    url: '/auth/verify-token',
    data: {
      idToken: AUTH_TOKEN
    },
  });
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  log('WATER QUALITY MONITORING API - COMPREHENSIVE ENDPOINT TESTS', 'header');
  log(`Base URL: ${BASE_URL}`, 'info');
  log(`API Version: ${API_VERSION}`, 'info');
  log(`Start Time: ${new Date().toLocaleString()}`, 'info');
  
  try {
    // Run all test suites
    await testHealthEndpoints();
    await testRootEndpoints();
    await testAuthEndpoints();
    await testAlertEndpoints();
    await testDeviceEndpoints();
    await testAnalyticsEndpoints();
    await testReportEndpoints();
    await testUserEndpoints();
    
    // Print summary
    log('TEST SUMMARY', 'header');
    log(`Total Tests: ${testResults.passed + testResults.failed + testResults.skipped}`, 'info');
    log(`Passed: ${testResults.passed}`, 'success');
    log(`Failed: ${testResults.failed}`, 'error');
    log(`Skipped: ${testResults.skipped}`, 'warning');
    log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`, 'info');
    
    // Print failed tests details
    if (testResults.failed > 0) {
      log('\nFAILED TESTS:', 'error');
      testResults.tests
        .filter(t => t.status === 'FAILED')
        .forEach(test => {
          console.log(chalk.red(`  ✗ ${test.name}`));
          if (test.error) {
            console.log(chalk.gray(`    Error: ${test.error}`));
          }
          if (test.statusCode) {
            console.log(chalk.gray(`    Status Code: ${test.statusCode}`));
          }
        });
    }
    
    log(`\nEnd Time: ${new Date().toLocaleString()}`, 'info');
    
  } catch (error) {
    log(`Fatal error during test execution: ${error.message}`, 'error');
    console.error(error);
  }
}

// ============================================
// RUN TESTS
// ============================================

runAllTests();
