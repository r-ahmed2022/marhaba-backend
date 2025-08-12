// models/Lead.js
import mongoose from 'mongoose';

export const leadSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});


export default leadSchema;