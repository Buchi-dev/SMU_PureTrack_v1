/*
 * Water Quality Monitoring System - OPTIMIZED VERSION
 * Arduino UNO R4 WiFi - Clock-Synchronized 30 Minute Data Transmission
 * Firmware: v7.0.0 - Server Polling Mode (No LWT)
 * 
 * OPTIMIZATIONS:
 * - F() macro for all string constants (saves ~500 bytes RAM)
 * - PROGMEM for calibration data (saves ~100 bytes RAM)
 * - Optimized JSON buffer sizes
 * - Reduced String concatenation
 * - Cached frequently accessed values
 * 
 * FEATURES:
 * - Calibration Mode: 255ms sensor readings, no MQTT transmission
 * - Manual control via code (change CALIBRATION_MODE below)
 * - Server Polling: Responds to "who_is_online" queries instead of LWT
 * - No Last Will Testament - explicit presence control
 */


#include <WiFiS3.h>
#include <WiFiSSLClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <EEPROM.h>
#include <avr/pgmspace.h>  // For PROGMEM support


// ===========================
// CALIBRATION MODE CONTROL
// ===========================
// Set to true to enable calibration mode (255ms readings, no MQTT)
// Set to false for normal operation (60s readings, MQTT enabled)
#define CALIBRATION_MODE true    // ← CHANGE THIS TO true OR false


// ===========================
// CONFIGURATION
// ===========================


// WiFi Credentials
#define WIFI_SSID "Yuzon Only"
#define WIFI_PASSWORD "Pldtadmin@2024"


// MQTT Broker Configuration - HiveMQ Cloud (SSL/TLS)
#define MQTT_BROKER "0331c5286d084675b9198021329c7573.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_CLIENT_ID "arduino_uno_r4_002"
#define MQTT_USERNAME "Admin"
#define MQTT_PASSWORD "Admin123"


// Device Configuration
#define DEVICE_ID "arduino_uno_r4_002"
#define DEVICE_NAME "Water Quality Monitor R4"
#define DEVICE_TYPE "Arduino UNO R4 WiFi"
#define FIRMWARE_VERSION "7.0.0"  // No LWT - Server polling mode


// Sensor Pin Configuration
#define TDS_PIN A0
#define PH_PIN A0
#define TURBIDITY_PIN A2


// Timing Configuration
#define SENSOR_READ_INTERVAL 60000
#define CALIBRATION_INTERVAL 255        // 255ms for calibration mode
#define REGISTRATION_INTERVAL 60000
#define MQTT_RECONNECT_INTERVAL 30000
#define WATCHDOG_INTERVAL 300000
#define NTP_UPDATE_INTERVAL 3600000


// Time Settings - Philippine Time (UTC+8)
#define RESTART_HOUR_UTC 16
#define RESTART_MINUTE 0
#define TIMEZONE_OFFSET_SECONDS 28800
#define MAX_UPTIME_HOURS 25


// 24/7 Operation Settings
#define MAX_MQTT_FAILURES 10
#define MAX_WIFI_FAILURES 3


// EEPROM Settings
#define EEPROM_SIZE 512
#define EEPROM_MAGIC_NUMBER 0xA5B7
#define EEPROM_ADDR_MAGIC 0
#define EEPROM_ADDR_APPROVED 2
#define EEPROM_ADDR_BOOT_COUNT 3


// ===========================
// CALIBRATION DATA IN PROGMEM
// ===========================

const int CALIB_COUNT = 4;
const PROGMEM int calibADC[CALIB_COUNT] = {105, 116, 224, 250};
const PROGMEM float calibPPM[CALIB_COUNT] = {236.0, 278.0, 1220.0, 1506.0};

const int PH_CALIB_COUNT = 4;
const PROGMEM int phCalibADC[PH_CALIB_COUNT] = {0, 100, 400, 450};
const PROGMEM float phCalibPH[PH_CALIB_COUNT] = {6.6, 7.0, 4.0, 9.0};

const float TDS_CALIBRATION_FACTOR = 0.589;
const float TDS_OFFSET = 0.0;


// ===========================
// MQTT TOPICS (Pre-computed) - ACTIVE ONLY
// ===========================


char topicData[50];          // devices/{deviceId}/data - Sensor readings
char topicRegister[50];      // devices/{deviceId}/register - Registration
char topicCommands[50];      // devices/{deviceId}/commands - Server commands
char topicPresence[50];      // devices/{deviceId}/presence - Presence status


const char PRESENCE_QUERY_TOPIC[] PROGMEM = "presence/query";      // Server polls
const char PRESENCE_RESPONSE_TOPIC[] PROGMEM = "presence/response"; // Device responds


// ===========================
// SMA SMOOTHING BUFFERS
// ===========================

const int SMA_SIZE = 20;
int smaBuffer[SMA_SIZE];
int smaIndex = 0;
long smaSum = 0;
int smaCount = 0;

const int TURB_SMA_SIZE = 20;
int turbBuffer[TURB_SMA_SIZE];
int turbIndex = 0;
long turbSum = 0;
int turbCount = 0;

const int PH_SMA_SIZE = 20;
int phBuffer[PH_SMA_SIZE];
int phIndex = 0;
long phSum = 0;
int phCount = 0;

float fitSlope = 0.0;
float fitIntercept = 0.0;

float phFitSlope = 0.0;
float phFitIntercept = 0.0;


// ===========================
// GLOBAL OBJECTS
// ===========================
WiFiSSLClient wifiSSLClient;
PubSubClient mqttClient(wifiSSLClient);
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, NTP_UPDATE_INTERVAL);


// ===========================
// GLOBAL VARIABLES
// ===========================
unsigned long lastSensorRead = 0;
unsigned long lastRegistrationAttempt = 0;
unsigned long lastMqttReconnect = 0;
unsigned long lastWatchdog = 0;
unsigned long lastNtpUpdate = 0;
unsigned long bootTime = 0;


bool isApproved = false;
bool mqttConnected = false;
bool timeInitialized = false;
bool restartScheduled = false;
bool isCalibrationMode = CALIBRATION_MODE;  // Set from #define at compile time


// Sensor variables
float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;


int consecutiveMqttFailures = 0;
int consecutiveWifiFailures = 0;


unsigned long transmissionCount = 0;
unsigned long bootCount = 0;
int lastTransmissionMinute = -1;
unsigned long sensorReadInterval = CALIBRATION_MODE ? CALIBRATION_INTERVAL : SENSOR_READ_INTERVAL;


