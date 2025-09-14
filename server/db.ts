import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon with optimized settings for connection pool management
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Optimized connection pool configuration to prevent exhaustion
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Maximum number of connections in pool
  min: 2,                     // Minimum number of connections to maintain
  idleTimeoutMillis: 30000,   // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout connection attempts after 10 seconds
  maxUses: 7500,              // Connection maximum reuse count before refresh
  allowExitOnIdle: true       // Allow process to exit when all connections idle
});

export const db = drizzle({ client: pool, schema });

// Log pool events for monitoring
pool.on('connect', (client) => {
  console.log('🔗 Database connection established');
});

pool.on('error', (err) => {
  console.error('💥 Database pool error:', err);
});

pool.on('remove', () => {
  console.log('🔌 Database connection removed from pool');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, closing database pool...');
  pool.end().then(() => {
    console.log('✅ Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, closing database pool...');
  pool.end().then(() => {
    console.log('✅ Database pool closed');  
    process.exit(0);
  });
});