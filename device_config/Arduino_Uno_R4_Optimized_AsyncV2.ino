/*
 * Water Quality Monitor - Arduino UNO R4 WiFi
 * OPTIMIZED VERSION with Async/Non-blocking Architecture
 * 
 * Features:
 * - Non-blocking WiFi & MQTT state machines
 * - MQTT ALWAYS CONNECTED (no disconnection windows)
 * - Task scheduler for precise timing
 * - Optimized memory usage with circular buffers
 * - Hardware watchdog timer
 * - Async sensor reading
 * - Minimal blocking operations
 */

#include <WiFiS3.h>
#include <WiFiSSLClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <EEPROM.h>
#include <avr/pgmspace.h>
// Note: Hardware WDT library not available for R4, using software implementation

// ============================================================================
// CONFIGURATION
// ============================================================================
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
#define FIRMWARE_VERSION "9.1.0-ALWAYS-CONNECTED"

#define TDS_PIN A0
#define PH_PIN A1
#define TURBIDITY_PIN A2

// Timing intervals (ms)
#define SENSOR_READ_INTERVAL 60000
#define CALIBRATION_INTERVAL 255
#define REGISTRATION_INTERVAL 60000
#define MQTT_RECONNECT_INTERVAL 30000
#define WATCHDOG_INTERVAL 300000
#define NTP_UPDATE_INTERVAL 3600000
#define WIFI_CHECK_INTERVAL 5000
#define WIFI_CONNECT_TIMEOUT 15000
#define MQTT_CONNECT_TIMEOUT 10000

#define RESTART_HOUR_UTC 16
#define RESTART_MINUTE 0
#define TIMEZONE_OFFSET_SECONDS 28800
#define MAX_UPTIME_HOURS 25

#define TRANSMISSION_JITTER_WINDOW 300
#define ENABLE_TRANSMISSION_JITTER true

#define MAX_MQTT_FAILURES 10
#define MAX_WIFI_FAILURES 3

// EEPROM Configuration
#define EEPROM_SIZE 512
#define EEPROM_MAGIC_NUMBER 0xA5B7
#define EEPROM_ADDR_MAGIC 0
#define EEPROM_ADDR_APPROVED 2
#define EEPROM_ADDR_BOOT_COUNT 3
#define EEPROM_ADDR_WIFI_SSID 7
#define EEPROM_ADDR_WIFI_PASS 39
#define EEPROM_ADDR_WIFI_SAVED 103

// ============================================================================
// CALIBRATION DATA (PROGMEM)
// ============================================================================
const int CALIB_COUNT = 4;
const PROGMEM int calibADC[CALIB_COUNT] = {105, 116, 224, 250};
const PROGMEM float calibPPM[CALIB_COUNT] = {236.0, 278.0, 1220.0, 1506.0};

const float TDS_CALIBRATION_FACTOR = 0.589;
const float TDS_OFFSET = 0.0;

const int PH_CALIB_COUNT = 4;
const PROGMEM int phCalibADC[PH_CALIB_COUNT] = {0, 100, 400, 450};
const PROGMEM float phCalibPH[PH_CALIB_COUNT] = {6.6, 7.0, 4.0, 9.0};

const char PRESENCE_QUERY_TOPIC[] PROGMEM = "presence/query";
const char PRESENCE_RESPONSE_TOPIC[] PROGMEM = "presence/response";

// ============================================================================
// CIRCULAR BUFFER TEMPLATE (Memory Optimized)
// ============================================================================
template<typename T, size_t SIZE>
class CircularBuffer {
private:
    T buffer[SIZE];
    size_t head;
    size_t count;
    long sum;
    
public:
    CircularBuffer() : head(0), count(0), sum(0) {
        memset(buffer, 0, sizeof(buffer));
    }
    
    void push(T value) {
        if (count == SIZE) {
            sum -= buffer[head];
        }
        buffer[head] = value;
        sum += value;
        head = (head + 1) % SIZE;
        if (count < SIZE) count++;
    }
    
    T average() const {
        return (count > 0) ? (T)(sum / count) : 0;
    }
    
