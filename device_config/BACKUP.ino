/*
 * Water Quality Monitoring System with WiFi Configuration Portal
 * Arduino UNO R4 WiFi - Clock-Synchronized 30 Minute Data Transmission
 * Firmware: v6.9.3 - WiFi Manager + Manual Calibration Mode Control
 * 
 * NEW FEATURES:
 * - WiFi Configuration Portal (Access Point mode)
 * - Network scanning and web-based WiFi setup
 * - EEPROM storage for WiFi credentials
 * - Automatic fallback to portal mode if connection fails
 * - Calibration Mode: 255ms sensor readings, no MQTT transmission
 * - Manual control via code and MQTT commands
 */

#include <WiFiS3.h>
#include <WiFiSSLClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <EEPROM.h>
#include <avr/pgmspace.h>

// ===========================
// WIFI PORTAL CONFIGURATION
// ===========================
#define AP_SSID "WaterMonitor_Config"
#define AP_PASSWORD "12345678"

// EEPROM addresses for WiFi credentials
#define EEPROM_WIFI_CONFIGURED 10
#define EEPROM_WIFI_SSID_START 11
#define EEPROM_WIFI_PASS_START 111
#define MAX_SSID_LENGTH 32
#define MAX_PASS_LENGTH 64

// WiFi Portal mode
bool portalMode = false;
WiFiServer portalServer(80);

// ===========================
// CALIBRATION MODE CONTROL
// ===========================
#define CALIBRATION_MODE false

// ===========================
// MQTT CONFIGURATION
// ===========================
#define MQTT_BROKER "0331c5286d084675b9198021329c7573.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_CLIENT_ID "arduino_uno_r4_002"
#define MQTT_USERNAME "Admin"
#define MQTT_PASSWORD "Admin123"

// ===========================
// DEVICE CONFIGURATION
// ===========================
#define DEVICE_ID "arduino_uno_r4_002"
#define DEVICE_NAME "Water Quality Monitor R4"
#define DEVICE_TYPE "Arduino UNO R4 WiFi"
#define FIRMWARE_VERSION "6.9.3"

// ===========================
// SENSOR PIN CONFIGURATION
// ===========================
#define TDS_PIN A0
#define PH_PIN A0
#define TURBIDITY_PIN A2

// ===========================
// TIMING CONFIGURATION
// ===========================
#define SENSOR_READ_INTERVAL 60000
#define CALIBRATION_INTERVAL 255
#define REGISTRATION_INTERVAL 60000
#define MQTT_RECONNECT_INTERVAL 30000
#define WATCHDOG_INTERVAL 300000
#define NTP_UPDATE_INTERVAL 3600000

// ===========================
// TIME SETTINGS
// ===========================
#define RESTART_HOUR_UTC 16
#define RESTART_MINUTE 0
#define TIMEZONE_OFFSET_SECONDS 28800
#define MAX_UPTIME_HOURS 25

// ===========================
// 24/7 OPERATION SETTINGS
// ===========================
#define MAX_MQTT_FAILURES 10
#define MAX_WIFI_FAILURES 3

// ===========================
// EEPROM SETTINGS
// ===========================
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
// MQTT TOPICS
// ===========================
char topicData[50];
char topicStatus[50];
char topicRegister[50];
char topicCommands[50];
char topicPresence[50];

const char PRESENCE_QUERY_TOPIC[] PROGMEM = "presence/query";
const char PRESENCE_RESPONSE_TOPIC[] PROGMEM = "presence/response";

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
bool isCalibrationMode = CALIBRATION_MODE;

float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;

int consecutiveMqttFailures = 0;
int consecutiveWifiFailures = 0;

unsigned long transmissionCount = 0;
unsigned long bootCount = 0;
int lastTransmissionMinute = -1;
unsigned long sensorReadInterval = CALIBRATION_MODE ? CALIBRATION_INTERVAL : SENSOR_READ_INTERVAL;

