/*
 * ============================================================================
 * WATER QUALITY MONITORING SYSTEM
 * ============================================================================
 * Hardware: Arduino UNO R4 WiFi + ADS1115 16-bit ADC
 * Sensors: TDS, pH, Turbidity
 * 
 * ADS1115 Channel Mapping:
 *   A0 → TDS Sensor
 *   A1 → pH Sensor
 *   A2 → Turbidity Sensor
 * 
 * WHO Water Quality Standards:
 *   Turbidity: < 1 NTU = Safe drinking water
 *   TDS: < 300 ppm = Excellent, < 600 ppm = Good
 *   pH: 6.5-8.5 = Safe range
 * 
 * Author: IoT Water Quality Project
 * Version: 1.0.0
 * Date: October 2025
 * ============================================================================
 */

// ============================================================================
// LIBRARY INCLUDES
// ============================================================================
#include <WiFiS3.h>
#include <ArduinoMqttClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>

// ============================================================================
// NETWORK CONFIGURATION
// ============================================================================
#define WIFI_SSID                 "Yuzon Only"
#define WIFI_PASSWORD             "Pldtadmin@2024"
#define MQTT_BROKER               "36965de434ff42a4a93a697c94a13ad7.s1.eu.hivemq.cloud"
#define MQTT_PORT                 8883
#define MQTT_USERNAME             "functions2025"
#define MQTT_PASSWORD             "Jaffmier@0924"

// ============================================================================
// DEVICE CONFIGURATION
// ============================================================================
#define DEVICE_ID                 "arduino_uno_r4_001"
#define DEVICE_NAME               "Water Quality Monitor 1"
#define DEVICE_TYPE               "Arduino UNO R4 WiFi"
#define FIRMWARE_VERSION          "1.0.0"

// ============================================================================
// MQTT TOPICS
// ============================================================================
#define TOPIC_SENSOR_DATA         "device/sensordata/" DEVICE_ID
#define TOPIC_REGISTRATION        "device/registration/" DEVICE_ID
#define TOPIC_STATUS              "device/status/" DEVICE_ID
#define TOPIC_COMMAND             "device/command/" DEVICE_ID
#define TOPIC_DISCOVERY           "device/discovery/request"

// ============================================================================
// HARDWARE CONFIGURATION
// ============================================================================
// ADS1115 ADC Channels
#define ADS_TDS_CHANNEL           0    // A0
#define ADS_PH_CHANNEL            1    // A1
#define ADS_TURBIDITY_CHANNEL     2    // A2

// ADS1115 Settings
#define ADS_SAMPLES               50   // Averaging samples
#define ADS_SAMPLE_DELAY          2    // Delay between samples (ms)
#define ADS_VREF                  4.096f
#define ADS_MAX                   32767.0f
#define SENSOR_VREF               5.0f

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================
#define SENSOR_READ_INTERVAL      125    // Sensor read interval (ms)
#define MQTT_PUBLISH_INTERVAL     10000  // MQTT publish interval (ms)
#define HEARTBEAT_INTERVAL        30000  // Heartbeat interval (ms)

// ============================================================================
// WHO WATER QUALITY THRESHOLDS
// ============================================================================
// Turbidity Standards (NTU)
#define TURBIDITY_EXCELLENT       0.5f
#define TURBIDITY_GOOD            1.0f
#define TURBIDITY_ACCEPTABLE      3.0f
#define TURBIDITY_POOR            5.0f

// Turbidity 16-bit ADC Thresholds (Calibrated for actual sensor)
// Based on samples: Clean=7980 ADC (0 NTU), Cloudy=8160 ADC (~3-5 NTU)
#define TURB_ADC_EXCELLENT        7980L   // 0.0 NTU - Clean water
#define TURB_ADC_VERY_CLEAR       7950L   // 0.5 NTU
#define TURB_ADC_CLEAR            7900L   // 1.0 NTU - WHO safe limit
#define TURB_ADC_SLIGHTLY_TURBID  7850L   // 1.5 NTU
#define TURB_ADC_NOTICEABLE       7800L   // 2.0 NTU
#define TURB_ADC_MODERATE         7700L   // 3.0 NTU
#define TURB_ADC_HIGH             7600L   // 4.0 NTU
#define TURB_ADC_VERY_HIGH        7500L   // 5.0 NTU

