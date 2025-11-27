/*
 * Water Quality Monitoring System - CALIBRATED & OPTIMIZED
 * Arduino UNO R4 WiFi with Advanced Sensor Calibration + Direct HTTPS Integration
 * Sensors: TDS (Calibrated), pH (Calibrated), Turbidity (Calibrated)
 * 
 * Author: IoT Water Quality Project - Calibrated Version
 * Date: 2025
 * Firmware: v5.2.2 - Fixed HTTPS with Insecure Mode
 */


#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include "Arduino_LED_Matrix.h"  // LED Matrix library for R4 WiFi


// ===========================
// CONFIGURATION
// ===========================


// WiFi Credentials
#define WIFI_SSID "Yuzon Only"
#define WIFI_PASSWORD "Pldtadmin@2024"


// API Server Configuration - BACK TO HTTPS
#define API_SERVER "puretrack-api.onrender.com"  // Server hostname (no http:// or https://)
#define API_PORT 443  // HTTPS port (Render requires HTTPS)
#define API_ENDPOINT "/api/v1/devices/readings"
#define API_KEY "6a8d48a00823c869ad23c27cc34a3d446493cf35d6924d8f9d54e17c4565737a"  // Must match DEVICE_API_KEY in server .env


// Device Configuration
#define DEVICE_ID "arduino_uno_r4_002"
#define DEVICE_NAME "Water Quality Monitor R4 Calibrated"
#define DEVICE_TYPE "Arduino UNO R4 WiFi"
#define FIRMWARE_VERSION "5.2.2"


// Sensor Pin Configuration
#define TDS_PIN A0          // TDS Sensor
#define PH_PIN A1           // pH Sensor
#define TURBIDITY_PIN A2    // Turbidity Sensor


// Timing Configuration - Real-time Monitoring (Optimized)
#define SENSOR_READ_INTERVAL 2000    // Read sensors every 2 seconds (real-time)
#define HTTP_PUBLISH_INTERVAL 2000   // Publish every 2 seconds (real-time)
#define HTTP_TIMEOUT 15000           // 15 second timeout for HTTPS requests (longer for SSL handshake)
#define REGISTRATION_INTERVAL 5000   // Send registration request every 5 seconds when unregistered
#define SSE_RECONNECT_INTERVAL 10000 // Reconnect to SSE every 10 seconds if disconnected


// ===========================
// ADVANCED CALIBRATION DATA
// ===========================


// TDS Calibration data: ADC readings -> PPM measured values
const int CALIB_COUNT = 4;
const int calibADC[CALIB_COUNT] = {105, 116, 224, 250};
const float calibPPM[CALIB_COUNT] = {236.0, 278.0, 1220.0, 1506.0};


// pH calibration data
const int PH_CALIB_COUNT = 3;
const int phCalibADC[PH_CALIB_COUNT] = {482, 503, 532};
const float phCalibPH[PH_CALIB_COUNT] = {9.81, 6.81, 4.16};


// TDS Calibration correction factor
const float TDS_CALIBRATION_FACTOR = 0.589;  // Fine-tuned for accuracy
const float TDS_OFFSET = 0.0;                 // Additional offset if needed


// ===========================
// SMA SMOOTHING BUFFERS
// ===========================


// TDS smoothing / moving average
const int SMA_SIZE = 8; // number of readings to average
int smaBuffer[SMA_SIZE];
int smaIndex = 0;
long smaSum = 0;
int smaCount = 0;


// Turbidity smoothing (separate from TDS SMA)
const int TURB_SMA_SIZE = 5; // lightweight smoothing for turbidity
int turbBuffer[TURB_SMA_SIZE];
int turbIndex = 0;
long turbSum = 0;
int turbCount = 0;


// pH smoothing
const int PH_SMA_SIZE = 5; // lightweight smoothing for pH
int phBuffer[PH_SMA_SIZE];
int phIndex = 0;
long phSum = 0;
int phCount = 0;


// Precomputed linear fit fallback (slope/intercept). Calculated in setup().
float fitSlope = 0.0;
float fitIntercept = 0.0;


// ===========================
// GLOBAL OBJECTS - SSL CLIENT
// ===========================


WiFiSSLClient wifiClient;  // SSL Client for HTTPS
HttpClient httpClient = HttpClient(wifiClient, API_SERVER, API_PORT);
WiFiSSLClient sseClient;   // Separate SSL Client for SSE connection
ArduinoLEDMatrix matrix;   // LED Matrix object for 12x8 display


