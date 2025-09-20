import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: String,
    required: true,
    enum: ['customer', 'admin']
  },
  text: {
    type: String,
    required: true
  },
  cid: {
    type: String
  },
  user: {
    name: String,
    email: String,
    id: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
});

export default messageSchema;
