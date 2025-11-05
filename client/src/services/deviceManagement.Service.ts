import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/database';
import type { 
  Device, 
  SensorReading, 
  DeviceData, 
  CommandParams, 
  DeviceResponse 
} from '../schemas';

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

/**
 * Device Management Service
 * 
 * Architecture Pattern:
 * - READ operations: Direct Firebase access (Firestore/RTDB) for real-time data
 * - WRITE operations: Cloud Functions only for security and validation
 */
export class DeviceManagementService {
  private readonly functions = getFunctions();
  private readonly db = getDatabase();
  private readonly firestore = getFirestore();
  private readonly functionName = 'deviceManagement';

  // ============================================================================
  // READ OPERATIONS (Client → Firebase Direct)
  // ============================================================================

  /** READ - Direct Firestore query */
  async listDevices(): Promise<Device[]> {
    try {
      console.log('📡 Fetching devices from Firestore...');
      const devicesRef = collection(this.firestore, 'devices');
      
      // Try without orderBy first to see if that's causing issues
      let snapshot;
      try {
        const q = query(devicesRef, orderBy('registeredAt', 'desc'));
        snapshot = await getDocs(q);
        console.log('📊 Firestore query with orderBy completed:', snapshot.size, 'documents found');
      } catch (orderError: any) {
        console.warn('⚠️ OrderBy failed, trying without ordering:', orderError.message);
        // Fallback to query without orderBy
        snapshot = await getDocs(devicesRef);
        console.log('📊 Firestore query without orderBy completed:', snapshot.size, 'documents found');
      }
      
      const devices = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Device document:', doc.id, data);
        return {
          id: doc.id,
          deviceId: doc.id,
          ...data
        } as Device;
      });
      