// ===========================
// GLOBAL VARIABLES
// ===========================


unsigned long lastSensorRead = 0;
unsigned long lastHttpPublish = 0;
unsigned long lastRegistrationAttempt = 0;
unsigned long lastSSEReconnect = 0;
unsigned long sensorReadStartTime = 0;


// Device registration state
bool isRegistered = false;         // Device registration status
bool isApproved = false;           // Admin approval status (received "go" command)
bool sseConnected = false;         // SSE connection status
String sseBuffer = "";             // Buffer for SSE data parsing


// Sensor readings (calibrated values)
float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;


bool serverConnected = false;
int consecutiveFailures = 0;  // Track connection failures
const int MAX_FAILURES = 3;   // Reconnect after 3 failures


// LED Matrix State Machine
enum MatrixState {
  CONNECTING,      // WiFi search animation
  IDLE,            // Cloud WiFi icon (static)
  HEARTBEAT        // ECG heartbeat line animation
};


MatrixState matrixState = CONNECTING;
MatrixState previousState = CONNECTING;


// ===========================
// SETUP FUNCTION
// ===========================


void setup() {
  // Initialize Serial communication at 115200 baud (faster for calibrated output)
  Serial.begin(115200);
  while (!Serial && millis() < 3000); // Wait up to 3 seconds for Serial
  
  Serial.println("=== Arduino UNO R4 Calibrated Water Quality Monitor ===");
  Serial.println("Firmware: v5.2.2 - Fixed HTTPS with Insecure Mode");
  Serial.println("Initializing LED Matrix...");
  
  // Initialize LED Matrix
  matrix.begin();
  
  // Test LED Matrix - show startup animation
  Serial.println("Playing startup animation...");
  matrix.loadSequence(LEDMATRIX_ANIMATION_STARTUP);
  matrix.play(false);  // Play once
  
  // Wait for startup animation to complete
  while (!matrix.sequenceDone()) {
    delay(50);
  }
  
  Serial.println("LED Matrix initialized!");
  
  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);
  
  // Initialize SMA buffers
  for (int i = 0; i < SMA_SIZE; i++) {
    smaBuffer[i] = 0;
  }
  for (int i = 0; i < PH_SMA_SIZE; i++) {
    phBuffer[i] = 0;
  }
  for (int i = 0; i < TURB_SMA_SIZE; i++) {
    turbBuffer[i] = 0;
  }
  
  // Compute linear regression slope/intercept as fallback for TDS
  float meanX = 0.0;
  float meanY = 0.0;
  for (int i = 0; i < CALIB_COUNT; ++i) {
    meanX += (float)calibADC[i];
    meanY += calibPPM[i];
  }
  meanX /= CALIB_COUNT;
  meanY /= CALIB_COUNT;
  float num = 0.0;
  float den = 0.0;
  for (int i = 0; i < CALIB_COUNT; ++i) {
    float dx = (float)calibADC[i] - meanX;
    float dy = calibPPM[i] - meanY;
    num += dx * dy;
    den += dx * dx;
  }
  if (den != 0.0) {
    fitSlope = num / den;
    fitIntercept = meanY - fitSlope * meanX;
  }


  // Print calibration parameters for debugging/verification
  Serial.println("=== CALIBRATION PARAMETERS ===");
  Serial.print("TDS Linear fit: slope=");
  Serial.print(fitSlope, 4);
  Serial.print(" intercept=");
  Serial.println(fitIntercept, 2);
  Serial.print("TDS Calibration factor: ");
  Serial.println(TDS_CALIBRATION_FACTOR, 3);
  Serial.println("================================");
  
  // Set HTTP timeout (longer for SSL handshake)
  httpClient.setTimeout(HTTP_TIMEOUT);
  Serial.print("HTTPS timeout set to: ");
  Serial.print(HTTP_TIMEOUT / 1000);
  Serial.println(" seconds");
  
  // Start with connecting state - WiFi Search animation
  matrixState = CONNECTING;
  previousState = CONNECTING;
  matrix.loadSequence(LEDMATRIX_ANIMATION_WIFI_SEARCH);
  matrix.play(true);  // Loop while connecting
  
  Serial.println("Connecting to WiFi...");
  connectWiFi();
  
  Serial.println("Testing server connection...");
  testServerConnection();
  
  // Switch to idle state after connection - Cloud WiFi icon
  if (serverConnected) {
    Serial.println("✓ Server Connected! Switching to IDLE state (Cloud WiFi).");
    matrixState = IDLE;
    matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);  // Static cloud WiFi icon
  } else {
    Serial.println("✗ Server Connection Failed! Staying in CONNECTING state.");
  }
  
  Serial.println("Setup complete. Starting main loop...");
  Serial.println("Advanced calibration active - piecewise linear interpolation + SMA smoothing");
  Serial.println("ECG heartbeat animation will trigger every 2 seconds during sensor readings.");
  Serial.println("Using HTTPS (port 443) - SSL certificate verification disabled for compatibility");
  Serial.println();
  Serial.println("=== DEVICE REGISTRATION SYSTEM ===");
  Serial.println("Device will enter registration mode until approved by admin");
  Serial.println("Waiting for 'go' command from server via SSE...");
  
  // Attempt initial SSE connection
  connectSSE();
}