// ============================================================================
// DATA STRUCTURES
// ============================================================================

// Sensor Data Structure
struct SensorData {
  float turbidity;
  float tds;
  float ph;
  long turbidityRawADC;
};

// Turbidity Smoothing Filter
struct TurbiditySmoothingFilter {
  static const int BUFFER_SIZE = 10;
  long readings[BUFFER_SIZE];
  int index;
  long total;
  long average;
  bool initialized;
  
  void init() {
    for (int i = 0; i < BUFFER_SIZE; i++) {
      readings[i] = 0;
    }
    index = 0;
    total = 0;
    average = 0;
    initialized = false;
  }
  
  long update(long newReading) {
    total -= readings[index];
    readings[index] = newReading;
    total += readings[index];
    index = (index + 1) % BUFFER_SIZE;
    average = total / BUFFER_SIZE;
    initialized = true;
    return average;
  }
};

// Timing Control Structure
struct TimingControl {
  unsigned long lastSensorRead;
  unsigned long lastMqttPublish;
  unsigned long lastHeartbeat;
  
  void init() {
    lastSensorRead = 0;
    lastMqttPublish = 0;
    lastHeartbeat = 0;
  }
};

// System State Structure
struct SystemState {
  bool mqttConnected;
  bool mqttPublishEnabled;
  
  void init() {
    mqttConnected = false;
    mqttPublishEnabled = false;
  }
};

// ============================================================================
// GLOBAL OBJECTS
// ============================================================================
WiFiSSLClient wifiClient;
MqttClient mqttClient(wifiClient);
Adafruit_ADS1115 ads;

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================
SensorData sensorData;
TurbiditySmoothingFilter turbidityFilter;
TimingControl timing;
SystemState systemState;

// ============================================================================
// ARDUINO SETUP
// ============================================================================
void setup() {
  initializeSerial();
  initializeHardware();
  initializeDataStructures();
  connectToNetwork();
  
  Serial.println(F("\n✓ Setup complete - System ready\n"));
}

// ============================================================================
// ARDUINO MAIN LOOP
// ============================================================================
void loop() {
  unsigned long currentMillis = millis();
  
  maintainMQTTConnection();
  mqttClient.poll();
  
  if (shouldReadSensors(currentMillis)) {
    readAllSensors();
    printSensorReadings();
  }
  
  if (shouldPublishData(currentMillis)) {
    publishSensorDataToMQTT();
  }
  
  if (shouldSendHeartbeat(currentMillis)) {
    publishDeviceStatus("online");
  }
  
  delay(100);
}

// ============================================================================
// INITIALIZATION FUNCTIONS
// ============================================================================

void initializeSerial() {
  Serial.begin(115200);
  while (!Serial && millis() < 5000);
  
  Serial.println(F("\n============================================"));
  Serial.println(F("  Water Quality Monitoring System"));
  Serial.println(F("  Arduino UNO R4 + ADS1115 16-bit ADC"));
  Serial.println(F("============================================\n"));
}

void initializeHardware() {
  Wire.begin();
  
  if (!ads.begin()) {
    Serial.println(F("✗ ADS1115 initialization failed!"));
    Serial.println(F("\nCheck wiring:"));
    Serial.println(F("  SDA → Arduino SDA"));
    Serial.println(F("  SCL → Arduino SCL"));
    Serial.println(F("  VDD → 5V"));
    Serial.println(F("  GND → GND"));
    while (1);
  }
  
  ads.setGain(GAIN_ONE);
  
  Serial.println(F("✓ ADS1115 initialized"));
  Serial.println(F("✓ Gain set to ±4.096V"));
  Serial.println(F("\n--- Channel Configuration ---"));
  Serial.println(F("  A0 → TDS Sensor"));
  Serial.println(F("  A1 → pH Sensor"));
  Serial.println(F("  A2 → Turbidity Sensor"));
  Serial.println(F("-----------------------------\n"));
}

