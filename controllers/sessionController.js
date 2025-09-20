import connections from "../config/db.js";
import sessionSchema from "../models/Session.js";
import messageSchema from "../models/Message.js";

/** Get all sessions (optionally filter by status) */
export const getSessions = async (req, res) => {
  try {
    const conn = connections.marhabaconnect; // later replace with dynamic from middleware
    const Session = conn.model("Session", sessionSchema);

    const { status } = req.query;
    const filter = status ? { status } : {};

    const sessions = await Session.find(filter).sort({ lastMessageAt: -1 });
    res.json(sessions);
  } catch (err) {
    console.error("❌ Error fetching sessions:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};

/** Get messages for a specific sessionId */
export const getSessionMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const conn = connections.marhabaconnect;
    const Message = conn.model("Message", messageSchema);

    const messages = await Message.find({ sessionId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching session messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};
