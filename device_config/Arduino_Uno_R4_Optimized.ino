#include <WiFiS3.h>
#include <WiFiSSLClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <EEPROM.h>
#include <avr/pgmspace.h>

#define CALIBRATION_MODE false 

#define ENABLE_WIFI_MANAGER true
#define AP_SSID "PureTrack-Setup"
#define AP_PASSWORD "12345678"
#define WIFI_MANAGER_TIMEOUT 300000
#define MAX_WIFI_CONNECTION_ATTEMPTS 3

#define MQTT_BROKER "f4f8d29564364fbdbe9b052230c33d40.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_CLIENT_ID "arduino_uno_r4_002"
#define MQTT_USERNAME "Device_Production"
#define MQTT_PASSWORD "Device123"

#define DEVICE_ID "arduino_uno_r4_002"
#define DEVICE_NAME "Water Quality Monitor R4"
#define DEVICE_TYPE "Arduino UNO R4 WiFi"
#define FIRMWARE_VERSION "8.0.0"

#define TDS_PIN A0
#define PH_PIN A0
#define TURBIDITY_PIN A2

#define SENSOR_READ_INTERVAL 60000
#define CALIBRATION_INTERVAL 255
#define REGISTRATION_INTERVAL 60000
#define MQTT_RECONNECT_INTERVAL 30000
#define WATCHDOG_INTERVAL 300000
#define NTP_UPDATE_INTERVAL 3600000

#define RESTART_HOUR_UTC 16
#define RESTART_MINUTE 0
#define TIMEZONE_OFFSET_SECONDS 28800
#define MAX_UPTIME_HOURS 25

#define TRANSMISSION_JITTER_WINDOW 300
#define ENABLE_TRANSMISSION_JITTER true

#define MAX_MQTT_FAILURES 10
#define MAX_WIFI_FAILURES 3

#define EEPROM_SIZE 512
#define EEPROM_MAGIC_NUMBER 0xA5B7
#define EEPROM_ADDR_MAGIC 0
#define EEPROM_ADDR_APPROVED 2
#define EEPROM_ADDR_BOOT_COUNT 3
#define EEPROM_ADDR_WIFI_SSID 7
#define EEPROM_ADDR_WIFI_PASS 39
#define EEPROM_ADDR_WIFI_SAVED 103

const int CALIB_COUNT = 4;
const PROGMEM int calibADC[CALIB_COUNT] = {105, 116, 224, 250};
const PROGMEM float calibPPM[CALIB_COUNT] = {236.0, 278.0, 1220.0, 1506.0};

const float TDS_CALIBRATION_FACTOR = 0.589;
const float TDS_OFFSET = 0.0;

const int PH_CALIB_COUNT = 4;
const PROGMEM int phCalibADC[PH_CALIB_COUNT] = {0, 100, 400, 450};
const PROGMEM float phCalibPH[PH_CALIB_COUNT] = {6.6, 7.0, 4.0, 9.0};

char topicData[50];
char topicRegister[50];
char topicCommands[50];
char topicPresence[50];

const char PRESENCE_QUERY_TOPIC[] PROGMEM = "presence/query";
const char PRESENCE_RESPONSE_TOPIC[] PROGMEM = "presence/response";

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


WiFiSSLClient wifiSSLClient;
PubSubClient mqttClient(wifiSSLClient);
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, NTP_UPDATE_INTERVAL);
WiFiServer webServer(80);

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

bool wifiManagerActive = false;
bool wifiCredentialsSaved = false;
unsigned long wifiManagerStartTime = 0;
String savedSSID = "";
String savedPassword = "";
int wifiConnectionAttempts = 0;

float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;

int consecutiveMqttFailures = 0;
int consecutiveWifiFailures = 0;

unsigned long transmissionCount = 0;
unsigned long bootCount = 0;
int lastTransmissionMinute = -1;
int transmissionJitterOffset = 0;
unsigned long mqttMessagesReceived = 0;
unsigned long mqttCommandsReceived = 0;

unsigned long sensorReadInterval = CALIBRATION_MODE ? CALIBRATION_INTERVAL : SENSOR_READ_INTERVAL;

bool presenceQueryActive = false;
unsigned long lastPresenceQuery = 0;
const unsigned long PRESENCE_TIMEOUT = 30000;

uint8_t cachedWiFiStatus = WL_IDLE_STATUS;
unsigned long lastWiFiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 1000;

enum ModuleStatus {
  MODULE_UNINITIALIZED = 0,
  MODULE_INITIALIZING = 1,
  MODULE_FAILED = 2,
  MODULE_READY = 3
};

struct SystemReadiness {
  ModuleStatus eeprom;
  ModuleStatus wifi;
  ModuleStatus ntp;
  ModuleStatus mqtt;
  ModuleStatus sensors;
  ModuleStatus calibration;
  bool systemReady;
  unsigned long readyTime;
};

SystemReadiness moduleReadiness = {
  MODULE_UNINITIALIZED,
  MODULE_UNINITIALIZED,
  MODULE_UNINITIALIZED,
  MODULE_UNINITIALIZED,
  MODULE_UNINITIALIZED,
  MODULE_UNINITIALIZED,
  false,
  0
};

void checkSystemReadiness();
void printSystemReadiness();
bool isSystemFullyReady();
const char* getModuleStatusString(ModuleStatus status);
void setModuleStatus(ModuleStatus* module, ModuleStatus newStatus, const char* moduleName);

void handlePresenceQuery(const char* message);
void publishPresenceOnline();

