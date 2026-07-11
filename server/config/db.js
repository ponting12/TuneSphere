const mongoose = require('mongoose');
const { setDbMode } = require('../services/dbService');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    setDbMode('mongo');
  } catch (err) {
    console.warn(`⚠️ MongoDB connection error: ${err.message}`);
    console.warn(`ℹ️ Falling back to Local JSON database (server/data/db.json)`);
    setDbMode('local');
  }
};

module.exports = connectDB;

