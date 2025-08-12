// db.js
import mongoose from 'mongoose';
import leadSchema from '../models/Lead.js';
import querySchema from '../models/Query.js';
import dotenv from 'dotenv';

dotenv.config();

const connections = {};

/**
 * Initialize connections for each firm based on environment variables.
 * Supports multi-domain setup and works with X-Firm header in development.
 */
export async function initDBConnections() {
  async function connectDB(name, uri) {
    if (!uri) {
      throw new Error(`No Mongo URI provided for ${name}`);
    }
    try {
      const conn =  mongoose.createConnection(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
      });

      conn.model('Lead', leadSchema);
      conn.model('Query', querySchema);

      console.log(`✅ Connected to ${name} DB`);
      return conn;
    } catch (err) {
      console.error(`❌ ${name} DB connection error:`, err);
      throw err;
    }
  }

  connections.cuttingedge = await connectDB(
    'Cutting Edge',
    process.env.MONGO_URI_CUTTINGEDGE_PROD
  );

  connections.marhabaconnect = await connectDB(
    'Marhaba Connect',
    process.env.MONGO_URI_MARHABACONNECT_PROD
  );
}

export default connections;