/*
 * Water Quality Monitoring System - MQTT OPTIMIZED
 * Arduino UNO R4 WiFi with Advanced Sensor Calibration + MQTT Integration
 * MQTT v3.1.1 OPTIMIZED VERSION with HiveMQ Broker
 * Sensors: TDS (Calibrated), pH (Calibrated), Turbidity (Calibrated)
 * 
 * Author: IoT Water Quality Project - MQTT Version
 * Date: 2025
 * Firmware: v6.0.0 - MQTT Integration with Command Handling
 */

#include <WiFiS3.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "Arduino_LED_Matrix.h"

// ===========================
// CONFIGURATION
// ===========================

// USER MODES
bool sendToServer = true;          // MQTT publishing enabled
bool isCalibrationMode = false;     // Set to false for normal operation

// WiFi Credentials
#define WIFI_SSID "Yuzon Only"
#define WIFI_PASSWORD "Pldtadmin@2024"

// MQTT Broker Configuration - HiveMQ Cloud Cluster
#define MQTT_BROKER "0331c5286d084675b9198021329c7573.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_CLIENT_ID "arduino_uno_r4_002"
#define MQTT_USERNAME "Admin"  // Leave empty for anonymous connection
#define MQTT_PASSWORD "Admin123"  // Leave empty for anonymous connection

// Device Configuration
#define DEVICE_ID "arduino_uno_r4_002"
#define DEVICE_NAME "Water Quality Monitor R4 MQTT"
#define DEVICE_TYPE "Arduino UNO R4 WiFi"
#define FIRMWARE_VERSION "6.0.0"

// Sensor Pin Configuration
#define TDS_PIN A0
#define PH_PIN A1
#define TURBIDITY_PIN A2

// Timing Configuration - Optimized for MQTT
#define SENSOR_READ_INTERVAL 2000
#define MQTT_PUBLISH_INTERVAL 2000
#define REGISTRATION_INTERVAL 5000
#define MQTT_RECONNECT_INTERVAL 5000
#define STATUS_UPDATE_INTERVAL 30000  // Send status every 30 seconds

// ===========================
// ADVANCED CALIBRATION DATA
// ===========================

const int CALIB_COUNT = 4;
const int calibADC[CALIB_COUNT] = {105, 116, 224, 250};
const float calibPPM[CALIB_COUNT] = {236.0, 278.0, 1220.0, 1506.0};

const int PH_CALIB_COUNT = 3;
const int phCalibADC[PH_CALIB_COUNT] = {482, 503, 532};
const float phCalibPH[PH_CALIB_COUNT] = {9.81, 6.81, 4.16};

const float TDS_CALIBRATION_FACTOR = 0.589;
const float TDS_OFFSET = 0.0;

// ===========================
// SMA SMOOTHING BUFFERS
// ===========================

const int SMA_SIZE = 8;
int smaBuffer[SMA_SIZE];
int smaIndex = 0;
long smaSum = 0;
int smaCount = 0;

const int TURB_SMA_SIZE = 5;
int turbBuffer[TURB_SMA_SIZE];
int turbIndex = 0;
long turbSum = 0;
int turbCount = 0;

const int PH_SMA_SIZE = 5;
int phBuffer[PH_SMA_SIZE];
int phIndex = 0;
long phSum = 0;
int phCount = 0;

float fitSlope = 0.0;
float fitIntercept = 0.0;

// ===========================
// GLOBAL OBJECTS - MQTT OPTIMIZED
// ===========================
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
ArduinoLEDMatrix matrix;

// ===========================
// GLOBAL VARIABLES
// ===========================
unsigned long lastSensorRead = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastRegistrationAttempt = 0;
unsigned long lastMqttReconnect = 0;
unsigned long lastStatusUpdate = 0;

bool isRegistered = false;
bool isApproved = false;
bool mqttConnected = false;

float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;

int consecutiveFailures = 0;
const int MAX_FAILURES = 3;

