# Device Firmware Refactor - Computation Logic Migration

## ✅ Changes Completed

### **Issue**
Device firmware was sending **raw sensor data** (voltages and ADC values) instead of **computed values** (ppm, pH, NTU), causing a mismatch with the backend expectations.

### **Solution**
Migrated computation logic from backend to **device firmware** (ESP32 and Arduino UNO R4).

---

## 📡 Data Format Changes

### **BEFORE (Raw Data - ❌ Mismatch)**
```json
{
  "tdsVoltage": 2.5,        // Raw voltage (0-5V)
  "phVoltage": 2.3,         // Raw voltage (0-5V)
  "turbidityADC": 512,      // Raw ADC value (0-1024)
  "timestamp": 123456789
}
```

### **AFTER (Computed Values - ✅ Matches Backend)**
```json
{
  "tds": 332.5,             // ppm (parts per million)
  "ph": 7.8,                // pH scale (0-14)
  "turbidity": 5.2,         // NTU (Nephelometric Turbidity Units)
  "timestamp": 123456789
}
```

---

## 🔧 Sensor Calibration Formulas (Added to Firmware)

### **TDS (Total Dissolved Solids)**
```cpp
float tdsPpm = (voltage * 133.0) * compensationCoefficient;
// compensationCoefficient = 1.0 at 25°C
```

### **pH Level**
```cpp
float phValue = 7.0 + ((2.5 - voltage) / 0.18);
// Calibrated for 2.5V = pH 7.0
// Clamped to 0-14 range
```

### **Turbidity**
```cpp
float voltage = (adcAverage / 1024.0) * 5.0;
float voltageRatio = voltage / 5.0;
float ntu = -1120.4 * pow(voltageRatio, 2) + 5742.3 * voltageRatio - 4352.9;
// Polynomial calibration curve
// Clamped to non-negative values
```

---

## 📂 Files Modified

### **1. ESP32_Dev_Module.ino**
- ✅ Added `readTDS()` computation (voltage → ppm)
- ✅ Added `readPH()` computation (voltage → pH 0-14)
- ✅ Added `readTurbidity()` computation (ADC → NTU)
- ✅ Updated `publishSensorData()` to send computed values
- ✅ Updated header documentation

**Firmware Version:** `v3.2.2 - With On-Device Computation`

### **2. Arduino_Uno_R4_Optimized.ino**
- ✅ Added `readTDS()` computation (voltage → ppm)
- ✅ Added `readPH()` computation (voltage → pH 0-14)
- ✅ Added `readTurbidity()` computation (ADC → NTU)
- ✅ Updated `publishSensorData()` to send computed values
- ✅ Updated header documentation

**Firmware Version:** `v4.0.0 - Using Prebuilt LED Animations + On-Device Computation`

---

## ✅ Backend Compatibility Verification

### **Backend Expects (from `Sensor.Types.ts`):**
```typescript
export interface SensorData {
  turbidity: number;  // NTU (Nephelometric Turbidity Units)
  tds: number;        // ppm (parts per million)
  ph: number;         // pH level (0-14 scale)
  timestamp: number;  // Unix timestamp in milliseconds
}
```

### **Device Now Sends:**
```json
{
  "tds": 332.5,         // ✅ Matches: ppm
  "ph": 7.8,            // ✅ Matches: pH (0-14)
  "turbidity": 5.2,     // ✅ Matches: NTU
  "timestamp": 123456789 // ✅ Matches: milliseconds
}
```

### **✅ NO MISMATCH - Data format is now compatible!**

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ ESP32 / Arduino UNO R4                                          │
│  ├─ Read analog sensors (voltage/ADC)                          │
│  ├─ Apply calibration formulas                                 │
│  ├─ Convert to ppm, pH, NTU                                    │
│  └─ Publish to MQTT: { tds, ph, turbidity, timestamp }        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ MQTT Bridge                                                     │
│  ├─ Receive computed values from devices                       │
│  ├─ Forward to Pub/Sub (no conversion needed)                  │
│  └─ Publish to: iot-sensor-readings                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend (Cloud Functions)                                       │
│  ├─ processSensorData.ts receives computed values              │
│  ├─ Validate: turbidity (NTU), tds (ppm), ph (0-14)           │
│  ├─ Store in Firestore & Realtime Database                     │
│  ├─ Check thresholds and create alerts                         │
│  └─ No conversion needed - data already in correct format      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Benefits of This Approach

1. **✅ No Backend Conversion Overhead**
   - Devices send ready-to-use values
   - Backend just validates and stores

2. **✅ Consistent Data Format**
   - All devices send same format (ppm, pH, NTU)
   - No device-specific handling needed

3. **✅ Better Device Control**
   - Calibration formulas in firmware (easy to update per device)
   - Can adjust calibration without backend changes

4. **✅ Reduced Backend Complexity**
   - No need to track which device sends what format
   - Simpler validation logic

5. **✅ Future-Proof**
   - New devices just need to implement calibration
   - Backend remains unchanged

---

## 🚀 Next Steps

1. **Upload firmware to devices:**
   ```
   - Flash ESP32_Dev_Module.ino to ESP32 devices
   - Flash Arduino_Uno_R4_Optimized.ino to Arduino UNO R4 devices
   ```

2. **Verify data in Realtime Database:**
   ```
   /devices/{deviceId}/latestReading/
   {
     "tds": 332.5,
     "ph": 7.8,
     "turbidity": 5.2,
     "timestamp": 1731974400000
   }
   ```

3. **Test alert thresholds:**
   - Ensure alerts are created when values exceed thresholds
   - Verify alert debouncing works correctly

---

## 📝 Notes

- **MQTT Bridge:** No changes needed - passes data through as-is
- **Backend:** No changes needed - already expects computed values
- **Firmware:** Computation logic added to both ESP32 and Arduino UNO R4
- **Breaking Change:** Old firmware sending raw data will NOT work anymore
- **Migration Required:** All deployed devices must be updated with new firmware

---

**Last Updated:** November 18, 2025  
**Status:** ✅ Complete - No Mismatch
