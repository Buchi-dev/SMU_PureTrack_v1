import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import type {
  WaterQualityAlert,
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
  AlertResponse,
} from '../schemas';
import { dataFlowLogger, DataSource, FlowLayer } from '../utils/dataFlowLogger';

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

const ERROR_MESSAGES: Record<string, string> = {
  'functions/unauthenticated': 'Please log in to perform this action',
  'functions/permission-denied': 'You do not have permission to manage alerts',
  'functions/not-found': 'Alert not found',
  'functions/already-exists': 'Alert already exists',
  'functions/invalid-argument': 'Invalid request parameters',
  'functions/internal': 'An internal error occurred. Please try again',
  'functions/unavailable': 'Alert service temporarily unavailable. Please try again',
  'functions/deadline-exceeded': 'Request timeout. Please try again',
};

export class AlertsService {
  private readonly functions = getFunctions();
  private readonly functionName = 'alertManagement';
  private readonly db = getFirestore();

  // ============================================================================
  // WRITE OPERATIONS (Client → Cloud Functions → Firestore)
  // ============================================================================

  private async callFunction<T>(action: string, data: Omit<T, 'action'>): Promise<void> {
    try {
      const callable = httpsCallable<T, AlertResponse>(this.functions, this.functionName);
      const result = await callable({ action, ...data } as T);

      if (!result.data.success) {
        throw new Error(result.data.error || `Failed to ${action}`);
      }
    } catch (error: any) {
      throw this.handleError(error, `Failed to ${action}`);
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    return this.callFunction<AcknowledgeAlertRequest>('acknowledgeAlert', { alertId });
  }

  async resolveAlert(alertId: string, notes?: string): Promise<void> {
    return this.callFunction<ResolveAlertRequest>('resolveAlert', { alertId, notes });
  }

  // ============================================================================
  // READ OPERATIONS (Client → Firestore Real-time Listener)
  // ============================================================================

  subscribeToAlerts(
    onUpdate: (alerts: WaterQualityAlert[]) => void,
    onError: (error: Error) => void,
    maxAlerts: number = 20
  ): Unsubscribe {
    const alertsQuery = query(
      collection(this.db, 'alerts'),
      orderBy('createdAt', 'desc'),
      limit(maxAlerts)
    );

    // Cache to prevent propagating invalid snapshots
    let lastValidSnapshot: WaterQualityAlert[] | null = null;
    let isFirstSnapshot = true;

    return onSnapshot(
      alertsQuery,
      (snapshot) => {
        // DEFENSIVE: Validate snapshot before propagating to UI
        // Reject null/undefined, but accept empty arrays as valid
        if (!snapshot) {
          dataFlowLogger.logValidationIssue(
            DataSource.FIRESTORE,
            FlowLayer.SERVICE,
            'Received null snapshot',
            null
          );
          console.warn('[AlertsService] Received null snapshot, maintaining cached state');
          return;
        }

        // Parse alerts from snapshot
        const alerts = snapshot.docs.map((doc) => ({
          alertId: doc.id,
          ...doc.data(),
        } as WaterQualityAlert));

        dataFlowLogger.log(
          DataSource.FIRESTORE,
          FlowLayer.SERVICE,
          'Snapshot received',
          { alertCount: alerts.length, isFirstSnapshot }
        );

        // DEFENSIVE: On subsequent updates, validate we're not regressing to empty state
        // Only propagate empty array if it's genuinely the first load or a confirmed delete
        if (!isFirstSnapshot && alerts.length === 0 && lastValidSnapshot && lastValidSnapshot.length > 0) {
          dataFlowLogger.logStateRejection(
            DataSource.FIRESTORE,
            FlowLayer.SERVICE,
            'Empty snapshot during active session - likely Firestore listener stall',
            alerts,
            lastValidSnapshot
          );
          console.warn('[AlertsService] Rejecting empty snapshot - likely Firestore listener stall');
          console.warn('[AlertsService] Maintaining cached state with', lastValidSnapshot.length, 'alerts');
          return;
        }

        // Valid data - cache and propagate
        lastValidSnapshot = alerts;
        isFirstSnapshot = false;
        
        dataFlowLogger.log(
          DataSource.FIRESTORE,
          FlowLayer.SERVICE,
          'Propagating valid alert data',
          { alertCount: alerts.length }
        );
        
        onUpdate(alerts);
      },
      (err) => {
        dataFlowLogger.log(
          DataSource.FIRESTORE,
          FlowLayer.SERVICE,
          'Snapshot error',
          { error: err.message }
        );
        console.error('[AlertsService] Snapshot error:', err);
        onError(err instanceof Error ? err : new Error('Failed to fetch alerts'));
        
        // On error, don't clear cache - let UI decide whether to use cached data
      }
    );
  }

  private handleError(error: any, defaultMessage: string): ErrorResponse {
    console.error('AlertsService error:', error);

    const code = error.code || 'unknown';
    const message = code in ERROR_MESSAGES
      ? (code === 'functions/failed-precondition' ? error.message : ERROR_MESSAGES[code])
      : (error.message || defaultMessage);

    return {
      code,
      message,
      details: error.details,
    };
  }
}

export const alertsService = new AlertsService();
export default alertsService;