void buildTopics() {
  snprintf(topicData, sizeof(topicData), "devices/%s/data", DEVICE_ID);
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
    Serial.println(F(""));
    Serial.println(F("CALIBRATION INSTRUCTIONS:"));
    Serial.println(F("1. Immerse sensors in reference solution"));
    Serial.println(F("2. Wait 30 seconds for stabilization"));
    Serial.println(F("3. Record ADC values from Serial output"));
    Serial.println(F("4. Update calibration arrays in code"));
    Serial.println(F("================================\n"));
  } else {
    sensorReadInterval = SENSOR_READ_INTERVAL;
    Serial.println(F("\n=== CALIBRATION MODE DISABLED ==="));
    Serial.println(F("✓ MQTT transmission: ENABLED"));
    Serial.print(F("✓ Sensor read interval: "));
    Serial.print(SENSOR_READ_INTERVAL);
    Serial.println(F("ms"));
    Serial.println(F("✓ Normal operation resumed"));
    Serial.println(F("✓ Will reconnect to MQTT automatically"));
    Serial.println(F("=================================\n"));
  }
}

void toggleCalibrationMode() {
  setCalibrationMode(!isCalibrationMode);
}


const char* getModuleStatusString(ModuleStatus status) {
  switch (status) {
    case MODULE_UNINITIALIZED: return "UNINITIALIZED";
    case MODULE_INITIALIZING:  return "INITIALIZING";
    case MODULE_FAILED:        return "FAILED";
    case MODULE_READY:         return "READY";
    default:                   return "UNKNOWN";
  }
}

void setModuleStatus(ModuleStatus* module, ModuleStatus newStatus, const char* moduleName) {
  if (*module == newStatus) return;
  
  ModuleStatus oldStatus = *module;
  *module = newStatus;
  
  Serial.print(F("📦 "));
  Serial.print(moduleName);
  Serial.print(F(": "));
  Serial.print(getModuleStatusString(oldStatus));
  Serial.print(F(" → "));
  Serial.println(getModuleStatusString(newStatus));
  
  checkSystemReadiness();
}

void checkSystemReadiness() {
  bool wasReady = moduleReadiness.systemReady;
  
  bool allReady;
  if (isCalibrationMode) {
    allReady = (moduleReadiness.eeprom == MODULE_READY &&
                moduleReadiness.wifi == MODULE_READY &&
                moduleReadiness.sensors == MODULE_READY &&
                moduleReadiness.calibration == MODULE_READY);
  } else {
    allReady = (moduleReadiness.eeprom == MODULE_READY &&
                moduleReadiness.wifi == MODULE_READY &&
                moduleReadiness.ntp == MODULE_READY &&
                moduleReadiness.mqtt == MODULE_READY &&
                moduleReadiness.sensors == MODULE_READY &&
                moduleReadiness.calibration == MODULE_READY);
  }
  
  moduleReadiness.systemReady = allReady;
  
  if (allReady && !wasReady) {
    moduleReadiness.readyTime = millis();
    Serial.println(F("\n╔════════════════════════════════════════════╗"));
    Serial.println(F("║   ✅ SYSTEM FULLY READY - ALL MODULES OK   ║"));
    Serial.println(F("╚════════════════════════════════════════════╝"));
    Serial.print(F("⏱ Ready Time: "));
    Serial.print((moduleReadiness.readyTime - bootTime) / 1000.0, 2);
    Serial.println(F(" seconds after boot\n"));
    
    if (isCalibrationMode) {
      Serial.println(F("🔧 Mode: CALIBRATION - Fast sensor readings active"));
    } else {
      Serial.println(F("📡 Mode: OPERATIONAL - Data transmission enabled"));
    }
  } else if (!allReady && wasReady) {
    Serial.println(F("\n⚠️ WARNING: System no longer ready - module failure detected"));
    moduleReadiness.systemReady = false;
  }
}

bool isSystemFullyReady() {
  return moduleReadiness.systemReady;
}

void printSystemReadiness() {
  Serial.println(F("\n╔════════════════════════════════════════════════════════╗"));
  Serial.println(F("║          SYSTEM READINESS STATUS REPORT                ║"));
  Serial.println(F("╠════════════════════════════════════════════════════════╣"));
  
  Serial.print(F("║  EEPROM Storage:     "));
  Serial.print(getModuleStatusString(moduleReadiness.eeprom));
  for (int i = strlen(getModuleStatusString(moduleReadiness.eeprom)); i < 26; i++) Serial.print(F(" "));
  Serial.println(F("║"));
  
  Serial.print(F("║  WiFi Network:       "));
  Serial.print(getModuleStatusString(moduleReadiness.wifi));
  for (int i = strlen(getModuleStatusString(moduleReadiness.wifi)); i < 26; i++) Serial.print(F(" "));
  Serial.println(F("║"));
  
  Serial.print(F("║  NTP Time Sync:      "));
  Serial.print(getModuleStatusString(moduleReadiness.ntp));
  if (isCalibrationMode) Serial.print(F(" (BYPASSED)"));
  int len = strlen(getModuleStatusString(moduleReadiness.ntp)) + (isCalibrationMode ? 11 : 0);
  for (int i = len; i < 26; i++) Serial.print(F(" "));
  Serial.println(F("║"));
  
  Serial.print(F("║  MQTT Broker:        "));
  Serial.print(getModuleStatusString(moduleReadiness.mqtt));
  if (isCalibrationMode) Serial.print(F(" (BYPASSED)"));
  len = strlen(getModuleStatusString(moduleReadiness.mqtt)) + (isCalibrationMode ? 11 : 0);
  for (int i = len; i < 26; i++) Serial.print(F(" "));
  Serial.println(F("║"));
  
  Serial.print(F("║  Sensor Hardware:    "));
  Serial.print(getModuleStatusString(moduleReadiness.sensors));
  for (int i = strlen(getModuleStatusString(moduleReadiness.sensors)); i < 26; i++) Serial.print(F(" "));
  Serial.println(F("║"));
  
  Serial.print(F("║  Calibration Engine: "));
  Serial.print(getModuleStatusString(moduleReadiness.calibration));
  for (int i = strlen(getModuleStatusString(moduleReadiness.calibration)); i < 26; i++) Serial.print(F(" "));
  Serial.println(F("║"));
  
  Serial.println(F("╠════════════════════════════════════════════════════════╣"));
  
  Serial.print(F("║  SYSTEM STATUS:      "));
  if (moduleReadiness.systemReady) {
    Serial.print(F("✅ READY"));
    for (int i = 0; i < 18; i++) Serial.print(F(" "));
  } else {
    Serial.print(F("⏳ NOT READY"));
    for (int i = 0; i < 14; i++) Serial.print(F(" "));
  }
  Serial.println(F("║"));
  
  if (moduleReadiness.systemReady) {
    Serial.print(F("║  Uptime Since Ready: "));
    unsigned long readyUptime = (millis() - moduleReadiness.readyTime) / 1000;
    Serial.print(readyUptime);
    Serial.print(F("s"));
    for (int i = String(readyUptime).length() + 1; i < 26; i++) Serial.print(F(" "));
    Serial.println(F("║"));
  }
  
  Serial.println(F("╚════════════════════════════════════════════════════════╝\n"));
}