// ===========================
// MAIN LOOP
// ===========================


void loop() {
  unsigned long currentMillis = millis();
  
  // Update LED Matrix state
  updateMatrixState();
  
  // Check WiFi connection with improved handling
  if (WiFi.status() != WL_CONNECTED) {
    serverConnected = false;
    consecutiveFailures++;
    
    if (matrixState != CONNECTING) {
      Serial.println("WiFi disconnected! Switching to CONNECTING state.");
      matrixState = CONNECTING;
      matrix.loadSequence(LEDMATRIX_ANIMATION_WIFI_SEARCH);
      matrix.play(true);
    }
    
    connectWiFi();
    
    // Reset failure counter on successful WiFi connection
    if (WiFi.status() == WL_CONNECTED) {
      consecutiveFailures = 0;
      sseConnected = false; // Force SSE reconnection
    }
  }
  
  // Handle SSE connection and message processing
  if (sseConnected) {
    processSSEMessages();
  } else {
    // Try to reconnect to SSE
    if (currentMillis - lastSSEReconnect >= SSE_RECONNECT_INTERVAL) {
      lastSSEReconnect = currentMillis;
      connectSSE();
    }
  }
  
  // Device behavior depends on registration status
  if (!isApproved) {
    // REGISTRATION MODE: Send registration requests until approved
    if (currentMillis - lastRegistrationAttempt >= REGISTRATION_INTERVAL) {
      lastRegistrationAttempt = currentMillis;
      sendRegistrationRequest();
    }
  } else {
    // ACTIVE MODE: Device is approved, can read sensors and publish data
    if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
      lastSensorRead = currentMillis;
      
      Serial.println("--- Reading Sensors (Calibrated) ---");
      
      // Switch to heartbeat animation during sensing
      if (matrixState == IDLE) {
        Serial.println("💓 Triggering ECG heartbeat animation...");
        matrixState = HEARTBEAT;
        sensorReadStartTime = currentMillis;
        matrix.loadSequence(LEDMATRIX_ANIMATION_HEARTBEAT_LINE);
        matrix.play(false);  // Play once, don't loop
      }
      
      readSensors();  // This now handles all detailed logging with calibrated values
      
      publishSensorData();
      
      if (serverConnected) {
        Serial.println("✓ Calibrated data published to server!");
        consecutiveFailures = 0;  // Reset on success
      } else {
        Serial.println("✗ Server not connected, calibrated data not published.");
        consecutiveFailures++;
        
        // Retry server connection after multiple failures
        if (consecutiveFailures >= MAX_FAILURES) {
          Serial.println("Multiple failures detected. Retesting server connection...");
          testServerConnection();
          consecutiveFailures = 0;
        }
      }
    }
  }
  
  delay(10);  // Minimal delay for stability
}


// ===========================
// LED MATRIX STATE MANAGEMENT
// ===========================