void initializeDataStructures() {
  sensorData.turbidity = 0.0f;
  sensorData.tds = 0.0f;
  sensorData.ph = 0.0f;
  sensorData.turbidityRawADC = 0;
  
  turbidityFilter.init();
  timing.init();
  systemState.init();
}

void connectToNetwork() {
  connectWiFi();
  connectMQTT();
  registerDevice();
}

// ============================================================================
// TIMING CONTROL FUNCTIONS
// ============================================================================

bool shouldReadSensors(unsigned long currentMillis) {
  if (currentMillis - timing.lastSensorRead >= SENSOR_READ_INTERVAL) {
    timing.lastSensorRead = currentMillis;
    return true;
  }
  return false;
}

bool shouldPublishData(unsigned long currentMillis) {
  if (currentMillis - timing.lastMqttPublish >= MQTT_PUBLISH_INTERVAL) {
    timing.lastMqttPublish = currentMillis;
    return systemState.mqttPublishEnabled;
  }
  return false;
}

bool shouldSendHeartbeat(unsigned long currentMillis) {
  if (currentMillis - timing.lastHeartbeat >= HEARTBEAT_INTERVAL) {
    timing.lastHeartbeat = currentMillis;
    return systemState.mqttPublishEnabled;
  }
  return false;
}

// ============================================================================
// WIFI CONNECTION FUNCTIONS
// ============================================================================

void connectWiFi() {
  Serial.print(F("Connecting to WiFi: "));
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(F("."));
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n✓ WiFi connected"));
    Serial.print(F("  IP Address: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("  MAC Address: "));
    Serial.println(getMacAddress());
  } else {
    Serial.println(F("\n✗ WiFi connection failed"));
    Serial.println(F("Restarting in 5 seconds..."));
    delay(5000);
    NVIC_SystemReset();
  }
}

String getMacAddress() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char macStr[18];
  sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", 
          mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(macStr);
}

// ============================================================================
// MQTT CONNECTION FUNCTIONS
// ============================================================================

void maintainMQTTConnection() {
  if (!mqttClient.connected()) {
    systemState.mqttConnected = false;
    Serial.println(F("⚠ MQTT disconnected - Reconnecting..."));
    connectMQTT();
  }
}

void connectMQTT() {
  Serial.print(F("Connecting to MQTT broker: "));
  Serial.println(MQTT_BROKER);
  
  mqttClient.setId(DEVICE_ID);
  mqttClient.setUsernamePassword(MQTT_USERNAME, MQTT_PASSWORD);
  mqttClient.setKeepAliveInterval(60000);
  mqttClient.onMessage(handleMqttMessage);
  
  int attempts = 0;
  while (!mqttClient.connect(MQTT_BROKER, MQTT_PORT) && attempts < 5) {
    Serial.print(F("  Connection failed (Error: "));
    Serial.print(mqttClient.connectError());
    Serial.println(F(") - Retrying in 5s..."));
    delay(5000);
    attempts++;
  }
  
  if (mqttClient.connected()) {
    systemState.mqttConnected = true;
    Serial.println(F("✓ MQTT connected"));
    subscribeToTopics();
  } else {
    systemState.mqttConnected = false;
    Serial.println(F("✗ MQTT connection failed"));
  }
}

void subscribeToTopics() {
  mqttClient.subscribe(TOPIC_COMMAND);
  Serial.print(F("  Subscribed to: "));
  Serial.println(TOPIC_COMMAND);
  
  mqttClient.subscribe(TOPIC_DISCOVERY);
  Serial.print(F("  Subscribed to: "));
  Serial.println(TOPIC_DISCOVERY);
}

// ============================================================================
// MQTT MESSAGE HANDLING
// ============================================================================

