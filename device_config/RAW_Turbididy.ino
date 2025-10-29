/*
 * ============================================================================
 * TURBIDITY SENSOR - STANDALONE
 * ============================================================================
 * Hardware: Arduino UNO R4 WiFi + ADS1115 16-bit ADC
 * Sensor: Turbidity Sensor (NTU)
 * 
 * ADS1115 Configuration:
 *   Channel A2 → Turbidity Sensor
 * 
 * WHO Water Quality Standards:
 *   < 0.5 NTU: Excellent (Safe for drinking)
 *   < 1.0 NTU: Good (Safe for drinking - WHO standard)
 *   < 3.0 NTU: Acceptable (Treatment recommended)
 *   < 5.0 NTU: Poor (Treatment required)
 *   ≥ 5.0 NTU: Unacceptable (Not safe)
 * 
 * Calibration:
 *   Clear Water: ADC ~5340-5350 = 0 NTU
 *   Turbid Water: ADC ~5150 = 2 NTU (adjust based on testing)
 * 
 * Note: Using GAIN_TWO (±2.048V) for better resolution
 * 
 * Author: IoT Water Quality Project
 * Version: 1.0.0
 * Date: October 2025
 * ============================================================================
 */

// ============================================================================
// LIBRARY INCLUDES
// ============================================================================
#include <Wire.h>
#include <Adafruit_ADS1X15.h>

// ============================================================================
// HARDWARE CONFIGURATION
// ============================================================================
#define ADS_TURBIDITY_CHANNEL     2    // A2

// ADS1115 Settings
#define ADS_SAMPLES               50   // Averaging samples
#define ADS_SAMPLE_DELAY          2    // Delay between samples (ms)
#define ADS_VREF                  4.096f
#define ADS_MAX                   32767.0f

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================
#define SENSOR_READ_INTERVAL      125    // Sensor read interval (ms)

// ============================================================================
// WHO WATER QUALITY THRESHOLDS
// ============================================================================
// Turbidity Standards (NTU)
#define TURBIDITY_EXCELLENT       0.5f
#define TURBIDITY_GOOD            1.0f
#define TURBIDITY_ACCEPTABLE      3.0f
#define TURBIDITY_POOR            5.0f

// Turbidity 16-bit ADC Thresholds (Calibrated for GAIN_TWO)
// Based on actual sensor readings: Clear water ~5340-5350
#define TURB_ADC_EXCELLENT        5350L   // Clear water (0 NTU)
#define TURB_ADC_VERY_CLEAR       5300L   // Very clear (0.3 NTU)
#define TURB_ADC_CLEAR            5250L   // Clear (0.8 NTU)
#define TURB_ADC_SLIGHTLY_TURBID  5200L   // Slightly turbid (1.5 NTU)
#define TURB_ADC_NOTICEABLE       5150L   // Noticeable (2.5 NTU)
#define TURB_ADC_MODERATE         5000L   // Moderate (3.5 NTU)
#define TURB_ADC_HIGH             4800L   // High (4.5 NTU)
#define TURB_ADC_VERY_HIGH        4500L   // Very high (5.0 NTU)

// ============================================================================
// DATA STRUCTURES
// ============================================================================

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

// ============================================================================
// GLOBAL OBJECTS
// ============================================================================
Adafruit_ADS1115 ads;

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================
TurbiditySmoothingFilter turbidityFilter;
unsigned long lastSensorRead = 0;
float turbidityNTU = 0.0f;
long turbidityRawADC = 0;

// ============================================================================
// ARDUINO SETUP
// ============================================================================
void setup() {
  initializeSerial();
  initializeHardware();
  turbidityFilter.init();
  
  Serial.println(F("\n✓ Setup complete - System ready\n"));
}