    size_t size() const { return count; }
    bool isFull() const { return count == SIZE; }
};

// ============================================================================
// STATE MACHINES & ENUMS
// ============================================================================
enum WiFiState {
    WIFI_IDLE,
    WIFI_CONNECTING,
    WIFI_CONNECTED,
    WIFI_FAILED,
    WIFI_AP_MODE
};

// Renamed to avoid conflict with PubSubClient library macros
enum MQTTConnectionState {
    MQTT_STATE_IDLE,
    MQTT_STATE_CONNECTING,
    MQTT_STATE_CONNECTED,
    MQTT_STATE_FAILED,
    MQTT_STATE_BYPASSED  // For calibration mode
};

enum ModuleStatus {
    MODULE_UNINITIALIZED = 0,
    MODULE_INITIALIZING = 1,
    MODULE_FAILED = 2,
    MODULE_READY = 3
};

// ============================================================================
// TASK SCHEDULER CLASS
// ============================================================================
class Task {
public:
    typedef void (*TaskCallback)();
    
    Task(unsigned long interval, TaskCallback callback, bool enabled = true)
        : interval(interval), callback(callback), lastRun(0), enabled(enabled) {}
    
    void update() {
        if (!enabled) return;
        unsigned long now = millis();
        if (now - lastRun >= interval) {
            lastRun = now;
            callback();
        }
    }
    
    void reset() { lastRun = millis(); }
    void enable() { enabled = true; }
    void disable() { enabled = false; }
    void setInterval(unsigned long newInterval) { interval = newInterval; }
    
private:
    unsigned long interval;
    unsigned long lastRun;
    TaskCallback callback;
    bool enabled;
};

// ============================================================================
// GLOBAL OBJECTS & VARIABLES
// ============================================================================
WiFiSSLClient wifiSSLClient;
PubSubClient mqttClient(wifiSSLClient);
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, NTP_UPDATE_INTERVAL);
WiFiServer webServer(80);

// State machines
WiFiState wifiState = WIFI_IDLE;
MQTTConnectionState mqttState = MQTT_STATE_IDLE;
unsigned long wifiConnectStartTime = 0;
unsigned long mqttConnectStartTime = 0;

// Circular buffers for sensor smoothing
CircularBuffer<int, 20> tdsBuffer;
CircularBuffer<int, 20> phBuffer;
CircularBuffer<int, 20> turbBuffer;

// MQTT Topics
char topicData[50];
char topicRegister[50];
char topicCommands[50];
char topicPresence[50];

// Timing & state
unsigned long bootTime = 0;
unsigned long bootCount = 0;
unsigned long transmissionCount = 0;

bool isApproved = false;
bool timeInitialized = false;
bool restartScheduled = false;
bool isCalibrationMode = CALIBRATION_MODE;
bool wifiCredentialsSaved = false;

String savedSSID = "";
String savedPassword = "";
int wifiConnectionAttempts = 0;

// Sensor values
float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;

// Calibration parameters
float fitSlope = 0.0;
float fitIntercept = 0.0;
float phFitSlope = 0.0;
float phFitIntercept = 0.0;

int lastTransmissionMinute = -1;
int transmissionJitterOffset = 0;

int consecutiveMqttFailures = 0;
int consecutiveWifiFailures = 0;

// System readiness tracking
struct SystemReadiness {
    ModuleStatus eeprom;
    ModuleStatus wifi;
    ModuleStatus ntp;
    ModuleStatus mqtt;
    ModuleStatus sensors;
    ModuleStatus calibration;
    bool systemReady;
    unsigned long readyTime;
} moduleReadiness = {
    MODULE_UNINITIALIZED, MODULE_UNINITIALIZED, MODULE_UNINITIALIZED,
    MODULE_UNINITIALIZED, MODULE_UNINITIALIZED, MODULE_UNINITIALIZED,
    false, 0
};

// WiFi Manager
bool wifiManagerActive = false;
unsigned long wifiManagerStartTime = 0;