bool presenceQueryActive = false;
unsigned long lastPresenceQuery = 0;
const unsigned long PRESENCE_TIMEOUT = 30000;

uint8_t cachedWiFiStatus = WL_IDLE_STATUS;
unsigned long lastWiFiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 1000;

// ===========================
// FUNCTION DECLARATIONS
// ===========================
void handlePresenceQuery(const char* message);
void publishPresenceOnline();

// ===========================
// WIFI EEPROM FUNCTIONS
// ===========================
void saveWiFiCredentials(String ssid, String password) {
  Serial.println(F("\n=== Saving WiFi Credentials ==="));
  
  EEPROM.write(EEPROM_WIFI_CONFIGURED, 1);
  
  for (int i = 0; i < MAX_SSID_LENGTH; i++) {
    if (i < ssid.length()) {
      EEPROM.write(EEPROM_WIFI_SSID_START + i, ssid[i]);
    } else {
      EEPROM.write(EEPROM_WIFI_SSID_START + i, 0);
    }
  }
  
  for (int i = 0; i < MAX_PASS_LENGTH; i++) {
    if (i < password.length()) {
      EEPROM.write(EEPROM_WIFI_PASS_START + i, password[i]);
    } else {
      EEPROM.write(EEPROM_WIFI_PASS_START + i, 0);
    }
  }
  
  Serial.println(F("✓ WiFi credentials saved"));
  Serial.println(F("===============================\n"));
}

bool loadWiFiCredentials(char* ssid, char* password) {
  if (EEPROM.read(EEPROM_WIFI_CONFIGURED) != 1) {
    return false;
  }
  
  for (int i = 0; i < MAX_SSID_LENGTH; i++) {
    ssid[i] = EEPROM.read(EEPROM_WIFI_SSID_START + i);
  }
  ssid[MAX_SSID_LENGTH - 1] = '\0';
  
  for (int i = 0; i < MAX_PASS_LENGTH; i++) {
    password[i] = EEPROM.read(EEPROM_WIFI_PASS_START + i);
  }
  password[MAX_PASS_LENGTH - 1] = '\0';
  
  return true;
}

void clearWiFiCredentials() {
  EEPROM.write(EEPROM_WIFI_CONFIGURED, 0);
  Serial.println(F("WiFi credentials cleared"));
}

// ===========================
// WIFI PORTAL FUNCTIONS
// ===========================
void startPortalMode() {
  Serial.println(F("\n=== Starting WiFi Configuration Portal ==="));
  
  WiFi.end();
  delay(1000);
  
  if (WiFi.beginAP(AP_SSID, AP_PASSWORD)) {
    portalMode = true;
    portalServer.begin();
    
    Serial.println(F("✓ Access Point started"));
    Serial.print(F("  SSID: "));
    Serial.println(AP_SSID);
    Serial.print(F("  Password: "));
    Serial.println(AP_PASSWORD);
    Serial.print(F("  IP Address: "));
    Serial.println(WiFi.localIP());
    Serial.println(F("\nConnect to this AP and navigate to:"));
    Serial.println(F("  http://192.168.4.1"));
    Serial.println(F("=====================================\n"));
  } else {
    Serial.println(F("✗ Failed to start AP"));
  }
}

