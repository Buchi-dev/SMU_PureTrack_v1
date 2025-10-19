// API service for Firebase Functions using Axios
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { 
  safeParseApiResponse, 
  type ApiResponse, 
  type Device, 
  type SensorReading 
} from '../schemas';

const API_URL = 'https://us-central1-my-app-da530.cloudfunctions.net/deviceManagement';

// Create Axios instance with default configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

export const api = {
  // List all devices
  listDevices: async (): Promise<Device[]> => {
    const { data } = await axiosInstance.post('', {
      action: 'LIST_DEVICES',
    });
    
    // Validate response with Zod
    const validationResult = safeParseApiResponse(data);
    if (!validationResult.success) {
      console.error('Invalid API response:', validationResult.error);
      throw new Error('Invalid response from server');
    }
    
    return validationResult.data.devices || [];
  },

  // Get specific device
  getDevice: async (deviceId: string): Promise<Device | null> => {
    const { data } = await axiosInstance.post<ApiResponse>('', {
      action: 'GET_DEVICE',
      deviceId,
    });
    return data.device || null;
  },

  // Get latest sensor readings
  getSensorReadings: async (deviceId: string): Promise<SensorReading | null> => {
    const { data } = await axiosInstance.post<ApiResponse>('', {
      action: 'GET_SENSOR_READINGS',
      deviceId,
    });
    return data.sensorData || null;
  },

  // Get sensor history
  getSensorHistory: async (deviceId: string, limit = 50): Promise<SensorReading[]> => {
    const { data } = await axiosInstance.post<ApiResponse>('', {
      action: 'GET_SENSOR_HISTORY',
      deviceId,
      limit,
    });
    return data.history || [];
  },

  // Send command to device
  sendCommand: async (deviceId: string, command: string, params?: Record<string, any>): Promise<boolean> => {
    const { data } = await axiosInstance.post<ApiResponse>('', {
      action: 'SEND_COMMAND',
      deviceId,
      command,
      params,
    });
    return data.success;
  },

  // Discover devices
  discoverDevices: async (): Promise<boolean> => {
    const { data } = await axiosInstance.post<ApiResponse>('', {
      action: 'DISCOVER_DEVICES',
    });
    return data.success;
  },

  // Add new device
  addDevice: async (deviceId: string, deviceData: Partial<Device>): Promise<boolean> => {
    const { data } = await axiosInstance.post<ApiResponse>('', {
      action: 'ADD_DEVICE',
      deviceId,
      deviceData,
    });
    return data.success;
  },

  // Update device
  updateDevice: async (deviceId: string, deviceData: Partial<Device>): Promise<boolean> => {
    const { data } = await axiosInstance.post<ApiResponse>('', {
      action: 'UPDATE_DEVICE',
      deviceId,
      deviceData,
    });
    return data.success;
  },

  // Delete device
  deleteDevice: async (deviceId: string): Promise<boolean> => {
    const { data } = await axiosInstance.post<ApiResponse>('', {
      action: 'DELETE_DEVICE',
      deviceId,
    });
    return data.success;
  },
};
