/*
 * Water Quality Monitoring System
 * Arduino UNO R4 WiFi with MQTT Integration
 * Sensors: TDS, pH, Turbidity
 * 
 * WHO Water Quality Standards Applied:
 * - Turbidity: < 1 NTU = Safe drinking water
 * - TDS: < 300 ppm = Excellent, < 600 ppm = Good
 * - pH: 6.5-8.5 = Safe range
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
#define WIFI_PASSWORD "Pldtadmin@2024"

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

// Sensor Pin Configuration
#define TDS_PIN A0          // TDS Sensor
#define TURBIDITY_PIN A1    // Turbidity Sensor
#define PH_PIN A2           // pH Sensor


// Timing Configuration - Phase 3 Optimization
#define SENSOR_READ_INTERVAL 30000   // Read sensors every 30 seconds
#define MQTT_PUBLISH_INTERVAL 300000 // Publish batch to MQTT every 5 minutes (300 seconds)
#define HEARTBEAT_INTERVAL 300000    // Send status every 5 minutes (aligned with batch)
#define BATCH_SIZE 10                // Buffer 10 readings before sending (5 minutes worth)

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

bool mqttConnected = false;
bool sendToMQTT = false;  // Control flag for MQTT publishing

// Phase 3: Batch buffer for readings
struct SensorReading {
  float turbidity;
  float tds;
  float ph;
  unsigned long timestamp;
};
SensorReading readingBuffer[BATCH_SIZE];
int bufferIndex = 0;
bool bufferReady = false;

// Constants for sensor reading
const int SENSOR_SAMPLES = 100;  // Increased for more stable readings
const int SAMPLE_DELAY = 1;
const float ADC_MAX = 4095.0;
const float VREF = 5.0;  // Arduino UNO R4 operates at 5V

// WHO-based Turbidity thresholds (NTU)
const float EXCELLENT_THRESHOLD = 0.5;    // < 0.5 NTU: Excellent quality
const float GOOD_THRESHOLD = 1.0;         // < 1 NTU: Good quality (WHO standard)
const float ACCEPTABLE_THRESHOLD = 3.0;   // < 3 NTU: Acceptable
const float POOR_THRESHOLD = 5.0;         // < 5 NTU: Poor quality
// > 5 NTU: Unacceptable

// Turbidity smoothing variables (for ADC readings)
const int TURBIDITY_NUM_READINGS = 10;
int turbidityReadings[10];
int turbidityReadIndex = 0;
long turbidityTotal = 0;
int turbidityAverage = 0;
bool turbidityInitialized = false;

// ===========================
// SETUP FUNCTION
// ===========================

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 5000);
  
  Serial.println(F("\n================================="));
  Serial.println(F("Water Quality Monitor - Starting"));
  Serial.println(F("=================================\n"));

  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);
  analogReadResolution(12);
  
  // Initialize turbidity smoothing array
  for (int i = 0; i < TURBIDITY_NUM_READINGS; i++) {
    turbidityReadings[i] = 0;
  }
  
  connectWiFi();
  connectMQTT();
  registerDevice();
  
  Serial.println(F("\n✓ Setup complete - System ready\n"));
}

// ===========================
// MAIN LOOP
// ===========================

void loop() {
  unsigned long currentMillis = millis();
  
  if (!mqttClient.connected()) {
    mqttConnected = false;
    Serial.println(F("⚠ MQTT disconnected - Reconnecting..."));
    connectMQTT();
  }
  
  mqttClient.poll();
  
  // Read sensors every 30 seconds and buffer the reading
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = currentMillis;
    readSensors();
    printSensorData();
    
    // Store reading in buffer (Phase 3 Batching)
    readingBuffer[bufferIndex].turbidity = turbidity;
    readingBuffer[bufferIndex].tds = tds;
    readingBuffer[bufferIndex].ph = ph;
    readingBuffer[bufferIndex].timestamp = currentMillis;
    
    bufferIndex++;
    Serial.print(F("📦 Buffered reading "));
    Serial.print(bufferIndex);
    Serial.print(F("/"));
    Serial.println(BATCH_SIZE);
    
    // Mark buffer as ready when full
    if (bufferIndex >= BATCH_SIZE) {
      bufferReady = true;
      bufferIndex = 0;  // Reset for next batch
    }
  }
  
  // Publish batch every 5 minutes when buffer is ready
  if (currentMillis - lastMqttPublish >= MQTT_PUBLISH_INTERVAL) {
    lastMqttPublish = currentMillis;
    if (sendToMQTT && bufferReady) {
      publishSensorDataBatch();
      bufferReady = false;
    }
  }
  
  // Heartbeat removed - status tracking no longer needed
  
  delay(100);
}

// ===========================
// WiFi FUNCTIONS
// ===========================

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
    Serial.print(F("IP Address: "));
    Serial.println(WiFi.localIP());
    
    uint8_t mac[6];
    WiFi.macAddress(mac);
    char macStr[18];
    sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    Serial.print(F("MAC Address: "));
    Serial.println(macStr);
  } else {
    Serial.println(F("\n✗ WiFi connection failed"));
    Serial.println(F("Restarting in 5 seconds..."));
    delay(5000);
    NVIC_SystemReset();
  }
}

// ===========================
// MQTT FUNCTIONS
// ===========================

void connectMQTT() {
  Serial.print(F("Connecting to MQTT broker: "));
  Serial.println(MQTT_BROKER);
  
  mqttClient.setId(DEVICE_ID);
  mqttClient.setUsernamePassword(MQTT_USERNAME, MQTT_PASSWORD);
  mqttClient.setKeepAliveInterval(60000);
  
  int attempts = 0;
  while (!mqttClient.connect(MQTT_BROKER, MQTT_PORT) && attempts < 5) {
    Serial.print(F("MQTT connection failed. Error code: "));
    Serial.println(mqttClient.connectError());
    Serial.println(F("Retrying in 5 seconds..."));
    delay(5000);
    attempts++;
  }
  
  if (mqttClient.connected()) {
    Serial.println(F("✓ MQTT connected"));
    mqttConnected = true;
  } else {
    Serial.println(F("✗ MQTT connection failed"));
    mqttConnected = false;
  }
}

// Command handling removed - not used in UI

// ===========================
// DEVICE REGISTRATION
// ===========================

void registerDevice() {
  if (!mqttConnected) {
    Serial.println(F("Cannot register - MQTT not connected"));
    return;
  }
  
  if (!sendToMQTT) {
    Serial.println(F("⊘ MQTT publishing disabled - Skipping registration"));
    return;
  }
  
  Serial.println(F("Registering device with Firebase..."));
  
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
  
  mqttClient.beginMessage(TOPIC_REGISTRATION);
  mqttClient.print(payload);
  mqttClient.endMessage();
  
  Serial.println(F("✓ Registration message sent"));
  Serial.println(payload);
}

// ===========================
// SENSOR READING FUNCTIONS
// ===========================

// Helper function to read analog sensor with averaging
float readAnalogAverage(uint8_t pin) {
  long sum = 0;
  for (int i = 0; i < SENSOR_SAMPLES; i++) {
    sum += analogRead(pin);
    delay(SAMPLE_DELAY);
  }
  return (sum / (float)SENSOR_SAMPLES / ADC_MAX) * VREF;
}

void readSensors() {
  tds = readTDS();
  ph = readPH();
  turbidity = readTurbidity();
}
//TDS CALIBRATED SUCCESSFULLY
float readTDS() {
  float voltage = readAnalogAverage(TDS_PIN);
  float tdsRaw = (133.42 * voltage * voltage * voltage 
                  - 255.86 * voltage * voltage 
                  + 857.39 * voltage) * 0.5;
  float tdsCalibrated = (tdsRaw * 1.2963) - 93.31;
  return constrain(tdsCalibrated, 0, 1000);
}

float readPH() {
  float voltage = readAnalogAverage(PH_PIN);
  
  // pH calculation for 5V system: pH = 7 at ~2.5V, slope ~0.18V per pH unit (PRESERVED)
  float phValue = 7.0 + ((2.5 - voltage) / 0.18);
  
  return constrain(phValue, 0, 14);
}

float readTurbidity() {
  // Read raw ADC value (12-bit: 0-4095)
  int rawADC = analogRead(TURBIDITY_PIN);
  
  // Convert 12-bit ADC (0-4095) to 10-bit equivalent (0-1023) for calibration compatibility
  int adc10bit = rawADC / 4;
  
  // Apply smoothing filter
  turbidityTotal = turbidityTotal - turbidityReadings[turbidityReadIndex];
  turbidityReadings[turbidityReadIndex] = adc10bit;
  turbidityTotal = turbidityTotal + turbidityReadings[turbidityReadIndex];
  turbidityReadIndex = (turbidityReadIndex + 1) % TURBIDITY_NUM_READINGS;
  turbidityAverage = turbidityTotal / TURBIDITY_NUM_READINGS;
  
  // Calculate NTU using WHO-calibrated formula
  // Calibration based on: ADC 705 = 0 NTU (clear), ADC 666 = 2 NTU (turbid)
  float ntu = calculateTurbidityNTU(turbidityAverage);
  
  // Constrain to valid range
  ntu = constrain(ntu, 0.0, 5.0);
  
  return ntu;
}

/**
 * Convert ADC reading to NTU value
 * WHO Standards Calibration:
 * ADC 705+ = 0 NTU (Clear Water)
 * ADC 666 = 2 NTU (Turbid Water)
 * < 1 NTU = Safe drinking water (WHO standard)
 * > 5 NTU = Unacceptable
 */
