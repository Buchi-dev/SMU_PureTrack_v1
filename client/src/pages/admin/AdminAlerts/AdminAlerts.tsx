/**
 * AdminAlerts - Manage Alerts Page
 * 
 * View, manage, and configure water quality alerts.
 * 
 * Architecture:
 * ✅ Service Layer → Global Hooks → UI Components
 * 
 * Data Flow:
 * - READ: useAlerts() - Fetch alerts with manual refresh
 * - WRITE: useAlertMutations() - Alert operations (acknowledge, resolve)
 * - UI Logic: Local hooks for filtering and statistics (useAlertFilters, useAlertStats)
 * 
 * @module pages/admin/AdminAlerts
 */

import { useState, useEffect } from 'react';
import { Space, message } from 'antd';
import { BellOutlined, ReloadOutlined } from '@ant-design/icons';
import type { WaterQualityAlert } from '../../../schemas';
import { AdminLayout } from '../../../components/layouts/AdminLayout';
import { PageHeader } from '../../../components/PageHeader';
import { useAlerts, useAlertMutations } from '../../../hooks';
import { useAlertStats, useAlertFilters } from './hooks';
import {
  CompactAlertStatistics,
  AlertFilters,
  AlertsTable,
  AlertDetailsDrawer,
} from './components';

export const AdminAlerts = () => {
  const [selectedAlert, setSelectedAlert] = useState<WaterQualityAlert | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ✅ GLOBAL READ HOOK - Fetch alerts on demand
  const { alerts, isLoading: loading, error: alertsError, refetch } = useAlerts({ 
    filters: { limit: 100 }
  });

  // ✅ GLOBAL WRITE HOOK - Alert operations (acknowledge, resolve)
  const { 
    acknowledgeAlert, 
    resolveAlert,
    resolveAllAlerts, 
    isLoading: isOperating,
    error: operationError,
  } = useAlertMutations();

  // ✅ LOCAL UI HOOKS - UI-specific filtering and statistics
  const { filteredAlerts, filters, setFilters, clearFilters } = useAlertFilters(alerts);
  const stats = useAlertStats(filteredAlerts);

  // Handle errors from global hooks
  useEffect(() => {
    if (alertsError) {
      console.error('Error loading alerts:', alertsError);
      message.error('Failed to load alerts');
    }
  }, [alertsError]);

  useEffect(() => {
    if (operationError) {
      console.error('Alert operation error:', operationError);
      message.error(operationError.message);
    }
  }, [operationError]);

  const handleClearFilters = () => {
    clearFilters();
    message.info('Filters cleared');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      message.success('Alerts refreshed successfully');
    } catch {
      message.error('Failed to refresh alerts');
    } finally {
      setIsRefreshing(false);
    }
  };

  const viewAlertDetails = (alert: WaterQualityAlert) => {
    setSelectedAlert(alert);
    setDetailsVisible(true);
  };

  // ✅ Acknowledge alert handler with cache update and refetch
  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      message.success('Alert acknowledged successfully');
      // Force refetch to ensure UI is up-to-date
      await refetch();
    } catch (error) {
      // Error already shown by useEffect
    }
  };

  // ✅ Resolve alert handler with cache update and refetch
  const handleResolve = async (alertId: string, notes?: string) => {
    try {
      await resolveAlert(alertId, notes);
      message.success('Alert resolved successfully');
      setDetailsVisible(false); // Close drawer after successful resolution
      // Force refetch to ensure UI is up-to-date
      await refetch();
    } catch (error) {
      // Error already shown by useEffect
    }
  };

  // ✅ Use global write hook for batch operations with cache updates
  const handleBatchAcknowledge = async (alertIds: string[]) => {
    try {
      const results = await Promise.allSettled(
        alertIds.map((id) => acknowledgeAlert(id))
      );
      
      const failed = results
        .map((result, idx) => (result.status === 'rejected' ? alertIds[idx] : null))
        .filter((id): id is string => id !== null);
      
      if (failed.length === 0) {
        message.success(`All ${alertIds.length} alerts acknowledged successfully`);
      } else if (failed.length === alertIds.length) {
        message.error('Failed to acknowledge any selected alerts');
      } else {
        message.warning(
          `Acknowledged ${alertIds.length - failed.length} of ${alertIds.length} alerts. ${failed.length} failed.`
        );
      }
      
      // Force refetch to ensure UI is up-to-date
      await refetch();
    } catch {
      message.error('Failed to acknowledge alerts');
    }
  };

  // ✅ Resolve all alerts handler with optional filters
  const handleResolveAll = async (notes?: string, currentFilters?: any) => {
    try {
      // Build filters based on current filter state if provided
      const apiFilters: { severity?: string; parameter?: string } = {};
      
      // Admin filters are arrays, so we need to check if they exist and have values
      if (currentFilters?.severity && Array.isArray(currentFilters.severity) && currentFilters.severity.length > 0) {
        // Take the first filter value if it's an array
        apiFilters.severity = currentFilters.severity[0];
      }
      if (currentFilters?.parameter && Array.isArray(currentFilters.parameter) && currentFilters.parameter.length > 0) {
        // Take the first filter value if it's an array
        apiFilters.parameter = currentFilters.parameter[0];
      }

      // Only pass filters if we have at least one filter value
      const hasFilters = Object.keys(apiFilters).length > 0;
      const result = await resolveAllAlerts(
        notes || undefined, 
        hasFilters ? apiFilters : undefined
      );
      message.success(`Successfully resolved ${result.resolvedCount} alert(s)`);
      
      // Force refetch to ensure UI is up-to-date
      await refetch();
      
      return result;
    } catch (error) {
      message.error('Failed to resolve all alerts');
      throw error;
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: '24px' }}>
        <PageHeader
          title="Water Quality Alerts"
          icon={<BellOutlined />}
          description="Monitor and manage water quality alerts"
          breadcrumbItems={[
            { title: 'Alerts', icon: <BellOutlined /> }
          ]}
          actions={[
            {
              key: 'refresh',
              label: 'Refresh',
              icon: <ReloadOutlined spin={isRefreshing} />,
              onClick: handleRefresh,
              disabled: loading || isRefreshing,
            }
          ]}
        />

        <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>
          {/* Statistics */}
          <CompactAlertStatistics stats={stats} />

          {/* Filters and Actions */}
          <AlertFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={handleClearFilters}
            totalAlerts={alerts.length}
            filteredCount={filteredAlerts.length}
          />

          {/* Alerts Table */}
          <AlertsTable
            alerts={filteredAlerts}
            loading={loading}
            onViewDetails={viewAlertDetails}
            onAcknowledge={handleAcknowledge}
            onBatchAcknowledge={handleBatchAcknowledge}
            onResolveAll={handleResolveAll}
            currentFilters={filters}
            isAcknowledging={isOperating}
          />
        </Space>

        {/* Alert Details Drawer */}
        <AlertDetailsDrawer
          visible={detailsVisible}
          alert={selectedAlert}
          onClose={() => setDetailsVisible(false)}
          onAcknowledge={handleAcknowledge}
          onResolve={handleResolve}
          isAcknowledging={isOperating}
          isResolving={isOperating}
        />
      </div>
    </AdminLayout>
  );

};