void updateMatrixState() {
  // Check if heartbeat animation is complete
  if (matrixState == HEARTBEAT && matrix.sequenceDone()) {
    Serial.println("🌊 Heartbeat complete. Returning to IDLE state.");
    matrixState = IDLE;
    matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);  // Back to cloud WiFi icon
  }
  
  // Handle state transitions
  if (matrixState != previousState) {
    previousState = matrixState;
    
    // Debug output
    Serial.print("🖥️  Matrix State Changed: ");
    if (matrixState == CONNECTING) {
      Serial.println("CONNECTING (WiFi Search)");
    } else if (matrixState == IDLE) {
      Serial.println("IDLE (Cloud WiFi Icon)");
    } else if (matrixState == HEARTBEAT) {
      Serial.println("HEARTBEAT (ECG Line)");
    }
  }
}


// ===========================
// WiFi FUNCTIONS
// ===========================


void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  // Disconnect first to ensure clean connection
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
    Serial.println("\n✗ WiFi connection failed!");
    Serial.println("Retrying WiFi connection in 5 seconds...");
    delay(5000);
    connectWiFi();  // Recursive retry
  } else {
    Serial.println("\n✓ WiFi connected!");
    
    // Wait for valid IP address (not 0.0.0.0)
    attempts = 0;
    while (WiFi.localIP() == IPAddress(0, 0, 0, 0) && attempts < 20) {
      Serial.print(".");
      delay(500);
      attempts++;
    }
    
    IPAddress ip = WiFi.localIP();
    if (ip == IPAddress(0, 0, 0, 0)) {
      Serial.println("\n✗ Failed to obtain IP address!");
      Serial.println("Retrying WiFi connection...");
      delay(2000);
      connectWiFi();  // Recursive retry
    } else {
      Serial.print("IP address: ");
      Serial.println(ip);
      Serial.print("Signal strength (RSSI): ");
      Serial.print(WiFi.RSSI());
      Serial.println(" dBm");
    }
  }
}


// ===========================
// SERVER CONNECTION FUNCTIONS
// ===========================


void testServerConnection() {
  Serial.print("Testing connection to: https://");
  Serial.println(API_SERVER);
  Serial.println("Sending GET request to /health endpoint...");
  
  // Stop any existing connection
  httpClient.stop();
  delay(100);
  
  httpClient.beginRequest();
  httpClient.get("/health");
  httpClient.sendHeader("Host", API_SERVER);
  httpClient.sendHeader("User-Agent", "Arduino-UNO-R4/5.2.2");
  httpClient.sendHeader("Connection", "close");
  httpClient.endRequest();
  
  Serial.println("Request sent, waiting for response...");
  
  int statusCode = httpClient.responseStatusCode();
  String response = httpClient.responseBody();
  
  Serial.print("Health check status code: ");
  Serial.println(statusCode);
  
  if (statusCode == 200) {
    serverConnected = true;
    Serial.print("✓ Server responded with status code: ");
    Serial.println(statusCode);
    Serial.print("Response (first 200 chars): ");
    Serial.println(response.substring(0, min(200, (int)response.length())));
    
    // Switch to IDLE state if we were connecting
    if (matrixState == CONNECTING) {
      matrixState = IDLE;
      matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);
    }
  } else {
    serverConnected = false;
    Serial.print("✗ Server connection failed with status: ");
    Serial.println(statusCode);
    Serial.print("Response: ");
    Serial.println(response);
    
    if (statusCode == 301 || statusCode == 307 || statusCode == 308) {
      Serial.println("⚠️  Server is redirecting HTTP to HTTPS");
      Serial.println("   This is normal - the Arduino will use HTTPS");
    }
  }
  
  // Clean up connection
  httpClient.stop();
}


// ===========================
// ADVANCED CALIBRATION FUNCTIONS
// ===========================