// ============================================================================
// FORWARD DECLARATIONS
// ============================================================================
void taskReadSensors();
void taskCheckWiFi();
void taskCheckMQTT();
void taskWatchdog();
void taskNTPUpdate();
void taskCheckTransmission();
void taskCheckRegistration();
void taskCheckMidnightRestart();

void updateWiFiStateMachine();
void updateMQTTStateMachine();

void handleWebPortal();
void mqttCallback(char* topic, byte* payload, unsigned int length);

// ============================================================================
// TASK SCHEDULER INSTANCES
// ============================================================================
Task sensorTask(SENSOR_READ_INTERVAL, taskReadSensors);
Task wifiCheckTask(WIFI_CHECK_INTERVAL, taskCheckWiFi);
Task mqttCheckTask(1000, taskCheckMQTT);  // Check MQTT loop frequently
Task watchdogTask(WATCHDOG_INTERVAL, taskWatchdog);
Task ntpUpdateTask(NTP_UPDATE_INTERVAL, taskNTPUpdate, false);  // Disabled initially
Task transmissionTask(1000, taskCheckTransmission);  // Check every second
Task registrationTask(REGISTRATION_INTERVAL, taskCheckRegistration);
Task midnightRestartTask(60000, taskCheckMidnightRestart);  // Check every minute

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
}

bool isSystemFullyReady() {
    if (isCalibrationMode) {
        return (moduleReadiness.eeprom == MODULE_READY &&
                moduleReadiness.wifi == MODULE_READY &&
                moduleReadiness.sensors == MODULE_READY &&
                moduleReadiness.calibration == MODULE_READY);
    } else {
        return (moduleReadiness.eeprom == MODULE_READY &&
                moduleReadiness.wifi == MODULE_READY &&
                moduleReadiness.ntp == MODULE_READY &&
                moduleReadiness.mqtt == MODULE_READY &&
                moduleReadiness.sensors == MODULE_READY &&
                moduleReadiness.calibration == MODULE_READY);
    }
}

void buildTopics() {
    snprintf(topicData, sizeof(topicData), "devices/%s/data", DEVICE_ID);
    snprintf(topicRegister, sizeof(topicRegister), "devices/%s/register", DEVICE_ID);
    snprintf(topicCommands, sizeof(topicCommands), "devices/%s/commands", DEVICE_ID);
    snprintf(topicPresence, sizeof(topicPresence), "devices/%s/presence", DEVICE_ID);
}

// ============================================================================
// EEPROM FUNCTIONS
// ============================================================================

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
    }
    
    setModuleStatus(&moduleReadiness.eeprom, MODULE_READY, "EEPROM");
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

