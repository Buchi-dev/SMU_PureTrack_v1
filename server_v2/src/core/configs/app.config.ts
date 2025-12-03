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
}

interface Config {
  server: ServerConfig;
  database: DatabaseConfig;
  cors: CorsConfig;
}

export const appConfig: Config = {
  server: {
    port: parseInt(process.env.PORT || '', 10),
    nodeEnv: process.env.NODE_ENV || '',
    apiVersion: process.env.API_VERSION || 'v2',
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
  },
};

export default appConfig;
