import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
  recipient: String,
  subject: String,
  templateName: String,
  sentAt: { type: Date, default: Date.now }
});

export default mongoose.model('EmailLog', emailLogSchema);