float adcToPPM(int adc) {
  if (CALIB_COUNT <= 0) return 0.0;

  for (int i = 0; i < CALIB_COUNT; ++i) {
    if (adc == calibADC[i]) return calibPPM[i];
  }

  for (int i = 0; i < CALIB_COUNT - 1; ++i) {
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

  for (int i = 0; i < PH_CALIB_COUNT; ++i) {
    if (adc == phCalibADC[i]) return phCalibPH[i];
  }

  for (int i = 0; i < PH_CALIB_COUNT - 1; ++i) {
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
  if (ntu < 0) ntu = 0;
  return ntu;
}


String getTurbidityStatus(float ntu) {
  if (ntu < 35.0) return "Very Clean";
  return "Very Cloudy";
}


// ===========================
// SENSOR READING FUNCTIONS
// ===========================


void readSensors() {
  int value0 = analogRead(TDS_PIN);
  int value1 = analogRead(PH_PIN);
  int value2 = analogRead(TURBIDITY_PIN);

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

  Serial.print("A0(raw): ");
  Serial.print(value0);
  Serial.print(" | A0(avg): ");
  Serial.print(averagedADC);
  Serial.print(" | V: ");
  Serial.print(voltage, 3);
  Serial.print(" | TDS (ppm): ");
  Serial.println(calibratedPPM, 1);

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
  Serial.print(" | Turbidity (NTU): ");
  Serial.print(ntu, 2);
  Serial.print(" | Status: ");
  Serial.println(getTurbidityStatus(ntu));
}


// ===========================
// HTTP PUBLISH FUNCTIONS
// ===========================


void publishSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected, skipping publish");
    return;
  }
  
  httpClient.stop();
  delay(100);
  
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["tds"] = tds;
  doc["pH"] = ph;
  doc["turbidity"] = turbidity;
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("--- Sending JSON Payload ---");
  Serial.println(payload);
  Serial.println("----------------------------");
  
  httpClient.beginRequest();
  httpClient.post(API_ENDPOINT);
  httpClient.sendHeader("Host", API_SERVER);
  httpClient.sendHeader("Content-Type", "application/json");
  httpClient.sendHeader("x-api-key", API_KEY);
  httpClient.sendHeader("User-Agent", "Arduino-UNO-R4/5.2.2");
  httpClient.sendHeader("Content-Length", payload.length());
  httpClient.sendHeader("Connection", "close");
  httpClient.beginBody();
  httpClient.print(payload);
  httpClient.endRequest();
  
  Serial.println("Waiting for server response...");
  
  int statusCode = httpClient.responseStatusCode();
  String response = httpClient.responseBody();
  
  Serial.print("Server Status Code: ");
  Serial.println(statusCode);
  
  if (statusCode == 200 || statusCode == 201) {
    serverConnected = true;
    Serial.println("✓ HTTP POST successful!");
    Serial.print("Response: ");
    Serial.println(response);
  } else if (statusCode > 0) {
    serverConnected = false;
    Serial.print("✗ HTTP POST failed with status: ");
    Serial.println(statusCode);
    Serial.print("Error response: ");
    Serial.println(response);
  } else {
    serverConnected = false;
    Serial.println("✗ No response from server (timeout or connection error)");
  }
  
  httpClient.stop();
}


// ===========================
// DEVICE REGISTRATION FUNCTIONS
// ===========================


/**
 * Send registration request to server
 */
void sendRegistrationRequest() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected, skipping registration request");
    return;
  }
  
  Serial.println("--- Sending Registration Request ---");
  
  httpClient.stop();
  delay(100);
  
  StaticJsonDocument<384> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["type"] = DEVICE_TYPE;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  char mac[18];
  uint8_t macRaw[6];
  WiFi.macAddress(macRaw);
  snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X", macRaw[0], macRaw[1], macRaw[2], macRaw[3], macRaw[4], macRaw[5]);
  doc["macAddress"] = mac;
  doc["ipAddress"] = WiFi.localIP().toString();
  
  JsonArray sensorsArray = doc.createNestedArray("sensors");
  sensorsArray.add("pH");
  sensorsArray.add("turbidity");
  sensorsArray.add("tds");
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println(payload);
  
  httpClient.beginRequest();
  httpClient.post("/api/v1/devices/register");
  httpClient.sendHeader("Host", API_SERVER);
  httpClient.sendHeader("Content-Type", "application/json");
  httpClient.sendHeader("x-api-key", API_KEY);
  httpClient.sendHeader("User-Agent", "Arduino-UNO-R4/5.2.2");
  httpClient.sendHeader("Content-Length", payload.length());
  httpClient.sendHeader("Connection", "close");
  httpClient.beginBody();
  httpClient.print(payload);
  httpClient.endRequest();
  
  int statusCode = httpClient.responseStatusCode();
  String response = httpClient.responseBody();
  
  Serial.print("Registration Status Code: ");
  Serial.println(statusCode);
  
  if (statusCode == 200 || statusCode == 201) {
    Serial.println("✓ Registration request sent successfully!");
    Serial.print("Response: ");
    Serial.println(response);
    
    // Parse response to check if approved
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error) {
      bool registered = responseDoc["data"]["isRegistered"] | false;
      String command = responseDoc["data"]["command"] | "";
      
      if (registered && command == "go") {
        Serial.println("🎉 Device APPROVED! Switching to active mode...");
        isRegistered = true;
        isApproved = true;
      } else {
        Serial.println("⏳ Registration pending admin approval...");
        isRegistered = true;
        isApproved = false;
      }
    }
  } else {
    Serial.print("✗ Registration request failed with status: ");
    Serial.println(statusCode);
  }
  
  httpClient.stop();
  Serial.println("------------------------------------");
}


