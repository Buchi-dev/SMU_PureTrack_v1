/*
 * Water Quality Sensor Logic Extraction
 * Arduino UNO R4 WiFi
 * Sensors: TDS (A0), pH (A1), Turbidity (A2)
 * 
 * Outputs:
 *   - tdsVoltage (V)
 *   - phVoltage (V)
 *   - turbidityADC (10-bit raw, smoothed)
 * 
 * No WiFi, No MQTT, No LED Matrix
 * Pure sensor reading module
 */

#define TDS_PIN A0
#define PH_PIN A1
#define TURBIDITY_PIN A2

// ===== ADC + Sampling Config =====
const int SENSOR_SAMPLES = 50;
const float ADC_MAX = 16383.0;    // UNO R4 = 14-bit
const float VREF = 5.0;

// ===== TDS Calibration Constants =====
const float TDS_TEMP_COEFFICIENT = 0.02;  // Temperature compensation coefficient
const float TDS_REF_TEMP = 25.0;          // Reference temperature (°C)
const float DEFAULT_TEMP = 25.0;          // Default temperature if no sensor

// ===== Custom TDS Calibration Points (Based on Real Measurements) =====
// Calibration data: [sensorPPM, actualPPM]
// Sample 1: 178 ppm (sensor) → 288 ppm (actual)
// Sample 2: 700 ppm (sensor) → 838 ppm (actual)
// Sample 3: 800 ppm (sensor) → 922 ppm (actual)
const int NUM_CAL_POINTS = 4;
const float calSensorPPM[NUM_CAL_POINTS] = {16.5, 178.0, 700.0, 800.0};
const float calActualPPM[NUM_CAL_POINTS] = {16.5, 288.0, 838.0, 922.0};

// ===== Turbidity Smoothing =====
const int TURBIDITY_NUM_READINGS = 5;
int turbidityReadings[TURBIDITY_NUM_READINGS];
int turbidityIndex = 0;
long turbidityTotal = 0;

// ===== SENSOR VARIABLES =====
float tdsVoltage = 0.0;
float tdsPPM = 0.0;
float phVoltage = 0.0;
int turbidityADC = 0;

// ======================================
// Helper: Analog Averaging (optimized)
// ======================================
float readAnalogAverage(uint8_t pin) {
  long sum = 0;

  for (int i = 0; i < SENSOR_SAMPLES; i++) {
    sum += analogRead(pin);
    delayMicroseconds(800);
  }

  return (sum / (float)SENSOR_SAMPLES / ADC_MAX) * VREF;
}

// ======================================
// TDS Voltage (raw)
// ======================================
float readTDS() {
  return readAnalogAverage(TDS_PIN);
}

// ======================================
// TDS Raw PPM from Voltage (Standard Formula)
// ======================================
float calculateRawTDS(float voltage, float temperature = DEFAULT_TEMP) {
  // Temperature compensation
  float compensationCoefficient = 1.0 + TDS_TEMP_COEFFICIENT * (temperature - TDS_REF_TEMP);
  float compensatedVoltage = voltage / compensationCoefficient;
  
  // TDS calculation using polynomial curve fitting
  // Formula: TDS = (133.42 * V^3 - 255.86 * V^2 + 857.39 * V) * 0.5
  float tdsValue = (133.42 * pow(compensatedVoltage, 3) 
                    - 255.86 * pow(compensatedVoltage, 2) 
                    + 857.39 * compensatedVoltage) * 0.5;
  
  return tdsValue;
}

// ======================================
// TDS Calibration Mapping (Linear Interpolation)
// ======================================
float calibrateTDS(float rawPPM) {
  // Handle edge cases
  if (rawPPM <= calSensorPPM[0]) {
    return rawPPM; // Below minimum calibration point
  }
  if (rawPPM >= calSensorPPM[NUM_CAL_POINTS - 1]) {
    // Extrapolate beyond max calibration point using last slope
    int lastIdx = NUM_CAL_POINTS - 1;
    float slope = (calActualPPM[lastIdx] - calActualPPM[lastIdx - 1]) / 
                  (calSensorPPM[lastIdx] - calSensorPPM[lastIdx - 1]);
    return calActualPPM[lastIdx] + slope * (rawPPM - calSensorPPM[lastIdx]);
  }
  
  // Find interpolation range
  for (int i = 0; i < NUM_CAL_POINTS - 1; i++) {
    if (rawPPM >= calSensorPPM[i] && rawPPM <= calSensorPPM[i + 1]) {
      // Linear interpolation between calibration points
      float slope = (calActualPPM[i + 1] - calActualPPM[i]) / 
                    (calSensorPPM[i + 1] - calSensorPPM[i]);
      return calActualPPM[i] + slope * (rawPPM - calSensorPPM[i]);
    }
  }
  
  return rawPPM; // Fallback (should never reach here)
}

// ======================================
// TDS PPM Calculation with Custom Calibration
// ======================================
float calculateTDS(float voltage, float temperature = DEFAULT_TEMP) {
  float rawPPM = calculateRawTDS(voltage, temperature);
  float calibratedPPM = calibrateTDS(rawPPM);
  return calibratedPPM;
}

// ======================================
// pH Voltage (raw)
// ======================================
float readPH() {
  return readAnalogAverage(PH_PIN);
}

// ======================================
// Turbidity Raw ADC + smoothing
// ======================================
int readTurbidity() {
  int rawADC = analogRead(TURBIDITY_PIN);

  // Convert 14-bit ADC → 10-bit equivalent
  int adc10bit = rawADC / 16;

  turbidityTotal -= turbidityReadings[turbidityIndex];
  turbidityReadings[turbidityIndex] = adc10bit;
  turbidityTotal += turbidityReadings[turbidityIndex];

  turbidityIndex = (turbidityIndex + 1) % TURBIDITY_NUM_READINGS;

  return turbidityTotal / TURBIDITY_NUM_READINGS;
}

// ======================================
// Read All Sensors
// ======================================
void readSensors() {
  tdsVoltage = readTDS();
  tdsPPM = calculateTDS(tdsVoltage, DEFAULT_TEMP);  // Calculate PPM from voltage
  phVoltage = readPH();
  turbidityADC = readTurbidity();
}

// ======================================
// Setup
// ======================================
void setup() {
  Serial.begin(115200);

  // Initialize smoothing array
  for (int i = 0; i < TURBIDITY_NUM_READINGS; i++) {
    turbidityReadings[i] = 0;
  }

  Serial.println("Water Quality Sensor Module Ready");
}

// ======================================
// Loop
// ======================================
void loop() {
  readSensors();

  Serial.print("TDS Voltage: ");
  Serial.print(tdsVoltage, 3);
  Serial.println(" V");

  Serial.print("TDS PPM: ");
  Serial.print(tdsPPM, 2);
  Serial.println(" ppm");

  Serial.print("pH Voltage: ");
  Serial.print(phVoltage, 3);
  Serial.println(" V");

  Serial.print("Turbidity ADC (10-bit avg): ");
  Serial.println(turbidityADC);

  Serial.println("----------------------------");

  delay(2000); // 2-second interval
}