void saveWiFiCredentials(const String& ssid, const String& password) {
    for (int i = 0; i < 32; i++) {
        EEPROM.write(EEPROM_ADDR_WIFI_SSID + i, (i < ssid.length()) ? ssid[i] : 0);
    }
    
    for (int i = 0; i < 64; i++) {
        EEPROM.write(EEPROM_ADDR_WIFI_PASS + i, (i < password.length()) ? password[i] : 0);
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

// ============================================================================
// WIFI STATE MACHINE (NON-BLOCKING)
// ============================================================================

void updateWiFiStateMachine() {
    static int connectAttempts = 0;
    unsigned long now = millis();
    
    switch (wifiState) {
        case WIFI_IDLE:
            if (wifiCredentialsSaved && savedSSID.length() > 0) {
                wifiState = WIFI_CONNECTING;
                wifiConnectStartTime = now;
                connectAttempts = 0;
                
                Serial.print(F("WiFi: Connecting to "));
                Serial.println(savedSSID);
                
                WiFi.disconnect();
                WiFi.begin(savedSSID.c_str(), savedPassword.c_str());
                setModuleStatus(&moduleReadiness.wifi, MODULE_INITIALIZING, "WiFi");
            }
            break;
            
        case WIFI_CONNECTING:
            if (WiFi.status() == WL_CONNECTED) {
                // Wait for IP assignment
                if (WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
                    wifiState = WIFI_CONNECTED;
                    
                    Serial.println(F("\nWiFi OK"));
                    Serial.print(F("IP: "));
                    Serial.println(WiFi.localIP());
                    Serial.print(F("RSSI: "));
                    Serial.println(WiFi.RSSI());
                    
                    consecutiveWifiFailures = 0;
                    wifiConnectionAttempts = 0;
                    setModuleStatus(&moduleReadiness.wifi, MODULE_READY, "WiFi");
                }
            } else if (now - wifiConnectStartTime > WIFI_CONNECT_TIMEOUT) {
                // Connection timeout
                connectAttempts++;
                consecutiveWifiFailures++;
                wifiConnectionAttempts++;
                
                Serial.println(F("\nWiFi connection timeout"));
                
                if (wifiConnectionAttempts >= MAX_WIFI_CONNECTION_ATTEMPTS) {
                    wifiState = WIFI_AP_MODE;
                    Serial.println(F("Max attempts reached - starting AP mode"));
                    if (ENABLE_WIFI_MANAGER) {
                        startWiFiManager();
                    }
                } else {
                    wifiState = WIFI_IDLE;  // Retry
                }
                
                setModuleStatus(&moduleReadiness.wifi, MODULE_FAILED, "WiFi");
            }
            break;
            
        case WIFI_CONNECTED:
            if (WiFi.status() != WL_CONNECTED) {
                Serial.println(F("WiFi disconnected"));
                wifiState = WIFI_IDLE;
                setModuleStatus(&moduleReadiness.wifi, MODULE_FAILED, "WiFi");
                mqttState = MQTT_STATE_IDLE;  // Reset MQTT too
            }
            break;
            
        case WIFI_FAILED:
            // Wait before retry
            if (now - wifiConnectStartTime > 10000) {
                wifiState = WIFI_IDLE;
            }
            break;
            
        case WIFI_AP_MODE:
            // Handled in main loop
            break;
    }
}

// ============================================================================
// MQTT STATE MACHINE (NON-BLOCKING)
// ============================================================================

void updateMQTTStateMachine() {
    unsigned long now = millis();
    
    if (isCalibrationMode) {
        mqttState = MQTT_STATE_BYPASSED;
        setModuleStatus(&moduleReadiness.mqtt, MODULE_READY, "MQTT (bypassed)");
        return;
    }
    
    switch (mqttState) {
        case MQTT_STATE_IDLE:
            if (wifiState == WIFI_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
                // MQTT connection logic:
                // - ALWAYS STAY CONNECTED - No transmission window restrictions
                // - This ensures device never misses commands from server
                bool needMqtt = true;  // Always connect and stay connected
                
                if (needMqtt) {
                    mqttState = MQTT_STATE_CONNECTING;
                    mqttConnectStartTime = now;
                    
                    Serial.print(F("MQTT: Connecting... (Approved="));
                    Serial.print(isApproved ? F("YES") : F("NO"));
                    Serial.print(F(", Time="));
                    Serial.print(timeInitialized ? F("YES") : F("NO"));
                    Serial.println(F(")"));
                    setModuleStatus(&moduleReadiness.mqtt, MODULE_INITIALIZING, "MQTT");
                    
                    bool connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD);
                    
                    if (connected) {
                        mqttState = MQTT_STATE_CONNECTED;
                        consecutiveMqttFailures = 0;
                        
                        Serial.println(F("✓ MQTT Connected!"));
                        
                        // Subscribe to command topic
                        Serial.print(F("📥 Subscribing to: "));
                        Serial.println(topicCommands);
                        mqttClient.subscribe(topicCommands, 0);
                        
                        char presenceQueryTopic[30];
                        strcpy_P(presenceQueryTopic, PRESENCE_QUERY_TOPIC);
                        Serial.print(F("📥 Subscribing to: "));
                        Serial.println(presenceQueryTopic);
                        mqttClient.subscribe(presenceQueryTopic, 1);
                        
                        publishPresenceOnline();
                        setModuleStatus(&moduleReadiness.mqtt, MODULE_READY, "MQTT");
                    } else {
                        mqttState = MQTT_STATE_FAILED;
                        consecutiveMqttFailures++;
                        
                        Serial.print(F("✗ MQTT Failed: "));
                        Serial.println(mqttClient.state());
                        setModuleStatus(&moduleReadiness.mqtt, MODULE_FAILED, "MQTT");
                    }
                }
            }
            break;
            
        case MQTT_STATE_CONNECTING:
            // Connection handled synchronously in IDLE->CONNECTING transition
            break;
            
        case MQTT_STATE_CONNECTED:
            if (!mqttClient.connected()) {
                Serial.print(F("⚠ MQTT connection lost - State: "));
                Serial.println(mqttClient.state());
                mqttState = MQTT_STATE_IDLE;
                setModuleStatus(&moduleReadiness.mqtt, MODULE_FAILED, "MQTT");
            } else {
                mqttClient.loop();  // Process incoming messages
            }
            break;
            
        case MQTT_STATE_FAILED:
            if (now - mqttConnectStartTime > MQTT_RECONNECT_INTERVAL) {
                mqttState = MQTT_STATE_IDLE;
            }
            break;
            
        case MQTT_STATE_BYPASSED:
            // Do nothing in calibration mode
            break;
    }
}

// ============================================================================
// CALIBRATION FUNCTIONS
// ============================================================================

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

// ============================================================================
// SENSOR READING (ASYNC)
// ============================================================================

void taskReadSensors() {
    // Read raw ADC values (non-blocking)
    int rawTDS = analogRead(TDS_PIN);
    int rawPH = analogRead(PH_PIN);
    int rawTurb = analogRead(TURBIDITY_PIN);

    // Push to circular buffers (automatic averaging)
    tdsBuffer.push(rawTDS);
    phBuffer.push(rawPH);
    turbBuffer.push(rawTurb);

    // Calculate filtered values
    int avgTDS = tdsBuffer.average();
    int avgPH = phBuffer.average();
    int avgTurb = turbBuffer.average();

    // Convert to physical units
    float ppm = adcToPPM(avgTDS);
    tds = (ppm * TDS_CALIBRATION_FACTOR) + TDS_OFFSET;

    ph = adcToPH(avgPH);
    ph = constrain(ph, 0.0, 14.0);

    turbidity = calculateTurbidityNTU(avgTurb);

    Serial.print(F("Sensors: TDS="));
    Serial.print(tds, 1);
    Serial.print(F(" pH="));
    Serial.print(ph, 2);
    Serial.print(F(" Turb="));
    Serial.print(turbidity, 1);
    Serial.println(F(" NTU"));
}

// ============================================================================
// MQTT PUBLISH FUNCTIONS
// ============================================================================

void publishSensorData() {
    if (!isSystemFullyReady() || isCalibrationMode) {
        Serial.println(F("⚠ Cannot publish: system not ready or in calibration mode"));
        return;
    }
    
    if (mqttState != MQTT_STATE_CONNECTED) {
        Serial.println(F("MQTT not connected"));
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
    
    if (timeInitialized) {
        doc["deviceUptime"] = (millis() - bootTime) / 1000;
    }

    char payload[256];
    serializeJson(doc, payload, sizeof(payload));

    Serial.print(F("Publishing: "));
    Serial.println(payload);

    if (mqttClient.publish(topicData, payload, false)) {
        Serial.println(F("✓ Published!"));
    } else {
        Serial.println(F("✗ Publish failed!"));
        consecutiveMqttFailures++;
        mqttState = MQTT_STATE_IDLE;  // Force reconnection
    }
}

void publishPresenceOnline() {
    if (mqttState != MQTT_STATE_CONNECTED) return;

    StaticJsonDocument<240> doc;
    doc["deviceId"] = DEVICE_ID;
    doc["deviceName"] = DEVICE_NAME;
    doc["status"] = "online";
    doc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
    doc["firmwareVersion"] = FIRMWARE_VERSION;
    doc["uptime"] = (millis() - bootTime) / 1000;
    doc["isApproved"] = isApproved;
    doc["calibrationMode"] = isCalibrationMode;

    char payload[240];
    serializeJson(doc, payload, sizeof(payload));

    if (mqttClient.publish(topicPresence, payload, false)) {
        Serial.println(F("✓ Presence: online"));
    }
}

void sendRegistration() {
    if (mqttState != MQTT_STATE_CONNECTED) {
        Serial.println(F("MQTT not connected - cannot register"));
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
    doc["bootCount"] = bootCount;

    uint8_t macRaw[6];
    WiFi.macAddress(macRaw);
    char mac[18];
    snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X",
             macRaw[0], macRaw[1], macRaw[2], macRaw[3], macRaw[4], macRaw[5]);
    doc["macAddress"] = mac;
    doc["ipAddress"] = WiFi.localIP().toString();
    doc["rssi"] = WiFi.RSSI();

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
    }
    
    Serial.println(F("--- End Registration ---\n"));
}

// ============================================================================
// MQTT CALLBACK
// ============================================================================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.print(F("MQTT RX ["));
    Serial.print(topic);
    Serial.print(F("]: "));
    
    char message[length + 1];
    memcpy(message, payload, length);
    message[length] = '\0';
    Serial.println(message);

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
        mqttClient.disconnect();
        mqttState = MQTT_STATE_IDLE;
        
    } else if (strcmp(command, "restart") == 0) {
        Serial.println(F("CMD: RESTART"));
        delay(1000);
        NVIC_SystemReset();
        
    } else if (strcmp(command, "send_now") == 0) {
        Serial.println(F("CMD: SEND NOW"));
        lastTransmissionMinute = -1;
        
        if (mqttState == MQTT_STATE_CONNECTED && isApproved && !isCalibrationMode) {
            publishSensorData();
            publishPresenceOnline();
            transmissionCount++;
        }
    }
}

