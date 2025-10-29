/*
 * Water Quality Monitoring System
 * Arduino UNO R4 WiFi with MQTT Integration
 * Sensors: TDS, pH, Turbidity (NO Temperature)
 * 
 * Author: IoT Water Quality Project
 * Date: 2025
 */

#include <WiFiS3.h>
#include <ArduinoMqttClient.h>
#include <ArduinoJson.h>

// ===========================
// CONFIGURATION
// ===========================

// WiFi Credentials
#define WIFI_SSID "Yuzon Only"
#define WIFI_PASSWORD "Pldtadmin@@2024"

// MQTT Broker Configuration (HiveMQ Cloud)
#define MQTT_BROKER "36965de434ff42a4a93a697c94a13ad7.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883  // TLS/SSL port
#define MQTT_USERNAME "functions2025"
#define MQTT_PASSWORD "Jaffmier@0924"

// Device Configuration
#define DEVICE_ID "arduino_uno_r4_001"
#define DEVICE_NAME "Water Quality Monitor 1"
#define DEVICE_TYPE "Arduino UNO R4 WiFi"
#define FIRMWARE_VERSION "1.0.0"

// MQTT Topics
#define TOPIC_SENSOR_DATA "device/sensordata/" DEVICE_ID
#define TOPIC_REGISTRATION "device/registration/" DEVICE_ID
#define TOPIC_STATUS "device/status/" DEVICE_ID
#define TOPIC_COMMAND "device/command/" DEVICE_ID
#define TOPIC_DISCOVERY "device/discovery/request"

// Sensor Pin Configuration
#define TDS_PIN A0          // TDS Sensor
#define PH_PIN A1           // pH Sensor
#define TURBIDITY_PIN A2    // Turbidity Sensor

// Timing Configuration
#define SENSOR_READ_INTERVAL 5000   // Read sensors every 5 seconds
#define MQTT_PUBLISH_INTERVAL 10000 // Publish to MQTT every 10 seconds
#define HEARTBEAT_INTERVAL 30000    // Send status every 30 seconds

// ===========================
// GLOBAL OBJECTS
// ===========================

WiFiSSLClient wifiClient;  // Use SSL for HiveMQ Cloud
MqttClient mqttClient(wifiClient);

// ===========================
// GLOBAL VARIABLES
// ===========================

unsigned long lastSensorRead = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastHeartbeat = 0;

// Sensor readings
float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;

bool isRegistered = false;
bool mqttConnected = false;

// ===========================
// SETUP FUNCTION
// ===========================

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 5000); // Wait for Serial or timeout after 5s
  
  Serial.println("\n=================================");
  Serial.println("Water Quality Monitor - Starting");
  Serial.println("=================================\n");

  // Initialize sensor pins
  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);
  
  // Set ADC resolution to 12-bit for better accuracy
  analogReadResolution(12);
  
  // Connect to WiFi
  connectWiFi();
  
  // Connect to MQTT Broker
  connectMQTT();
  
  // Register device with Firebase
  registerDevice();
  
  Serial.println("\n✓ Setup complete - System ready\n");
}

// ===========================
// MAIN LOOP
// ===========================

void loop() {
  unsigned long currentMillis = millis();
  
  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    mqttConnected = false;
    Serial.println("⚠ MQTT disconnected - Reconnecting...");
    connectMQTT();
  }
  
  // Poll MQTT for incoming messages
  mqttClient.poll();
  
  // Read sensors at regular intervals
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = currentMillis;
    readSensors();
    printSensorData();
  }
  
  // Publish sensor data to MQTT
  if (currentMillis - lastMqttPublish >= MQTT_PUBLISH_INTERVAL) {
    lastMqttPublish = currentMillis;
    publishSensorData();
  }
  
  // Send heartbeat status
  if (currentMillis - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = currentMillis;
    publishStatus("online");
  }
  
  delay(100); // Small delay to prevent CPU overload
}

