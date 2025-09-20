// sockets/chatHandler.js
import connections from "../config/db.js";
import sessionSchema from "../models/Session.js";
import {
  saveMessage,
  getAllChatHistories,
  getMessagesBySession,
  closeSession
} from "../controllers/contactController.js";

const ADMINS_ROOM = "admins";
const minimizedSessions = new Set(); // ephemeral; consider persisting if needed

export default function chatHandler(io) {
  io.on("connection", (socket) => {
    console.log("🟢 New socket connected:", socket.id);

    // Optional: attach role info if you authenticate admins via token/cookie
    socket.data.role = "guest";
    socket.data.admin = null;

    /**
     * Admin joins the admin hub to receive dashboard updates
     * payload: { admin: { id, name, email } }
     */
    socket.on("admin-join", async ({ admin }) => {
      try {
        socket.join(ADMINS_ROOM);
        socket.data.role = "admin";
        socket.data.admin = admin || null;

        const allSessions = await getAllChatHistories(); // returns keyed object
        io.to(socket.id).emit("all-chat-history", allSessions);
      } catch (err) {
        console.error("❌ Error in admin-join:", err);
      }
    });

    /**
     * Customer joins a chat session
     * payload: { name, email, sessionId }
     */
    socket.on("join", async ({ name, email, sessionId }) => {
      try {
        socket.join(sessionId);
        socket.data.role = "customer";
        socket.data.sessionId = sessionId;

        console.log(`👤 Customer joined ${sessionId}: ${name} (${email})`);

        // Save system-like join info (optional; you can keep your current pattern)
        await saveMessage({
          sessionId,
          user: { name, email },
          text: `${name} joined the chat.`,
          userType: "customer"
        });

        // Ensure session open with customer info
        const conn = connections["marhabaconnect"];
        const Session = conn.model("Session", sessionSchema);
        await Session.findOneAndUpdate(
          { sessionId },
          {
            $set: {
              status: "open",
              customerInfo: { name, email },
              lastMessageAt: new Date()
            }
          },
          { upsert: true }
        );

        // Send chat history to this customer only
        const messages = await getMessagesBySession(sessionId);
       io.to(sessionId).emit("chat-history", messages);
        io.to(ADMINS_ROOM).emit("all-chat-history", getAllSessions());

      } catch (err) {
        console.error("❌ Error in join:", err);
      }
    });

    /**
     * Customer message
     * payload: { sessionId, user: {name,email}, text, userType: "customer" }
     */
    socket.on("customer-message", async (msg) => {
      try {
        const newMsg = await saveMessage({
          sessionId: msg.sessionId,
          user: msg.user,
          text: msg.text,
          userType: "customer"
        });

        // Increment unread for admins
        const conn = connections["marhabaconnect"];
        const Session = conn.model("Session", sessionSchema);
        await Session.findOneAndUpdate(
          { sessionId: msg.sessionId },
          { $inc: { unreadCount: 1 }, $set: { lastMessageAt: new Date() } }
        );

        // Emit to all in the session (customer + any joined admins)
        io.to(msg.sessionId).emit("message", newMsg);

        // Push dashboard update for that session
        const updatedSessions = await getAllChatHistories();
        const updatedSession = updatedSessions[msg.sessionId];
        io.to(ADMINS_ROOM).emit("dashboard-update", updatedSession);

        // If customer minimized, you may notify them with unread count
        if (minimizedSessions.has(msg.sessionId)) {
          const s = await Session.findOne({ sessionId: msg.sessionId }).lean();
          io.to(msg.sessionId).emit("unread-count", { count: s?.unreadCount || 0 });
        }
      } catch (err) {
        console.error("❌ Error saving customer message:", err);
      }
    });

    /**
     * Admin joins a specific session room to converse
     * payload: { sessionId, admin: { id, name, email } }
     */
    socket.on("join-session", async ({ sessionId, admin }) => {
      try {
        socket.join(sessionId);
        if (socket.data.role !== "admin") {
          socket.data.role = "admin";
          socket.join(ADMINS_ROOM);
        }
        socket.data.admin = admin || socket.data.admin;

        // Send messages to this admin
        const messages = await getMessagesBySession(sessionId);
        io.to(socket.id).emit("session-messages", { sessionId, messages: messages || [] });

        // Reset unread for this session when an admin opens it
        const conn = connections["marhabaconnect"];
        const Session = conn.model("Session", sessionSchema);
        await Session.findOneAndUpdate({ sessionId }, { $set: { unreadCount: 0 } });

        // Broadcast dashboard update
        const updatedSessions = await getAllChatHistories();
        const updatedSession = updatedSessions[sessionId];
        io.to(ADMINS_ROOM).emit("dashboard-update", updatedSession);
      } catch (err) {
        console.error("❌ Error in join-session:", err);
      }
    });

    /**
     * Admin message
     * payload: { sessionId, user: { id, name, email }, text }
     */
    socket.on("admin-message", async (msg) => {
      try {
        const newMsg = await saveMessage({
          ...msg,
          userType: "admin"
        });

        // Assign admin & reset unread
        const conn = connections["marhabaconnect"];
        const Session = conn.model("Session", sessionSchema);
        await Session.findOneAndUpdate(
          { sessionId: msg.sessionId },
          {
            $set: {
              assignedAdmin: {
                id: msg.user.id,
                name: msg.user.name,
                email: msg.user.email
              },
              unreadCount: 0,
              lastMessageAt: new Date()
            }
          }
        );

        // Message to room
        io.to(msg.sessionId).emit("message", newMsg);

        // Dashboard update
        const updatedSessions = await getAllChatHistories();
        const updatedSession = updatedSessions[msg.sessionId];
        io.to(ADMINS_ROOM).emit("dashboard-update", updatedSession);
      } catch (err) {
        console.error("❌ Error saving admin message:", err);
      }
    });

    /**
     * Admin fetches session messages (also resets unread)
     * payload: { sessionId }
     */
    socket.on("get-session-messages", async ({ sessionId }) => {
      try {
        const messages = await getMessagesBySession(sessionId);

        // Reset unread
        const conn = connections["marhabaconnect"];
        const Session = conn.model("Session", sessionSchema);
        await Session.findOneAndUpdate({ sessionId }, { $set: { unreadCount: 0 } });

        io.to(socket.id).emit("session-messages", { sessionId, messages: messages || [] });

        const updatedSessions = await getAllChatHistories();
        const updatedSession = updatedSessions[sessionId];
        io.to(ADMINS_ROOM).emit("dashboard-update", updatedSession);
      } catch (err) {
        console.error("❌ Error fetching session messages:", err);
      }
    });

    /**
     * Typing relay
     * payload: { sessionId, from, isTyping, adminId? }
     */
    socket.on("typing", ({ sessionId, from, isTyping, adminId, adminName }) => {
      // Optionally include admin identity for per-admin typing indicator
      socket.to(sessionId).emit("typing", { from, isTyping, adminId, adminName });
    });

    /**
     * Customer minimized/restored to refine unread badge UX
     */
    socket.on("minimized", ({ sessionId }) => {
      minimizedSessions.add(sessionId);
    });
    socket.on("restored", ({ sessionId }) => {
      minimizedSessions.delete(sessionId);
    });

    /**
     * Optionally close session
     */
    socket.on("close-session", async ({ sessionId }) => {
      try {
        await closeSession(sessionId);
        const updatedSessions = await getAllChatHistories();
        io.to(ADMINS_ROOM).emit("dashboard-update", updatedSessions[sessionId]);
      } catch (err) {
        console.error("❌ Error closing session:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });
}