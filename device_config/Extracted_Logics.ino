/*
 * EXTRACTED SENSOR LOGICS - PURE CALIBRATION LOGIC
 * Water Quality Monitoring System - Sensor Reading and Calibration Logic
 *
 * This file contains ONLY the sensor reading logic for recalibration purposes.
 * Pure functions and data - no WiFi, NTP, or Arduino framework dependencies.
 *
 * For integration: Include this file in your main sketch or copy the functions.
 */

#include <avr/pgmspace.h>  // For PROGMEM support

// Sensor Pin Configuration
#define TDS_PIN A0
#define PH_PIN A0
#define TURBIDITY_PIN A2

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
// SMA SMOOTHING BUFFERS
// ===========================

const int SMA_SIZE = 5;
int smaBuffer[SMA_SIZE];
int smaIndex = 0;
long smaSum = 0;
int smaCount = 0;

const int TURB_SMA_SIZE = 3;
int turbBuffer[TURB_SMA_SIZE];
int turbIndex = 0;
long turbSum = 0;
int turbCount = 0;

const int PH_SMA_SIZE = 3;
int phBuffer[PH_SMA_SIZE];
int phIndex = 0;
long phSum = 0;
int phCount = 0;

float fitSlope = 0.0;
float fitIntercept = 0.0;

float phFitSlope = 0.0;
float phFitIntercept = 0.0;

// ===========================
// GLOBAL SENSOR VARIABLES
// ===========================

float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;

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
// ARDUINO FUNCTIONS FOR STANDALONE COMPILATION
// ===========================

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println(F("=== SENSOR CALIBRATION LOGIC TEST ==="));
  Serial.println(F("Pure sensor reading functions"));
  Serial.println(F("Ready for calibration testing..."));

  // Initialize sensor pins
  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);

  // Compute TDS calibration parameters
  computeCalibrationParams();
  computePHCalibrationParams();
  printCalibrationInfo();
}

void loop() {
  static unsigned long lastRead = 0;
  unsigned long currentMillis = millis();

  // Read sensors every 1 second for calibration testing
  if (currentMillis - lastRead >= 1000) {
    lastRead = currentMillis;
    readSensors();
  }
}
