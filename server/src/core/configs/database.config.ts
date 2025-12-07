import mongoose from 'mongoose';
import { appConfig } from './app.config';
import logger from '@utils/logger.util';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('📦 Using existing database connection');
      return;
    }

    try {
      await mongoose.connect(appConfig.database.uri);
      this.isConnected = true;
      logger.info('✅ MongoDB connected successfully');

      mongoose.connection.on('error', (error) => {
        logger.error('❌ MongoDB connection error', { error: error.message, stack: error.stack });
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('✅ MongoDB reconnected');
        this.isConnected = true;
      });
    } catch (error: any) {
      logger.error('❌ Failed to connect to MongoDB', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('👋 MongoDB disconnected');
    } catch (error: any) {
      logger.error('❌ Error disconnecting from MongoDB', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    // Check both internal flag and mongoose connection state
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const mongooseConnected = mongoose.connection.readyState === 1;
    return this.isConnected && mongooseConnected;
  }

  public getConnection(): mongoose.Connection {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return mongoose.connection;
  }
}

export default DatabaseConnection.getInstance();
