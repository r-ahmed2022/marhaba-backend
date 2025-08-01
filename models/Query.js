import mongoose from 'mongoose';

const querySchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  queryemail: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

querySchema.index({ queryemail: 1, message: 1, timestamp: 1 }, { unique: true });

const Query = mongoose.model('Query', querySchema);
export default Query;