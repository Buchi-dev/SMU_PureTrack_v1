# 🚀 ESP32 Quick Deployment Guide

## ⚡ CRITICAL FIXES COMPLETED

✅ **pH field case fixed:** `doc["pH"]` (capital H)  
✅ **API server configured:** Railway production URL  
✅ **API key matched:** Server and ESP32 synchronized  
✅ **HTTPS enabled:** WiFiClientSecure added  

---

## 📋 UPLOAD STEPS (Arduino IDE)

### 1. Install Required Libraries
**Tools → Manage Libraries...**
- ✅ ArduinoJson (v6.x or later)
- ✅ WiFi (built-in for ESP32)
- ✅ HTTPClient (built-in for ESP32)

### 2. Configure Board
**Tools → Board → ESP32 Arduino → ESP32 Dev Module**

**Board Settings:**
- Upload Speed: 921600
- CPU Frequency: 240MHz
- Flash Frequency: 80MHz
- Flash Mode: QIO
- Flash Size: 4MB
- Partition Scheme: Default

### 3. Select Port
**Tools → Port → COM# (Arduino Compatible)**
- Windows: COM3, COM4, etc.
- Mac: /dev/cu.usbserial-XXXX
- Linux: /dev/ttyUSB0

### 4. Upload
**Sketch → Upload** (or Ctrl+U)
- Wait for "Connecting..."
- If stuck, hold BOOT button on ESP32
- Release when "Writing at 0x00001000..."
- Wait for "Done uploading"

### 5. Monitor
**Tools → Serial Monitor**
- Set baud rate: 115200
- Watch for connection messages

---

## 🔍 QUICK VERIFICATION

### Check 1: Server Health
```bash
curl https://smu-puretrack-api-production.up.railway.app/health
```
**Expected:** `{"status":"healthy",...}`

### Check 2: API Key Test
```bash
curl -X POST https://smu-puretrack-api-production.up.railway.app/api/v1/devices/readings \
  -H "Content-Type: application/json" \
  -H "x-api-key: 6a8d48a00823c869ad23c27cc34a3d446493cf35d6924d8f9d54e17c4565737a" \
  -d '{"deviceId":"test","pH":7.0,"turbidity":2.5,"tds":300}'
```
**Expected:** `{"success":true,...}`

### Check 3: MongoDB Data
1. Login to MongoDB Atlas
2. Browse Collections → `water_quality_db` → `devices`
3. Look for `esp32_dev_002`

---

## ⚙️ CURRENT CONFIGURATION

| Setting | Value |
|---------|-------|
| **WiFi SSID** | Yuzon Only |
| **WiFi Password** | Pldtadmin@2024 |
| **API Server** | https://smu-puretrack-api-production.up.railway.app |
| **Device ID** | esp32_dev_002 |
| **API Key** | 6a8d48a00823c869ad23c27cc34a3d446493cf35d6924d8f9d54e17c4565737a |
| **Data Interval** | 2 seconds |
| **Protocol** | HTTPS (TLS/SSL) |

---

## 🚨 COMMON ERRORS

### Error: "WiFi.status() != WL_CONNECTED"
**Fix:** Check WiFi SSID and password, ensure 2.4GHz network

### Error: "HTTP code 401"
**Fix:** API key mismatch, verify keys match

### Error: "HTTP code 400"
**Fix:** Already fixed (pH field capitalization)

### Error: "Connection refused"
**Fix:** Server down or URL incorrect, check Railway dashboard

### Error: "espcomm_upload_mem failed"
**Fix:** Hold BOOT button during upload, check USB cable

---

## 📊 EXPECTED BEHAVIOR

```
[0s]     ESP32 boots up
[2s]     WiFi connecting...
[10s]    WiFi connected! IP: 192.168.1.XXX
[12s]    Server test: Connected ✅
[14s]    Reading sensors...
[16s]    Sending data... HTTP 200 OK ✅
[18s]    Reading sensors...
[20s]    Sending data... HTTP 200 OK ✅
...every 2 seconds
```

---

## 🎯 POST-DEPLOYMENT CHECKLIST

- [ ] ESP32 powers on without errors
- [ ] WiFi connects within 30 seconds
- [ ] Server connection test passes
- [ ] First sensor data sent successfully
- [ ] Device appears in MongoDB `devices` collection
- [ ] Sensor readings appear in `sensorreadings` collection
- [ ] Device status shows "online" in admin panel
- [ ] Approve device registration (change to 'registered')
- [ ] Set device location in admin panel
- [ ] Test alert by simulating bad water (pH < 6.0)
- [ ] Verify email notification received

---

## 🔗 USEFUL LINKS

- **Railway Dashboard:** https://railway.app/
- **MongoDB Atlas:** https://cloud.mongodb.com/
- **API Documentation:** https://smu-puretrack-api-production.up.railway.app/api-docs
- **Client Dashboard:** http://localhost:5173 (or deployed URL)

---

## 📞 TROUBLESHOOTING RESOURCES

**Server Logs (Railway):**
```bash
# View server logs
railway logs
```

**MongoDB Queries:**
```javascript
// Check device
db.devices.findOne({deviceId: "esp32_dev_002"})

// Check latest reading
db.sensorreadings.findOne({deviceId: "esp32_dev_002"}, {sort: {timestamp: -1}})

// Check alerts
db.alerts.find({deviceId: "esp32_dev_002"}).sort({timestamp: -1})
```

---

**Status:** ✅ READY TO DEPLOY  
**Last Updated:** November 21, 2025  
**Firmware Version:** 4.0.0 (HTTPS Enabled)