void handlePortalClient() {
  WiFiClient client = portalServer.available();
  
  if (client) {
    Serial.println(F("New portal client"));
    String currentLine = "";
    String header = "";
    
    while (client.connected()) {
      if (client.available()) {
        char c = client.read();
        header += c;
        
        if (c == '\n') {
          if (currentLine.length() == 0) {
            
            if (header.indexOf("GET /connect?") >= 0) {
              Serial.println(F("\n=== WiFi Connection Request ==="));
              
              int ssidStart = header.indexOf("ssid=") + 5;
              int ssidEnd = header.indexOf("&", ssidStart);
              String newSSID = header.substring(ssidStart, ssidEnd);
              
              int passStart = header.indexOf("pass=") + 5;
              int passEnd = header.indexOf(" ", passStart);
              String newPass = header.substring(passStart, passEnd);
              
              newSSID.replace("%20", " ");
              newSSID.replace("+", " ");
              newPass.replace("%20", " ");
              newPass.replace("+", " ");
              
              Serial.print(F("SSID: "));
              Serial.println(newSSID);
              
              client.println("HTTP/1.1 200 OK");
              client.println("Content-type:text/html");
              client.println();
              client.println("<html><head><meta name='viewport' content='width=device-width, initial-scale=1'>");
              client.println("<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;}</style></head>");
              client.println("<body><h2>Connecting to WiFi...</h2>");
              client.println("<p>Connecting to: <b>" + newSSID + "</b></p>");
              client.println("<p>Please wait... Device will restart if successful.</p></body></html>");
              client.stop();
              
              delay(1000);
              
              WiFi.end();
              delay(1000);
              
              Serial.println(F("Testing connection..."));
              WiFi.begin(newSSID.c_str(), newPass.c_str());
              
              int attempts = 0;
              while (WiFi.status() != WL_CONNECTED && attempts < 20) {
                delay(500);
                Serial.print(".");
                attempts++;
              }
              Serial.println();
              
              if (WiFi.status() == WL_CONNECTED) {
                Serial.println(F("✓ Connection successful!"));
                Serial.print(F("IP: "));
                Serial.println(WiFi.localIP());
                
                saveWiFiCredentials(newSSID, newPass);
                
                Serial.println(F("Restarting in 3 seconds..."));
                delay(3000);
                NVIC_SystemReset();
                
              } else {
                Serial.println(F("✗ Connection failed!"));
                Serial.println(F("Restarting portal..."));
                startPortalMode();
              }
              
              return;
              
            } else {
              client.println("HTTP/1.1 200 OK");
              client.println("Content-type:text/html");
              client.println();
              
              client.println("<html><head><meta name='viewport' content='width=device-width, initial-scale=1'>");
              client.println("<style>");
              client.println("body{font-family:Arial;text-align:center;padding:20px;background:#f0f0f0;}");
              client.println("h2{color:#333;margin-bottom:5px;}");
              client.println("h3{color:#666;margin-top:5px;}");
              client.println("select,input{width:80%;max-width:400px;padding:12px;margin:10px auto;font-size:16px;display:block;}");
              client.println("input[type=submit]{background:#4CAF50;color:white;border:none;cursor:pointer;border-radius:4px;}");
              client.println("input[type=submit]:hover{background:#45a049;}");
              client.println(".info{color:#666;font-size:12px;margin-top:30px;}");
              client.println("</style></head><body>");
              
              client.println("<h2>💧 Water Quality Monitor</h2>");
              client.println("<h3>WiFi Configuration</h3>");
              
              Serial.println(F("Scanning networks..."));
              int numNetworks = WiFi.scanNetworks();
              Serial.print(F("Found "));
              Serial.print(numNetworks);
              Serial.println(F(" networks"));
              
              client.println("<form action='/connect' method='GET'>");
              client.println("<select name='ssid' required>");
              client.println("<option value=''>-- Select WiFi Network --</option>");
              
              for (int i = 0; i < numNetworks; i++) {
                client.print("<option value='");
                client.print(WiFi.SSID(i));
                client.print("'>");
                client.print(WiFi.SSID(i));
                client.print(" (");
                client.print(WiFi.RSSI(i));
                client.println(" dBm)</option>");
              }
              
              client.println("</select>");
              client.println("<input type='password' name='pass' placeholder='Enter WiFi Password' required>");
              client.println("<input type='submit' value='Connect to WiFi'>");
              client.println("</form>");
              
              client.println("<div class='info'>");
              client.println("Device ID: " + String(DEVICE_ID) + "<br>");
              client.println("Firmware: v" + String(FIRMWARE_VERSION) + "</div>");
              
              client.println("</body></html>");
            }
            
            client.println();
            break;
          } else {
            currentLine = "";
          }
        } else if (c != '\r') {
          currentLine += c;
        }
      }
    }
    client.stop();
  }
}