// ===========================
// WiFi FUNCTIONS
// ===========================

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    uint8_t mac[6];
    WiFi.macAddress(mac);
    char macStr[18];
    sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    Serial.print("MAC Address: ");
    Serial.println(macStr);
  } else {
    Serial.println("\n✗ WiFi connection failed");
    Serial.println("Restarting in 5 seconds...");
    delay(5000);
    NVIC_SystemReset(); // Software reset for Arduino UNO R4
  }
}

// ===========================
// MQTT FUNCTIONS
// ===========================

void connectMQTT() {
  Serial.print("Connecting to MQTT broker: ");
  Serial.println(MQTT_BROKER);
  
  // Set MQTT credentials
  mqttClient.setId(DEVICE_ID);
  mqttClient.setUsernamePassword(MQTT_USERNAME, MQTT_PASSWORD);
  
  // Set keep-alive interval
  mqttClient.setKeepAliveInterval(60000); // 60 seconds
  
  // Set callback for incoming messages
  mqttClient.onMessage(onMqttMessage);
  
  // Connect to broker
  int attempts = 0;
  while (!mqttClient.connect(MQTT_BROKER, MQTT_PORT) && attempts < 5) {
    Serial.print("MQTT connection failed. Error code: ");
    Serial.println(mqttClient.connectError());
    Serial.println("Retrying in 5 seconds...");
    delay(5000);
    attempts++;
  }
  
  if (mqttClient.connected()) {
    Serial.println("✓ MQTT connected");
    mqttConnected = true;
    
    // Subscribe to command topic
    Serial.print("Subscribing to: ");
    Serial.println(TOPIC_COMMAND);
    mqttClient.subscribe(TOPIC_COMMAND);
    
    // Subscribe to discovery topic
    Serial.print("Subscribing to: ");
    Serial.println(TOPIC_DISCOVERY);
    mqttClient.subscribe(TOPIC_DISCOVERY);
    
  } else {
    Serial.println("✗ MQTT connection failed");
    mqttConnected = false;
  }
}

void onMqttMessage(int messageSize) {
  String topic = mqttClient.messageTopic();
  String payload = "";
  
  while (mqttClient.available()) {
    payload += (char)mqttClient.read();
  }
  
  Serial.println("\n--- Incoming MQTT Message ---");
  Serial.print("Topic: ");
  Serial.println(topic);
  Serial.print("Payload: ");
  Serial.println(payload);
  Serial.println("-----------------------------\n");
  
  // Parse JSON payload
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }
  
  // Handle commands
  if (topic == String(TOPIC_COMMAND)) {
    handleCommand(doc);
  } else if (topic == String(TOPIC_DISCOVERY)) {
    Serial.println("Discovery request received - Re-registering device");
    registerDevice();
  }
}

void handleCommand(JsonDocument& doc) {
  const char* command = doc["command"];
  
  if (command == nullptr) {
    Serial.println("No command in payload");
    return;
  }
  
  Serial.print("Executing command: ");
  Serial.println(command);
  
  if (strcmp(command, "DISCOVER") == 0) {
    registerDevice();
  } else if (strcmp(command, "STATUS") == 0) {
    publishStatus("online");
  } else if (strcmp(command, "RESET") == 0) {
    Serial.println("Resetting device...");
    delay(1000);
    NVIC_SystemReset();
  } else if (strcmp(command, "READ_SENSORS") == 0) {
    readSensors();
    publishSensorData();
  } else {
    Serial.println("Unknown command");
  }
}

// ===========================
// DEVICE REGISTRATION
// ===========================

void registerDevice() {
  if (!mqttConnected) {
    Serial.println("Cannot register - MQTT not connected");
    return;
  }
  
  Serial.println("Registering device with Firebase...");
  
  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["type"] = DEVICE_TYPE;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char macStr[18];
  sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  doc["macAddress"] = macStr;
  doc["ipAddress"] = WiFi.localIP().toString();
  
  JsonArray sensors = doc.createNestedArray("sensors");
  sensors.add("turbidity");
  sensors.add("tds");
  sensors.add("ph");
  
  String payload;
  serializeJson(doc, payload);
  
  // Publish registration message
  mqttClient.beginMessage(TOPIC_REGISTRATION);
  mqttClient.print(payload);
  mqttClient.endMessage();
  
  Serial.println("✓ Registration message sent");
  Serial.println(payload);
  isRegistered = true;
}

