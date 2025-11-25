//DATE: 11/24/2025
//CALIBRATED TDS with Multiplicative Factor

// Define analog input pins
const int analogPin0 = A0; // TDS sensor (A0)
const int analogPin1 = A1; // PH
const int analogPin2 = A2; // TURBIDITY

// Calibration data: ADC readings -> PPM measured values
const int CALIB_COUNT = 4;
const int calibADC[CALIB_COUNT] = {105, 116, 224, 250};
const float calibPPM[CALIB_COUNT] = {236.0, 278.0, 1220.0, 1506.0};

// TDS Calibration correction factor
// Calculated from: 220/179 * 0.479 = 0.589
const float TDS_CALIBRATION_FACTOR = 0.589;  // Fine-tuned for accuracy
const float TDS_OFFSET = 0.0;                 // Additional offset if needed

// SMA smoothing / moving average
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

// Precomputed linear fit fallback (slope/intercept). Calculated in setup().
float fitSlope = 0.0;
float fitIntercept = 0.0;

// Turbidity thresholds (WHO-like) and helper values
const float EXCELLENT_THRESHOLD = 0.5;    // < 0.5 NTU: Excellent quality
const float GOOD_THRESHOLD = 1.0;          // < 1 NTU: Good quality (WHO)
const float ACCEPTABLE_THRESHOLD = 3.0;    // < 3 NTU: Acceptable
const float POOR_THRESHOLD = 5.0;          // < 5 NTU: Poor quality

/**
 * Convert ADC reading -> PPM using piecewise linear interpolation across
 * calibration points. If ADC is outside calibration range we use a linear
 * extrapolation based on the nearest segment. If that fails we fallback to the
 * precomputed linear regression fit.
 */
float adcToPPM(int adc) {
  if (CALIB_COUNT <= 0) return 0.0;

  // if adc is exactly one of calibration points
  for (int i = 0; i < CALIB_COUNT; ++i) {
    if (adc == calibADC[i]) return calibPPM[i];
  }

  // find which segment adc lies in
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

  // adc < smallest calibration -> extrapolate using first segment
  if (adc < calibADC[0] && CALIB_COUNT >= 2) {
    float slope = (calibPPM[1] - calibPPM[0]) / (float)(calibADC[1] - calibADC[0]);
    return calibPPM[0] + slope * (adc - calibADC[0]);
  }

  // adc > largest calibration -> extrapolate using last segment
  if (adc > calibADC[CALIB_COUNT - 1] && CALIB_COUNT >= 2) {
    int last = CALIB_COUNT - 1;
    float slope = (calibPPM[last] - calibPPM[last - 1]) / (float)(calibADC[last] - calibADC[last - 1]);
    return calibPPM[last] + slope * (adc - calibADC[last]);
  }

  // fallback to linear regression
  return fitSlope * (float)adc + fitIntercept;
}

// Convert turbidity ADC (10-bit) to NTU using calibrated ranges.
// Based on calibration: ADC 265 = 0 NTU (Very Clear), ADC 250 = 5 NTU (Very Cloudy)
float calculateTurbidityNTU(int adcValue) {
  // Linear calibration: slope = (5 - 0) / (250 - 265) = -1/3
  // intercept = 0 - (-1/3)*265 ≈ 88.45
  float slope = -1.0 / 3.0;
  float intercept = 88.45;
  float ntu = slope * (float)adcValue + intercept;
  if (ntu < 0) ntu = 0;  // Clamp to 0 for very clear water
  return ntu;
}

String getTurbidityStatus(float ntu) {
  if (ntu < EXCELLENT_THRESHOLD) return "Excellent";
  if (ntu < GOOD_THRESHOLD) return "Good";
  if (ntu < ACCEPTABLE_THRESHOLD) return "Acceptable";
  if (ntu < POOR_THRESHOLD) return "Poor";
  return "Unacceptable";
}

void setup() {
  // Initialize Serial communication at 9600 baud
  Serial.begin(9600);

  // Compute linear regression slope/intercept as fallback
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

  // Print linear-fit parameters for debugging/verification
  Serial.print("Linear fit: slope=");
  Serial.print(fitSlope, 4);
  Serial.print(" intercept=");
  Serial.println(fitIntercept, 2);
}

void loop() {
  // Read ADC values
  int value0 = analogRead(analogPin0);
  int value1 = analogRead(analogPin1);
  int value2 = analogRead(analogPin2);

  // Add value2 into turb buffer
  turbSum -= turbBuffer[turbIndex];
  turbBuffer[turbIndex] = value2;
  turbSum += turbBuffer[turbIndex];
  turbIndex = (turbIndex + 1) % TURB_SMA_SIZE;
  if (turbCount < TURB_SMA_SIZE) turbCount++;

  // Add value0 into SMA buffer
  smaSum -= smaBuffer[smaIndex];
  smaBuffer[smaIndex] = value0;
  smaSum += smaBuffer[smaIndex];
  smaIndex = (smaIndex + 1) % SMA_SIZE;
  if (smaCount < SMA_SIZE) smaCount++;

  int averagedADC = smaSum / max(1, smaCount);

  // Convert averaged ADC to voltage (10-bit ADC on UNO, 0-1023) and to ppm
  float voltage = (float)averagedADC * (5.0 / 1023.0);
  float ppm = adcToPPM(averagedADC);

  // Apply multiplicative calibration factor + offset to match meter
  float calibratedPPM = (ppm * TDS_CALIBRATION_FACTOR) + TDS_OFFSET;

  int averagedTurbADC = turbSum / max(1, turbCount);
  float ntu = calculateTurbidityNTU(averagedTurbADC);
  String turbStatus = getTurbidityStatus(ntu);

  // Print useful values
  Serial.print("A0(raw): ");
  Serial.print(value0);
  Serial.print(" | A0(avg): ");
  Serial.print(averagedADC);
  Serial.print(" | V: ");
  Serial.print(voltage, 3);
  Serial.print(" | TDS (ppm): ");
  Serial.println(calibratedPPM, 1);

  // Print other sensors
  Serial.print("A1: ");
  Serial.print(value1);
  Serial.print(" | A2(raw): ");
  Serial.print(value2);
  Serial.print(" | A2(avg): ");
  Serial.print(averagedTurbADC);
  Serial.print(" | Turbidity (NTU): ");
  Serial.print(ntu, 2);
  Serial.print(" | Status: ");
  Serial.println(turbStatus);

  // Small delay for readability
  delay(125);
}
