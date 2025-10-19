import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as mqtt from "mqtt";
import {Request} from "firebase-functions/v2/https";

// ===========================
// TYPE DEFINITIONS
// ===========================

// MQTT Types
type MqttProtocol = "mqtt" | "mqtts" | "ws" | "wss";

interface MqttConfig {
  broker: string;
  port: number;
  username: string;
  password: string;
  protocol: MqttProtocol;
}

interface MqttTopics {
  DISCOVERY: string;
  REGISTRATION: string;
  SENSOR_DATA: string;
  COMMAND: string;
  STATUS: string;
}

// Device Types
interface DeviceMetadata {
  location?: string;
  description?: string;
  owner?: string;
  [key: string]: any;
}

interface DeviceData {
  deviceId?: string;
  name?: string;
  type?: string;
  firmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  sensors?: string[];
  status?: DeviceStatus;
  metadata?: DeviceMetadata;
}

interface Device {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  status: DeviceStatus;
  registeredAt: admin.firestore.FieldValue;
  lastSeen: admin.firestore.FieldValue;
  metadata: DeviceMetadata;
}

type DeviceStatus = "online" | "offline" | "error" | "maintenance";

// Sensor Types
interface SensorReading {
  deviceId: string;
  turbidity: number;
  tds: number;
  ph: number;
  temperature: number;
  timestamp: number;
  receivedAt: number;
}

interface SensorData {
  turbidity?: number;
  tds?: number;
  ph?: number;
  temperature?: number;
  timestamp?: number;
}

// Request/Response Types
type DeviceAction =
  | "DISCOVER_DEVICES"
  | "ADD_DEVICE"
  | "GET_DEVICE"
  | "UPDATE_DEVICE"
  | "DELETE_DEVICE"
  | "LIST_DEVICES"
  | "GET_SENSOR_READINGS"
  | "START_MQTT_LISTENER";

interface DeviceManagementRequest {
  action: DeviceAction;
  deviceId?: string;
  deviceData?: DeviceData;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

interface DeviceResponse extends ApiResponse {
  device?: Device | admin.firestore.DocumentData;
}

interface DevicesListResponse extends ApiResponse {
  count?: number;
  devices?: Array<{id: string} & admin.firestore.DocumentData>;
}

interface SensorReadingResponse extends ApiResponse {
  deviceId?: string;
  sensorData?: SensorReading | null;
}

// Discovery Message Types
interface DiscoveryMessage {
  command: string;
  timestamp: number;
  requestId: string;
}

interface DeviceRegistrationInfo {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
}

// ===========================
// INITIALIZATION
// ===========================

// Initialize Firebase Admin
admin.initializeApp();
const db: admin.firestore.Firestore = admin.firestore();
const rtdb: admin.database.Database = admin.database();

// Set global options
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
  timeoutSeconds: 60,
});

// MQTT Configuration
const MQTT_CONFIG: MqttConfig = {
  broker: "36965de434ff42a4a93a697c94a13ad7.s1.eu.hivemq.cloud",
  port: 8883,
  username: "functions2025",
  password: "Jaffmier@0924",
  protocol: "mqtts",
};

// MQTT Topics
const TOPICS: MqttTopics = {
  DISCOVERY: "device/discovery/request",
  REGISTRATION: "device/registration/+",
  SENSOR_DATA: "device/sensordata/+",
  COMMAND: "device/command/+",
  STATUS: "device/status/+",
};

// ===========================
// MAIN FUNCTION
// ===========================