void handleMqttMessage(int messageSize) {
  String topic = mqttClient.messageTopic();
  String payload = readMqttPayload(messageSize);
  
  printMqttMessage(topic, payload);
  
  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, payload)) {
    Serial.println(F("✗ JSON parse error"));
    return;
  }
  
  if (topic == String(TOPIC_COMMAND)) {
    processCommand(doc);
  } else if (topic == String(TOPIC_DISCOVERY)) {
    Serial.println(F("→ Discovery request received"));
    registerDevice();
  }
}

String readMqttPayload(int messageSize) {
  String payload = "";
  payload.reserve(messageSize);
  while (mqttClient.available()) {
    payload += (char)mqttClient.read();
  }
  return payload;
}

void printMqttMessage(const String& topic, const String& payload) {
  Serial.println(F("\n--- Incoming MQTT Message ---"));
  Serial.print(F("Topic: "));
  Serial.println(topic);
  Serial.print(F("Payload: "));
  Serial.println(payload);
  Serial.println(F("-----------------------------\n"));
}

void processCommand(JsonDocument& doc) {
  const char* command = doc["command"];
  
  if (!command) {
    Serial.println(F("✗ No command in payload"));
    return;
  }
  
  Serial.print(F("→ Executing command: "));
  Serial.println(command);
  
  executeCommand(command);
}

void executeCommand(const char* command) {
  if (strcmp(command, "DISCOVER") == 0) {
    registerDevice();
  } 
  else if (strcmp(command, "STATUS") == 0) {
    publishDeviceStatus("online");
  } 
  else if (strcmp(command, "RESET") == 0) {
    Serial.println(F("→ Resetting device..."));
    delay(1000);
    NVIC_SystemReset();
  } 
  else if (strcmp(command, "READ_SENSORS") == 0) {
    readAllSensors();
    publishSensorDataToMQTT();
  } 
  else if (strcmp(command, "START_MQTT") == 0) {
    systemState.mqttPublishEnabled = true;
    Serial.println(F("✓ MQTT publishing ENABLED"));
    publishDeviceStatus("mqtt_enabled");
  } 
  else if (strcmp(command, "STOP_MQTT") == 0) {
    systemState.mqttPublishEnabled = false;
    Serial.println(F("✓ MQTT publishing DISABLED"));
    publishDeviceStatus("mqtt_disabled");
  } 
  else {
    Serial.println(F("✗ Unknown command"));
  }
}

// ============================================================================
// DEVICE REGISTRATION
// ============================================================================

void registerDevice() {
  if (!systemState.mqttConnected) {
    Serial.println(F("✗ Cannot register - MQTT not connected"));
    return;
  }
  
  if (!systemState.mqttPublishEnabled) {
    Serial.println(F("⊘ MQTT publishing disabled - Skipping registration"));
    return;
  }
  
  Serial.println(F("→ Registering device..."));
  
  StaticJsonDocument<512> doc;
  buildRegistrationPayload(doc);
  
  String payload;
  serializeJson(doc, payload);
  
  mqttClient.beginMessage(TOPIC_REGISTRATION);
  mqttClient.print(payload);
  mqttClient.endMessage();
  
  Serial.println(F("✓ Registration sent"));
  Serial.println(payload);
}