float calculateTurbidityNTU(int adcValue) {
  float ntu;
  
  // Calibrated ADC to NTU conversion
  // Higher ADC = clearer water (0 NTU)
  // Lower ADC = turbid water (2-5 NTU)
  
  if (adcValue >= 705) {
    // Excellent - Crystal clear water (ADC 705+)
    ntu = 0.0;
  } else if (adcValue >= 695) {
    // Excellent - Very clear (ADC 695-705)
    ntu = map(adcValue, 695, 705, 30, 0) / 100.0;  // 0.0 - 0.3 NTU
  } else if (adcValue >= 685) {
    // Good - Clear water (ADC 685-695)
    ntu = map(adcValue, 685, 695, 80, 30) / 100.0;  // 0.3 - 0.8 NTU
  } else if (adcValue >= 675) {
    // Acceptable - Slightly visible particles (ADC 675-685)
    ntu = map(adcValue, 675, 685, 150, 80) / 100.0;  // 0.8 - 1.5 NTU
  } else if (adcValue >= 666) {
    // Acceptable - Noticeable turbidity (ADC 666-675)
    ntu = map(adcValue, 666, 675, 250, 150) / 100.0;  // 1.5 - 2.5 NTU
  } else if (adcValue >= 640) {
    // Poor - Moderate turbidity (ADC 640-666)
    ntu = map(adcValue, 640, 666, 350, 250) / 100.0;  // 2.5 - 3.5 NTU
  } else if (adcValue >= 600) {
    // Poor - High turbidity (ADC 600-640)
    ntu = map(adcValue, 600, 640, 450, 350) / 100.0;  // 3.5 - 4.5 NTU
  } else if (adcValue >= 550) {
    // Unacceptable - Very high turbidity (ADC 550-600)
    ntu = map(adcValue, 550, 600, 500, 450) / 100.0;  // 4.5 - 5.0 NTU
  } else {
    // Critical - Extremely turbid (ADC below 550)
    ntu = 5.0;
  }
  
  return ntu;
}