// Presence detection variables
bool presenceQueryActive = false;
unsigned long lastPresenceQuery = 0;
const unsigned long PRESENCE_TIMEOUT = 30000;


// Cached WiFi status
uint8_t cachedWiFiStatus = WL_IDLE_STATUS;
unsigned long lastWiFiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 1000;


// ===========================
// FUNCTION DECLARATIONS
// ===========================
void handlePresenceQuery(const char* message);
void publishPresenceOnline();


// ===========================
// HELPER FUNCTIONS
// ===========================


// Build MQTT topics once (ACTIVE TOPICS ONLY)
void buildTopics() {
  snprintf(topicData, sizeof(topicData), "devices/%s/data", DEVICE_ID);
  snprintf(topicRegister, sizeof(topicRegister), "devices/%s/register", DEVICE_ID);
  snprintf(topicCommands, sizeof(topicCommands), "devices/%s/commands", DEVICE_ID);
  snprintf(topicPresence, sizeof(topicPresence), "devices/%s/presence", DEVICE_ID);
}


// Cached WiFi status check
uint8_t getWiFiStatus() {
  unsigned long now = millis();
  if (now - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
    cachedWiFiStatus = WiFi.status();
    lastWiFiCheck = now;
  }
  return cachedWiFiStatus;
}


// ===========================
// CALIBRATION MODE CONTROL (OPTIONAL MQTT)
// ===========================


void setCalibrationMode(bool enabled) {
  isCalibrationMode = enabled;
  
  if (enabled) {
    sensorReadInterval = CALIBRATION_INTERVAL;
    Serial.println(F("\n=== CALIBRATION MODE ENABLED ==="));
    Serial.println(F("✓ MQTT transmission: DISABLED"));
    Serial.print(F("✓ Sensor read interval: "));
    Serial.print(CALIBRATION_INTERVAL);
    Serial.println(F("ms"));
    Serial.println(F("✓ Data displayed locally only"));
    Serial.println(F("✓ Fast loop timing activated"));
    Serial.println(F("================================\n"));
  } else {
    sensorReadInterval = SENSOR_READ_INTERVAL;
    Serial.println(F("\n=== CALIBRATION MODE DISABLED ==="));
    Serial.println(F("✓ MQTT transmission: ENABLED"));
    Serial.print(F("✓ Sensor read interval: "));
    Serial.print(SENSOR_READ_INTERVAL);
    Serial.println(F("ms"));
    Serial.println(F("✓ Normal operation resumed"));
    Serial.println(F("=================================\n"));
  }
}


void toggleCalibrationMode() {
  setCalibrationMode(!isCalibrationMode);
}


// ===========================
// EEPROM FUNCTIONS
// ===========================


void initEEPROM() {
  Serial.println(F("\n=== EEPROM Initialization ==="));
  
  uint16_t magic = (EEPROM.read(EEPROM_ADDR_MAGIC) << 8) | EEPROM.read(EEPROM_ADDR_MAGIC + 1);
  
  if (magic != EEPROM_MAGIC_NUMBER) {
    Serial.println(F("First boot - initializing EEPROM"));
    
    EEPROM.write(EEPROM_ADDR_MAGIC, (EEPROM_MAGIC_NUMBER >> 8) & 0xFF);
    EEPROM.write(EEPROM_ADDR_MAGIC + 1, EEPROM_MAGIC_NUMBER & 0xFF);
    EEPROM.write(EEPROM_ADDR_APPROVED, 0);
    writeBootCount(0);
    
    isApproved = false;
    bootCount = 0;
    
    Serial.println(F("EEPROM initialized"));
  } else {
    Serial.println(F("EEPROM valid - reading stored values"));
    
    isApproved = EEPROM.read(EEPROM_ADDR_APPROVED) == 1;
    bootCount = readBootCount();
    bootCount++;
    writeBootCount(bootCount);
    
    Serial.print(F("Approved status: "));
    Serial.println(isApproved ? F("YES") : F("NO"));
    Serial.print(F("Boot count: "));
    Serial.println(bootCount);
  }
  
  Serial.println(F("=============================\n"));
}


void saveApprovedStatus(bool approved) {
  EEPROM.write(EEPROM_ADDR_APPROVED, approved ? 1 : 0);
  isApproved = approved;
  
  Serial.print(F("✓ Saved approved status to EEPROM: "));
  Serial.println(approved ? F("YES") : F("NO"));
}


unsigned long readBootCount() {
  unsigned long count = 0;
  count |= ((unsigned long)EEPROM.read(EEPROM_ADDR_BOOT_COUNT) << 24);
  count |= ((unsigned long)EEPROM.read(EEPROM_ADDR_BOOT_COUNT + 1) << 16);
  count |= ((unsigned long)EEPROM.read(EEPROM_ADDR_BOOT_COUNT + 2) << 8);
  count |= EEPROM.read(EEPROM_ADDR_BOOT_COUNT + 3);
  return count;
}


void writeBootCount(unsigned long count) {
  EEPROM.write(EEPROM_ADDR_BOOT_COUNT, (count >> 24) & 0xFF);
  EEPROM.write(EEPROM_ADDR_BOOT_COUNT + 1, (count >> 16) & 0xFF);
  EEPROM.write(EEPROM_ADDR_BOOT_COUNT + 2, (count >> 8) & 0xFF);
  EEPROM.write(EEPROM_ADDR_BOOT_COUNT + 3, count & 0xFF);
}


void clearEEPROM() {
  Serial.println(F("Clearing EEPROM..."));
  for (int i = 0; i < 50; i++) {
    EEPROM.write(i, 0);
  }
  Serial.println(F("EEPROM cleared - restart required"));
}


// ===========================
// CLOCK-BASED TRANSMISSION
// ===========================


bool isTransmissionTime() {
  if (!timeInitialized) return false;
  
  timeClient.update();
  int currentMinute = timeClient.getMinutes();
  
  bool isScheduledTime = (currentMinute == 0 || currentMinute == 30);
  bool notYetTransmitted = (currentMinute != lastTransmissionMinute);
  
  return isScheduledTime && notYetTransmitted;
}