// Device Management Function with Switch Case
export const deviceManagement = onRequest(
  {cors: true},
  async (req: Request, res): Promise<void> => {
    try {
      const {action, deviceId, deviceData} =
        req.body as DeviceManagementRequest;

      if (!action) {
        res.status(400).json({
          success: false,
          error: "Action is required",
        } as ApiResponse);
        return;
      }

      // Switch case for different operations
      switch (action) {
        case "DISCOVER_DEVICES": {
          await handleDiscoverDevices();
          res.status(200).json({
            success: true,
            message: "Discovery message sent to MQTT",
          } as ApiResponse);
          break;
        }

        case "ADD_DEVICE": {
          if (!deviceId) {
            res.status(400).json({
              success: false,
              error: "Device ID is required",
            } as ApiResponse);
            return;
          }
          const addResult: DeviceResponse = await handleAddDevice(
            deviceId,
            deviceData || {}
          );
          res.status(200).json(addResult);
          break;
        }

        case "GET_DEVICE": {
          if (!deviceId) {
            res.status(400).json({
              success: false,
              error: "Device ID is required",
            } as ApiResponse);
            return;
          }
          const device: DeviceResponse = await handleGetDevice(deviceId);
          res.status(200).json(device);
          break;
        }

        case "UPDATE_DEVICE": {
          if (!deviceId) {
            res.status(400).json({
              success: false,
              error: "Device ID is required",
            } as ApiResponse);
            return;
          }
          const updateResult: ApiResponse = await handleUpdateDevice(
            deviceId,
            deviceData || {}
          );
          res.status(200).json(updateResult);
          break;
        }

        case "DELETE_DEVICE": {
          if (!deviceId) {
            res.status(400).json({
              success: false,
              error: "Device ID is required",
            } as ApiResponse);
            return;
          }
          const deleteResult: ApiResponse = await handleDeleteDevice(deviceId);
          res.status(200).json(deleteResult);
          break;
        }

        case "LIST_DEVICES": {
          const devices: DevicesListResponse = await handleListDevices();
          res.status(200).json(devices);
          break;
        }

        case "GET_SENSOR_READINGS": {
          if (!deviceId) {
            res.status(400).json({
              success: false,
              error: "Device ID is required",
            } as ApiResponse);
            return;
          }
          const readings: SensorReadingResponse = await handleGetSensorReadings(
            deviceId
          );
          res.status(200).json(readings);
          break;
        }

        case "START_MQTT_LISTENER": {
          await startMqttSensorListener();
          res.status(200).json({
            success: true,
            message: "MQTT sensor listener started",
          } as ApiResponse);
          break;
        }

        default: {
          res.status(400).json({
            success: false,
            error: "Invalid action specified",
          } as ApiResponse);
        }
      }
    } catch (error) {
      console.error("Error in deviceManagement:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse);
    }
  }
);

// ===========================
// HANDLER FUNCTIONS
// ===========================

// DISCOVER DEVICES - Send discovery message to MQTT
async function handleDiscoverDevices(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const client: mqtt.MqttClient = mqtt.connect(MQTT_CONFIG.broker, {
      port: MQTT_CONFIG.port,
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
      protocol: MQTT_CONFIG.protocol,
    });

    client.on("connect", () => {
      const discoveryMessage: DiscoveryMessage = {
        command: "DISCOVER",
        timestamp: Date.now(),
        requestId: `discovery_${Date.now()}`,
      };

      client.publish(
        TOPICS.DISCOVERY,
        JSON.stringify(discoveryMessage),
        {qos: 1},
        (error?: Error) => {
          if (error) {
            console.error("MQTT Publish Error:", error);
            client.end();
            reject(error);
          } else {
            console.log("Discovery message sent successfully");
            client.end();
            resolve();
          }
        }
      );
    });

    client.on("error", (error: Error) => {
      console.error("MQTT Connection Error:", error);
      reject(error);
    });
  });
}

// ADD DEVICE - Create new device in Firestore
async function handleAddDevice(
  deviceId: string,
  deviceData: DeviceData
): Promise<DeviceResponse> {
  try {
    const deviceRef: admin.firestore.DocumentReference =
      db.collection("devices").doc(deviceId);
    const doc: admin.firestore.DocumentSnapshot = await deviceRef.get();

    if (doc.exists) {
      return {
        success: false,
        error: "Device already exists",
      };
    }

    const newDevice: Device = {
      deviceId: deviceId,
      name: deviceData.name || `Device-${deviceId}`,
      type: deviceData.type || "Arduino UNO R4 WiFi",
      firmwareVersion: deviceData.firmwareVersion || "1.0.0",
      macAddress: deviceData.macAddress || "",
      ipAddress: deviceData.ipAddress || "",
      sensors: deviceData.sensors || ["turbidity", "tds", "ph"],
      status: (deviceData.status as DeviceStatus) || "online",
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      metadata: deviceData.metadata || {},
    };

    await deviceRef.set(newDevice);

    // Initialize Realtime Database structure for sensor data
    await rtdb.ref(`sensorReadings/${deviceId}`).set({
      deviceId: deviceId,
      latestReading: null,
      status: "waiting_for_data",
    });

    return {
      success: true,
      message: "Device added successfully",
      data: {
        deviceId: deviceId,
        device: newDevice,
      },
    };
  } catch (error) {
    throw new Error(
      `Add device failed: ${error instanceof Error ? error.message : error}`
    );
  }
}

