/**
 * Database Module
 * 
 * Handles SQLite database operations for device persistence
 * - Creates database and tables on initialization
 * - CRUD operations for devices
 * - Automatic backup on shutdown
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path
const DB_PATH = join(__dirname, 'devices.db');

class DeviceDatabase {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize database connection and create tables
   */
  initialize() {
    try {
      this.db = new Database(DB_PATH);
      this.db.pragma('journal_mode = WAL'); // Better concurrent access
      
      // Create devices table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS devices (
          deviceId TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          firmwareVersion TEXT NOT NULL,
          macAddress TEXT NOT NULL,
          ipAddress TEXT NOT NULL,
          sensors TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'stopped',
          createdAt INTEGER NOT NULL,
          lastSeen INTEGER
        )
      `);
      
      console.log('✅ Database initialized successfully');
      console.log(`📁 Database location: ${DB_PATH}`);
      
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Save a new device to the database
   */
  createDevice(device) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO devices (
          deviceId, name, type, firmwareVersion, 
          macAddress, ipAddress, sensors, status, 
          createdAt, lastSeen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        device.deviceId,
        device.name,
        device.type,
        device.firmwareVersion,
        device.macAddress,
        device.ipAddress,
        JSON.stringify(device.sensors),
        device.status,
        device.createdAt,
        device.lastSeen
      );
      
      return true;
    } catch (error) {
      console.error('Error creating device in database:', error.message);
      return false;
    }
  }

  /**
   * Get all devices from the database
   */
  getAllDevices() {
    try {
      const stmt = this.db.prepare('SELECT * FROM devices');
      const rows = stmt.all();
      
      return rows.map(row => ({
        deviceId: row.deviceId,
        name: row.name,
        type: row.type,
        firmwareVersion: row.firmwareVersion,
        macAddress: row.macAddress,
        ipAddress: row.ipAddress,
        sensors: JSON.parse(row.sensors),
        status: row.status,
        createdAt: row.createdAt,
        lastSeen: row.lastSeen,
        simulator: null
      }));
    } catch (error) {
      console.error('Error getting devices from database:', error.message);
      return [];
    }
  }

  /**
   * Get a single device by ID
   */
  getDevice(deviceId) {
    try {
      const stmt = this.db.prepare('SELECT * FROM devices WHERE deviceId = ?');
      const row = stmt.get(deviceId);
      
      if (!row) return null;
      
      return {
        deviceId: row.deviceId,
        name: row.name,
        type: row.type,
        firmwareVersion: row.firmwareVersion,
        macAddress: row.macAddress,
        ipAddress: row.ipAddress,
        sensors: JSON.parse(row.sensors),
        status: row.status,
        createdAt: row.createdAt,
        lastSeen: row.lastSeen,
        simulator: null
      };
    } catch (error) {
      console.error('Error getting device from database:', error.message);
      return null;
    }
  }

  /**
   * Update device status
   */
  updateDeviceStatus(deviceId, status, lastSeen = null) {
    try {
      const stmt = this.db.prepare(`
        UPDATE devices 
        SET status = ?, lastSeen = ?
        WHERE deviceId = ?
      `);
      
      stmt.run(status, lastSeen || Date.now(), deviceId);
      return true;
    } catch (error) {
      console.error('Error updating device status:', error.message);
      return false;
    }
  }

  /**
   * Update device last seen timestamp
   */
  updateDeviceLastSeen(deviceId) {
    try {
      const stmt = this.db.prepare(`
        UPDATE devices 
        SET lastSeen = ?, status = 'running'
        WHERE deviceId = ?
      `);
      
      stmt.run(Date.now(), deviceId);
      return true;
    } catch (error) {
      console.error('Error updating device last seen:', error.message);
      return false;
    }
  }

  /**
   * Delete a device from the database
   */
  deleteDevice(deviceId) {
    try {
      const stmt = this.db.prepare('DELETE FROM devices WHERE deviceId = ?');
      stmt.run(deviceId);
      return true;
    } catch (error) {
      console.error('Error deleting device from database:', error.message);
      return false;
    }
  }

  /**
   * Get the highest device counter
   */
  getMaxDeviceCounter() {
    try {
      const stmt = this.db.prepare(`
        SELECT deviceId FROM devices 
        WHERE deviceId LIKE 'esp32_sim_%'
        ORDER BY deviceId DESC 
        LIMIT 1
      `);
      
      const row = stmt.get();
      if (!row) return 0;
      
      // Extract number from deviceId like "esp32_sim_0001"
      const match = row.deviceId.match(/esp32_sim_(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting max device counter:', error.message);
      return 0;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Database connection closed');
    }
  }

  /**
   * Get database statistics
   */
  getStats() {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
          SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped
        FROM devices
      `);
      
      return stmt.get();
    } catch (error) {
      console.error('Error getting database stats:', error.message);
      return { total: 0, running: 0, stopped: 0 };
    }
  }
}

// Export singleton instance
export const deviceDB = new DeviceDatabase();
