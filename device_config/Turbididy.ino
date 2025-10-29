/*
 * Turbidity Sensor (NTU) - Arduino UNO R4
 * Based on WHO Water Quality Standards
 * 
 * WHO Drinking Water Standards:
 * - < 1 NTU: Excellent (Safe for drinking)
 * - 1-5 NTU: Acceptable (Treatment recommended)
 * - > 5 NTU: Unacceptable (Requires treatment)
 * 
 * Hardware Connections:
 * - Turbidity Sensor VCC -> 5V
 * - Turbidity Sensor GND -> GND
 * - Turbidity Sensor OUT -> A0
 */

// Pin Definitions
const int TURBIDITY_SENSOR_PIN = A2;

// Calibration values (adjust based on your sensor)
const float VOLTAGE_REFERENCE = 5.0;
const int ADC_RESOLUTION = 1024;

// WHO-based Turbidity thresholds (NTU)
const float EXCELLENT_THRESHOLD = 0.5;    // < 0.5 NTU: Excellent quality
const float GOOD_THRESHOLD = 1.0;         // < 1 NTU: Good quality (WHO standard)
const float ACCEPTABLE_THRESHOLD = 3.0;   // < 3 NTU: Acceptable
const float POOR_THRESHOLD = 5.0;         // < 5 NTU: Poor quality
// > 5 NTU: Unacceptable

// Smoothing variables
const int NUM_READINGS = 10;
int readings[NUM_READINGS];
int readIndex = 0;
int total = 0;
int average = 0;

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize turbidity sensor pin
  pinMode(TURBIDITY_SENSOR_PIN, INPUT);
  
  // Initialize smoothing array
  for (int i = 0; i < NUM_READINGS; i++) {
    readings[i] = 0;
  }
  
  Serial.println("=================================");
  Serial.println("Turbidity Sensor - Arduino UNO R4");
  Serial.println("=================================");
  Serial.println();
  delay(1000);
}

void loop() {
  // Read and smooth sensor values
  float ntu = readTurbidity();
  
  // Display results
  displayTurbidity(ntu);
  
  // Delay between readings
  delay(125);
}

/**
 * Read turbidity sensor and convert to NTU
 */
float readTurbidity() {
  // Remove oldest reading
  total = total - readings[readIndex];
  
  // Read sensor value
  readings[readIndex] = analogRead(TURBIDITY_SENSOR_PIN);
  
  // Add new reading to total
  total = total + readings[readIndex];
  
  // Advance to next position
  readIndex = (readIndex + 1) % NUM_READINGS;
  
  // Calculate average
  average = total / NUM_READINGS;
  
  // Convert to voltage
  float voltage = average * (VOLTAGE_REFERENCE / ADC_RESOLUTION);
  
  // Convert voltage to NTU
  // This formula may need calibration based on your specific sensor
  // Lower voltage = higher turbidity for most sensors
  float ntu = calculateNTU(voltage);
  
  // Constrain NTU to 0-5 range
  ntu = constrain(ntu, 0.0, 5.0);
  
  return ntu;
}

/**
 * Convert voltage to NTU value
 * Calibration based on sensor readings:
 * ADC 705 = Clear Water = 0 NTU
 * ADC 666 = Turbid Water = 2 NTU
 * 
 * WHO Standards Applied:
 * < 1 NTU = Safe drinking water
 * > 5 NTU = Unacceptable
 */
float calculateNTU(float voltage) {
  float ntu;
  
  // Calibrated ADC to NTU conversion
  // Higher ADC = clearer water (0 NTU)
  // Lower ADC = turbid water (2-5 NTU)
  
  if (average >= 705) {
    // Excellent - Crystal clear water (ADC 705+)
    ntu = 0.0;
  } else if (average >= 695) {
    // Excellent - Very clear (ADC 695-705)
    ntu = map(average, 695, 705, 30, 0) / 100.0;  // 0.0 - 0.3 NTU
  } else if (average >= 685) {
    // Good - Clear water (ADC 685-695)
    ntu = map(average, 685, 695, 80, 30) / 100.0;  // 0.3 - 0.8 NTU
  } else if (average >= 675) {
    // Acceptable - Slightly visible particles (ADC 675-685)
    ntu = map(average, 675, 685, 150, 80) / 100.0;  // 0.8 - 1.5 NTU
  } else if (average >= 666) {
    // Acceptable - Noticeable turbidity (ADC 666-675)
    ntu = map(average, 666, 675, 250, 150) / 100.0;  // 1.5 - 2.5 NTU
  } else if (average >= 640) {
    // Poor - Moderate turbidity (ADC 640-666)
    ntu = map(average, 640, 666, 350, 250) / 100.0;  // 2.5 - 3.5 NTU
  } else if (average >= 600) {
    // Poor - High turbidity (ADC 600-640)
    ntu = map(average, 600, 640, 450, 350) / 100.0;  // 3.5 - 4.5 NTU
  } else if (average >= 550) {
    // Unacceptable - Very high turbidity (ADC 550-600)
    ntu = map(average, 550, 600, 500, 450) / 100.0;  // 4.5 - 5.0 NTU
  } else {
    // Critical - Extremely turbid (ADC below 550)
    ntu = 5.0;
  }
  
  return ntu;
}

/**
 * Display turbidity reading with status
 */
void displayTurbidity(float ntu) {
  Serial.println("--- Turbidity Reading ---");
  Serial.print("NTU: ");
  Serial.print(ntu, 2);
  Serial.print(" | Status: ");
  Serial.println(getTurbidityStatus(ntu));
  Serial.print("Raw ADC: ");
  Serial.println(average);
  Serial.println();
}

/**
 * Get water quality status based on NTU (WHO Standards)
 */
String getTurbidityStatus(float ntu) {
  if (ntu < EXCELLENT_THRESHOLD) {
    return "EXCELLENT - Safe for drinking ✓✓";
  } else if (ntu < GOOD_THRESHOLD) {
    return "GOOD - Safe for drinking ✓";
  } else if (ntu < ACCEPTABLE_THRESHOLD) {
    return "ACCEPTABLE - Treatment recommended ⚠";
  } else if (ntu < POOR_THRESHOLD) {
    return "POOR - Treatment required ⚠⚠";
  } else {
    return "UNACCEPTABLE - Not safe ✗✗✗";
  }
}

/**
 * Alternative: Simple voltage-based reading (for testing)
 */
float getVoltage() {
  int sensorValue = analogRead(TURBIDITY_SENSOR_PIN);
  float voltage = sensorValue * (VOLTAGE_REFERENCE / ADC_RESOLUTION);
  return voltage;
}