// GET DEVICE - Read device from Firestore
async function handleGetDevice(deviceId: string): Promise<DeviceResponse> {
  try {
    const deviceRef: admin.firestore.DocumentReference =
      db.collection("devices").doc(deviceId);
    const doc: admin.firestore.DocumentSnapshot = await deviceRef.get();

    if (!doc.exists) {
      return {
        success: false,
        error: "Device not found",
      };
    }

    return {
      success: true,
      device: doc.data(),
    };
  } catch (error) {
    throw new Error(
      `Get device failed: ${error instanceof Error ? error.message : error}`
    );
  }
}

// UPDATE DEVICE - Update device in Firestore
async function handleUpdateDevice(
  deviceId: string,
  deviceData: DeviceData
): Promise<ApiResponse> {
  try {
    const deviceRef: admin.firestore.DocumentReference =
      db.collection("devices").doc(deviceId);
    const doc: admin.firestore.DocumentSnapshot = await deviceRef.get();

    if (!doc.exists) {
      return {
        success: false,
        error: "Device not found",
      };
    }

    const updateData: Partial<Device> & {
      updatedAt: admin.firestore.FieldValue;
      lastSeen: admin.firestore.FieldValue;
    } = {
      ...deviceData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    };

    await deviceRef.update(updateData);

    return {
      success: true,
      message: "Device updated successfully",
      data: {deviceId},
    };
  } catch (error) {
    throw new Error(
      `Update device failed: ${error instanceof Error ? error.message : error}`
    );
  }
}

// DELETE DEVICE - Delete device from Firestore
async function handleDeleteDevice(deviceId: string): Promise<ApiResponse> {
  try {
    const deviceRef: admin.firestore.DocumentReference =
      db.collection("devices").doc(deviceId);
    const doc: admin.firestore.DocumentSnapshot = await deviceRef.get();

    if (!doc.exists) {
      return {
        success: false,
        error: "Device not found",
      };
    }

    await deviceRef.delete();

    // Also delete sensor readings from Realtime Database
    await rtdb.ref(`sensorReadings/${deviceId}`).remove();

    return {
      success: true,
      message: "Device deleted successfully",
      data: {deviceId},
    };
  } catch (error) {
    throw new Error(
      `Delete device failed: ${error instanceof Error ? error.message : error}`
    );
  }
}

// LIST DEVICES - Get all devices
async function handleListDevices(): Promise<DevicesListResponse> {
  try {
    const devicesSnapshot: admin.firestore.QuerySnapshot =
      await db.collection("devices").get();

    const devices = devicesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      count: devices.length,
      devices: devices,
    };
  } catch (error) {
    throw new Error(
      `List devices failed: ${error instanceof Error ? error.message : error}`
    );
  }
}

