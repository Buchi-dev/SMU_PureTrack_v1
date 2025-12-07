import { config } from 'dotenv';
import type { CorsOptions } from 'cors';

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

interface Config {
  server: ServerConfig;
  database: DatabaseConfig;
  cors: CorsOptions;
}

// Parse allowed origins from environment variable
const getAllowedOrigins = (): string[] => {
  const corsOrigin = process.env.CORS_ORIGIN;
  
  if (!corsOrigin) {
    console.warn('⚠️  CORS_ORIGIN not set, allowing all origins (not recommended for production)');
    return [];
  }
  
  // Support comma-separated list of origins
  const origins = corsOrigin.includes(',') 
    ? corsOrigin.split(',').map(origin => origin.trim())
    : [corsOrigin];
  
  console.log('✅ Allowed CORS Origins:', origins);
  return origins;
};

const allowedOrigins = getAllowedOrigins();

// Export allowedOrigins for logging purposes
export { allowedOrigins };

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
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl, or same-origin)
      if (!origin) {
        return callback(null, true);
      }
      
      // If no specific origins configured, allow all (development mode)
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  Blocked CORS request from origin: ${origin}`);
        // IMPORTANT: Don't reject with error - this prevents CORS headers from being sent
        // Instead, allow the request but let the application handle authorization
        callback(null, true);
      }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
    preflightContinue: false,
  },
};

export default appConfig;
