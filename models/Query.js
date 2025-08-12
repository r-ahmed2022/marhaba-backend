// models/Query.js (refactored for multi-domain setup)
import mongoose from 'mongoose';

const querySchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  queryemail: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

querySchema.index({ queryemail: 1, message: 1 }, { unique: true });

export default querySchema;