/**
 * Connect to SSE endpoint to receive commands
 */
void connectSSE() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected, cannot connect SSE");
    return;
  }
  
  if (sseConnected) {
    Serial.println("SSE already connected");
    return;
  }
  
  Serial.println("--- Connecting to SSE ---");
  
  // Close any existing connection
  sseClient.stop();
  delay(500);
  
  // Connect to server
  if (!sseClient.connect(API_SERVER, API_PORT)) {
    Serial.println("✗ SSE connection failed");
    sseConnected = false;
    return;
  }
  
  // Send GET request for SSE endpoint
  String sseEndpoint = "/sse/" + String(DEVICE_ID);
  
  sseClient.println("GET " + sseEndpoint + " HTTP/1.1");
  sseClient.println("Host: " + String(API_SERVER));
  sseClient.println("x-api-key: " + String(API_KEY));
  sseClient.println("Accept: text/event-stream");
  sseClient.println("Cache-Control: no-cache");
  sseClient.println("Connection: keep-alive");
  sseClient.println();
  
  // Wait for response headers
  unsigned long timeout = millis() + 10000;
  while (sseClient.available() == 0 && millis() < timeout) {
    delay(100);
  }
  
  if (sseClient.available() == 0) {
    Serial.println("✗ SSE connection timeout");
    sseClient.stop();
    sseConnected = false;
    return;
  }
  
  // Read and verify response headers
  bool headersValid = false;
  while (sseClient.available()) {
    String line = sseClient.readStringUntil('\n');
    Serial.println("SSE Header: " + line);
    
    if (line.indexOf("text/event-stream") >= 0) {
      headersValid = true;
    }
    
    if (line == "\r" || line.length() == 0) {
      break; // End of headers
    }
  }
  
  if (headersValid) {
    Serial.println("✓ SSE connection established!");
    sseConnected = true;
    sseBuffer = "";
  } else {
    Serial.println("✗ Invalid SSE response");
    sseClient.stop();
    sseConnected = false;
  }
  
  Serial.println("-------------------------");
}


/**
 * Process incoming SSE messages
 */
void processSSEMessages() {
  if (!sseConnected || !sseClient.connected()) {
    Serial.println("SSE disconnected");
    sseConnected = false;
    sseClient.stop();
    return;
  }
  
  while (sseClient.available()) {
    char c = sseClient.read();
    
    if (c == '\n') {
      // Process complete line
      if (sseBuffer.startsWith("event: ")) {
        String eventType = sseBuffer.substring(7);
        eventType.trim();
        Serial.println("SSE Event: " + eventType);
      } 
      else if (sseBuffer.startsWith("data: ")) {
        String eventData = sseBuffer.substring(6);
        eventData.trim();
        Serial.println("SSE Data: " + eventData);
        
        // Parse JSON data
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, eventData);
        
        if (!error) {
          String command = doc["command"] | "";
          
          if (command == "go") {
            Serial.println("🎉 Received 'GO' command! Device approved!");
            Serial.println("Switching to ACTIVE mode - will start collecting sensor data");
            isRegistered = true;
            isApproved = true;
          } 
          else if (command == "deregister") {
            Serial.println("⚠️ Received 'DEREGISTER' command!");
            Serial.println("Device removed from system. Returning to registration mode...");
            isRegistered = false;
            isApproved = false;
            // Stop sending sensor data, go back to registration mode
          }
          else if (command == "wait") {
            Serial.println("⏳ Received 'WAIT' command - registration pending");
            isRegistered = true;
            isApproved = false;
          }
          else if (command == "update") {
            Serial.println("🔄 Received 'UPDATE' command");
            // Handle configuration updates if needed
          }
        }
      }
      
      sseBuffer = "";
    } else {
      sseBuffer += c;
    }
  }
}