/**
 * Get turbidity status based on WHO water quality standards
 */
String getTurbidityStatus(float ntu) {
  if (ntu < EXCELLENT_THRESHOLD) {
    return "EXCELLENT - Safe";
  } else if (ntu < GOOD_THRESHOLD) {
    return "GOOD - Safe";
  } else if (ntu < ACCEPTABLE_THRESHOLD) {
    return "ACCEPTABLE";
  } else if (ntu < POOR_THRESHOLD) {
    return "POOR";
  } else {
    return "UNACCEPTABLE";
  }
}

void printSensorData() {
  Serial.println(F("\n--- Sensor Readings ---"));
  Serial.print(F("Turbidity: "));
  Serial.print(turbidity, 2);
  Serial.print(F(" NTU | Status: "));
  Serial.print(getTurbidityStatus(turbidity));
  Serial.print(F(" | Raw ADC: "));
  Serial.println(turbidityAverage);
  
  Serial.print(F("TDS: "));
  Serial.print(tds, 2);
  Serial.println(F(" ppm"));
  
  Serial.print(F("pH: "));
  Serial.println(ph, 2);
  Serial.println(F("----------------------\n"));
}

// ===========================
// MQTT PUBLISH FUNCTIONS
// ===========================

void publishSensorData() {
  if (!mqttConnected) {
    Serial.println(F("Cannot publish - MQTT not connected"));
    return;
  }
  
  if (!sendToMQTT) {
    return;  // Silent skip
  }
  
  StaticJsonDocument<256> doc;
  doc["turbidity"] = turbidity;
  doc["tds"] = tds;
  doc["ph"] = ph;
  doc["timestamp"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  mqttClient.beginMessage(TOPIC_SENSOR_DATA);
  mqttClient.print(payload);
  mqttClient.endMessage();
  
  Serial.print(F("✓ Published sensor data to: "));
  Serial.println(TOPIC_SENSOR_DATA);
}

// Phase 3: Publish batch of sensor readings
void publishSensorDataBatch() {
  if (!mqttConnected) {
    Serial.println(F("Cannot publish batch - MQTT not connected"));
    return;
  }
  
  if (!sendToMQTT) {
    return;  // Silent skip
  }
  
  Serial.println(F("\n📦 Publishing batch of readings..."));
  
  // Create JSON document with readings array
  StaticJsonDocument<1024> doc;
  JsonArray readings = doc.createNestedArray("readings");
  
  for (int i = 0; i < BATCH_SIZE; i++) {
    JsonObject reading = readings.createNestedObject();
    reading["turbidity"] = readingBuffer[i].turbidity;
    reading["tds"] = readingBuffer[i].tds;
    reading["ph"] = readingBuffer[i].ph;
    reading["timestamp"] = readingBuffer[i].timestamp;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  mqttClient.beginMessage(TOPIC_SENSOR_DATA);
  mqttClient.print(payload);
  mqttClient.endMessage();
  
  Serial.print(F("✓ Published batch ("));
  Serial.print(BATCH_SIZE);
  Serial.print(F(" readings) to: "));
  Serial.println(TOPIC_SENSOR_DATA);
  Serial.print(F("   Payload size: "));
  Serial.print(payload.length());
  Serial.println(F(" bytes"));
}

// publishStatus function removed - status tracking no longer needed