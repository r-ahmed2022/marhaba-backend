import mongoose from "mongoose";

const { Schema, model } = mongoose;

const sessionSchema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerInfo: {
      name: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
    },
    assignedAdmin: {
      id: { type: String },
      name: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Number,
      default: 0, // ✅ new field for unread messages
    },
  },
  { timestamps: true }
);

export default sessionSchema;