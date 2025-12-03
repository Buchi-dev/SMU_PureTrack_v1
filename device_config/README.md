# Water Quality Monitoring System - Device Firmware

## 📋 Overview

This firmware enables real-time water quality monitoring using an Arduino UNO R4 WiFi. It monitors pH, TDS (Total Dissolved Solids), and Turbidity levels, transmitting data to a remote server via secure MQTT.

**Firmware Version:** v7.0.0  
**Release Date:** December 2025  
**Platform:** Arduino UNO R4 WiFi

---

## 🚀 Key Features

- ✅ **WiFi Manager** - Zero-configuration web portal for WiFi setup
- ✅ **WiFi Persistence** - Credentials saved to EEPROM (survives reboots)
- ✅ **Secure MQTT** - SSL/TLS connection to HiveMQ Cloud (Port 8883)
- ✅ **Scheduled Transmission** - Data sent every 30 minutes (:00 and :30)
- ✅ **NTP Time Sync** - Philippine Time Zone (UTC+8)
- ✅ **Calibration Mode** - Fast sensor readings for calibration
- ✅ **Auto Restart** - Daily midnight maintenance restart
- ✅ **Approval System** - Server-side device registration

---

## 🔌 Hardware Connections

| Sensor         | Arduino Pin | Description                              |
|----------------|-------------|------------------------------------------|
| pH Sensor      | A0          | Analog pH measurement (0-14 pH scale)    |
| TDS Sensor     | A1          | Total Dissolved Solids (0-1000+ ppm)     |
| Turbidity      | A2          | Water clarity measurement (0-3000 NTU)   |

---

## 📶 WiFi Manager Setup

### First Time Configuration

1. **Power on the device**
   - Device creates WiFi Access Point: `PureTrack-Setup`
   - Password: `12345678`

2. **Connect to the Access Point**
   - Use your phone or computer
   - Connect to WiFi: `PureTrack-Setup`
   - Enter password: `12345678`

3. **Open the Configuration Portal**
   - Open web browser
   - Navigate to: `http://192.168.4.1`
   - Portal loads instantly (lightweight HTML)

4. **Configure WiFi**
   - View list of available networks
   - Enter your WiFi SSID (network name)
   - Enter your WiFi password
   - Click "Connect"

5. **Automatic Connection**
   - Device saves credentials to EEPROM
   - Connects to your WiFi network
   - Access Point shuts down
   - Normal operation begins

### After Reboot

- Device **automatically connects** using saved credentials
- No need to reconfigure
- If connection fails 3 times, WiFi Manager starts again
- Access point times out after 5 minutes if not configured

---

## 🛠️ Installation Instructions

### Requirements

- Arduino IDE 2.0 or later
- Arduino UNO R4 WiFi board package
- Required libraries (install via Library Manager):
  - `WiFiS3`
  - `PubSubClient`
  - `ArduinoJson` (v6 or later)
  - `NTPClient`

### Steps

1. **Open Arduino IDE**
   - File → Open
   - Select `Arduino_Uno_R4_Optimized.ino`

2. **Configure Settings**
   - Set `CALIBRATION_MODE` to `false` for production
   - Verify `MQTT_BROKER` credentials
   - Confirm `DEVICE_ID` is unique

3. **Select Board**
   - Tools → Board → Arduino UNO R4 WiFi

4. **Upload Firmware**
   - Click Upload button
   - Wait for compilation and upload

5. **Open Serial Monitor**
   - Tools → Serial Monitor
   - Set baud rate to **115200**
   - View boot process and status

---

## 🔧 Configuration

### Calibration Mode

For sensor calibration and testing:

```cpp
#define CALIBRATION_MODE true
```

**Behavior:**
- Fast sensor readings every 255ms
- No MQTT connection
- Real-time Serial output
- Use with known reference solutions

### Normal Mode (Production)

```cpp
#define CALIBRATION_MODE false
```

**Behavior:**
- Sensor readings every 60 seconds
- Data transmission every 30 minutes
- Full MQTT connectivity
- Requires server approval

---

## 📡 MQTT Topics

### Device Publishes To:

| Topic                          | Description                      | Frequency      |
|--------------------------------|----------------------------------|----------------|
| `devices/{deviceId}/data`      | Sensor readings                  | Every 30 min   |
| `devices/{deviceId}/register`  | Registration request             | On boot        |
| `devices/{deviceId}/presence`  | Online announcement              | On connect     |
| `presence/response`            | Server poll response             | On query       |

### Device Subscribes To:

| Topic                          | Description                      |
|--------------------------------|----------------------------------|
| `devices/{deviceId}/commands`  | Server commands (go, restart)    |
| `presence/query`               | Server "who_is_online" polling   |

---

## 🎮 MQTT Commands

Send commands via MQTT to `devices/{deviceId}/commands`:

| Command      | Description                                   |
|--------------|-----------------------------------------------|
| `go`         | Approve device for data transmission          |
| `deregister` | Revoke device approval                        |
| `restart`    | Restart device immediately                    |
| `send_now`   | Force immediate data transmission             |

---

## 💾 EEPROM Memory Map