// GET SENSOR READINGS - Retrieve sensor data from Realtime Database
async function handleGetSensorReadings(
  deviceId: string
): Promise<SensorReadingResponse> {
  try {
    const snapshot: admin.database.DataSnapshot = await rtdb
      .ref(`sensorReadings/${deviceId}/latestReading`)
      .once("value");

    if (!snapshot.exists()) {
      return {
        success: false,
        error: "No sensor readings found for this device",
      };
    }

    const sensorData: SensorReading = snapshot.val();

    return {
      success: true,
      deviceId: deviceId,
      sensorData: sensorData,
    };
  } catch (error) {
    throw new Error(
      `Get sensor readings failed: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

// MQTT SENSOR LISTENER - Listen for sensor data and store in Realtime Database
async function startMqttSensorListener(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const client: mqtt.MqttClient = mqtt.connect(MQTT_CONFIG.broker, {
      port: MQTT_CONFIG.port,
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
      protocol: MQTT_CONFIG.protocol,
      keepalive: 60,
      reconnectPeriod: 5000,
    });

    client.on("connect", () => {
      console.log("Connected to MQTT broker for sensor data");

      // Subscribe to sensor data topic
      client.subscribe(TOPICS.SENSOR_DATA, {qos: 1}, (error?: Error) => {
        if (error) {
          console.error("Subscription error:", error);
          reject(error);
        } else {
          console.log("Subscribed to sensor data topic");
          resolve();
        }
      });
    });

    client.on("message", async (topic: string, message: Buffer) => {
      try {
        console.log(`Message received on topic: ${topic}`);

        // Extract deviceId from topic (device/sensordata/arduino_uno_r4_001)
        const topicParts: string[] = topic.split("/");
        const deviceId: string = topicParts[topicParts.length - 1];

        // Parse sensor data
        const sensorData: SensorData = JSON.parse(message.toString());
        console.log("Sensor data:", sensorData);

        // Prepare data for Realtime Database
        const readingData: SensorReading = {
          deviceId: deviceId,
          turbidity: sensorData.turbidity || 0,
          tds: sensorData.tds || 0,
          ph: sensorData.ph || 0,
          temperature: sensorData.temperature || 0,
          timestamp: Date.now(),
          receivedAt: admin.database.ServerValue.TIMESTAMP,
        };

        // Store in Realtime Database - Latest Reading (for real-time monitoring)
        await rtdb
          .ref(`sensorReadings/${deviceId}/latestReading`)
          .set(readingData);

        // Store in Realtime Database - Historical Data
        await rtdb
          .ref(`sensorReadings/${deviceId}/history`)
          .push(readingData);

        // Update device last seen in Firestore
        await db
          .collection("devices")
          .doc(deviceId)
          .update({
            lastSeen: admin.firestore.FieldValue.serverTimestamp(),
            status: "online",
          });

        console.log(`Sensor data stored for device: ${deviceId}`);
      } catch (error) {
        console.error("Error processing sensor data:", error);
      }
    });

    client.on("error", (error: Error) => {
      console.error("MQTT Error:", error);
      reject(error);
    });

    client.on("offline", () => {
      console.log("MQTT client went offline");
    });

    client.on("reconnect", () => {
      console.log("MQTT client reconnecting...");
    });
  });
}

// ===========================
// EXPORTED FUNCTIONS
// ===========================

// MQTT Device Registration Listener
export const mqttDeviceListener = onRequest(
  {timeoutSeconds: 300, cors: true},
  async (req: Request, res): Promise<void> => {
    const client: mqtt.MqttClient = mqtt.connect(MQTT_CONFIG.broker, {
      port: MQTT_CONFIG.port,
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
      protocol: MQTT_CONFIG.protocol,
    });

    client.on("connect", () => {
      console.log("Connected to MQTT broker");
      client.subscribe(TOPICS.REGISTRATION, {qos: 1});
    });

    client.on("message", async (topic: string, message: Buffer) => {
      try {
        const deviceInfo: DeviceRegistrationInfo = JSON.parse(
          message.toString()
        );
        console.log("Device registration received:", deviceInfo);

        // Auto-register device
        await handleAddDevice(deviceInfo.deviceId, deviceInfo);

        console.log(`Device ${deviceInfo.deviceId} registered successfully`);
      } catch (error) {
        console.error("Error processing device registration:", error);
      }
    });

    client.on("error", (error: Error) => {
      console.error("MQTT Error:", error);
    });

    res.status(200).json({
      success: true,
      message: "MQTT device registration listener started",
    } as ApiResponse);
  }
);

// Start MQTT Sensor Listener on Function Initialization
export const initializeMqttListener = onRequest(
  {timeoutSeconds: 540, cors: true},
  async (req: Request, res): Promise<void> => {
    try {
      await startMqttSensorListener();
      res.status(200).json({
        success: true,
        message: "MQTT sensor listener initialized successfully",
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse);
    }
  }
);
