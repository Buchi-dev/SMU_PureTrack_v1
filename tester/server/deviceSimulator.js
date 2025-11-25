/**
 * Fully Independent DeviceSimulator
 * Sends realistic sensor data to your backend
 */

export class DeviceSimulator {
  constructor() {
    // --------------------------
    // Device identity
    // NOTE: Use the EXACT deviceId from your registered device in the database
    // To register a new device, change this ID and register it in the admin panel first
    // --------------------------
    this.deviceId = "DEV-BDZBLWRN"; // 👈 CHANGE THIS to match your registered device
    this.name = "WaterSense-X";
    this.type = "water-quality-sensor";
    this.firmwareVersion = "4.0.0-SIM";
    this.macAddress = "AA:BB:CC:DD:EE:FF"; // Fixed MAC address
    this.ipAddress = "192.168.0.100"; // Fixed IP address

    // --------------------------
    // Fixed sensor list
    // --------------------------
    this.sensors = ["tds", "pH", "turbidity"];

    // --------------------------
    // Backend config (real API key)
    // --------------------------
    this.networkConfig = {
      endpoint: "https://puretrack-api.onrender.com/api/v1/devices/readings",
      // endpoint: "http://localhost:5000/api/v1/devices/readings",
      apiKey: "6a8d48a00823c869ad23c27cc34a3d446493cf35d6924d8f9d54e17c4565737a"
    };

    // --------------------------
    // Runtime vars
    // --------------------------
    this.publishInterval = null;
    this.isRunning = false;
    this.failCount = 0;

    // --------------------------
    // Sensor behavior
    // --------------------------
    this.sensorConfig = {
      tds: { baseline: 350, variance: 80, min: 100, max: 800, drift: 0.5, noise: 15 },
      pH: { baseline: 7.2, variance: 0.4, min: 6.0, max: 8.5, drift: 0.02, noise: 0.1 },
      turbidity: { baseline: 12, variance: 5, min: 0, max: 100, drift: 0.3, noise: 2 }
    };

    this.currentValues = {};
    this.driftDirection = {};
    this.sensors.forEach(sensor => {
      this.currentValues[sensor] = this.sensorConfig[sensor].baseline;
      this.driftDirection[sensor] = 1;
    });
  }

  // --------------------------
  // Sensor simulation
  // --------------------------
  generateSensorValue(sensor) {
    const cfg = this.sensorConfig[sensor];
    const drift = (Math.random() - 0.5) * cfg.drift * this.driftDirection[sensor];
    this.currentValues[sensor] += drift;
    const noise = (Math.random() - 0.5) * cfg.noise;
    let value = this.currentValues[sensor] + noise;

    if (value < cfg.min) {
      value = cfg.min;
      this.driftDirection[sensor] = 1;
    }
    if (value > cfg.max) {
      value = cfg.max;
      this.driftDirection[sensor] = -1;
    }
    if (Math.random() < 0.05) this.driftDirection[sensor] *= -1;

    this.currentValues[sensor] = value;
    return value;
  }

  readSensors() {
    const readings = {};
    this.sensors.forEach(s => {
      readings[s] = parseFloat(this.generateSensorValue(s).toFixed(2));
    });
    readings.timestamp = new Date().toISOString();
    readings.deviceId = this.deviceId;
    
    // Include device metadata for auto-registration
    readings.name = this.name;
    readings.type = this.type;
    readings.firmwareVersion = this.firmwareVersion;
    readings.macAddress = this.macAddress;
    readings.ipAddress = this.ipAddress;
    readings.sensors = this.sensors;
    
    return readings;
  }

  // --------------------------
  // POST to backend
  // --------------------------
  async sendToBackend(data) {
    try {
      const res = await fetch(this.networkConfig.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.networkConfig.apiKey
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        this.failCount++;
        console.log(`   ❌ Server error: HTTP ${res.status}`);
        return;
      }

      console.log(`   ✅ Delivered`);
    } catch (err) {
      this.failCount++;
      console.log(`   ❌ Connection error: ${err.message}`);
    }
  }

  // --------------------------
  // Publisher loop
  // --------------------------
  startSensorPublishing() {
    this.publishInterval = setInterval(async () => {
      if (!this.isRunning) return;

      const d = this.readSensors();
      const now = new Date().toLocaleTimeString();

      console.log(`\n[${now}] 📊 Reading`);
      console.log(`   💧 TDS: ${d.tds} ppm`);
      console.log(`   🧪 pH: ${d.pH}`);
      console.log(`   🌫️ Turbidity: ${d.turbidity} NTU`);
      console.log(`   ⏰ Timestamp: ${d.timestamp}`);

      await this.sendToBackend(d);

      console.log(`   📉 Fail rate: ${this.failCount}`);
    }, 2000);
  }

  // --------------------------
  // Controls
  // --------------------------
  start() {
    if (this.isRunning) {
      console.log(`⚠️ Already running`);
      return;
    }

    this.isRunning = true;

    console.log(`\n🚀 Device Simulator Booted`);
    console.log(`📦 Firmware: ${this.firmwareVersion}`);
    console.log(`📡 Posting to: ${this.networkConfig.endpoint}`);
    console.log(`🔑 API Key: ${this.networkConfig.apiKey}`);
    console.log(`⚙️ Device ID: ${this.deviceId}`);
    console.log(`📡 Sending every 2s...\n`);

    this.startSensorPublishing();
  }

  stop() {
    this.isRunning = false;

    if (this.publishInterval) {
      clearInterval(this.publishInterval);
      this.publishInterval = null;
    }

    console.log(`⏹️ Simulator stopped`);
  }
}


const sim = new DeviceSimulator();
sim.start();