void getNextTransmissionTime(char* buffer, size_t bufSize) {
  if (!timeInitialized) {
    strncpy(buffer, "Unknown", bufSize);
    return;
  }
  
  timeClient.update();
  int currentHour = timeClient.getHours();
  int currentMinute = timeClient.getMinutes();
  
  int nextMinute, nextHour;
  
  if (currentMinute < 30) {
    nextMinute = 30;
    nextHour = currentHour;
  } else {
    nextMinute = 0;
    nextHour = (currentHour + 1) % 24;
  }
  
  snprintf(buffer, bufSize, "%02d:%02d UTC", nextHour, nextMinute);
}


void getNextTransmissionPHTime(char* buffer, size_t bufSize) {
  if (!timeInitialized) {
    strncpy(buffer, "Unknown", bufSize);
    return;
  }
  
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();
  unsigned long phTime = epochTime + TIMEZONE_OFFSET_SECONDS;
  
  int currentHour = (phTime % 86400L) / 3600;
  int currentMinute = (phTime % 3600) / 60;
  
  int nextMinute, nextHour;
  
  if (currentMinute < 30) {
    nextMinute = 30;
    nextHour = currentHour;
  } else {
    nextMinute = 0;
    nextHour = (currentHour + 1) % 24;
  }
  
  snprintf(buffer, bufSize, "%02d:%02d PH", nextHour, nextMinute);
}


// ===========================
// TIME MANAGEMENT FUNCTIONS
// ===========================


void checkMidnightRestart() {
  if (restartScheduled) return;
  
  timeClient.update();
  
  int currentHourUTC = timeClient.getHours();
  int currentMinuteUTC = timeClient.getMinutes();
  
  if (currentHourUTC == RESTART_HOUR_UTC && currentMinuteUTC == RESTART_MINUTE) {
    if (!restartScheduled) {
      restartScheduled = true;
      
      Serial.println(F("\n========================================="));
      Serial.println(F("MIDNIGHT RESTART (Philippine Time)"));
      Serial.print(F("UTC Time: "));
      Serial.println(timeClient.getFormattedTime());
      Serial.print(F("PH Time: "));
      printPhilippineTime();
      Serial.print(F("Uptime: "));
      Serial.print((millis() - bootTime) / 3600000);
      Serial.println(F(" hours"));
      Serial.print(F("Boot count: "));
      Serial.println(bootCount);
      Serial.println(F("Restarting in 5 seconds..."));
      Serial.println(F("Registration status will be preserved"));
      Serial.println(F("=========================================\n"));
      
      // No shutdown status needed - server will detect offline via polling
      mqttClient.disconnect();
      
      delay(5000);
      NVIC_SystemReset();
    }
  } else {
    if (currentMinuteUTC > 1) {
      restartScheduled = false;
    }
  }
}


void printCurrentTime() {
  Serial.print(F("UTC Time: "));
  Serial.println(timeClient.getFormattedTime());
  
  Serial.print(F("PH Time:  "));
  printPhilippineTime();
  
  int currentHourUTC = timeClient.getHours();
  int hoursUntilRestart = (currentHourUTC < RESTART_HOUR_UTC) 
    ? RESTART_HOUR_UTC - currentHourUTC 
    : 24 - currentHourUTC + RESTART_HOUR_UTC;
  
  int minutesUntilRestart = (60 - timeClient.getMinutes()) % 60;
  
  Serial.print(F("Next restart: "));
  Serial.print(hoursUntilRestart);
  Serial.print(F("h "));
  Serial.print(minutesUntilRestart);
  Serial.println(F("m"));
}


void printPhilippineTime() {
  char timeStr[9];
  getPhilippineTimeString(timeStr, sizeof(timeStr));
  Serial.println(timeStr);
}


void getPhilippineTimeString(char* buffer, size_t bufSize) {
  unsigned long epochTime = timeClient.getEpochTime();
  unsigned long phTime = epochTime + TIMEZONE_OFFSET_SECONDS;
  
  int hours = (phTime % 86400L) / 3600;
  int minutes = (phTime % 3600) / 60;
  int seconds = phTime % 60;
  
  snprintf(buffer, bufSize, "%02d:%02d:%02d", hours, minutes, seconds);
}


// ===========================
// WIFI FUNCTIONS
// ===========================


void connectWiFi() {
  Serial.print(F("WiFi: "));
  Serial.println(F(WIFI_SSID));
  
  WiFi.disconnect();
  delay(500);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);


  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    Serial.print(F("."));
    delay(500);
    attempts++;
  }


  cachedWiFiStatus = WiFi.status();
  
  if (cachedWiFiStatus != WL_CONNECTED) {
    Serial.println(F("\nWiFi FAILED"));
    consecutiveWifiFailures++;
    
    if (consecutiveWifiFailures >= MAX_WIFI_FAILURES) {
      Serial.println(F("Max WiFi failures - rebooting"));
      delay(3000);
      NVIC_SystemReset();
    }
    return;
  }


  Serial.println(F("\nWiFi OK"));
  
  attempts = 0;
  while (WiFi.localIP() == IPAddress(0, 0, 0, 0) && attempts < 20) {
    Serial.print(F("Waiting for IP"));
    delay(500);
    attempts++;
  }
  
  if (WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println(F("\nNo IP assigned - reconnecting"));
    consecutiveWifiFailures++;
    delay(2000);
    connectWiFi();
    return;
  }
  
  Serial.print(F("IP: "));
  Serial.println(WiFi.localIP());
  Serial.print(F("RSSI: "));
  Serial.println(WiFi.RSSI());
  
  consecutiveWifiFailures = 0;
}


void handleWiFiDisconnection() {
  Serial.println(F("WiFi lost - reconnecting"));
  consecutiveWifiFailures++;
  mqttConnected = false;
  connectWiFi();
  
  if (getWiFiStatus() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
    delay(1000);
    
    if (!timeInitialized) {
      timeClient.update();
      timeInitialized = true;
    }
  }
}


// ===========================
// MQTT FUNCTIONS
// ===========================