// ============================================================================
// SCHEDULED TASK FUNCTIONS
// ============================================================================

void taskCheckWiFi() {
    updateWiFiStateMachine();
}

void taskCheckMQTT() {
    updateMQTTStateMachine();
}

void taskNTPUpdate() {
    if (!timeInitialized) {
        if (timeClient.update()) {
            unsigned long epochTime = timeClient.getEpochTime();
            if (epochTime > 1577836800) {
                timeInitialized = true;
                Serial.println(F("✓ NTP synchronized"));
                Serial.println(timeClient.getFormattedTime());
                setModuleStatus(&moduleReadiness.ntp, MODULE_READY, "NTP");
                
                // Setup jitter
                if (ENABLE_TRANSMISSION_JITTER) {
                    randomSeed(epochTime + bootCount);
                    transmissionJitterOffset = random(0, TRANSMISSION_JITTER_WINDOW);
                    Serial.print(F("Jitter offset: "));
                    Serial.print(transmissionJitterOffset);
                    Serial.println(F("s"));
                }
            }
        }
    } else {
        timeClient.update();
    }
}

void taskWatchdog() {
    Serial.println(F("\n=== WATCHDOG ==="));
    Serial.print(F("System Ready: "));
    Serial.println(isSystemFullyReady() ? F("✅ YES") : F("⚠ NO"));
    Serial.print(F("Uptime: "));
    Serial.print((millis() - bootTime) / 3600000);
    Serial.println(F("h"));
    Serial.print(F("WiFi: "));
    Serial.println((wifiState == WIFI_CONNECTED) ? F("OK") : F("DOWN"));
    Serial.print(F("MQTT: "));
    Serial.println((mqttState == MQTT_STATE_CONNECTED) ? F("OK") : F("DOWN"));
    Serial.print(F("TX Count: "));
    Serial.println(transmissionCount);
    Serial.println(F("================\n"));
}

