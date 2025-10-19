#include <WiFiS3.h>
#include <ArduinoMqttClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Configuration
const char* mqttBroker = "your-hivemq-broker.hivemq.cloud";
const int mqttPort = 8883;
const char* mqttUser = "your-username";
const char* mqttPass = "your-password";

WiFiSSLClient wifiClient;
MqttClient mqttClient(wifiClient);

String deviceId = "arduino_uno_r4_001";

// Sensor Pins
const int TDS_PIN = A0;
const int TURBIDITY_PIN = A1;
const int PH_PIN = A2;

// Timing
unsigned long lastPublish = 0;
const long publishInterval = 5000; // Send data every 5 seconds

void setup() {
  Serial.begin(115200);
  
  // Initialize sensor pins
  pinMode(TDS_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  
  // Connect to WiFi
  connectWiFi();
  
  // Connect to MQTT
  connectMQTT();
  
  // Subscribe to discovery topic
  mqttClient.subscribe("device/discovery/request");
  mqttClient.onMessage(onMqttMessage);
}

void loop() {
  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.poll();
  
  // Publish sensor data at interval
  unsigned long currentMillis = millis();
  if (currentMillis - lastPublish >= publishInterval) {
    lastPublish = currentMillis;
    publishSensorData();
  }
  
  delay(100);
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  Serial.print("Connecting to MQTT broker");
  
  mqttClient.setUsernamePassword(mqttUser, mqttPass);
  
  while (!mqttClient.connect(mqttBroker, mqttPort)) {
    Serial.print(".");
    delay(1000);
  }
  
  Serial.println("\nConnected to MQTT broker!");
}

void onMqttMessage(int messageSize) {
  String topic = mqttClient.messageTopic();
  String payload = "";
  
  while (mqttClient.available()) {
    payload += (char)mqttClient.read();
  }
  
  Serial.println("Message received on topic: " + topic);
  
  // If discovery request received, send registration
  if (topic == "device/discovery/request") {
    sendDeviceRegistration();
  }
}

void sendDeviceRegistration() {
  String registrationTopic = "device/registration/" + deviceId;
  
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["name"] = "Arduino Water Monitor";
  doc["type"] = "Arduino UNO R4 WiFi";
  doc["firmwareVersion"] = "1.0.0";
  doc["macAddress"] = WiFi.macAddress();
  doc["ipAddress"] = WiFi.localIP().toString();
  
  JsonArray sensors = doc.createNestedArray("sensors");
  sensors.add("turbidity");
  sensors.add("tds");
  sensors.add("ph");
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  mqttClient.beginMessage(registrationTopic, false, 1);
  mqttClient.print(jsonString);
  mqttClient.endMessage();
  
  Serial.println("Device registration sent!");
}

void publishSensorData() {
  // Read sensor values
  float turbidity = readTurbiditySensor();
  float tds = readTDSSensor();
  float ph = readPHSensor();
  float temperature = 25.0; // You can add temperature sensor if needed
  
  // Create JSON document
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["turbidity"] = turbidity;
  doc["tds"] = tds;
  doc["ph"] = ph;
  doc["temperature"] = temperature;
  doc["timestamp"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Publish to MQTT
  String sensorTopic = "device/sensordata/" + deviceId;
  
  mqttClient.beginMessage(sensorTopic, false, 1);
  mqttClient.print(jsonString);
  mqttClient.endMessage();
  
  Serial.println("Sensor data published:");
  Serial.println(jsonString);
}

float readTurbiditySensor() {
  int sensorValue = analogRead(TURBIDITY_PIN);
  float voltage = sensorValue * (5.0 / 1023.0);
  
  // Convert voltage to NTU (calibration needed)
  float turbidity = 0;
  if (voltage < 2.5) {
    turbidity = 3000;
  } else {
    turbidity = -1120.4 * voltage * voltage + 5742.3 * voltage - 4352.9;
  }
  
  return turbidity;
}

float readTDSSensor() {
  int sensorValue = analogRead(TDS_PIN);
  float voltage = sensorValue * (5.0 / 1023.0);
  
  // Convert voltage to TDS (ppm) - calibration needed
  float tds = (133.42 * voltage * voltage * voltage - 255.86 * voltage * voltage + 857.39 * voltage) * 0.5;
  
  return tds;
}

float readPHSensor() {
  int sensorValue = analogRead(PH_PIN);
  float voltage = sensorValue * (5.0 / 1023.0);
  
  // Convert voltage to pH - calibration needed
  float ph = 3.5 * voltage;
  
  return ph;
}