void connectMQTT() {
  // Skip MQTT in calibration mode (unless you want remote control)
  if (isCalibrationMode) {
    Serial.println(F("Calibration mode - skipping MQTT"));
    return;
  }
  
  if (getWiFiStatus() != WL_CONNECTED) {
    Serial.println(F("MQTT: No WiFi"));
    return;
  }


  if (WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println(F("MQTT: No IP address"));
    return;
  }


  if (mqttClient.connected()) {
    mqttConnected = true;
    return;
  }


  Serial.println(F("\n--- MQTT SSL Connection ---"));
  Serial.print(F("Broker: "));
  Serial.println(F(MQTT_BROKER));
  Serial.print(F("Port: "));
  Serial.print(MQTT_PORT);
  Serial.println(F(" (SSL/TLS)"));
  Serial.println(F("Establishing SSL handshake..."));


  // Connect WITHOUT Last Will Testament (LWT)
  // Server will poll for presence instead of relying on broker LWT
  bool connected = mqttClient.connect(
    MQTT_CLIENT_ID,
    MQTT_USERNAME,
    MQTT_PASSWORD
  );


  if (connected) {
    Serial.println(F("✓ MQTT SSL Connected! (No LWT - Polling mode)"));
    mqttConnected = true;
    consecutiveMqttFailures = 0;


    if (mqttClient.subscribe(topicCommands, 0)) {
      Serial.print(F("✓ Subscribed: "));
      Serial.println(topicCommands);
    }


    // Subscribe to presence query topic - SERVER WILL POLL US
    char presenceQueryTopic[30];
    strcpy_P(presenceQueryTopic, PRESENCE_QUERY_TOPIC);
    
    if (mqttClient.subscribe(presenceQueryTopic, 1)) {
      Serial.print(F("✓ Subscribed: "));
      Serial.println(presenceQueryTopic);
      Serial.println(F("  Waiting for server presence polls..."));
    }


    // Announce we're online (will be validated by server polls)
    publishPresenceOnline();
    
  } else {
    Serial.print(F("✗ MQTT SSL Failed: "));
    Serial.println(mqttClient.state());
    printMqttError(mqttClient.state());
    
    mqttConnected = false;
    consecutiveMqttFailures++;
    
    if (consecutiveMqttFailures >= MAX_MQTT_FAILURES) {
      Serial.println(F("Max MQTT failures - resetting connection"));
      mqttClient.disconnect();
      delay(5000);
      consecutiveMqttFailures = 0;
    }
  }
  
  Serial.println(F("--- End MQTT Connection ---\n"));
}


void printMqttError(int state) {
  switch (state) {
    case -4: Serial.println(F("  SSL_CONNECTION_TIMEOUT")); break;
    case -3: Serial.println(F("  CONNECTION_LOST")); break;
    case -2: Serial.println(F("  CONNECT_FAILED")); break;
    case -1: Serial.println(F("  DISCONNECTED")); break;
    case 1: Serial.println(F("  BAD_PROTOCOL")); break;
    case 2: Serial.println(F("  BAD_CLIENT_ID")); break;
    case 3: Serial.println(F("  UNAVAILABLE")); break;
    case 4: Serial.println(F("  BAD_CREDENTIALS")); break;
    case 5: Serial.println(F("  UNAUTHORIZED")); break;
    default: Serial.println(F("  UNKNOWN")); break;
  }
}


void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print(F("MQTT RX ["));
  Serial.print(topic);
  Serial.print(F("]: "));
  
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  Serial.println(message);


  // Handle presence queries FIRST
  char presenceQueryTopic[30];
  strcpy_P(presenceQueryTopic, PRESENCE_QUERY_TOPIC);
  
  if (strcmp(topic, presenceQueryTopic) == 0) {
    handlePresenceQuery(message);
    return;
  }


  // Handle regular commands - Optimized size
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);


  if (error) {
    Serial.println(F("JSON parse error"));
    return;
  }


  const char* command = doc["command"];
  
  if (command == nullptr) return;


  if (strcmp(command, "go") == 0) {
    Serial.println(F("CMD: GO - Device approved!"));
    saveApprovedStatus(true);
    lastTransmissionMinute = -1;
    
  } else if (strcmp(command, "deregister") == 0) {
    Serial.println(F("CMD: DEREGISTER - Approval revoked"));
    saveApprovedStatus(false);
    
    Serial.println(F("Disconnecting MQTT for fresh registration..."));
    mqttClient.disconnect();
    delay(2000);
    mqttConnected = false;
    consecutiveMqttFailures = 0;
    lastMqttReconnect = millis() - MQTT_RECONNECT_INTERVAL;
    
  } else if (strcmp(command, "restart") == 0) {
    Serial.println(F("CMD: RESTART"));
    delay(1000);
    NVIC_SystemReset();
    
  } else if (strcmp(command, "send_now") == 0) {
    Serial.println(F("CMD: SEND NOW"));
    lastTransmissionMinute = -1;
    
    if (mqttConnected && isApproved && !isCalibrationMode) {
      Serial.println(F("\n=== MANUAL TX (send_now) ==="));
      publishSensorData();
      publishPresenceOnline(); // Announce presence instead of status
      transmissionCount++;
      Serial.println(F("=== TX COMPLETE ===\n"));
    } else if (isCalibrationMode) {
      Serial.println(F("⚠ Cannot send - Calibration mode active"));
    }
    
  } else if (strcmp(command, "sync_time") == 0) {
    Serial.println(F("CMD: SYNC TIME"));
    timeClient.forceUpdate();
    printCurrentTime();
    
  } else if (strcmp(command, "reset_eeprom") == 0) {
    Serial.println(F("CMD: RESET EEPROM"));
    clearEEPROM();
    delay(2000);
    NVIC_SystemReset();
    
  } else if (strcmp(command, "calibration_on") == 0) {
    Serial.println(F("CMD: CALIBRATION MODE ON"));
    setCalibrationMode(true);
    
  } else if (strcmp(command, "calibration_off") == 0) {
    Serial.println(F("CMD: CALIBRATION MODE OFF"));
    setCalibrationMode(false);
    
  } else if (strcmp(command, "toggle_calibration") == 0) {
    Serial.println(F("CMD: TOGGLE CALIBRATION"));
    toggleCalibrationMode();
    
  } else {
    Serial.print(F("CMD: Unknown - "));
    Serial.println(command);
  }
}


// ===========================
// MQTT PUBLISH FUNCTIONS
// ===========================