// ============================================================================
// ARDUINO MAIN LOOP
// ============================================================================
void loop() {
  unsigned long currentMillis = millis();
  
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = currentMillis;
    readTurbiditySensor();
    printTurbidityReading();
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
  Serial.println(F("  Turbidity Sensor - WHO Standards"));
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
  
  ads.setGain(GAIN_TWO);
  
  Serial.println(F("✓ ADS1115 initialized"));
  Serial.println(F("✓ Gain set to ±2.048V"));
  Serial.println(F("\n--- Channel Configuration ---"));
  Serial.println(F("  A2 → Turbidity Sensor"));
  Serial.println(F("-----------------------------\n"));
}

// ============================================================================
// ADS1115 ADC READING FUNCTION
// ============================================================================

int16_t readADSRaw16bit(uint8_t channel) {
  long sum = 0;
  
  for (int i = 0; i < ADS_SAMPLES; i++) {
    sum += ads.readADC_SingleEnded(channel);
    delay(ADS_SAMPLE_DELAY);
  }
  
  return (int16_t)(sum / ADS_SAMPLES);
}

// ============================================================================
// TURBIDITY SENSOR FUNCTIONS
// ============================================================================

void readTurbiditySensor() {
  int16_t rawADC = readADSRaw16bit(ADS_TURBIDITY_CHANNEL);
  
  // Apply smoothing filter
  long smoothedADC = turbidityFilter.update(rawADC);
  turbidityRawADC = smoothedADC;
  
  // Convert to NTU using WHO calibration
  turbidityNTU = convertADCtoNTU(smoothedADC);
  
  // Constrain to valid range
  turbidityNTU = constrain(turbidityNTU, 0.0f, 5.0f);
}

float convertADCtoNTU(long adcValue) {
  if (adcValue >= TURB_ADC_EXCELLENT) {
    return 0.0f;
  } 
  else if (adcValue >= TURB_ADC_VERY_CLEAR) {
    return map(adcValue, TURB_ADC_VERY_CLEAR, TURB_ADC_EXCELLENT, 30, 0) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_CLEAR) {
    return map(adcValue, TURB_ADC_CLEAR, TURB_ADC_VERY_CLEAR, 80, 30) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_SLIGHTLY_TURBID) {
    return map(adcValue, TURB_ADC_SLIGHTLY_TURBID, TURB_ADC_CLEAR, 150, 80) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_NOTICEABLE) {
    return map(adcValue, TURB_ADC_NOTICEABLE, TURB_ADC_SLIGHTLY_TURBID, 250, 150) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_MODERATE) {
    return map(adcValue, TURB_ADC_MODERATE, TURB_ADC_NOTICEABLE, 350, 250) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_HIGH) {
    return map(adcValue, TURB_ADC_HIGH, TURB_ADC_MODERATE, 450, 350) / 100.0f;
  } 
  else if (adcValue >= TURB_ADC_VERY_HIGH) {
    return map(adcValue, TURB_ADC_VERY_HIGH, TURB_ADC_HIGH, 500, 450) / 100.0f;
  } 
  else {
    return 5.0f;
  }
}

String getTurbidityStatus(float ntu) {
  if (ntu < TURBIDITY_EXCELLENT) {
    return "EXCELLENT - Safe for drinking ✓✓";
  } else if (ntu < TURBIDITY_GOOD) {
    return "GOOD - Safe for drinking ✓";
  } else if (ntu < TURBIDITY_ACCEPTABLE) {
    return "ACCEPTABLE - Treatment recommended ⚠";
  } else if (ntu < TURBIDITY_POOR) {
    return "POOR - Treatment required ⚠⚠";
  } else {
    return "UNACCEPTABLE - Not safe ✗✗✗";
  }
}

// ============================================================================
// DISPLAY FUNCTION
// ============================================================================

void printTurbidityReading() {
  Serial.println(F("\n========== Turbidity Reading =========="));
  
  Serial.print(F("NTU:    "));
  Serial.print(turbidityNTU, 2);
  Serial.println(F(" NTU"));
  
  Serial.print(F("Status: "));
  Serial.println(getTurbidityStatus(turbidityNTU));
  
  Serial.print(F("Raw ADC: "));
  Serial.println(turbidityRawADC);
  
  Serial.println(F("=======================================\n"));
}