void initEEPROM() {
  Serial.println(F("\n=== EEPROM Initialization ==="));
  setModuleStatus(&moduleReadiness.eeprom, MODULE_INITIALIZING, "EEPROM");
  
  uint16_t magic = (EEPROM.read(EEPROM_ADDR_MAGIC) << 8) | EEPROM.read(EEPROM_ADDR_MAGIC + 1);
  
  if (magic != EEPROM_MAGIC_NUMBER) {
    Serial.println(F("First boot - initializing EEPROM"));
    
    EEPROM.write(EEPROM_ADDR_MAGIC, (EEPROM_MAGIC_NUMBER >> 8) & 0xFF);
    EEPROM.write(EEPROM_ADDR_MAGIC + 1, EEPROM_MAGIC_NUMBER & 0xFF);
    EEPROM.write(EEPROM_ADDR_APPROVED, 0);
    EEPROM.write(EEPROM_ADDR_WIFI_SAVED, 0);
    writeBootCount(0);
    
    isApproved = false;
    bootCount = 0;
    
    Serial.println(F("EEPROM initialized"));
    setModuleStatus(&moduleReadiness.eeprom, MODULE_READY, "EEPROM");
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
    
    if (loadWiFiCredentials(savedSSID, savedPassword)) {
      wifiCredentialsSaved = true;
    }
    
    setModuleStatus(&moduleReadiness.eeprom, MODULE_READY, "EEPROM");
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

void saveWiFiCredentials(String ssid, String password) {
  for (int i = 0; i < 32; i++) {
    if (i < ssid.length()) {
      EEPROM.write(EEPROM_ADDR_WIFI_SSID + i, ssid[i]);
    } else {
      EEPROM.write(EEPROM_ADDR_WIFI_SSID + i, 0);
    }
  }
  
  for (int i = 0; i < 64; i++) {
    if (i < password.length()) {
      EEPROM.write(EEPROM_ADDR_WIFI_PASS + i, password[i]);
    } else {
      EEPROM.write(EEPROM_ADDR_WIFI_PASS + i, 0);
    }
  }
  
  EEPROM.write(EEPROM_ADDR_WIFI_SAVED, 1);
  
  Serial.println(F("✓ WiFi credentials saved to EEPROM"));
}

bool loadWiFiCredentials(String &ssid, String &password) {
  if (EEPROM.read(EEPROM_ADDR_WIFI_SAVED) != 1) {
    Serial.println(F("No WiFi credentials stored in EEPROM"));
    return false;
  }
  
  ssid = "";
  for (int i = 0; i < 32; i++) {
    char c = EEPROM.read(EEPROM_ADDR_WIFI_SSID + i);
    if (c == 0) break;
    ssid += c;
  }
  
  password = "";
  for (int i = 0; i < 64; i++) {
    char c = EEPROM.read(EEPROM_ADDR_WIFI_PASS + i);
    if (c == 0) break;
    password += c;
  }
  
  if (ssid.length() > 0) {
    Serial.println(F("✓ WiFi credentials loaded from EEPROM"));
    Serial.print(F("SSID: "));
    Serial.println(ssid);
    return true;
  }
  
  return false;
}

void clearEEPROM() {
  Serial.println(F("Clearing EEPROM..."));
  for (int i = 0; i < 110; i++) {
    EEPROM.write(i, 0);
  }
  Serial.println(F("EEPROM cleared - restart required"));
}

bool isTransmissionTime() {
  if (!timeInitialized) return false;
  
  timeClient.update();
  unsigned long currentEpoch = timeClient.getEpochTime();
  
  unsigned long phTime = currentEpoch + TIMEZONE_OFFSET_SECONDS;
  int currentMinute = (phTime % 3600) / 60;
  int currentSecond = phTime % 60;
  
  int minutesSinceScheduled;
  if (currentMinute >= 30) {
    minutesSinceScheduled = currentMinute - 30;
  } else {
    minutesSinceScheduled = currentMinute;
  }
  int totalSecondsSinceScheduled = (minutesSinceScheduled * 60) + currentSecond;
  
  bool withinTransmissionWindow = (totalSecondsSinceScheduled >= transmissionJitterOffset) && 
                                   (totalSecondsSinceScheduled < TRANSMISSION_JITTER_WINDOW);
  
  bool notYetTransmitted = (currentMinute != lastTransmissionMinute);
  
  bool shouldTransmit = withinTransmissionWindow && 
                        (totalSecondsSinceScheduled >= transmissionJitterOffset) &&
                        notYetTransmitted;
  
  if (shouldTransmit && ENABLE_TRANSMISSION_JITTER) {
    Serial.print(F("Transmission time! Jitter offset: "));
    Serial.print(transmissionJitterOffset);
    Serial.print(F("s, Elapsed: "));
    Serial.print(totalSecondsSinceScheduled);
    Serial.println(F("s"));
  }
  
  return shouldTransmit;
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


void getPhilippineDateString(char* buffer, size_t bufSize) {
  unsigned long epochTime = timeClient.getEpochTime();
  unsigned long phTime = epochTime + TIMEZONE_OFFSET_SECONDS;
  
  unsigned long days = phTime / 86400L;
  
  int year = 1970;
  unsigned long daysInYear;
  while (true) {
    bool isLeap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    daysInYear = isLeap ? 366 : 365;
    
    if (days >= daysInYear) {
      days -= daysInYear;
      year++;
    } else {
      break;
    }
  }
  
  int daysInMonth[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
  
  bool isLeap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
  if (isLeap) {
    daysInMonth[1] = 29;
  }
  
  int month = 1;
  for (int i = 0; i < 12; i++) {
    if (days >= daysInMonth[i]) {
      days -= daysInMonth[i];
      month++;
    } else {
      break;
    }
  }
  
  int day = days + 1;
  
  snprintf(buffer, bufSize, "%04d-%02d-%02d", year, month, day);
}

String scanWiFiNetworks() {
  Serial.println(F("Scanning WiFi networks..."));
  int networksFound = WiFi.scanNetworks();
  
  String networkList = "";
  
  if (networksFound == 0) {
    networkList = "<p>No networks found</p>";
  } else {
    Serial.print(F("Found "));
    Serial.print(networksFound);
    Serial.println(F(" networks"));
    
    for (int i = 0; i < networksFound; i++) {
      String ssid = WiFi.SSID(i);
      int rssi = WiFi.RSSI(i);
      
      networkList += "- " + ssid + " (" + String(rssi) + "dBm)<br>";
      
      Serial.print(i + 1);
      Serial.print(F(": "));
      Serial.print(ssid);
      Serial.print(F(" ("));
      Serial.print(rssi);
      Serial.println(F(" dBm)"));
    }
  }
  
  return networkList;
}

String generateWebPortalHTML(String networkList) {
  String html = "<html><head><title>WiFi Setup</title></head><body>";
  html += "<h1>WiFi Setup</h1>";
  html += "<p><b>Available Networks:</b></p>";
  html += networkList;
  html += "<hr>";
  html += "<form method='POST' action='/connect'>";
  html += "SSID:<br><input type='text' name='ssid'><br>";
  html += "Password:<br><input type='password' name='password'><br><br>";
  html += "<input type='submit' value='Connect'>";
  html += "</form>";
  html += "</body></html>";
  return html;
}

void startWiFiManager() {
  Serial.println(F("\n=== STARTING WiFi MANAGER ==="));
  
  WiFi.disconnect();
  delay(500);
  
  Serial.print(F("Creating Access Point: "));
  Serial.println(F(AP_SSID));
  
  bool apStarted = WiFi.beginAP(AP_SSID, AP_PASSWORD);
  
  if (!apStarted) {
    Serial.println(F("✗ Failed to start Access Point"));
    return;
  }
  
  delay(2000);
  
  IPAddress apIP = WiFi.localIP();
  Serial.println(F("✓ Access Point Started"));
  Serial.print(F("AP IP Address: "));
  Serial.println(apIP);
  Serial.print(F("AP Password: "));
  Serial.println(F(AP_PASSWORD));
  
  webServer.begin();
  Serial.println(F("✓ Web Server Started on port 80"));
  
  wifiManagerActive = true;
  wifiManagerStartTime = millis();
  
  Serial.println(F("\n────────────────────────────────────"));
  Serial.println(F("HOW TO CONNECT:"));
  Serial.println(F("1. Connect to WiFi: " AP_SSID));
  Serial.println(F("2. Password: " AP_PASSWORD));
  Serial.print(F("3. Open browser: http://"));
  Serial.println(apIP);
  Serial.println(F("4. Select WiFi and enter password"));
  Serial.println(F("────────────────────────────────────\n"));
}

void handleWebPortal() {
  WiFiClient client = webServer.available();
  
  if (!client) return;
  
  Serial.println(F("New web client connected"));
  
  String request = "";
  unsigned long timeout = millis();
  
  while (client.connected() && millis() - timeout < 2000) {
    if (client.available()) {
      char c = client.read();
      request += c;
    } else {
      delay(1);
    }
  }
  
  Serial.println(F("Request received:"));
  Serial.println(request.substring(0, 100));
  
  if (request.startsWith("GET / ") || request.startsWith("GET /index")) {
    Serial.println(F("Serving main page..."));
    
    String networkList = scanWiFiNetworks();
    String html = generateWebPortalHTML(networkList);
    
    client.println(F("HTTP/1.1 200 OK"));
    client.println(F("Content-Type: text/html"));
    client.println(F("Connection: close"));
    client.println();
    client.println(html);
    
  } else if (request.startsWith("POST /connect")) {
    Serial.println(F("Processing connection request..."));
    
    int bodyStart = request.indexOf("\r\n\r\n") + 4;
    String body = request.substring(bodyStart);
    
    Serial.print(F("Body: "));
    Serial.println(body);
    
    int ssidStart = body.indexOf("ssid=");
    if (ssidStart == -1) {
      Serial.println(F("✗ Error: 'ssid=' not found in request"));
      client.println(F("HTTP/1.1 400 Bad Request"));
      client.println(F("Connection: close"));
      client.println();
      client.stop();
      return;
    }
    ssidStart += 5;
    
    int ssidEnd = body.indexOf("&", ssidStart);
    if (ssidEnd == -1) ssidEnd = body.length();
    
    String ssid = body.substring(ssidStart, ssidEnd);
    ssid.replace("+", " ");
    urlDecode(ssid);
    ssid.trim();
    
    int passStart = body.indexOf("password=");
    if (passStart == -1) {
      Serial.println(F("✗ Error: 'password=' not found in request"));
      client.println(F("HTTP/1.1 400 Bad Request"));
      client.println(F("Connection: close"));
      client.println();
      client.stop();
      return;
    }
    passStart += 9;
    
    int passEnd = body.indexOf("&", passStart);
    if (passEnd == -1) passEnd = body.length();
    
    String password = body.substring(passStart, passEnd);
    password.replace("+", " ");
    urlDecode(password);
    password.trim();
    
    Serial.print(F("SSID: "));
    Serial.println(ssid);
    Serial.print(F("SSID Length: "));
    Serial.println(ssid.length());
    Serial.println(F("Password: ********"));
    Serial.print(F("Password Length: "));
    Serial.println(password.length());
    
    if (ssid.length() == 0) {
      Serial.println(F("✗ Error: SSID is empty!"));
      client.println(F("HTTP/1.1 400 Bad Request"));
      client.println(F("Connection: close"));
      client.println();
      client.stop();
      return;
    }
    
    savedSSID = ssid;
    savedPassword = password;
    wifiCredentialsSaved = true;
    saveWiFiCredentials(ssid, password);
    
    client.println(F("HTTP/1.1 200 OK"));
    client.println(F("Content-Type: text/html"));
    client.println(F("Connection: close"));
    client.println();
    client.print(F("<html><body><h1>Success!</h1><p>Connecting to: "));
    client.print(ssid);
    client.println(F("</p><p>You can close this page.</p></body></html>"));
    
    delay(100);
    client.stop();
    
    Serial.println(F("✓ Configuration saved - will connect now..."));
    
    delay(100);
    
    wifiManagerActive = false;
    WiFi.end();
    
    delay(2000);
    
    return;
    
  } else {
    client.println(F("HTTP/1.1 404 Not Found"));
    client.println(F("Content-Type: text/plain"));
    client.println(F("Connection: close"));
    client.println();
    client.println(F("404 - Page Not Found"));
  }
  
  delay(10);
  client.stop();
  Serial.println(F("Client disconnected"));
}

void urlDecode(String &str) {
  str.replace("%20", " ");
  str.replace("%21", "!");
  str.replace("%22", "\"");
  str.replace("%23", "#");
  str.replace("%24", "$");
  str.replace("%25", "%");
  str.replace("%26", "&");
  str.replace("%2B", "+");
  str.replace("%2F", "/");
  str.replace("%3A", ":");
  str.replace("%3D", "=");
  str.replace("%3F", "?");
  str.replace("%40", "@");
}

void connectWiFi() {
  setModuleStatus(&moduleReadiness.wifi, MODULE_INITIALIZING, "WiFi");
  
  if (!wifiCredentialsSaved || savedSSID.length() == 0) {
    Serial.println(F("\n⚠ No WiFi credentials configured!"));
    Serial.println(F("Starting WiFi Manager for configuration..."));
    setModuleStatus(&moduleReadiness.wifi, MODULE_FAILED, "WiFi");
    startWiFiManager();
    return;
  }
  
  Serial.print(F("WiFi: "));
  Serial.println(savedSSID);
  
  WiFi.disconnect();
  delay(500);
  WiFi.begin(savedSSID.c_str(), savedPassword.c_str());

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
    wifiConnectionAttempts++;
    setModuleStatus(&moduleReadiness.wifi, MODULE_FAILED, "WiFi");
    
    if (ENABLE_WIFI_MANAGER && wifiConnectionAttempts >= MAX_WIFI_CONNECTION_ATTEMPTS) {
      Serial.println(F("Max WiFi connection attempts reached"));
      Serial.println(F("Starting WiFi Manager Portal..."));
      startWiFiManager();
      return;
    }
    
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
    setModuleStatus(&moduleReadiness.wifi, MODULE_FAILED, "WiFi");
    delay(2000);
    connectWiFi();
    return;
  }
  
  Serial.print(F("IP: "));
  Serial.println(WiFi.localIP());
  Serial.print(F("RSSI: "));
  Serial.println(WiFi.RSSI());
  
  consecutiveWifiFailures = 0;
  wifiConnectionAttempts = 0;
  setModuleStatus(&moduleReadiness.wifi, MODULE_READY, "WiFi");
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


void connectMQTT() {
  if (isCalibrationMode) {
    Serial.println(F("Calibration mode - skipping MQTT"));
    setModuleStatus(&moduleReadiness.mqtt, MODULE_READY, "MQTT (bypassed)");
    return;
  }
  
  setModuleStatus(&moduleReadiness.mqtt, MODULE_INITIALIZING, "MQTT");
  
  if (getWiFiStatus() != WL_CONNECTED) {
    Serial.println(F("MQTT: No WiFi"));
    setModuleStatus(&moduleReadiness.mqtt, MODULE_FAILED, "MQTT");
    return;
  }


  if (WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println(F("MQTT: No IP address"));
    setModuleStatus(&moduleReadiness.mqtt, MODULE_FAILED, "MQTT");
    return;
  }


  if (mqttClient.connected()) {
    mqttConnected = true;
    setModuleStatus(&moduleReadiness.mqtt, MODULE_READY, "MQTT");
    return;
  }


  Serial.println(F("\n--- MQTT SSL Connection ---"));
  Serial.print(F("Broker: "));
  Serial.println(F(MQTT_BROKER));
  Serial.print(F("Port: "));
  Serial.print(MQTT_PORT);
  Serial.println(F(" (SSL/TLS)"));
  Serial.println(F("Establishing SSL handshake..."));

  bool connected = mqttClient.connect(
    MQTT_CLIENT_ID,
    MQTT_USERNAME,
    MQTT_PASSWORD
  );


  if (connected) {
    Serial.println(F("✓ MQTT SSL Connected! (No LWT - Polling mode)"));
    mqttConnected = true;
    consecutiveMqttFailures = 0;

    // Show topics for debugging
    Serial.println(F("\n--- Subscription Setup ---"));
    Serial.print(F("Commands topic: "));
    Serial.println(topicCommands);

    if (mqttClient.subscribe(topicCommands, 1)) {
      Serial.println(F("✓ Subscribed to commands (QoS 1)"));
    } else {
      Serial.println(F("✗ FAILED to subscribe to commands topic!"));
    }

    char presenceQueryTopic[30];
    strcpy_P(presenceQueryTopic, PRESENCE_QUERY_TOPIC);
    Serial.print(F("Presence topic: "));
    Serial.println(presenceQueryTopic);
    
    if (mqttClient.subscribe(presenceQueryTopic, 1)) {
      Serial.println(F("✓ Subscribed to presence (QoS 1)"));
      Serial.println(F("  Waiting for server presence polls..."));
    } else {
      Serial.println(F("✗ FAILED to subscribe to presence topic!"));
    }
    
    Serial.println(F("--- Subscription Complete ---\n"));
    Serial.println(F("📡 READY to receive commands (GO, DEREGISTER, RESTART, SEND_NOW)"));

    publishPresenceOnline();
    
    setModuleStatus(&moduleReadiness.mqtt, MODULE_READY, "MQTT");
  } else {
    Serial.print(F("✗ MQTT SSL Failed: "));
    Serial.println(mqttClient.state());
    printMqttError(mqttClient.state());
    
    mqttConnected = false;
    consecutiveMqttFailures++;
    setModuleStatus(&moduleReadiness.mqtt, MODULE_FAILED, "MQTT");
    
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
  mqttMessagesReceived++;
  
  Serial.print(F("\n>>> MQTT RX #"));
  Serial.print(mqttMessagesReceived);
  Serial.print(F(" ["));
  Serial.print(topic);
  Serial.print(F("] ("));
  Serial.print(length);
  Serial.print(F(" bytes): "));
  
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  Serial.println(message);

  // Handle presence query topic
  char presenceQueryTopic[30];
  strcpy_P(presenceQueryTopic, PRESENCE_QUERY_TOPIC);
  
  Serial.print(F("  Comparing topic: '"));
  Serial.print(topic);
  Serial.print(F("' vs presence: '"));
  Serial.print(presenceQueryTopic);
  Serial.print(F("' vs commands: '"));
  Serial.print(topicCommands);
  Serial.println(F("'"));
  
  if (strcmp(topic, presenceQueryTopic) == 0) {
    Serial.println(F("→ Routing to presence query handler"));
    handlePresenceQuery(message);
    return;
  }
  
  if (strcmp(topic, topicCommands) == 0) {
    Serial.println(F("→ Confirmed: This is a COMMAND topic message"));
  } else {
    Serial.println(F("⚠ Warning: Topic doesn't match expected patterns"));
  }

  // Handle command topic - increased buffer for larger payloads
  Serial.println(F("→ Parsing as command JSON"));
  StaticJsonDocument<384> doc;  // Increased from 200 to 384 bytes
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print(F("✗ JSON parse error: "));
    Serial.println(error.c_str());
    Serial.print(F("  Message length: "));
    Serial.println(length);
    return;
  }

  const char* command = doc["command"];
  
  if (command == nullptr) {
    Serial.println(F("✗ No 'command' field in JSON"));
    return;
  }
  
  mqttCommandsReceived++;
  Serial.print(F("→ Command #"));
  Serial.print(mqttCommandsReceived);
  Serial.print(F(" received: '"));
  Serial.print(command);
  Serial.println(F("'"));

  if (strcmp(command, "go") == 0 || strcmp(command, "GO") == 0) {
    Serial.println(F("\n╔════════════════════════════════════╗"));
    Serial.println(F("║  CMD: GO - DEVICE APPROVED!        ║"));
    Serial.println(F("╚════════════════════════════════════╝"));
    saveApprovedStatus(true);
    lastTransmissionMinute = -1;
    Serial.print(F("✓ Approval saved to EEPROM. isApproved = "));
    Serial.println(isApproved ? "TRUE" : "FALSE");
    
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
      publishPresenceOnline();
      transmissionCount++;
      Serial.println(F("=== TX COMPLETE ===\n"));
    } else if (isCalibrationMode) {
      Serial.println(F("⚠ Cannot send - Calibration mode active"));
    }
    
  } else {
    Serial.print(F("CMD: Unknown - "));
    Serial.println(command);
  }
}

void publishSensorData() {
  if (!isSystemFullyReady()) {
    Serial.println(F("⚠️ BLOCKED: System not fully ready - cannot transmit data"));
    printSystemReadiness();
    return;
  }
  
  if (isCalibrationMode) {
    Serial.println(F("⚠ Calibration mode active - MQTT transmission blocked"));
    return;
  }
  
  if (!mqttClient.connected()) {
    Serial.println(F("MQTT not connected"));
    mqttConnected = false;
    setModuleStatus(&moduleReadiness.mqtt, MODULE_FAILED, "MQTT");
    return;
  }

  
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["tds"] = round(tds * 10) / 10.0;
  doc["pH"] = round(ph * 100) / 100.0;
  doc["turbidity"] = round(turbidity * 10) / 10.0;
  doc["messageType"] = "sensor_data";
  doc["interval"] = "30min_clock_sync";
  doc["transmissionNumber"] = transmissionCount;
  
  // Optional metadata (not used for timestamping)
  if (timeInitialized) {
    doc["deviceUptime"] = (millis() - bootTime) / 1000; // seconds since boot
  }


  char payload[256];
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

  if (mqttClient.publish(topicPresence, presencePayload, false)) {
    Serial.println(F("✓ Presence status: online (NOT retained)"));
    Serial.println(F("  Server will send any pending commands via MQTT..."));
  } else {
    Serial.println(F("✗ Failed to publish presence status"));
    Serial.print(F("MQTT state: "));
    Serial.println(mqttClient.state());
  }
}

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

void printWatchdog() {
  Serial.println(F("\n=== WATCHDOG ==="));
  
  Serial.print(F("System Ready: "));
  Serial.println(isSystemFullyReady() ? F("✅ YES") : F("⚠️ NO"));
  
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
  
  Serial.print(F("MQTT Messages RX: "));
  Serial.println(mqttMessagesReceived);
  Serial.print(F("MQTT Commands RX: "));
  Serial.println(mqttCommandsReceived);
  Serial.print(F("TX Count: "));
  Serial.println(transmissionCount);
  Serial.println(F("================\n"));
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  bootTime = millis();

  Serial.println(F("\n=== Water Quality Monitor - Arduino R4 WiFi ==="));
  Serial.println(F("Firmware: v8.0.0 - System Readiness Framework"));
  Serial.print(F("Boot: "));
  Serial.println(bootTime);
  Serial.println(F("MQTT: SSL/TLS (Port 8883) - No LWT"));
  Serial.println(F("Restart: 12:00 AM Philippine Time (UTC+8)"));
  Serial.println(F("Data TX: Every 30 minutes (:00 and :30)"));
  Serial.println(F("Presence: Server polling (who_is_online)"));
  Serial.println(F("Optimizations: F() macro + PROGMEM + Reduced RAM"));
  
  Serial.print(F("CALIBRATION MODE: "));
  Serial.println(isCalibrationMode ? F("ENABLED (255ms, no MQTT)") : F("DISABLED (normal)"));
  
  buildTopics();
  
  initEEPROM();
  
  Serial.println(F("\n=== Sensor Hardware Initialization ==="));
  setModuleStatus(&moduleReadiness.sensors, MODULE_INITIALIZING, "Sensors");
  
  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);

  memset(smaBuffer, 0, sizeof(smaBuffer));
  memset(phBuffer, 0, sizeof(phBuffer));
  memset(turbBuffer, 0, sizeof(turbBuffer));
  
  Serial.println(F("✓ Sensor pins configured (A0, A1, A2)"));
  Serial.println(F("✓ Smoothing buffers initialized"));
  setModuleStatus(&moduleReadiness.sensors, MODULE_READY, "Sensors");

  Serial.println(F("\n=== Calibration Engine Initialization ==="));
  setModuleStatus(&moduleReadiness.calibration, MODULE_INITIALIZING, "Calibration");
  
  computeCalibrationParams();
  computePHCalibrationParams();
  printCalibrationInfo();
  
  setModuleStatus(&moduleReadiness.calibration, MODULE_READY, "Calibration");


  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(90);
  mqttClient.setSocketTimeout(60);
  mqttClient.setBufferSize(768);


  Serial.println(F("\n=== Network Connectivity ==="));
  
  connectWiFi();
  
  if (!isCalibrationMode && getWiFiStatus() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
    
    Serial.println(F("\n=== NTP Time Synchronization ==="));
    setModuleStatus(&moduleReadiness.ntp, MODULE_INITIALIZING, "NTP");
    
    timeClient.begin();
    delay(1000);
    
    Serial.println(F("IMPORTANT: Device will NOT send data until time is synced"));
    Serial.print(F("Attempting NTP sync"));
    
    for (int i = 0; i < 15; i++) {
      Serial.print(F("."));
      if (timeClient.update()) {
        unsigned long epochTime = timeClient.getEpochTime();
        if (epochTime > 1577836800) {
          timeInitialized = true;
          Serial.println(F(" ✓ SUCCESS"));
          Serial.print(F("✓ Epoch Time: "));
          Serial.println(epochTime);
          printCurrentTime();
          
          if (ENABLE_TRANSMISSION_JITTER) {
            randomSeed(epochTime + bootCount);
            transmissionJitterOffset = random(0, TRANSMISSION_JITTER_WINDOW);
            Serial.print(F("✓ Transmission jitter: "));
            Serial.print(transmissionJitterOffset);
            Serial.print(F(" seconds ("));
            Serial.print(transmissionJitterOffset / 60);
            Serial.print(F(" min "));
            Serial.print(transmissionJitterOffset % 60);
            Serial.println(F(" sec)"));
            Serial.println(F("  This prevents all devices from transmitting simultaneously"));
          }
          
          setModuleStatus(&moduleReadiness.ntp, MODULE_READY, "NTP");
          break;
        } else {
          Serial.print(F("!"));
        }
      }
      delay(1000);
    }
    
    if (!timeInitialized) {
      Serial.println(F(" ✗ FAILED"));
      Serial.println(F("⚠ WARNING: Time not initialized!"));
      Serial.println(F("⚠ Device will NOT send sensor data until NTP sync succeeds"));
      Serial.println(F("⚠ Will retry automatically in loop()"));
      setModuleStatus(&moduleReadiness.ntp, MODULE_FAILED, "NTP");
    }
    
    delay(2000);
    
    connectMQTT();
    
    if (mqttConnected) {
      delay(3000);
      
      if (!isApproved) {
        Serial.println(F("Device NOT approved - sending registration"));
        sendRegistration();
      } else {
        Serial.println(F("Device already approved - ready for data transmission"));
        publishPresenceOnline();
      }
    }
  } else if (isCalibrationMode) {
    Serial.println(F("\n*** CALIBRATION MODE - Skipping MQTT/NTP ***"));
    Serial.println(F("*** Sensor readings will display every 255ms ***"));
    setModuleStatus(&moduleReadiness.ntp, MODULE_READY, "NTP (bypassed)");
  }

  delay(1000);
  printSystemReadiness();
  
  if (isSystemFullyReady()) {
    Serial.println(F("✅ ALL SYSTEMS OPERATIONAL - Device ready for production use"));
    
    if (isCalibrationMode) {
      Serial.println(F("📊 Mode: CALIBRATION (255ms local readings only)"));
    } else {
      Serial.print(F("📡 Mode: "));
      Serial.println(isApproved ? F("ACTIVE MONITORING") : F("WAITING FOR APPROVAL"));
      
      if (timeInitialized) {
        char nextTxStr[15];
        getNextTransmissionPHTime(nextTxStr, sizeof(nextTxStr));
        Serial.print(F("📅 Next TX: "));
        Serial.println(nextTxStr);
      }
    }
  } else {
    Serial.println(F("⚠️ SYSTEM NOT READY - Some modules failed initialization"));
    Serial.println(F("⚠️ Device will continue with limited functionality"));
    Serial.println(F("⚠️ Failed modules will retry automatically"));
  }
  
  Serial.println();
}

void loop() {
  unsigned long currentMillis = millis();

  if (wifiManagerActive) {
    handleWebPortal();
    
    if (currentMillis - wifiManagerStartTime > WIFI_MANAGER_TIMEOUT) {
      Serial.println(F("\n⚠ WiFi Manager timeout"));
      
      if (!wifiCredentialsSaved || savedSSID.length() == 0) {
        Serial.println(F("✗ No credentials configured - restarting portal..."));
        wifiManagerStartTime = currentMillis;
      } else {
        Serial.println(F("Using previously saved credentials"));
        WiFi.end();
        wifiManagerActive = false;
        delay(1000);
        connectWiFi();
      }
    }
    
    return;
  }

  if (!isCalibrationMode && (currentMillis - bootTime) / 3600000UL >= MAX_UPTIME_HOURS) {
    Serial.println(F("Max uptime - safety restart"));
    delay(2000);
    NVIC_SystemReset();
  }

  if (!isCalibrationMode && timeInitialized) {
    checkMidnightRestart();
  }

  uint8_t wifiStatus = getWiFiStatus();
  if (!isCalibrationMode && wifiStatus != WL_CONNECTED) {
    if (moduleReadiness.wifi == MODULE_READY) {
      setModuleStatus(&moduleReadiness.wifi, MODULE_FAILED, "WiFi");
    }
    handleWiFiDisconnection();
    delay(5000);
    return;
  } else {
    if (wifiStatus == WL_CONNECTED && moduleReadiness.wifi != MODULE_READY) {
      setModuleStatus(&moduleReadiness.wifi, MODULE_READY, "WiFi");
    }
    consecutiveWifiFailures = 0;
  }

  if (!isCalibrationMode && timeInitialized && currentMillis - lastNtpUpdate >= NTP_UPDATE_INTERVAL) {
    lastNtpUpdate = currentMillis;
    timeClient.update();
  }

  if (!isCalibrationMode && !timeInitialized && wifiStatus == WL_CONNECTED) {
    static unsigned long lastNtpRetry = 0;
    if (currentMillis - lastNtpRetry >= 30000) {
      lastNtpRetry = currentMillis;
      Serial.println(F("⏳ Retrying NTP sync..."));
      setModuleStatus(&moduleReadiness.ntp, MODULE_INITIALIZING, "NTP");
      
      if (timeClient.update()) {
        unsigned long epochTime = timeClient.getEpochTime();
        if (epochTime > 1577836800) {
          timeInitialized = true;
          Serial.println(F("✓ NTP time synchronized successfully!"));
          Serial.print(F("✓ Epoch Time: "));
          Serial.println(epochTime);
          printCurrentTime();
          setModuleStatus(&moduleReadiness.ntp, MODULE_READY, "NTP");
        } else {
          Serial.print(F("✗ Invalid timestamp received: "));
          Serial.println(epochTime);
          setModuleStatus(&moduleReadiness.ntp, MODULE_FAILED, "NTP");
        }
      } else {
        Serial.println(F("✗ NTP sync failed - will retry in 30 seconds"));
        setModuleStatus(&moduleReadiness.ntp, MODULE_FAILED, "NTP");
      }
    }
  }

  if (!isCalibrationMode) {
    if (!mqttClient.connected()) {
      mqttConnected = false;
      if (moduleReadiness.mqtt == MODULE_READY) {
        setModuleStatus(&moduleReadiness.mqtt, MODULE_FAILED, "MQTT");
      }
      
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
      if (moduleReadiness.mqtt != MODULE_READY) {
        setModuleStatus(&moduleReadiness.mqtt, MODULE_READY, "MQTT");
      }
      mqttClient.loop();
      consecutiveMqttFailures = 0;
    }

    if (presenceQueryActive && (currentMillis - lastPresenceQuery) > PRESENCE_TIMEOUT) {
      presenceQueryActive = false;
      Serial.println(F("Presence query timeout"));
    }
  }

  unsigned long watchdogInterval = isCalibrationMode ? 60000 : WATCHDOG_INTERVAL;
  if (currentMillis - lastWatchdog >= watchdogInterval) {
    lastWatchdog = currentMillis;
    printWatchdog();
  }

  if (currentMillis - lastSensorRead >= sensorReadInterval) {
    lastSensorRead = currentMillis;
    readSensors();
    
    if (isCalibrationMode) {
      Serial.print(F("[CALIB] Interval: "));
      Serial.print(sensorReadInterval);
      Serial.println(F("ms - Local display only"));
    } else if (isApproved && timeInitialized) {
      char nextTxStr[15];
      getNextTransmissionPHTime(nextTxStr, sizeof(nextTxStr));
      Serial.print(F("Next TX: "));
      Serial.println(nextTxStr);
    }
  }

  if (!isCalibrationMode && !isApproved) {
    if (currentMillis - lastRegistrationAttempt >= REGISTRATION_INTERVAL) {
      lastRegistrationAttempt = currentMillis;
      if (mqttConnected) {
        sendRegistration();
      }
    }
  } 
  else if (!isCalibrationMode) {
    if (!isSystemFullyReady()) {
      return;
    }
    
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
        publishPresenceOnline();
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

  if (!isCalibrationMode) {
    delay(100);
  } else {
    delay(10);
  }
}

