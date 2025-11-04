/**
 * Manage Alerts Page
 * View, manage, and configure water quality alerts
 */

import { useState, useEffect } from 'react';
import { Typography, message } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { alertsService } from '../../../services/alerts.Service';
import type { WaterQualityAlert } from '../../../schemas';
import { AdminLayout } from '../../../components/layouts/AdminLayout';
import { useAlertStats, useAlertFilters, useAlertActions } from './hooks';
import {
  AlertStatistics,
  AlertFilters,
  AlertsTable,
  AlertDetailsDrawer,
} from './components';

const { Title, Text } = Typography;

export const AdminAlerts = () => {
  const [alerts, setAlerts] = useState<WaterQualityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<WaterQualityAlert | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Use custom hooks
  const { filteredAlerts, filters, setFilters, clearFilters } = useAlertFilters(alerts);
  const stats = useAlertStats(filteredAlerts);
  const { acknowledgeAlert, resolveAlert, isAcknowledging, isResolving } = useAlertActions();

  const handleClearFilters = () => {
    clearFilters();
    message.info('Filters cleared');
  };

  const viewAlertDetails = (alert: WaterQualityAlert) => {
    setSelectedAlert(alert);
    setDetailsVisible(true);
  };

  // Batch acknowledge multiple alerts
  const handleBatchAcknowledge = async (alertIds: string[]) => {
    const promises = alertIds.map((id) => alertsService.acknowledgeAlert(id));
    await Promise.all(promises);
  };

  // READ: Subscribe to real-time alerts from Firestore
  useEffect(() => {
    const unsubscribe = alertsService.subscribeToAlerts(
      (alertsData) => {
        setAlerts(alertsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading alerts:', error);
        message.error('Failed to load alerts');
        setLoading(false);
      },
      100 // Get more alerts for management page
    );

    return () => unsubscribe();
  }, []);

  return (
    <AdminLayout>
      <div>
        <Title level={2}>
          <BellOutlined /> Water Quality Alerts
        </Title>
        <Text type="secondary">
          Monitor and manage real-time water quality alerts
        </Text>

        {/* Statistics */}
        <AlertStatistics stats={stats} />

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
          onAcknowledge={acknowledgeAlert}
          onBatchAcknowledge={handleBatchAcknowledge}
          isAcknowledging={isAcknowledging}
        />

        {/* Alert Details Drawer */}
        <AlertDetailsDrawer
          visible={detailsVisible}
          alert={selectedAlert}
          onClose={() => setDetailsVisible(false)}
          onAcknowledge={acknowledgeAlert}
          onResolve={resolveAlert}
          isAcknowledging={isAcknowledging}
          isResolving={isResolving}
        />
      </div>
    </AdminLayout>
  );

};