// MQTT Topics
String topicData = "devices/" + String(DEVICE_ID) + "/data";
String topicStatus = "devices/" + String(DEVICE_ID) + "/status";
String topicRegister = "devices/" + String(DEVICE_ID) + "/register";
String topicCommands = "devices/" + String(DEVICE_ID) + "/commands";

enum MatrixState {
  CONNECTING,
  IDLE,
  HEARTBEAT,
  MQTT_CONNECTING
};

MatrixState matrixState = CONNECTING;
MatrixState previousState = CONNECTING;

// ===========================
// SETUP FUNCTION - MQTT OPTIMIZED
// ===========================
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000);

  Serial.println("=== Arduino UNO R4 MQTT Optimized ===");
  Serial.println("Firmware: v6.0.0 - MQTT Integration with HiveMQ");
  
  // Initialize LED Matrix
  matrix.begin();
  matrix.loadSequence(LEDMATRIX_ANIMATION_STARTUP);
  matrix.play(false);
  
  while (!matrix.sequenceDone()) {
    delay(50);
  }

  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);

  // Initialize buffers
  for (int i = 0; i < SMA_SIZE; i++) smaBuffer[i] = 0;
  for (int i = 0; i < PH_SMA_SIZE; i++) phBuffer[i] = 0;
  for (int i = 0; i < TURB_SMA_SIZE; i++) turbBuffer[i] = 0;

  // Compute calibration parameters
  computeCalibrationParams();

  printCalibrationInfo();

  // Initialize MQTT client
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(30);

  Serial.println("MQTT Client initialized:");
  Serial.println("  - Broker: 0331c5286d084675b9198021329c7573.s1.eu.hivemq.cloud:8883");
  Serial.println("  - Client ID: " + String(MQTT_CLIENT_ID));
  Serial.println("  - Topics configured for device communication");

  matrixState = CONNECTING;
  matrix.loadSequence(LEDMATRIX_ANIMATION_WIFI_SEARCH);
  matrix.play(true);

  connectWiFi();
  connectMQTT();

  if (mqttConnected) {
    matrixState = IDLE;
    matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);
  }

  Serial.println("\n=== DEVICE MODES ===");
  Serial.print("Send to Server: ");
  Serial.println(sendToServer ? "ENABLED (MQTT)" : "DISABLED");
  Serial.print("Calibration Mode: ");
  Serial.println(isCalibrationMode ? "ENABLED (250ms)" : "DISABLED");
  
  if (!isCalibrationMode && sendToServer) {
    // Send initial registration
    sendRegistration();
  }
}

// ===========================
// MAIN LOOP - MQTT OPTIMIZED
// ===========================
void loop() {
  unsigned long currentMillis = millis();

  // Dynamic timing based on mode
  unsigned long readInterval = isCalibrationMode ? 250 : SENSOR_READ_INTERVAL;

  updateMatrixState();

  // WiFi connection management
  if (WiFi.status() != WL_CONNECTED) {
    handleWiFiDisconnection();
    return;
  }

  // MQTT connection management
  if (!mqttClient.connected()) {
    if (currentMillis - lastMqttReconnect >= MQTT_RECONNECT_INTERVAL) {
      lastMqttReconnect = currentMillis;
      connectMQTT();
    }
  } else {
    mqttClient.loop();  // Process incoming MQTT messages
  }

  // Registration mode vs Active mode
  if (!isApproved && sendToServer && !isCalibrationMode) {
    if (currentMillis - lastRegistrationAttempt >= REGISTRATION_INTERVAL) {
      lastRegistrationAttempt = currentMillis;
      sendRegistration();
    }
  } else {
    // Sensor reading logic
    if (currentMillis - lastSensorRead >= readInterval) {
      lastSensorRead = currentMillis;

      if (!isCalibrationMode) {
        Serial.println("--- Reading Sensors (Calibrated) ---");
        if (matrixState == IDLE) {
          matrixState = HEARTBEAT;
          matrix.loadSequence(LEDMATRIX_ANIMATION_HEARTBEAT_LINE);
          matrix.play(false);
        }
      }

      readSensors();

      // Publish data via MQTT
      if (sendToServer && !isCalibrationMode) {
        publishSensorDataMQTT();
      } else if (!sendToServer) {
        if (!isCalibrationMode) {
          Serial.println("(!) sendToServer=false, local readings only.");
        }
      } else if (isCalibrationMode) {
        // Minimal output in calibration mode for speed
      }
    }

    // Send periodic status updates
    if (sendToServer && !isCalibrationMode && currentMillis - lastStatusUpdate >= STATUS_UPDATE_INTERVAL) {
      lastStatusUpdate = currentMillis;
      sendStatusUpdate();
    }
  }

  delay(10);
}