void publishSensorData() {
  // Block MQTT transmission in calibration mode
  if (isCalibrationMode) {
    Serial.println(F("⚠ Calibration mode active - MQTT transmission blocked"));
    return;
  }
  
  if (!mqttClient.connected()) {
    Serial.println(F("MQTT not connected"));
    mqttConnected = false;
    return;
  }


  StaticJsonDocument<220> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  // Sensor data assignment
  doc["tds"] = round(tds * 10) / 10.0;
  doc["pH"] = round(ph * 100) / 100.0;
  doc["turbidity"] = round(turbidity * 10) / 10.0;
  doc["messageType"] = "sensor_data";
  doc["interval"] = "30min_clock_sync";
  doc["transmissionNumber"] = transmissionCount;


  char payload[220];
  size_t payloadSize = serializeJson(doc, payload, sizeof(payload));


  Serial.print(F("Publishing ("));
  Serial.print(payloadSize);
  Serial.println(F(" bytes):"));
  Serial.println(payload);


  if (mqttClient.publish(topicData, payload, false)) {
    Serial.println(F("✓ Published!"));
  } else {
    Serial.println(F("✗ Publish failed!"));
    Serial.print(F("State: "));
    Serial.println(mqttClient.state());
    
    if (mqttClient.state() == 0) {
      Serial.println(F("State shows connected but publish failed - forcing reconnect"));
      mqttClient.disconnect();
      mqttConnected = false;
      delay(1000);
    }
    
    consecutiveMqttFailures++;
  }
}


void sendRegistration() {
  if (!mqttClient.connected()) {
    Serial.println(F("MQTT not connected - cannot register"));
    mqttConnected = false;
    return;
  }


  if (WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println(F("No IP - cannot register"));
    return;
  }


  Serial.println(F("\n--- Device Registration ---"));


  StaticJsonDocument<480> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["type"] = DEVICE_TYPE;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  doc["messageType"] = "registration";
  doc["uptime"] = (millis() - bootTime) / 1000;
  doc["dataInterval"] = "30min_clock_sync";
  doc["restartSchedule"] = "daily_midnight_ph";
  doc["timezone"] = "Asia/Manila";
  doc["connectionType"] = "SSL/TLS";
  doc["bootCount"] = bootCount;


  uint8_t macRaw[6];
  WiFi.macAddress(macRaw);
  char mac[18];
  snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X",
           macRaw[0], macRaw[1], macRaw[2], macRaw[3], macRaw[4], macRaw[5]);
  doc["macAddress"] = mac;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  
  if (timeInitialized) {
    doc["utcTime"] = timeClient.getFormattedTime();
    
    char phTimeStr[9];
    getPhilippineTimeString(phTimeStr, sizeof(phTimeStr));
    doc["phTime"] = phTimeStr;
  }


  JsonArray sensors = doc.createNestedArray("sensors");
  sensors.add("pH");
  sensors.add("turbidity");
  sensors.add("tds");


  char payload[480];
  size_t payloadSize = serializeJson(doc, payload, sizeof(payload));


  Serial.print(F("Size: "));
  Serial.print(payloadSize);
  Serial.println(F(" bytes"));
  
  if (payloadSize > 768) {
    Serial.println(F("✗ Payload too large!"));
    return;
  }
  
  Serial.println(payload);


  bool published = mqttClient.publish(topicRegister, payload, false);


  if (published) {
    Serial.println(F("✓ Registration sent!"));
  } else {
    Serial.println(F("✗ Registration failed!"));
    Serial.print(F("MQTT state: "));
    Serial.println(mqttClient.state());
    
    if (mqttClient.state() == 0) {
      Serial.println(F("State shows connected but publish failed - forcing reconnect"));
      mqttClient.disconnect();
      mqttConnected = false;
      delay(1000);
    } else {
      printMqttError(mqttClient.state());
    }
    
    consecutiveMqttFailures++;
  }
  
  Serial.println(F("--- End Registration ---\n"));
}


// REMOVED: sendStatusUpdate() - Status topic replaced by presence polling
// Status information is now communicated through presence responses
// when server queries "who_is_online"


// REMOVED: sendShutdownStatus() - Not needed with polling mode
// Device simply stops responding to presence queries when offline


// ===========================
// MQTT PRESENCE DETECTION
// ===========================


void handlePresenceQuery(const char* message) {
  Serial.println(F("\n=== PRESENCE QUERY RECEIVED ==="));
  
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);


  if (error) {
    Serial.print(F("Failed to parse presence query: "));
    Serial.println(error.c_str());
    return;
  }


  const char* queryType = doc["query"];
  if (queryType != nullptr && strcmp(queryType, "who_is_online") == 0) {
    presenceQueryActive = true;
    lastPresenceQuery = millis();


    Serial.println(F("Query type: who_is_online"));
    Serial.println(F("Preparing response..."));


    StaticJsonDocument<300> responseDoc;
    responseDoc["response"] = "i_am_online";
    responseDoc["deviceId"] = DEVICE_ID;
    responseDoc["deviceName"] = DEVICE_NAME;
    responseDoc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
    responseDoc["firmwareVersion"] = FIRMWARE_VERSION;
    responseDoc["uptime"] = (millis() - bootTime) / 1000;
    responseDoc["isApproved"] = isApproved;
    responseDoc["wifiRSSI"] = WiFi.RSSI();
    responseDoc["calibrationMode"] = isCalibrationMode;
    
    if (timeInitialized) {
      char phTimeStr[9];
      getPhilippineTimeString(phTimeStr, sizeof(phTimeStr));
      responseDoc["phTime"] = phTimeStr;
    }


    char responsePayload[300];
    size_t payloadSize = serializeJson(responseDoc, responsePayload, sizeof(responsePayload));


    Serial.print(F("Response payload: "));
    Serial.println(responsePayload);
    Serial.print(F("Response size: "));
    Serial.print(payloadSize);
    Serial.println(F(" bytes"));


    if (!mqttClient.connected()) {
      Serial.println(F("✗ MQTT disconnected - cannot respond"));
      mqttConnected = false;
      return;
    }


    char presenceResponseTopic[30];
    strcpy_P(presenceResponseTopic, PRESENCE_RESPONSE_TOPIC);
    
    bool published = mqttClient.publish(presenceResponseTopic, responsePayload, false);
    
    if (published) {
      Serial.println(F("✓ Presence response published successfully"));
    } else {
      Serial.println(F("✗ Failed to publish presence response"));
      Serial.print(F("MQTT state: "));
      Serial.println(mqttClient.state());
      printMqttError(mqttClient.state());
    }


    publishPresenceOnline();
    
    Serial.println(F("=== PRESENCE RESPONSE COMPLETE ===\n"));
  } else {
    Serial.print(F("Unknown query type: "));
    Serial.println(queryType != nullptr ? queryType : "null");
  }
}