// ===========================
// HELPER FUNCTIONS
// ===========================
void buildTopics() {
  snprintf(topicData, sizeof(topicData), "devices/%s/data", DEVICE_ID);
  snprintf(topicStatus, sizeof(topicStatus), "devices/%s/status", DEVICE_ID);
  snprintf(topicRegister, sizeof(topicRegister), "devices/%s/register", DEVICE_ID);
  snprintf(topicCommands, sizeof(topicCommands), "devices/%s/commands", DEVICE_ID);
  snprintf(topicPresence, sizeof(topicPresence), "devices/%s/presence", DEVICE_ID);
}

uint8_t getWiFiStatus() {
  unsigned long now = millis();
  if (now - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
    cachedWiFiStatus = WiFi.status();
    lastWiFiCheck = now;
  }
  return cachedWiFiStatus;
}

// ===========================
// CALIBRATION MODE CONTROL
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
    Serial.println(F("================================\n"));
  } else {
    sensorReadInterval = SENSOR_READ_INTERVAL;
    Serial.println(F("\n=== CALIBRATION MODE DISABLED ==="));
    Serial.println(F("✓ MQTT transmission: ENABLED"));
    Serial.print(F("✓ Sensor read interval: "));
    Serial.print(SENSOR_READ_INTERVAL);
    Serial.println(F("ms"));
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
  
  Serial.print(F("✓ Saved approved status: "));
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
// TIME FUNCTIONS
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
      Serial.print(F("Uptime: "));
      Serial.print((millis() - bootTime) / 3600000);
      Serial.println(F(" hours"));
      Serial.println(F("Restarting in 5 seconds..."));
      Serial.println(F("=========================================\n"));
      
      if (mqttConnected) {
        sendShutdownStatus();
      }
      
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
void connectWiFi(const char* ssid, const char* password) {
  Serial.print(F("WiFi: "));
  Serial.println(ssid);
  
  WiFi.disconnect();
  delay(500);
  WiFi.begin(ssid, password);

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
      Serial.println(F("Max WiFi failures - starting portal"));
      startPortalMode();
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
    Serial.println(F("\nNo IP assigned"));
    consecutiveWifiFailures++;
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
  
  char savedSSID[MAX_SSID_LENGTH];
  char savedPass[MAX_PASS_LENGTH];
  
  if (loadWiFiCredentials(savedSSID, savedPass)) {
    connectWiFi(savedSSID, savedPass);
    
    if (getWiFiStatus() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
      delay(1000);
      
      if (!timeInitialized) {
        timeClient.update();
        timeInitialized = true;
      }
    }
  } else {
    startPortalMode();
  }
}

// ===========================
// MQTT FUNCTIONS
// ===========================
void connectMQTT() {
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
  Serial.println(F("Establishing SSL handshake..."));

  StaticJsonDocument<200> lwtDoc;
  lwtDoc["deviceId"] = DEVICE_ID;
  lwtDoc["deviceName"] = DEVICE_NAME;
  lwtDoc["status"] = "offline";
  lwtDoc["timestamp"] = "disconnected";
  lwtDoc["reason"] = "unexpected_disconnect";

  char lwtPayload[200];
  serializeJson(lwtDoc, lwtPayload, sizeof(lwtPayload));

  bool connected = mqttClient.connect(
    MQTT_CLIENT_ID,
    MQTT_USERNAME,
    MQTT_PASSWORD,
    topicPresence,
    1,
    true,
    lwtPayload
  );

  if (connected) {
    Serial.println(F("✓ MQTT SSL Connected!"));
    mqttConnected = true;
    consecutiveMqttFailures = 0;

    if (mqttClient.subscribe(topicCommands, 0)) {
      Serial.print(F("✓ Subscribed: "));
      Serial.println(topicCommands);
    }

    char presenceQueryTopic[30];
    strcpy_P(presenceQueryTopic, PRESENCE_QUERY_TOPIC);
    
    if (mqttClient.subscribe(presenceQueryTopic, 1)) {
      Serial.print(F("✓ Subscribed: "));
      Serial.println(presenceQueryTopic);
    }

    publishPresenceOnline();
    
  } else {
    Serial.print(F("✗ MQTT SSL Failed: "));
    Serial.println(mqttClient.state());
    printMqttError(mqttClient.state());
    
    mqttConnected = false;
    consecutiveMqttFailures++;
    
    if (consecutiveMqttFailures >= MAX_MQTT_FAILURES) {
      Serial.println(F("Max MQTT failures - resetting"));
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

  char presenceQueryTopic[30];
  strcpy_P(presenceQueryTopic, PRESENCE_QUERY_TOPIC);
  
  if (strcmp(topic, presenceQueryTopic) == 0) {
    handlePresenceQuery(message);
    return;
  }

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
    Serial.println(F("CMD: DEREGISTER"));
    saveApprovedStatus(false);
    mqttClient.disconnect();
    delay(2000);
    mqttConnected = false;
    
  } else if (strcmp(command, "restart") == 0) {
    Serial.println(F("CMD: RESTART"));
    delay(1000);
    NVIC_SystemReset();
    
  } else if (strcmp(command, "send_now") == 0) {
    Serial.println(F("CMD: SEND NOW"));
    lastTransmissionMinute = -1;
    
    if (mqttConnected && isApproved && !isCalibrationMode) {
      publishSensorData();
      sendStatusUpdate();
      transmissionCount++;
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
    Serial.println(F("CMD: CALIBRATION ON"));
    setCalibrationMode(true);
    
  } else if (strcmp(command, "calibration_off") == 0) {
    Serial.println(F("CMD: CALIBRATION OFF"));
    setCalibrationMode(false);
    
  } else if (strcmp(command, "toggle_calibration") == 0) {
    Serial.println(F("CMD: TOGGLE CALIBRATION"));
    toggleCalibrationMode();
    
  } else if (strcmp(command, "reset_wifi") == 0) {
    Serial.println(F("CMD: RESET WIFI"));
    clearWiFiCredentials();
    delay(2000);
    NVIC_SystemReset();
  }
}

// ===========================
// MQTT PUBLISH FUNCTIONS
// ===========================
void publishSensorData() {
  if (isCalibrationMode) {
    Serial.println(F("⚠ Calibration mode - MQTT blocked"));
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
  doc["tds"] = round(tds * 10) / 10.0;
  doc["pH"] = round(ph * 100) / 100.0;
  doc["turbidity"] = round(turbidity * 10) / 10.0;
  doc["messageType"] = "sensor_data";
  doc["interval"] = "30min_clock_sync";
  doc["transmissionNumber"] = transmissionCount;

  char payload[220];
  serializeJson(doc, payload, sizeof(payload));

  Serial.println(F("Publishing sensor data:"));
  Serial.println(payload);

  if (mqttClient.publish(topicData, payload, false)) {
    Serial.println(F("✓ Published!"));
  } else {
    Serial.println(F("✗ Publish failed!"));
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
  serializeJson(doc, payload, sizeof(payload));

  Serial.println(payload);

  if (mqttClient.publish(topicRegister, payload, false)) {
    Serial.println(F("✓ Registration sent!"));
  } else {
    Serial.println(F("✗ Registration failed!"));
    consecutiveMqttFailures++;
  }
  
  Serial.println(F("--- End Registration ---\n"));
}

void sendStatusUpdate() {
  if (!mqttClient.connected()) {
    return;
  }

  StaticJsonDocument<300> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  doc["status"] = "online";
  doc["uptime"] = (millis() - bootTime) / 1000;
  doc["wifiRSSI"] = WiFi.RSSI();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["messageType"] = "device_status";
  doc["isApproved"] = isApproved;
  doc["transmissionCount"] = transmissionCount;
  doc["bootCount"] = bootCount;
  doc["calibrationMode"] = isCalibrationMode;
  
  if (timeInitialized) {
    doc["utcTime"] = timeClient.getFormattedTime();
    
    char phTimeStr[9];
    getPhilippineTimeString(phTimeStr, sizeof(phTimeStr));
    doc["phTime"] = phTimeStr;
    
    char nextTxStr[15];
    getNextTransmissionPHTime(nextTxStr, sizeof(nextTxStr));
    doc["nextTransmission"] = nextTxStr;
  }

  char payload[300];
  serializeJson(doc, payload, sizeof(payload));

  mqttClient.publish(topicStatus, payload, false);
}

void sendShutdownStatus() {
  StaticJsonDocument<200> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  doc["status"] = "restarting";
  doc["reason"] = "scheduled_midnight_ph_time";
  doc["uptime"] = (millis() - bootTime) / 1000;
  doc["messageType"] = "device_status";
  doc["bootCount"] = bootCount;
  
  char payload[200];
  serializeJson(doc, payload, sizeof(payload));

  mqttClient.publish(topicStatus, payload, true);
  delay(500);
}

// ===========================
// PRESENCE DETECTION
// ===========================
void handlePresenceQuery(const char* message) {
  Serial.println(F("\n=== PRESENCE QUERY RECEIVED ==="));
  
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.println(F("Failed to parse presence query"));
    return;
  }

  const char* queryType = doc["query"];
  if (queryType != nullptr && strcmp(queryType, "who_is_online") == 0) {
    presenceQueryActive = true;
    lastPresenceQuery = millis();

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
    serializeJson(responseDoc, responsePayload, sizeof(responsePayload));

    Serial.println(responsePayload);

    char presenceResponseTopic[30];
    strcpy_P(presenceResponseTopic, PRESENCE_RESPONSE_TOPIC);
    
    if (mqttClient.publish(presenceResponseTopic, responsePayload, false)) {
      Serial.println(F("✓ Presence response sent"));
    } else {
      Serial.println(F("✗ Failed to send presence"));
    }

    publishPresenceOnline();
    
    Serial.println(F("=== PRESENCE COMPLETE ===\n"));
  }
}

void publishPresenceOnline() {
  if (!mqttClient.connected()) {
    mqttConnected = false;
    return;
  }

  StaticJsonDocument<240> presenceDoc;
  presenceDoc["deviceId"] = DEVICE_ID;
  presenceDoc["deviceName"] = DEVICE_NAME;
  presenceDoc["status"] = "online";
  presenceDoc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
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

  if (mqttClient.publish(topicPresence, presencePayload, true)) {
    Serial.println(F("✓ Presence: online"));
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
  float slope = 20.0 / (100.0 - 360.0);
  float intercept = -slope * 360.0;
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

  turbidity = calculateTurbidityNTU(avgTurb);

  Serial.print(F("TDS:"));
  Serial.print(tds, 1);
  Serial.print(F(" pH:"));
  Serial.print(ph, 2);
  Serial.print(F(" Turb:"));
  Serial.print(turbidity, 1);
  Serial.print(F(" ("));
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
  Serial.println(isCalibrationMode ? F("ACTIVE") : F("OFF"));
  
  Serial.print(F("IP: "));
  Serial.println(WiFi.localIP());
  
  Serial.print(F("Approved: "));
  Serial.println(isApproved ? F("YES") : F("NO"));
  
  if (timeInitialized) {
    printCurrentTime();
  }
  
  Serial.print(F("WiFi: "));
  Serial.println(getWiFiStatus() == WL_CONNECTED ? F("OK") : F("DOWN"));
  Serial.print(F("MQTT: "));
  Serial.println(mqttConnected ? F("OK") : F("DOWN"));
  Serial.println(F("================\n"));
}

// ===========================
// SETUP FUNCTION
// ===========================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  bootTime = millis();

  Serial.println(F("\n=== Water Quality Monitor with WiFi Portal ==="));
  Serial.println(F("Firmware: v6.9.3 - WiFi Manager + Calibration"));
  Serial.println(F("MQTT: SSL/TLS (Port 8883)"));
  Serial.println(F("WiFi Portal: Enabled"));
  
  Serial.print(F("Calibration Mode: "));
  Serial.println(isCalibrationMode ? F("ENABLED") : F("DISABLED"));
  
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

  // Try to load WiFi credentials
  char savedSSID[MAX_SSID_LENGTH];
  char savedPass[MAX_PASS_LENGTH];
  
  if (loadWiFiCredentials(savedSSID, savedPass)) {
    Serial.println(F("\n=== Connecting with saved credentials ==="));
    Serial.print(F("SSID: "));
    Serial.println(savedSSID);
    
    connectWiFi(savedSSID, savedPass);
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println(F("✓ WiFi connected!"));
      
      cachedWiFiStatus = WiFi.status();
      
      timeClient.begin();
      delay(1000);
      
      if (!isCalibrationMode) {
        Serial.print(F("NTP sync"));
        for (int i = 0; i < 5; i++) {
          Serial.print(".");
          if (timeClient.update()) {
            timeInitialized = true;
            Serial.println(F(" OK"));
            printCurrentTime();
            break;
          }
          delay(1000);
        }
        
        connectMQTT();
        
        if (mqttConnected) {
          delay(3000);
          if (!isApproved) {
            sendRegistration();
          } else {
            sendStatusUpdate();
          }
        }
      }
    } else {
      Serial.println(F("✗ Saved credentials failed"));
      startPortalMode();
    }
  } else {
    Serial.println(F("No saved WiFi credentials"));
    startPortalMode();
  }
  
  Serial.println(F("\n=== System Ready ===\n"));
}

// ===========================
// LOOP FUNCTION
// ===========================
void loop() {
  // Portal mode - only handle portal clients
  if (portalMode) {
    handlePortalClient();
    delay(10);
    return;
  }
  
  unsigned long currentMillis = millis();

  // Sensor reading
  if (currentMillis - lastSensorRead >= sensorReadInterval) {
    lastSensorRead = currentMillis;
    readSensors();
  }

  // WiFi check
  if (getWiFiStatus() != WL_CONNECTED) {
    handleWiFiDisconnection();
    return;
  }

  // MQTT operations (skip in calibration mode)
  if (!isCalibrationMode) {
    // MQTT reconnection
    if (!mqttClient.connected() && (currentMillis - lastMqttReconnect >= MQTT_RECONNECT_INTERVAL)) {
      lastMqttReconnect = currentMillis;
      connectMQTT();
    }

    if (mqttClient.connected()) {
      mqttClient.loop();
    }

    // Time sync
    if (timeInitialized && (currentMillis - lastNtpUpdate >= NTP_UPDATE_INTERVAL)) {
      lastNtpUpdate = currentMillis;
      timeClient.update();
    }

    // Clock-synced transmission
    if (isApproved && mqttConnected && timeInitialized) {
      if (isTransmissionTime()) {
        Serial.println(F("\n=== SCHEDULED TRANSMISSION ==="));
        publishSensorData();
        sendStatusUpdate();
        transmissionCount++;
        lastTransmissionMinute = timeClient.getMinutes();
        Serial.println(F("=== TX COMPLETE ===\n"));
      }
    }

    // Registration for unapproved devices
    if (!isApproved && mqttConnected && (currentMillis - lastRegistrationAttempt >= REGISTRATION_INTERVAL)) {
      lastRegistrationAttempt = currentMillis;
      sendRegistration();
    }

    // Midnight restart check
    if (timeInitialized) {
      checkMidnightRestart();
    }
  }

  // Watchdog
  if (currentMillis - lastWatchdog >= WATCHDOG_INTERVAL) {
    lastWatchdog = currentMillis;
    printWatchdog();
  }
}