// ===========================
// OPTIMIZED FUNCTIONS
// ===========================

void computeCalibrationParams() {
  float meanX = 0.0, meanY = 0.0;
  for (int i = 0; i < CALIB_COUNT; i++) {
    meanX += (float)calibADC[i];
    meanY += calibPPM[i];
  }
  meanX /= CALIB_COUNT;
  meanY /= CALIB_COUNT;
  
  float num = 0.0, den = 0.0;
  for (int i = 0; i < CALIB_COUNT; i++) {
    float dx = (float)calibADC[i] - meanX;
    float dy = calibPPM[i] - meanY;
    num += dx * dy;
    den += dx * dx;
  }
  
  if (den != 0.0) {
    fitSlope = num / den;
    fitIntercept = meanY - fitSlope * meanX;
  }
}

void printCalibrationInfo() {
  Serial.println("=== CALIBRATION PARAMETERS ===");
  Serial.print("TDS Linear fit: slope=");
  Serial.print(fitSlope, 4);
  Serial.print(" intercept=");
  Serial.println(fitIntercept, 2);
  Serial.print("TDS Factor: ");
  Serial.println(TDS_CALIBRATION_FACTOR, 3);
  Serial.println("================================");
}

void handleWiFiDisconnection() {
  mqttConnected = false;
  consecutiveFailures++;
  connectionActive = false;
  
  if (matrixState != CONNECTING) {
    Serial.println("WiFi lost! Reconnecting...");
    matrixState = CONNECTING;
    matrix.loadSequence(LEDMATRIX_ANIMATION_WIFI_SEARCH);
    matrix.play(true);
  }
  
  connectWiFi();
  
  if (WiFi.status() == WL_CONNECTED) {
    consecutiveFailures = 0;
    connectMQTT();
  }
}

// ===========================
// MQTT FUNCTIONS
// ===========================

void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cannot connect to MQTT - WiFi not connected");
    return;
  }

  if (mqttClient.connected()) {
    return;
  }

  Serial.println("--- Connecting to MQTT Broker ---");
  Serial.print("Broker: ");
  Serial.println(MQTT_BROKER);
  Serial.print("Port: ");
  Serial.println(MQTT_PORT);

  matrixState = MQTT_CONNECTING;
  matrix.loadSequence(LEDMATRIX_ANIMATION_WIFI_SEARCH);
  matrix.play(true);

  // Attempt MQTT connection
  bool connected = false;
  if (strlen(MQTT_USERNAME) > 0) {
    connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD);
  } else {
    connected = mqttClient.connect(MQTT_CLIENT_ID);
  }

  if (connected) {
    Serial.println("✓ MQTT connected!");
    mqttConnected = true;
    consecutiveFailures = 0;

    // Subscribe to commands topic
    if (mqttClient.subscribe(topicCommands.c_str())) {
      Serial.println("✓ Subscribed to commands topic");
    } else {
      Serial.println("✗ Failed to subscribe to commands");
    }

    if (matrixState == MQTT_CONNECTING) {
      matrixState = IDLE;
      matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);
    }
  } else {
    Serial.print("✗ MQTT connection failed, rc=");
    Serial.println(mqttClient.state());
    mqttConnected = false;
    consecutiveFailures++;
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.println("--- MQTT Message Received ---");
  Serial.print("Topic: ");
  Serial.println(topic);

  // Convert payload to string
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';

  Serial.print("Message: ");
  Serial.println(message);

  // Parse JSON message
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (!error) {
    String command = doc["command"] | "";

    if (command == "go") {
      Serial.println("🎉 GO command received!");
      isRegistered = true;
      isApproved = true;
    } else if (command == "deregister") {
      Serial.println("⚠️ DEREGISTER command!");
      isRegistered = false;
      isApproved = false;
    } else if (command == "wait") {
      Serial.println("⏳ WAIT command");
      isRegistered = true;
      isApproved = false;
    } else if (command == "restart") {
      Serial.println("🔄 RESTART command received!");
      delay(1000);
      // Software reset would go here if supported
    } else {
      Serial.println("Unknown command: " + command);
    }
  } else {
    Serial.println("Failed to parse JSON message");
  }
}