void publishPresenceOnline() {
  if (!mqttClient.connected()) {
    Serial.println(F("MQTT not connected - cannot publish presence"));
    mqttConnected = false;
    return;
  }


  StaticJsonDocument<240> presenceDoc;
  presenceDoc["deviceId"] = DEVICE_ID;
  presenceDoc["deviceName"] = DEVICE_NAME;
  presenceDoc["status"] = "online";
  presenceDoc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  presenceDoc["lastResponse"] = millis();
  presenceDoc["firmwareVersion"] = FIRMWARE_VERSION;
  presenceDoc["uptime"] = (millis() - bootTime) / 1000;
  presenceDoc["isApproved"] = isApproved;
  presenceDoc["calibrationMode"] = isCalibrationMode;
  
  if (timeInitialized) {
    char phTimeStr[9];
    getPhilippineTimeString(phTimeStr, sizeof(phTimeStr));
    presenceDoc["phTime"] = phTimeStr;
  }


  char presencePayload[240];
  serializeJson(presenceDoc, presencePayload, sizeof(presencePayload));


  // Publish WITHOUT retained flag - server will poll to verify
  if (mqttClient.publish(topicPresence, presencePayload, false)) {
    Serial.println(F("✓ Presence status: online (NOT retained)"));
  } else {
    Serial.println(F("✗ Failed to publish presence status"));
    Serial.print(F("MQTT state: "));
    Serial.println(mqttClient.state());
  }
}


// ===========================
// CALIBRATION FUNCTIONS
// ===========================

void computeCalibrationParams() {
  float meanX = 0.0, meanY = 0.0;
  for (int i = 0; i < CALIB_COUNT; i++) {
    meanX += pgm_read_word_near(calibADC + i);
    meanY += pgm_read_float_near(calibPPM + i);
  }
  meanX /= CALIB_COUNT;
  meanY /= CALIB_COUNT;

  float num = 0.0, den = 0.0;
  for (int i = 0; i < CALIB_COUNT; i++) {
    float dx = pgm_read_word_near(calibADC + i) - meanX;
    float dy = pgm_read_float_near(calibPPM + i) - meanY;
    num += dx * dy;
    den += dx * dx;
  }

  if (den != 0.0) {
    fitSlope = num / den;
    fitIntercept = meanY - fitSlope * meanX;
  }
}

void computePHCalibrationParams() {
  float meanX = 0.0, meanY = 0.0;
  for (int i = 0; i < PH_CALIB_COUNT; i++) {
    meanX += pgm_read_word_near(phCalibADC + i);
    meanY += pgm_read_float_near(phCalibPH + i);
  }
  meanX /= PH_CALIB_COUNT;
  meanY /= PH_CALIB_COUNT;

  float num = 0.0, den = 0.0;
  for (int i = 0; i < PH_CALIB_COUNT; i++) {
    float dx = pgm_read_word_near(phCalibADC + i) - meanX;
    float dy = pgm_read_float_near(phCalibPH + i) - meanY;
    num += dx * dy;
    den += dx * dx;
  }

  if (den != 0.0) {
    phFitSlope = num / den;
    phFitIntercept = meanY - phFitSlope * meanX;
  }
}

void printCalibrationInfo() {
  Serial.println(F("=== CALIBRATION ==="));
  Serial.print(F("TDS Slope: "));
  Serial.println(fitSlope, 3);
  Serial.print(F("TDS Intercept: "));
  Serial.println(fitIntercept, 2);
  Serial.print(F("pH Slope: "));
  Serial.println(phFitSlope, 3);
  Serial.print(F("pH Intercept: "));
  Serial.println(phFitIntercept, 2);
  Serial.println(F("==================="));
}

float adcToPPM(int adc) {
  for (int i = 0; i < CALIB_COUNT - 1; i++) {
    int adc_i = pgm_read_word_near(calibADC + i);
    int adc_i1 = pgm_read_word_near(calibADC + i + 1);

    if (adc >= adc_i && adc <= adc_i1) {
      float ppm_i = pgm_read_float_near(calibPPM + i);
      float ppm_i1 = pgm_read_float_near(calibPPM + i + 1);
      float slope = (ppm_i1 - ppm_i) / (float)(adc_i1 - adc_i);
      return ppm_i + slope * (adc - adc_i);
    }
  }
  return fitSlope * adc + fitIntercept;
}

float adcToPH(int adc) {
  for (int i = 0; i < PH_CALIB_COUNT - 1; i++) {
    int adc_i = pgm_read_word_near(phCalibADC + i);
    int adc_i1 = pgm_read_word_near(phCalibADC + i + 1);

    if (adc >= adc_i && adc <= adc_i1) {
      float ph_i = pgm_read_float_near(phCalibPH + i);
      float ph_i1 = pgm_read_float_near(phCalibPH + i + 1);
      float slope = (ph_i1 - ph_i) / (float)(adc_i1 - adc_i);
      return ph_i + slope * (adc - adc_i);
    }
  }
  return phFitSlope * adc + phFitIntercept;
}

float calculateTurbidityNTU(int adcValue) {
  // Calibrated for:
  // Clear water: ADC ~360, NTU = 0
  // Cloudy water: ADC ~100, NTU = 20
  float slope = 20.0 / (100.0 - 360.0);  // -0.0769230769
  float intercept = -slope * 360.0;       // 27.69230769
  float ntu = slope * adcValue + intercept;
  return (ntu < 0) ? 0 : ntu;
}

String getTurbidityStatus(float ntu) {
  if (ntu > 10.0) return "EMERGENCY";
  if (ntu > 5.0) return "CRITICAL";
  if (ntu > 1.0) return "WARNING";
  return "NORMAL";
}


// ===========================
// SENSOR READING
// ===========================