| Address   | Size  | Description                          |
|-----------|-------|--------------------------------------|
| 0-1       | 2     | Magic number (0xA5B7)                |
| 2         | 1     | Device approval status (0=no, 1=yes) |
| 3-6       | 4     | Boot counter (unsigned long)         |
| 7-38      | 32    | WiFi SSID (null-terminated)          |
| 39-102    | 64    | WiFi Password (null-terminated)      |
| 103       | 1     | WiFi saved flag (0=no, 1=yes)        |

**Total:** 104 bytes used out of 512 available

---

## 🐛 Troubleshooting

### Device Won't Connect to WiFi

**Solution:**
1. Wait for WiFi Manager to start (after 3 failed attempts)
2. Connect to AP: `WaterQuality-Setup`
3. Reconfigure network via http://192.168.4.1
4. Check Serial Monitor for connection status

### No Data Transmission

**Possible Causes:**
- Device not approved by server (wait for "go" command)
- MQTT broker credentials incorrect
- Network connectivity issues
- Not at scheduled time (:00 or :30 minutes)

**Solution:**
1. Check Serial Monitor for error messages
2. Verify device approval status
3. Send `send_now` command to test transmission
4. Verify MQTT broker is accessible

### Incorrect Sensor Readings

**Solution:**
1. Enable `CALIBRATION_MODE = true`
2. Use known reference solutions
3. Calibrate sensors using Serial output
4. Update calibration constants in code
5. Set back to `CALIBRATION_MODE = false`

### Reset All Settings

**Solution:**
1. Connect to Serial Monitor (115200 baud)
2. Call `clearEEPROM()` function
3. Device will restart in factory state
4. Reconfigure via WiFi Manager

### WiFi Manager Portal Slow to Load

**Solution:**
- This is normal for microcontrollers
- Wait 5-10 seconds for page to load
- HTML is already minimized for performance
- Avoid refreshing repeatedly

---

## 📊 Serial Monitor Output

### Normal Boot Sequence

```
=== Water Quality Monitor - Arduino R4 WiFi ===
Firmware: v7.0.0 - Server Polling Mode
CALIBRATION MODE: DISABLED (normal)

=== EEPROM Initialization ===
EEPROM valid - reading stored values
✓ WiFi credentials loaded from EEPROM
SSID: YourNetwork
Approved status: YES
Boot count: 42

Connecting to WiFi: YourNetwork
✓ WiFi Connected
IP Address: 192.168.1.100
Signal: -45 dBm

=== NTP TIME SYNC ===
✓ Time synchronized
UTC Time: 16:30:00
PH Time:  00:30:00

=== MQTT BROKER ===
Connecting to MQTT...
✓ MQTT Connected
✓ Subscribed to commands
✓ Subscribed to presence query

Status: Approved - Ready for data transmission
Next TX: 01:00 PH
```

### WiFi Manager Active

```
=== STARTING WiFi MANAGER ===
Creating Access Point: WaterQuality-Setup
✓ Access Point Started
AP IP Address: 192.168.4.1

────────────────────────────────────
HOW TO CONNECT:
1. Connect to WiFi: WaterQuality-Setup
2. Password: 12345678
3. Open browser: http://192.168.4.1
4. Select WiFi and enter password
────────────────────────────────────
```

---

## 🔐 Security Considerations

- **MQTT:** SSL/TLS encryption (Port 8883)
- **WiFi Password:** Stored in EEPROM (consider encryption for production)
- **Web Portal:** No authentication (use in controlled environment)
- **Credentials:** Update default MQTT passwords before deployment

---

## 📈 Performance Metrics

- **RAM Usage:** ~60% (optimized with F() macro and PROGMEM)
- **Boot Time:** ~15-20 seconds (including WiFi + MQTT)
- **Sensor Read Interval:** 60 seconds (normal) / 255ms (calibration)
- **Data Transmission:** Every 30 minutes
- **WiFi Manager Timeout:** 5 minutes
- **MQTT Reconnect:** Exponential backoff (2s, 4s, 8s, 16s, 32s)

---

## 📝 Version History

### v7.0.0 - December 2025
- Added WiFi Manager with web portal
- Implemented WiFi credential EEPROM persistence
- Simplified HTML for microcontroller performance
- Enhanced POST request parsing with validation
- Added comprehensive inline documentation
- Optimized for Arduino UNO R4 WiFi platform

---

## 📞 Support

For issues or questions:

1. **Check Serial Monitor** at 115200 baud for debug output
2. **Review this README** for common solutions
3. **Check inline code documentation** for technical details
4. **Factory reset** via `clearEEPROM()` if needed

---

## 📄 License

Copyright © 2025 Water Quality Monitoring Team  
All Rights Reserved

---

## 🎯 Quick Reference

### Important Constants

```cpp
#define CALIBRATION_MODE false       // Set to true for calibration
#define DEVICE_ID "arduino_uno_r4_002"
#define MQTT_BROKER "your-broker.hivemq.cloud"
#define AP_SSID "WaterQuality-Setup"
#define AP_PASSWORD "12345678"
```

### Serial Commands

- Baud rate: **115200**
- Line ending: **Both NL & CR**

### WiFi Manager

- SSID: **WaterQuality-Setup**
- Password: **12345678**
- Portal: **http://192.168.4.1**
- Timeout: **5 minutes**

### Data Transmission Schedule

- **Every 30 minutes** at:
  - :00 (top of hour)
  - :30 (half past hour)
- **Philippine Time (UTC+8)**

---

**Last Updated:** December 2025  
**Firmware Version:** v7.0.0