// ===========================
// MQTT PUBLISH FUNCTIONS
// ===========================

void publishSensorDataMQTT() {
  if (!mqttClient.connected()) {
    Serial.println("✗ MQTT not connected");
    return;
  }

  // Prepare JSON payload (use stack allocation for efficiency)
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();
  doc["tds"] = round(tds * 10) / 10.0;        // Round to 1 decimal
  doc["pH"] = round(ph * 100) / 100.0;        // Round to 2 decimals
  doc["turbidity"] = round(turbidity * 10) / 10.0;
  doc["messageType"] = "sensor_data";

  String payload;
  serializeJson(doc, payload);

  Serial.println("--- Publishing Sensor Data ---");
  Serial.println(payload);

  // Publish to MQTT topic
  if (mqttClient.publish(topicData.c_str(), payload.c_str(), false)) {  // QoS 0
    Serial.println("✓ Sensor data published!");
    consecutiveFailures = 0;
  } else {
    Serial.println("✗ Failed to publish sensor data");
    consecutiveFailures++;
  }

  // Retry logic
  if (consecutiveFailures >= MAX_FAILURES) {
    Serial.println("Multiple failures - reconnecting MQTT");
    mqttClient.disconnect();
    connectMQTT();
    consecutiveFailures = 0;
  }
}

void sendRegistration() {
  if (!mqttClient.connected()) {
    Serial.println("✗ MQTT not connected - cannot register");
    return;
  }

  Serial.println("--- Sending Registration ---");

  StaticJsonDocument<384> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["type"] = DEVICE_TYPE;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["timestamp"] = millis();
  doc["messageType"] = "registration";

  uint8_t macRaw[6];
  WiFi.macAddress(macRaw);
  char mac[18];
  snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X",
           macRaw[0], macRaw[1], macRaw[2], macRaw[3], macRaw[4], macRaw[5]);
  doc["macAddress"] = mac;
  doc["ipAddress"] = WiFi.localIP().toString();

  JsonArray sensorsArray = doc.createNestedArray("sensors");
  sensorsArray.add("pH");
  sensorsArray.add("turbidity");
  sensorsArray.add("tds");

  String payload;
  serializeJson(doc, payload);

  Serial.println(payload);

  if (mqttClient.publish(topicRegister.c_str(), payload.c_str(), true)) {  // QoS 1 for registration
    Serial.println("✓ Registration sent!");
  } else {
    Serial.println("✗ Registration failed!");
  }
}

void sendStatusUpdate() {
  if (!mqttClient.connected()) {
    Serial.println("✗ MQTT not connected - cannot send status");
    return;
  }

  Serial.println("--- Sending Status Update ---");

  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();
  doc["status"] = "online";
  doc["uptime"] = millis() / 1000;  // uptime in seconds
  doc["wifiRSSI"] = WiFi.RSSI();
  doc["messageType"] = "device_status";
  doc["firmwareVersion"] = FIRMWARE_VERSION;

  String payload;
  serializeJson(doc, payload);

  Serial.println(payload);

  if (mqttClient.publish(topicStatus.c_str(), payload.c_str(), false)) {  // QoS 0
    Serial.println("✓ Status update sent!");
  } else {
    Serial.println("✗ Status update failed!");
  }
}

