// db.js
import mongoose from 'mongoose';
import leadSchema from '../models/Lead.js';
import querySchema from '../models/Query.js';
import userSchema from '../models/User.js';
import messageSchema from '../models/Message.js';
import sessionSchema from '../models/Session.js';
import dotenv from 'dotenv';

dotenv.config();

const connections = {};

export async function initDBConnections() {
  // Connect default mongoose connection for models that use it
  try {
    await mongoose.connect(process.env.MONGO_URI_MARHABACONNECT_PROD, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });
    console.log('✅ Connected to Default DB');
  } catch (err) {
    console.error('❌ Default DB connection error:', err);
  }

  async function connectDB(name, uri) {
    if (!uri) {
      throw new Error(`No Mongo URI provided for ${name}`);
    }
    try {
      const conn =  mongoose.createConnection(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false, // Disable mongoose buffering
      });

      // Add connection event listeners
      conn.on('connected', () => console.log(`✅ Connected to ${name} DB`));
      conn.on('error', (err) => console.error(`❌ ${name} DB connection error:`, err));
      conn.on('disconnected', () => console.log(`⚠️ Disconnected from ${name} DB`));

      conn.model('Lead', leadSchema);
      conn.model('Query', querySchema);
      conn.model('User', userSchema);
      conn.model('Message', messageSchema);
      conn.model('Session', sessionSchema);

      return conn;
    } catch (err) {
      console.error(`❌ ${name} DB connection error:`, err);
      // Don't throw error, return null instead to allow graceful degradation
      return null;
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

  // Filter out null connections
  Object.keys(connections).forEach(key => {
    if (!connections[key]) {
      delete connections[key];
    }
  });
}

export default connections;