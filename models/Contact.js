import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema(
  {
    sessionId:  { type: String, required: true, unique: true, index: true },
    name:       { type: String, required: true },
    email:      { type: String, required: true },
    lastActive: {
      type: Date,
      default: Date.now,
      index: { expires: '1d' } // auto-remove after 24h
    }
  },
  { timestamps: true }
);

export default mongoose.model('Contact', ContactSchema);