void readSensors() {
  int rawTDS = analogRead(TDS_PIN);
  int rawPH = analogRead(PH_PIN);
  int rawTurb = analogRead(TURBIDITY_PIN);

  smaSum -= smaBuffer[smaIndex];
  smaBuffer[smaIndex] = rawTDS;
  smaSum += rawTDS;
  smaIndex = (smaIndex + 1) % SMA_SIZE;
  if (smaCount < SMA_SIZE) smaCount++;

  phSum -= phBuffer[phIndex];
  phBuffer[phIndex] = rawPH;
  phSum += rawPH;
  phIndex = (phIndex + 1) % PH_SMA_SIZE;
  if (phCount < PH_SMA_SIZE) phCount++;

  turbSum -= turbBuffer[turbIndex];
  turbBuffer[turbIndex] = rawTurb;
  turbSum += rawTurb;
  turbIndex = (turbIndex + 1) % TURB_SMA_SIZE;
  if (turbCount < TURB_SMA_SIZE) turbCount++;

  int avgTDS = smaSum / max(1, smaCount);
  int avgPH = phSum / max(1, phCount);
  int avgTurb = turbSum / max(1, turbCount);

  float ppm = adcToPPM(avgTDS);
  tds = (ppm * TDS_CALIBRATION_FACTOR) + TDS_OFFSET;

  ph = adcToPH(avgPH);
  if (ph < 0.0) ph = 0.0;
  if (ph > 14.0) ph = 14.0;

  int turb10bit = avgTurb / 16;
  turbidity = calculateTurbidityNTU(avgTurb);

  // Simple output for calibration
  Serial.print(F("Raw TDS:"));
  Serial.print(rawTDS);
  Serial.print(F(" Raw pH:"));
  Serial.print(rawPH);
  Serial.print(F(" Raw Turb:"));
  Serial.print(rawTurb);
  Serial.print(F(" | Avg TDS:"));
  Serial.print(avgTDS);
  Serial.print(F(" Avg pH:"));
  Serial.print(avgPH);
  Serial.print(F(" Avg Turb:"));
  Serial.print(avgTurb);
  Serial.print(F(" | TDS:"));
  Serial.print(tds, 1);
  Serial.print(F(" pH:"));
  Serial.print(ph, 2);
  Serial.print(F(" Turb:"));
  Serial.print(turbidity, 1);
  Serial.print(F(" NTU ("));
  Serial.print(getTurbidityStatus(turbidity));
  Serial.println(F(")"));
}


// ===========================
// WATCHDOG
// ===========================


void printWatchdog() {
  Serial.println(F("\n=== WATCHDOG ==="));
  Serial.print(F("Uptime: "));
  Serial.print((millis() - bootTime) / 3600000);
  Serial.println(F("h"));
  
  Serial.print(F("Boot count: "));
  Serial.println(bootCount);
  
  Serial.print(F("Calibration Mode: "));
  Serial.println(isCalibrationMode ? F("ACTIVE (255ms)") : F("OFF"));
  
  Serial.print(F("Read Interval: "));
  Serial.print(sensorReadInterval);
  Serial.println(F("ms"));
  
  Serial.print(F("IP: "));
  Serial.println(WiFi.localIP());
  
  Serial.print(F("Approved: "));
  Serial.println(isApproved ? F("YES") : F("NO"));
  
  if (timeInitialized) {
    Serial.print(F("UTC:  "));
    Serial.println(timeClient.getFormattedTime());
    Serial.print(F("PH:   "));
    printPhilippineTime();
    
    if (!isCalibrationMode) {
      char nextTxStr[15];
      getNextTransmissionPHTime(nextTxStr, sizeof(nextTxStr));
      Serial.print(F("Next TX: "));
      Serial.println(nextTxStr);
    }
    
    int currentHourUTC = timeClient.getHours();
    int hoursUntilRestart = (currentHourUTC < RESTART_HOUR_UTC) 
      ? RESTART_HOUR_UTC - currentHourUTC 
      : 24 - currentHourUTC + RESTART_HOUR_UTC;
    
    Serial.print(F("Restart in: "));
    Serial.print(hoursUntilRestart);
    Serial.println(F("h"));
  } else {
    Serial.println(F("Time: Not synced"));
  }
  
  Serial.print(F("WiFi: "));
  Serial.println(getWiFiStatus() == WL_CONNECTED ? F("OK") : F("DOWN"));
  Serial.print(F("MQTT SSL: "));
  Serial.println(mqttConnected ? F("OK") : F("DOWN"));
  Serial.print(F("TX Count: "));
  Serial.println(transmissionCount);
  Serial.println(F("================\n"));
}


// ===========================
// SETUP FUNCTION
// ===========================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  bootTime = millis();


  Serial.println(F("\n=== Arduino R4 - Clock-Synchronized TX ==="));
  Serial.println(F("Firmware: v6.9.2 - MANUAL CALIBRATION MODE"));
  Serial.print(F("Boot: "));
  Serial.println(bootTime);
  Serial.println(F("MQTT: SSL/TLS (Port 8883)"));
  Serial.println(F("Restart: 12:00 AM Philippine Time"));
  Serial.println(F("Data TX: :00 and :30 minutes (clock-synced)"));
  Serial.println(F("FEATURE: Enhanced MQTT Presence Detection"));
  Serial.println(F("FEATURE: Manual Calibration Mode Control"));
  Serial.println(F("OPTIMIZED: F() macro + PROGMEM + Reduced RAM"));
  
  // Display calibration mode status
  Serial.print(F("CALIBRATION MODE: "));
  Serial.println(isCalibrationMode ? F("ENABLED (255ms, no MQTT)") : F("DISABLED (normal)"));
  
  buildTopics();
  initEEPROM();
  
  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);


  memset(smaBuffer, 0, sizeof(smaBuffer));
  memset(phBuffer, 0, sizeof(phBuffer));
  memset(turbBuffer, 0, sizeof(turbBuffer));


  computeCalibrationParams();
  computePHCalibrationParams();
  printCalibrationInfo();


  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(90);
  mqttClient.setSocketTimeout(60);
  mqttClient.setBufferSize(768);


  Serial.println(F("\n=== Connecting... ==="));
  
  connectWiFi();
  
  // Skip MQTT and NTP in calibration mode
  if (!isCalibrationMode && getWiFiStatus() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
    
    timeClient.begin();
    delay(1000);
    
    Serial.print(F("NTP sync"));
    for (int i = 0; i < 5; i++) {
      Serial.print(F("."));
      if (timeClient.update()) {
        timeInitialized = true;
        Serial.println(F(" OK"));
        printCurrentTime();
        break;
      }
      delay(1000);
    }
    
    if (!timeInitialized) {
      Serial.println(F(" Failed (will retry)"));
    }
    
    delay(2000);
    
    connectMQTT();
    
    if (mqttConnected) {
      delay(3000);
      
      if (!isApproved) {
        Serial.println(F("Device NOT approved - sending registration"));
        sendRegistration();
      } else {
        Serial.println(F("Device already approved - skipping registration"));
        sendStatusUpdate();
      }
    }
  } else if (isCalibrationMode) {
    Serial.println(F("\n*** CALIBRATION MODE - Skipping MQTT/NTP ***"));
    Serial.println(F("*** Sensor readings will display every 255ms ***"));
  }


  Serial.println(F("\n=== System Ready ==="));
  
  if (isCalibrationMode) {
    Serial.println(F("Mode: CALIBRATION (255ms local readings only)"));
  } else {
    Serial.print(F("Mode: "));
    Serial.println(isApproved ? F("ACTIVE MONITORING") : F("WAITING FOR APPROVAL"));
    
    if (timeInitialized) {
      char nextTxStr[15];
      getNextTransmissionPHTime(nextTxStr, sizeof(nextTxStr));
      Serial.print(F("Next TX: "));
      Serial.println(nextTxStr);
    }
  }
  
  Serial.println();
}