// ===========================
// SENSOR READING FUNCTIONS
// ===========================

void readSensors() {
  // Read TDS sensor (Total Dissolved Solids)
  tds = readTDS();
  
  // Read pH sensor
  ph = readPH();
  
  // Read Turbidity sensor
  turbidity = readTurbidity();
}

float readTDS() {
  int samples = 10;
  long sum = 0;
  
  for (int i = 0; i < samples; i++) {
    sum += analogRead(TDS_PIN);
    delay(10);
  }
  
  float average = sum / samples;
  float voltage = (average / 4095.0) * 3.3; // 12-bit ADC, 3.3V reference
  
  // TDS calculation (adjust formula based on your sensor)
  // Formula for generic TDS sensor
  float tdsValue = (133.42 * voltage * voltage * voltage 
                    - 255.86 * voltage * voltage 
                    + 857.39 * voltage) * 0.5;
  
  return constrain(tdsValue, 0, 1000); // TDS in ppm
}

float readPH() {
  int samples = 10;
  long sum = 0;
  
  for (int i = 0; i < samples; i++) {
    sum += analogRead(PH_PIN);
    delay(10);
  }
  
  float average = sum / samples;
  float voltage = (average / 4095.0) * 3.3;
  
  // pH calculation (adjust formula based on your sensor calibration)
  // Standard pH sensor: pH = 7 at ~1.65V (mid-point)
  // Slope: ~0.18V per pH unit
  float phValue = 7.0 + ((1.65 - voltage) / 0.18);
  
  return constrain(phValue, 0, 14); // pH scale 0-14
}

float readTurbidity() {
  int samples = 10;
  long sum = 0;
  
  for (int i = 0; i < samples; i++) {
    sum += analogRead(TURBIDITY_PIN);
    delay(10);
  }
  
  float average = sum / samples;
  float voltage = (average / 4095.0) * 3.3;
  
  // Turbidity calculation (adjust based on your sensor)
  // Lower voltage = higher turbidity
  // This is a generic formula - calibrate for your specific sensor
  float turbidityValue = 100.0 - (voltage / 3.3 * 100.0);
  
  return constrain(turbidityValue, 0, 100); // Turbidity in NTU
}

void printSensorData() {
  Serial.println("\n--- Sensor Readings ---");
  Serial.print("Turbidity: ");
  Serial.print(turbidity, 2);
  Serial.println(" NTU");
  
  Serial.print("TDS: ");
  Serial.print(tds, 2);
  Serial.println(" ppm");
  
  Serial.print("pH: ");
  Serial.print(ph, 2);
  Serial.println("");
  Serial.println("----------------------\n");
}

// ===========================
// MQTT PUBLISH FUNCTIONS
// ===========================

void publishSensorData() {
  if (!mqttConnected) {
    Serial.println("Cannot publish - MQTT not connected");
    return;
  }
  
  StaticJsonDocument<256> doc;
  doc["turbidity"] = turbidity;
  doc["tds"] = tds;
  doc["ph"] = ph;
  doc["temperature"] = 0.0;  // Set to 0 since not using temperature sensor
  doc["timestamp"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  // Publish to sensor data topic
  mqttClient.beginMessage(TOPIC_SENSOR_DATA);
  mqttClient.print(payload);
  mqttClient.endMessage();
  
  Serial.print("✓ Published sensor data to: ");
  Serial.println(TOPIC_SENSOR_DATA);
}

void publishStatus(const char* status) {
  if (!mqttConnected) {
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
  
  Serial.print("✓ Status published: ");
  Serial.println(status);
}