      console.log('✅ Mapped devices:', devices);
      return devices;
    } catch (error: any) {
      console.error('❌ Error fetching devices from Firestore:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw new Error('Failed to list devices');
    }
  }

  /** READ - Real-time RTDB listener */
  subscribeToSensorReadings(
    deviceId: string,
    onUpdate: (reading: SensorReading | null) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    return onValue(
      ref(this.db, `sensorReadings/${deviceId}/latestReading`),
      (snapshot) => onUpdate(snapshot.val()),
      (err) => onError(err instanceof Error ? err : new Error('Failed to fetch sensor data'))
    );
  }

  /** READ - Real-time RTDB listener */
  subscribeToSensorHistory(
    deviceId: string,
    onUpdate: (history: SensorReading[]) => void,
    onError: (error: Error) => void,
    limit: number = 50
  ): Unsubscribe {
    return onValue(
      ref(this.db, `sensorReadings/${deviceId}/history`),
      (snapshot) => {
        const data = snapshot.val();
        const readings = data ? (Object.values(data) as SensorReading[]) : [];
        onUpdate(readings.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit));
      },
      (err) => onError(err instanceof Error ? err : new Error('Failed to fetch sensor history'))
    );
  }

  /** READ - Get sensor readings once (async) */
  async getSensorReadings(deviceId: string): Promise<SensorReading | null> {
    try {
      const snapshot = await new Promise<any>((resolve, reject) => {
        const unsubscribe = onValue(
          ref(this.db, `sensorReadings/${deviceId}/latestReading`),
          (snapshot) => {
            unsubscribe();
            resolve(snapshot);
          },
          (error) => {
            unsubscribe();
            reject(error);
          }
        );
      });
      return snapshot.val() as SensorReading | null;
    } catch (error) {
      console.error(`Error fetching sensor readings for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch sensor readings for device ${deviceId}`);
    }
  }

  /** READ - Get sensor history once (async) */
  async getSensorHistory(deviceId: string, limit: number = 50): Promise<SensorReading[]> {
    try {
      const snapshot = await new Promise<any>((resolve, reject) => {
        const unsubscribe = onValue(
          ref(this.db, `sensorReadings/${deviceId}/history`),
          (snapshot) => {
            unsubscribe();
            resolve(snapshot);
          },
          (error) => {
            unsubscribe();
            reject(error);
          }
        );
      });
      
      const data = snapshot.val();
      const readings = data ? (Object.values(data) as SensorReading[]) : [];
      return readings.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    } catch (error) {
      console.error(`Error fetching sensor history for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch sensor history for device ${deviceId}`);
    }
  }

  /** READ - Real-time RTDB listeners */
  subscribeToMultipleDevices(
    deviceIds: string[],
    onUpdate: (deviceId: string, reading: SensorReading | null) => void,
    onError: (deviceId: string, error: Error) => void
  ): () => void {
    const unsubscribers = deviceIds.map((deviceId) =>
      this.subscribeToSensorReadings(
        deviceId,
        (reading) => onUpdate(deviceId, reading),
        (error) => onError(deviceId, error)
      )
    );

    return () => unsubscribers.forEach((unsub) => unsub());
  }

  // ============================================================================
  // WRITE OPERATIONS (Client → Cloud Functions → Firebase)
  // ============================================================================

  private async callFunction<T = any>(payload: any, errorMsg: string): Promise<T> {
    try {
      const callable = httpsCallable<any, DeviceResponse>(this.functions, this.functionName);
      const result = await callable(payload);
      return result.data as T;
    } catch (error: any) {
      throw this.handleError(error, errorMsg);
    }
  }

  /** WRITE - Cloud Function */
  async addDevice(deviceId: string, deviceData: DeviceData): Promise<Device> {
    const result = await this.callFunction<DeviceResponse>(
      { action: 'addDevice', deviceId, deviceData },
      'Failed to add device'
    );
    if (!result.device) throw new Error('Device creation failed');
    return result.device;
  }

  /** WRITE - Cloud Function */
  async updateDevice(deviceId: string, deviceData: DeviceData): Promise<void> {
    await this.callFunction(
      { action: 'updateDevice', deviceId, deviceData },
      `Failed to update device ${deviceId}`
    );
  }

  /** WRITE - Cloud Function */
  async deleteDevice(deviceId: string): Promise<void> {
    await this.callFunction(
      { action: 'deleteDevice', deviceId },
      `Failed to delete device ${deviceId}`
    );
  }

  /** WRITE - Cloud Function */
  async discoverDevices(): Promise<void> {
    await this.callFunction({ action: 'discoverDevices' }, 'Failed to send discovery command');
  }

  /** WRITE - Cloud Function */
  async sendCommand(deviceId: string, command: string, params?: CommandParams): Promise<void> {
    await this.callFunction(
      { action: 'sendCommand', deviceId, command, params },
      `Failed to send command to device ${deviceId}`
    );
  }

  /** WRITE - Cloud Function (via updateDevice) */
  async registerDevice(deviceId: string, building: string, floor: string, notes?: string): Promise<void> {
    await this.updateDevice(deviceId, {
      metadata: { location: { building, floor, notes: notes || '' } }
    });
  }

  /** WRITE - Cloud Function (via sendCommand) */
  async sendStatusCommand(deviceId: string): Promise<void> {
    await this.sendCommand(deviceId, 'STATUS');
  }

  /** WRITE - Cloud Function (via updateDevice) */
  async setMaintenanceMode(deviceId: string): Promise<void> {
    await this.updateDevice(deviceId, { status: 'maintenance' });
  }

  /** WRITE - Cloud Function (via updateDevice) */
  async setOnline(deviceId: string): Promise<void> {
    await this.updateDevice(deviceId, { status: 'online' });
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private static readonly ERROR_MESSAGES: Record<string, string> = {
    'functions/unauthenticated': 'Please log in to perform this action',
    'functions/permission-denied': 'You do not have permission to perform this action',
    'functions/not-found': 'Device not found',
    'functions/already-exists': 'Device already exists',
    'functions/invalid-argument': 'Invalid request parameters',
    'functions/internal': 'An internal error occurred. Please try again',
    'functions/unavailable': 'Service temporarily unavailable. Please try again',
    'functions/deadline-exceeded': 'Request timeout. Please try again',
  };

  private handleError(error: any, defaultMessage: string): ErrorResponse {
    console.error('DeviceManagementService error:', error);

    const code = error.code || 'unknown';
    const message = error.message || defaultMessage;
    const friendlyMessage = code === 'functions/failed-precondition' 
      ? message 
      : DeviceManagementService.ERROR_MESSAGES[code] || message;

    return { code, message: friendlyMessage, details: error.details };
  }
}

export const deviceManagementService = new DeviceManagementService();
export default deviceManagementService;
