const mongoose = require('mongoose');
const { setDbMode } = require('../services/dbService');

const connectDB = async () => {
  // Explicit DB_MODE support:
  // - DB_MODE=local   => always use local JSON DB
  // - DB_MODE=mongo   => require MongoDB (no fallback)
  // - DB_MODE=auto    => try Mongo, fallback to local (default)
  const dbMode = (process.env.DB_MODE || 'auto').toLowerCase();

  if (dbMode === 'local') {
    setDbMode('local');
    return;
  }

  try {
    const uri = process.env.MONGO_URI;
    if (typeof uri !== 'string' || !uri.trim()) {
      throw new Error('MONGO_URI is missing or not a string');
    }

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    setDbMode('mongo');
  } catch (err) {
    // If user explicitly asked for mongo, do not fallback.
    if (dbMode === 'mongo') {
      console.error(`❌ MongoDB connection failed (DB_MODE=mongo): ${err.message}`);
      process.exitCode = 1;
      throw err;
    }

    console.warn(`⚠️ MongoDB connection error: ${err.message}`);
    console.warn(`ℹ️ Falling back to Local JSON database (server/data/db.json)`);
    setDbMode('local');
  }
};

module.exports = connectDB;