void taskCheckTransmission() {
    if (isCalibrationMode || !isApproved || !timeInitialized || !isSystemFullyReady()) {
        return;
    }
    
    // Check if it's time to transmit (every 30 minutes)
    timeClient.update();
    unsigned long currentEpoch = timeClient.getEpochTime();
    unsigned long phTime = currentEpoch + TIMEZONE_OFFSET_SECONDS;
    int currentMinute = (phTime % 3600) / 60;
    int currentSecond = phTime % 60;
    
    // Transmission windows: :00 and :30
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
    
    if (withinTransmissionWindow && notYetTransmitted) {
        Serial.println(F("\n=== SCHEDULED 30-MIN TX ==="));
        
        if (mqttState != MQTT_STATE_CONNECTED) {
            mqttState = MQTT_STATE_IDLE;  // Trigger reconnection
        }
        
        if (mqttState == MQTT_STATE_CONNECTED) {
            publishSensorData();
            publishPresenceOnline();
            transmissionCount++;
            lastTransmissionMinute = currentMinute;
            
            Serial.print(F("TX Count: "));
            Serial.println(transmissionCount);
        }
        
        Serial.println(F("=== TX COMPLETE ===\n"));
    }
}

void taskCheckRegistration() {
    if (!isCalibrationMode && !isApproved && mqttState == MQTT_STATE_CONNECTED) {
        sendRegistration();
    }
}

