import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon to use WebSocket for serverless connections
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Create connection pool with explicit settings for better reliability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 20,
  retryDelay: 1000,
  maxRetries: 3
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });

// Test database connection with retries
async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('Database connection successful');
      const result = await client.query('SELECT NOW()');
      console.log('Database query successful:', result.rows[0]);
      client.release();
      return true;
    } catch (err) {
      console.error(`Database connection attempt ${i + 1} failed:`, err);
      if (i === retries - 1) {
        console.error('All database connection attempts failed');
        process.exit(-1);
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}

testConnection();