// ===========================
// LED MATRIX & HELPER FUNCTIONS
// ===========================

void updateMatrixState() {
  if (matrixState == HEARTBEAT && matrix.sequenceDone()) {
    matrixState = IDLE;
    matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);
  }
  
  if (matrixState != previousState) {
    previousState = matrixState;
  }
}

void connectWiFi() {
  Serial.print("Connecting to: ");
  Serial.println(WIFI_SSID);
  
  WiFi.disconnect();
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    Serial.print(".");
    delay(500);
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n✗ WiFi failed!");
    delay(5000);
    connectWiFi();
  } else {
    Serial.println("\n✓ WiFi connected!");
    
    // Wait for valid IP
    attempts = 0;
    while (WiFi.localIP() == IPAddress(0, 0, 0, 0) && attempts < 20) {
      delay(500);
      attempts++;
    }
    
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  }
}

void testMQTTConnection() {
  Serial.println("Testing MQTT connection...");
  
  if (connectMQTT()) {
    Serial.println("✓ MQTT connection test successful!");
  } else {
    Serial.println("✗ MQTT connection test failed!");
  }
}

// ===========================
// CALIBRATION FUNCTIONS
// ===========================

float adcToPPM(int adc) {
  if (CALIB_COUNT <= 0) return 0.0;

  for (int i = 0; i < CALIB_COUNT; i++) {
    if (adc == calibADC[i]) return calibPPM[i];
  }

  for (int i = 0; i < CALIB_COUNT - 1; i++) {
    int x0 = calibADC[i];
    int x1 = calibADC[i + 1];
    if (adc > x0 && adc < x1) {
      float y0 = calibPPM[i];
      float y1 = calibPPM[i + 1];
      float slope = (y1 - y0) / (float)(x1 - x0);
      return y0 + slope * (adc - x0);
    }
  }

  if (adc < calibADC[0] && CALIB_COUNT >= 2) {
    float slope = (calibPPM[1] - calibPPM[0]) / (float)(calibADC[1] - calibADC[0]);
    return calibPPM[0] + slope * (adc - calibADC[0]);
  }

  if (adc > calibADC[CALIB_COUNT - 1] && CALIB_COUNT >= 2) {
    int last = CALIB_COUNT - 1;
    float slope = (calibPPM[last] - calibPPM[last - 1]) / (float)(calibADC[last] - calibADC[last - 1]);
    return calibPPM[last] + slope * (adc - calibADC[last]);
  }

  return fitSlope * (float)adc + fitIntercept;
}

float adcToPH(int adc) {
  if (PH_CALIB_COUNT <= 0) return 7.0;

  for (int i = 0; i < PH_CALIB_COUNT; i++) {
    if (adc == phCalibADC[i]) return phCalibPH[i];
  }

  for (int i = 0; i < PH_CALIB_COUNT - 1; i++) {
    int x0 = phCalibADC[i];
    int x1 = phCalibADC[i + 1];
    if (adc >= x0 && adc <= x1) {
      float y0 = phCalibPH[i];
      float y1 = phCalibPH[i + 1];
      float slope = (y1 - y0) / (float)(x1 - x0);
      return y0 + slope * (adc - x0);
    }
  }

  if (adc < phCalibADC[0] && PH_CALIB_COUNT >= 2) {
    float slope = (phCalibPH[1] - phCalibPH[0]) / (float)(phCalibADC[1] - phCalibADC[0]);
    return phCalibPH[0] + slope * (adc - phCalibADC[0]);
  }

  if (adc > phCalibADC[PH_CALIB_COUNT - 1] && PH_CALIB_COUNT >= 2) {
    int last = PH_CALIB_COUNT - 1;
    float slope = (phCalibPH[last] - phCalibPH[last - 1]) / (float)(phCalibADC[last] - phCalibADC[last - 1]);
    return phCalibPH[last] + slope * (adc - phCalibADC[last]);
  }

  return 7.0;
}