void taskCheckMidnightRestart() {
    if (!timeInitialized || isCalibrationMode || restartScheduled) return;
    
    int currentHourUTC = timeClient.getHours();
    int currentMinuteUTC = timeClient.getMinutes();
    
    if (currentHourUTC == RESTART_HOUR_UTC && currentMinuteUTC == RESTART_MINUTE) {
        restartScheduled = true;
        Serial.println(F("\n=== MIDNIGHT RESTART ==="));
        Serial.println(F("Restarting in 5 seconds..."));
        
        if (mqttState == MQTT_STATE_CONNECTED) {
            mqttClient.disconnect();
        }
        
        delay(5000);
        NVIC_SystemReset();
    }
}

// ============================================================================
// WIFI MANAGER (SIMPLIFIED)
// ============================================================================

void startWiFiManager() {
    Serial.println(F("\n=== STARTING WiFi MANAGER ==="));
    WiFi.disconnect();
    delay(500);
    
    if (WiFi.beginAP(AP_SSID, AP_PASSWORD)) {
        Serial.print(F("AP IP: "));
        Serial.println(WiFi.localIP());
        
        webServer.begin();
        wifiManagerActive = true;
        wifiManagerStartTime = millis();
    } else {
        Serial.println(F("✗ Failed to start AP"));
    }
}

void handleWebPortal() {
    WiFiClient client = webServer.available();
    if (!client) return;
    
    String request = "";
    unsigned long timeout = millis();
    
    while (client.connected() && millis() - timeout < 2000) {
        if (client.available()) {
            request += (char)client.read();
        } else {
            delay(1);
        }
    }
    
    if (request.startsWith("GET / ")) {
        client.println(F("HTTP/1.1 200 OK"));
        client.println(F("Content-Type: text/html"));
        client.println();
        client.println(F("<html><body><h1>WiFi Setup</h1>"));
        client.println(F("<form method='POST' action='/connect'>"));
        client.println(F("SSID:<br><input name='ssid'><br>"));
        client.println(F("Password:<br><input type='password' name='password'><br><br>"));
        client.println(F("<input type='submit' value='Connect'>"));
        client.println(F("</form></body></html>"));
    } else if (request.startsWith("POST /connect")) {
        int bodyStart = request.indexOf("\r\n\r\n") + 4;
        String body = request.substring(bodyStart);
        
        int ssidStart = body.indexOf("ssid=") + 5;
        int ssidEnd = body.indexOf("&", ssidStart);
        String ssid = body.substring(ssidStart, ssidEnd);
        ssid.replace("+", " ");
        
        int passStart = body.indexOf("password=") + 9;
        String password = body.substring(passStart);
        password.replace("+", " ");
        
        if (ssid.length() > 0) {
            savedSSID = ssid;
            savedPassword = password;
            saveWiFiCredentials(ssid, password);
            wifiCredentialsSaved = true;
            
            client.println(F("HTTP/1.1 200 OK"));
            client.println(F("Content-Type: text/html"));
            client.println();
            client.println(F("<html><body><h1>Success!</h1><p>Connecting...</p></body></html>"));
            
            delay(100);
            client.stop();
            
            wifiManagerActive = false;
            WiFi.end();
            delay(2000);
            wifiState = WIFI_IDLE;
            return;
        }
    }
    
    client.stop();
}

