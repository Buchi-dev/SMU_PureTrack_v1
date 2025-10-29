/*
 * pH Sensor Standalone Monitor
 * Arduino UNO R4 WiFi
 * 
 * Reads pH sensor values with averaging for stable readings
 * 
 * Author: IoT Water Quality Project
 * Date: 2025
 */

// ===========================
// CONFIGURATION
// ===========================

// Sensor Pin Configuration
#define PH_PIN A1           // pH Sensor

// Timing Configuration
#define SENSOR_READ_INTERVAL 125   // Read sensor every 125ms

// ===========================
// GLOBAL VARIABLES
// ===========================

unsigned long lastSensorRead = 0;

// Sensor reading
float ph = 0.0;

// Calibration values (ADJUST THESE AFTER CALIBRATION)
float voltage_pH4 = 2.032;   // Voltage reading in pH 4.38 solution
float voltage_pH9 = 1.500;   // Voltage reading in pH 9.03 solution (placeholder)
float actual_pH4 = 4.38;     // Your pH 4.38 buffer solution
float actual_pH9 = 9.03;     // Your pH 9.03 buffer solution

// Constants for sensor reading
const int SENSOR_SAMPLES = 100;  // Increased for more stable readings
const int SAMPLE_DELAY = 1;      // 1ms delay between samples
const float ADC_MAX = 4095.0;    // 12-bit ADC
const float VREF = 5.0;          // Arduino UNO R4 operates at 5V

// ===========================
// SETUP FUNCTION
// ===========================

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 5000);
  
  Serial.println(F("\n================================="));
  Serial.println(F("pH Sensor Monitor - Starting"));
  Serial.println(F("=================================\n"));

  pinMode(PH_PIN, INPUT);
  analogReadResolution(12);  // Set to 12-bit for better accuracy
  
  Serial.println(F("✓ Setup complete - System ready\n"));
}

// ===========================
// MAIN LOOP
// ===========================

void loop() {
  unsigned long currentMillis = millis();
  
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = currentMillis;
    ph = readPH();
    printSensorData();
  }
  
  delay(100);
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

float readPH() {
  float voltage = readAnalogAverage(PH_PIN);
  
  // Two-point calibration using your buffer solutions
  // Linear equation: pH = slope * voltage + offset
  float slope = (actual_pH9 - actual_pH4) / (voltage_pH9 - voltage_pH4);
  float offset = actual_pH4 - (slope * voltage_pH4);
  
  float phValue = (slope * voltage) + offset;
  
  return constrain(phValue, 0, 14);  // pH scale 0-14
}

void printSensorData() {
  // Get current voltage for debugging
  float voltage = (analogRead(PH_PIN) / ADC_MAX) * VREF;
  
  Serial.println(F("\n--- pH Sensor Reading ---"));
  Serial.print(F("Raw Voltage: "));
  Serial.print(voltage, 3);
  Serial.println(F(" V"));
  Serial.print(F("Calculated pH: "));
  Serial.println(ph, 2);
  Serial.println(F(""));
  Serial.println(F("CALIBRATION INSTRUCTIONS:"));
  Serial.println(F("1. Put sensor in pH 4.38 solution"));
  Serial.println(F("2. Wait 1 minute, note the voltage"));
  Serial.println(F("3. Update 'voltage_pH4' in code"));
  Serial.println(F("4. Put sensor in pH 9.03 solution"));
  Serial.println(F("5. Wait 1 minute, note the voltage"));
  Serial.println(F("6. Update 'voltage_pH9' in code"));
  Serial.println(F("7. Re-upload and test!"));
  Serial.println(F("-------------------------\n"));
}