void buildRegistrationPayload(JsonDocument& doc) {
  doc["deviceId"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["type"] = DEVICE_TYPE;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["macAddress"] = getMacAddress();
  doc["ipAddress"] = WiFi.localIP().toString();
  
  JsonArray sensors = doc.createNestedArray("sensors");
  sensors.add("turbidity");
  sensors.add("tds");
  sensors.add("ph");
}

// ============================================================================
// ADS1115 ADC READING FUNCTIONS
// ============================================================================

float readADSVoltage(uint8_t channel) {
  long sum = 0;
  
  for (int i = 0; i < ADS_SAMPLES; i++) {
    sum += ads.readADC_SingleEnded(channel);
    delay(ADS_SAMPLE_DELAY);
  }
  
  float avgADC = sum / (float)ADS_SAMPLES;
  float voltage = (avgADC / ADS_MAX) * ADS_VREF;
  
  // Scale to sensor operating voltage (5V)
  voltage = (voltage / ADS_VREF) * SENSOR_VREF;
  
  return voltage;
}

int16_t readADSRaw16bit(uint8_t channel) {
  long sum = 0;
  
  for (int i = 0; i < ADS_SAMPLES; i++) {
    sum += ads.readADC_SingleEnded(channel);
    delay(ADS_SAMPLE_DELAY);
  }
  
  return (int16_t)(sum / ADS_SAMPLES);
}

// ============================================================================
// SENSOR READING FUNCTIONS
// ============================================================================

void readAllSensors() {
  sensorData.tds = readTDSSensor();
  sensorData.ph = readPHSensor();
  sensorData.turbidity = readTurbiditySensor();
}

// ----------------------------------------------------------------------------
// TDS Sensor
// ----------------------------------------------------------------------------
// Calibration: Two-point linear correction
//   Sample 1: Meter 245 ppm → Sensor 221 ppm
//   Sample 2: Meter 294 ppm → Sensor 311 ppm
//   Formula: TDS = (raw × 0.5444) + 124.69
// ----------------------------------------------------------------------------
float readTDSSensor() {
  float voltage = readADSVoltage(ADS_TDS_CHANNEL);
  
  // Polynomial voltage-to-TDS conversion
  float tdsRaw = (133.42f * voltage * voltage * voltage 
                  - 255.86f * voltage * voltage 
                  + 857.39f * voltage) * 0.5f;
  
  // Apply linear calibration correction
  float tdsCalibrated = (tdsRaw * 0.5444f) + 79.69f;
  
  return constrain(tdsCalibrated, 0.0f, 1000.0f);
}

// ----------------------------------------------------------------------------
// pH Sensor
// ----------------------------------------------------------------------------
// Calibration: pH = 7 at 2.5V, slope = 0.18V per pH unit
// ----------------------------------------------------------------------------
float readPHSensor() {
  float voltage = readADSVoltage(ADS_PH_CHANNEL);
  float phValue = 7.0f + ((2.5f - voltage) / 0.18f);
  return constrain(phValue, 0.0f, 14.0f);
}

// ----------------------------------------------------------------------------
// Turbidity Sensor
// ----------------------------------------------------------------------------
// Calibration based on actual sensor samples:
//   ADC 7980 = 0 NTU (Clean water)
//   ADC 8160 = ~3-5 NTU (Cloudy water)
// Note: Lower ADC = Higher turbidity (inverse relationship)
// ----------------------------------------------------------------------------
float readTurbiditySensor() {
  int16_t rawADC = readADSRaw16bit(ADS_TURBIDITY_CHANNEL);
  
  // Apply smoothing filter
  long smoothedADC = turbidityFilter.update(rawADC);
  sensorData.turbidityRawADC = smoothedADC;
  
  // Convert to NTU using calibrated values
  float ntu = convertADCtoNTU(smoothedADC);
  
  return constrain(ntu, 0.0f, 10.0f);
}

float convertADCtoNTU(long adcValue) {
  // Higher ADC = Clearer water (lower NTU)
  // Lower ADC = Cloudier water (higher NTU)
  
  if (adcValue >= TURB_ADC_EXCELLENT) {
    return 0.0f;  // Crystal clear
  } 
  else if (adcValue >= TURB_ADC_VERY_CLEAR) {
    // 0.0 to 0.5 NTU
    return map(adcValue, TURB_ADC_VERY_CLEAR, TURB_ADC_EXCELLENT, 50, 0) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_CLEAR) {
    // 0.5 to 1.0 NTU (WHO safe limit)
    return map(adcValue, TURB_ADC_CLEAR, TURB_ADC_VERY_CLEAR, 100, 50) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_SLIGHTLY_TURBID) {
    // 1.0 to 1.5 NTU
    return map(adcValue, TURB_ADC_SLIGHTLY_TURBID, TURB_ADC_CLEAR, 150, 100) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_NOTICEABLE) {
    // 1.5 to 2.0 NTU
    return map(adcValue, TURB_ADC_NOTICEABLE, TURB_ADC_SLIGHTLY_TURBID, 200, 150) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_MODERATE) {
    // 2.0 to 3.0 NTU
    return map(adcValue, TURB_ADC_MODERATE, TURB_ADC_NOTICEABLE, 300, 200) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_HIGH) {
    // 3.0 to 4.0 NTU
    return map(adcValue, TURB_ADC_HIGH, TURB_ADC_MODERATE, 400, 300) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_VERY_HIGH) {
    // 4.0 to 5.0 NTU
    return map(adcValue, TURB_ADC_VERY_HIGH, TURB_ADC_HIGH, 500, 400) / 100.0f;
  } 
  else {
    // > 5.0 NTU - Very turbid water
    // Linear extrapolation beyond calibration range
    float ntu = 5.0f + ((TURB_ADC_VERY_HIGH - adcValue) / 100.0f);
    return constrain(ntu, 5.0f, 10.0f);
  }
}

String getTurbidityStatus(float ntu) {
  if (ntu < TURBIDITY_EXCELLENT) {
    return "EXCELLENT - Safe";
  } else if (ntu < TURBIDITY_GOOD) {
    return "GOOD - Safe";
  } else if (ntu < TURBIDITY_ACCEPTABLE) {
    return "ACCEPTABLE";
  } else if (ntu < TURBIDITY_POOR) {
    return "POOR";
  } else {
    return "UNACCEPTABLE";
  }
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

void printSensorReadings() {
  Serial.println(F("\n========== Sensor Readings =========="));
  
  Serial.print(F("Turbidity: "));
  Serial.print(sensorData.turbidity, 2);
  Serial.print(F(" NTU | "));
  Serial.print(getTurbidityStatus(sensorData.turbidity));
  Serial.print(F(" | ADC: "));
  Serial.println(sensorData.turbidityRawADC);
  
  Serial.print(F("TDS:       "));
  Serial.print(sensorData.tds, 2);
  Serial.println(F(" ppm"));
  
  Serial.print(F("pH:        "));
  Serial.println(sensorData.ph, 2);
  
  Serial.println(F("=====================================\n"));
}

// ============================================================================
// MQTT PUBLISHING FUNCTIONS
// ============================================================================

void publishSensorDataToMQTT() {
  if (!systemState.mqttConnected) {
    Serial.println(F("✗ Cannot publish - MQTT not connected"));
    return;
  }
  
  if (!systemState.mqttPublishEnabled) {
    return;
  }
  
  StaticJsonDocument<256> doc;
  doc["turbidity"] = sensorData.turbidity;
  doc["tds"] = sensorData.tds;
  doc["ph"] = sensorData.ph;
  doc["timestamp"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  mqttClient.beginMessage(TOPIC_SENSOR_DATA);
  mqttClient.print(payload);
  mqttClient.endMessage();
  
  Serial.print(F("✓ Published to: "));
  Serial.println(TOPIC_SENSOR_DATA);
}

void publishDeviceStatus(const char* status) {
  if (!systemState.mqttConnected) {
    return;
  }
  
  // Allow status for control commands even when publishing disabled
  bool isControlStatus = (strcmp(status, "mqtt_enabled") == 0 || 
                          strcmp(status, "mqtt_disabled") == 0);
  
  if (!systemState.mqttPublishEnabled && !isControlStatus) {
    return;
  }
  
  StaticJsonDocument<128> doc;
  doc["status"] = status;
  doc["uptime"] = millis();
  doc["rssi"] = WiFi.RSSI();
  
  String payload;
  serializeJson(doc, payload);
  
  mqttClient.beginMessage(TOPIC_STATUS);
  mqttClient.print(payload);
  mqttClient.endMessage();
  
  Serial.print(F("✓ Status: "));
  Serial.println(status);
}