// ===========================
// MAIN LOOP - OPTIMIZED FOR CALIBRATION MODE
// ===========================
void loop() {
  unsigned long currentMillis = millis();


  // Safety fallback (skip in calibration mode)
  if (!isCalibrationMode && (currentMillis - bootTime) / 3600000UL >= MAX_UPTIME_HOURS) {
    Serial.println(F("Max uptime - safety restart"));
    delay(2000);
    NVIC_SystemReset();
  }


  // Check for midnight restart (skip in calibration mode)
  if (!isCalibrationMode && timeInitialized) {
    checkMidnightRestart();
  }


  // WiFi management - Using cached status
  uint8_t wifiStatus = getWiFiStatus();
  if (!isCalibrationMode && wifiStatus != WL_CONNECTED) {
    handleWiFiDisconnection();
    delay(5000);
    return;
  } else {
    consecutiveWifiFailures = 0;
  }


  // Update NTP time periodically (skip in calibration mode)
  if (!isCalibrationMode && timeInitialized && currentMillis - lastNtpUpdate >= NTP_UPDATE_INTERVAL) {
    lastNtpUpdate = currentMillis;
    timeClient.update();
  }


  // Initialize time if not yet done (skip in calibration mode)
  if (!isCalibrationMode && !timeInitialized && wifiStatus == WL_CONNECTED) {
    if (timeClient.update()) {
      timeInitialized = true;
      Serial.println(F("NTP time synchronized"));
      printCurrentTime();
    }
  }


  // MQTT management (skip in calibration mode)
  if (!isCalibrationMode) {
    if (!mqttClient.connected()) {
      mqttConnected = false;
      
      bool needMqtt = !isApproved;
      
      if (timeInitialized && isApproved) {
        int currentMinute = timeClient.getMinutes();
        needMqtt = (currentMinute == 28 || currentMinute == 29 || 
                    currentMinute == 58 || currentMinute == 59 || 
                    currentMinute == 0 || currentMinute == 30);
      }
      
      if (needMqtt && currentMillis - lastMqttReconnect >= MQTT_RECONNECT_INTERVAL) {
        lastMqttReconnect = currentMillis;
        connectMQTT();
      }
    } else {
      mqttClient.loop();
      consecutiveMqttFailures = 0;
    }


    // Check for presence query timeout
    if (presenceQueryActive && (currentMillis - lastPresenceQuery) > PRESENCE_TIMEOUT) {
      presenceQueryActive = false;
      Serial.println(F("Presence query timeout"));
    }
  }


  // Watchdog heartbeat (slower in calibration mode)
  unsigned long watchdogInterval = isCalibrationMode ? 60000 : WATCHDOG_INTERVAL;
  if (currentMillis - lastWatchdog >= watchdogInterval) {
    lastWatchdog = currentMillis;
    printWatchdog();
  }


  // ===== SENSOR READING - ALWAYS ACTIVE (works in all modes) =====
  if (currentMillis - lastSensorRead >= sensorReadInterval) {
    lastSensorRead = currentMillis;
    readSensors();
    
    if (isCalibrationMode) {
      // In calibration mode, show fast readings
      Serial.print(F("[CALIB] Interval: "));
      Serial.print(sensorReadInterval);
      Serial.println(F("ms - Local display only"));
    } else if (isApproved && timeInitialized) {
      // In normal mode, show next transmission time
      char nextTxStr[15];
      getNextTransmissionPHTime(nextTxStr, sizeof(nextTxStr));
      Serial.print(F("Next TX: "));
      Serial.println(nextTxStr);
    }
  }


  // Registration mode - send registration attempts (skip in calibration mode)
  if (!isCalibrationMode && !isApproved) {
    if (currentMillis - lastRegistrationAttempt >= REGISTRATION_INTERVAL) {
      lastRegistrationAttempt = currentMillis;
      if (mqttConnected) {
        sendRegistration();
      }
    }
  } 
  // Active monitoring mode - scheduled transmissions (skip in calibration mode)
  else if (!isCalibrationMode) {
    // Clock-synchronized data transmission
    if (isTransmissionTime()) {
      Serial.println(F("\n=== SCHEDULED 30-MIN TX ==="));
      Serial.print(F("Current time: "));
      Serial.println(timeClient.getFormattedTime());
      
      if (!mqttConnected) {
        connectMQTT();
        delay(3000);
      }
      
      if (mqttConnected) {
        publishSensorData();
        publishPresenceOnline(); // Update presence instead of status
        transmissionCount++;
        
        lastTransmissionMinute = timeClient.getMinutes();
        
        Serial.print(F("TX Count: "));
        Serial.println(transmissionCount);
        
        char nextTxStr[15];
        getNextTransmissionPHTime(nextTxStr, sizeof(nextTxStr));
        Serial.print(F("Next TX: "));
        Serial.println(nextTxStr);
      } else {
        Serial.println(F("MQTT unavailable - transmission skipped"));
      }
      
      Serial.println(F("=== TX COMPLETE ===\n"));
    }
  }


  // Minimal delay - conditional based on calibration mode
  if (!isCalibrationMode) {
    delay(100);  // Normal mode: 100ms delay
  } else {
    delay(10);   // Calibration mode: 10ms for tight 255ms timing
  }
}