float calculateTurbidityNTU(int adcValue) {
  float slope = -0.1613;
  float intercept = 27.74;
  float ntu = slope * (float)adcValue + intercept;
  return (ntu < 0) ? 0 : ntu;
}

String getTurbidityStatus(float ntu) {
  return (ntu < 35.0) ? "Very Clean" : "Very Cloudy";
}

// ===========================
// SENSOR READING
// ===========================

void readSensors() {
  int value0 = analogRead(TDS_PIN);
  int value1 = analogRead(PH_PIN);
  int value2 = analogRead(TURBIDITY_PIN);

  // Update smoothing buffers
  phSum -= phBuffer[phIndex];
  phBuffer[phIndex] = value1;
  phSum += phBuffer[phIndex];
  phIndex = (phIndex + 1) % PH_SMA_SIZE;
  if (phCount < PH_SMA_SIZE) phCount++;

  turbSum -= turbBuffer[turbIndex];
  turbBuffer[turbIndex] = value2;
  turbSum += turbBuffer[turbIndex];
  turbIndex = (turbIndex + 1) % TURB_SMA_SIZE;
  if (turbCount < TURB_SMA_SIZE) turbCount++;

  smaSum -= smaBuffer[smaIndex];
  smaBuffer[smaIndex] = value0;
  smaSum += smaBuffer[smaIndex];
  smaIndex = (smaIndex + 1) % SMA_SIZE;
  if (smaCount < SMA_SIZE) smaCount++;

  int averagedADC = smaSum / max(1, smaCount);
  int averagedTurbADC = turbSum / max(1, turbCount);
  int averagedPHADC = phSum / max(1, phCount);

  float voltage = (float)averagedADC * (5.0 / 16383.0);
  float ppm = adcToPPM(averagedADC);
  float calibratedPPM = (ppm * TDS_CALIBRATION_FACTOR) + TDS_OFFSET;
  float phValue = adcToPH(averagedPHADC);

  if (phValue < 0.0) phValue = 0.0;
  if (phValue > 14.0) phValue = 14.0;

  int turbADC10bit = averagedTurbADC / 16;
  float ntu = calculateTurbidityNTU(turbADC10bit);

  tds = calibratedPPM;
  ph = phValue;
  turbidity = ntu;

  // Only print detailed output if NOT in calibration mode
  if (!isCalibrationMode) {
    Serial.print("A0(raw): ");
    Serial.print(value0);
    Serial.print(" | A0(avg): ");
    Serial.print(averagedADC);
    Serial.print(" | V: ");
    Serial.print(voltage, 3);
    Serial.print(" | TDS: ");
    Serial.print(calibratedPPM, 1);
    Serial.println(" ppm");

    Serial.print("A1(raw): ");
    Serial.print(value1);
    Serial.print(" | A1(avg): ");
    Serial.print(averagedPHADC);
    Serial.print(" | pH: ");
    Serial.println(phValue, 2);

    Serial.print("A2(raw): ");
    Serial.print(value2);
    Serial.print(" | A2(avg): ");
    Serial.print(averagedTurbADC);
    Serial.print(" | Turbidity: ");
    Serial.print(ntu, 2);
    Serial.print(" NTU | ");
    Serial.println(getTurbidityStatus(ntu));
  } else {
    // Minimal output for calibration mode - fast readings
    Serial.print("TDS:");
    Serial.print(calibratedPPM, 1);
    Serial.print(" pH:");
    Serial.print(phValue, 2);
    Serial.print(" Turb:");
    Serial.println(ntu, 2);
  }
}

// ===========================
// LEGACY HTTP/SSE FUNCTIONS - REPLACED BY MQTT
// ===========================

/*
 * The following functions have been replaced by MQTT equivalents:
 * - sendRegistrationRequest() -> sendRegistration()
 * - connectSSE() & processSSEMessages() -> mqttCallback()
 *
 * These legacy functions are kept for reference but are no longer used.
 */
