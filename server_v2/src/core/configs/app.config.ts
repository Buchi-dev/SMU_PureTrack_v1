import { config } from 'dotenv';

// Load environment variables
config();

interface DatabaseConfig {
  uri: string;
  options: {
    retryWrites: boolean;
    w: string;
  };
}

interface ServerConfig {
  port: number;
  nodeEnv: string;
  apiVersion: string;
}

interface CorsConfig {
  origin: string | string[];
  credentials: boolean;
  allowedHeaders: string[];
  exposedHeaders: string[];
  methods: string[];
}

interface Config {
  server: ServerConfig;
  database: DatabaseConfig;
  cors: CorsConfig;
}

export const appConfig: Config = {
  server: {
    port: parseInt(process.env.PORT || '', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',
  },
  database: {
    uri: process.env.MONGODB_URI || '',
    options: {
      retryWrites: true,
      w: 'majority',
    },
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  },
};

export default appConfig;