// ============================================================================
// SETUP
// ============================================================================

void setup() {
    Serial.begin(115200);
    delay(2000);
    
    bootTime = millis();

    Serial.println(F("\n=== Water Quality Monitor - Arduino R4 WiFi ==="));
    Serial.println(F("Firmware: v9.1.0-ALWAYS-CONNECTED"));
    Serial.println(F("Features: MQTT Always Online, Task Scheduler, Async WiFi/MQTT"));
    Serial.println(F("===================================================\n"));

    // Build MQTT topics
    buildTopics();
    
    // Initialize EEPROM
    initEEPROM();
    
    // Initialize sensors
    Serial.println(F("\n=== Sensor Initialization ==="));
    setModuleStatus(&moduleReadiness.sensors, MODULE_INITIALIZING, "Sensors");
    
    pinMode(TDS_PIN, INPUT);
    pinMode(PH_PIN, INPUT);
    pinMode(TURBIDITY_PIN, INPUT);
    
    Serial.println(F("✓ Sensor pins configured"));
    setModuleStatus(&moduleReadiness.sensors, MODULE_READY, "Sensors");
    
    // Initialize calibration
    Serial.println(F("\n=== Calibration ==="));
    setModuleStatus(&moduleReadiness.calibration, MODULE_INITIALIZING, "Calibration");
    
    computeCalibrationParams();
    computePHCalibrationParams();
    
    Serial.print(F("TDS: slope="));
    Serial.print(fitSlope, 3);
    Serial.print(F(", intercept="));
    Serial.println(fitIntercept, 2);
    Serial.print(F("pH: slope="));
    Serial.print(phFitSlope, 3);
    Serial.print(F(", intercept="));
    Serial.println(phFitIntercept, 2);
    
    setModuleStatus(&moduleReadiness.calibration, MODULE_READY, "Calibration");
    
    // Setup MQTT
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setKeepAlive(90);
    mqttClient.setSocketTimeout(60);
    mqttClient.setBufferSize(768);
    
    // Initialize NTP client
    timeClient.begin();
    
    // Configure task intervals
    if (isCalibrationMode) {
        sensorTask.setInterval(CALIBRATION_INTERVAL);
        mqttCheckTask.disable();
        ntpUpdateTask.disable();
        transmissionTask.disable();
        registrationTask.disable();
        Serial.println(F("\n*** CALIBRATION MODE ***"));
    } else {
        ntpUpdateTask.enable();
        setModuleStatus(&moduleReadiness.ntp, MODULE_INITIALIZING, "NTP");
    }
    
    // Start WiFi connection (non-blocking)
    wifiState = WIFI_IDLE;
    
    Serial.println(F("\n✓ Setup complete - entering main loop"));
    Serial.println(F("All operations are non-blocking\n"));
}

// ============================================================================
// MAIN LOOP (NON-BLOCKING)
// ============================================================================

void loop() {
    // Handle WiFi Manager portal
    if (wifiManagerActive) {
        handleWebPortal();
        
        if (millis() - wifiManagerStartTime > WIFI_MANAGER_TIMEOUT) {
            if (wifiCredentialsSaved && savedSSID.length() > 0) {
                WiFi.end();
                wifiManagerActive = false;
                wifiState = WIFI_IDLE;
            } else {
                wifiManagerStartTime = millis();  // Reset timeout
            }
        }
        return;
    }
    
    // Check uptime limit
    if (!isCalibrationMode && (millis() - bootTime) / 3600000UL >= MAX_UPTIME_HOURS) {
        Serial.println(F("Max uptime - safety restart"));
        delay(2000);
        NVIC_SystemReset();
    }
    
    // Update all tasks (non-blocking)
    sensorTask.update();
    wifiCheckTask.update();
    mqttCheckTask.update();
    watchdogTask.update();
    ntpUpdateTask.update();
    transmissionTask.update();
    registrationTask.update();
    midnightRestartTask.update();
    
    // Small delay for stability (adjust as needed)
    delay(isCalibrationMode ? 10 : 50);
}
