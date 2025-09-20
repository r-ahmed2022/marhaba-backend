// sockets/chatSocket.js
import Contact from '../models/Contact.js';
import connections from '../config/db.js';
import { DateTime } from "luxon";
import { sendEmail} from '../utils/sendEmail.js';
import { isOfficeHours } from '../utils/getTimeZone.js';
import dotenv from 'dotenv';
dotenv.config();
const sessionMessages = new Map();
// sessionId → { messages: [{ sender, text, timestamp }], customer: { name, email } }

// Track how many live socket connections exist per sessionId (handles multi-tab)
const sessionConnections = new Map(); // sessionId → number
// Pending deliveries for admin -> customer messages, keyed by cid
const pendingDeliveries = new Map(); // cid → { sessionId, attempts, timer }

// Pending offline/idle email notifications per session
const pendingEmailTimers = new Map(); // sessionId → timer
const lastNotifyAt = new Map(); // sessionId → timestamp(ms)
const NOTIFY_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const IDLE_NOTIFY_DELAY_MS = 2 * 60 * 1000; // 2 minutes (during office hours when no admins online)




export default function registerChatSocket(io) {
  io.on('connection', async (socket) => {
    const { role, sessionId, name, email, timezone } = socket.handshake.query;

    // — Admin connects —
    if (role === 'admin') {
      socket.join('admins');

      // Any admin online → cancel all pending idle notifications
      try {
        for (const [sid, timer] of pendingEmailTimers) {
          try { clearTimeout(timer); } catch (_) {}
          pendingEmailTimers.delete(sid);
        }
      } catch (_) {}

      // Emit current active sessions from memory
      const allSessions = Array.from(sessionMessages.keys()).map((sid) => {
        const session = sessionMessages.get(sid) || { messages: [], customer: {} };
        const msgs = session.messages || [];
        const last = msgs[msgs.length - 1];
        return {
          sessionId: sid,
          customer: session.customer,
          createdAt: msgs[0]?.timestamp,
          lastMessageAt: last?.timestamp,
          status: (sessionConnections.get(sid) > 0 ? 'online' : 'offline'),
          unread: 0,
        };
      });

      // Fetch contact info for active sessions (only if DB is available)
      Contact.find({ sessionId: { $in: allSessions.map(s => s.sessionId) } })
        .then((docs) => {
          docs.forEach((doc) => {
            const sess = allSessions.find(s => s.sessionId === doc.sessionId);
            if (sess) {
              sess.customer = { name: doc.name, email: doc.email };
            }
          });
          socket.emit('active_sessions', allSessions);

          // Attempt resend of any pending customer->admin deliveries (admin connected)
          try {
            for (const [k, v] of pendingDeliveries) {
              if (v?.expect === 'admin' && v?.msg) {
                io.to('admins').emit('message', { sessionId: v.sessionId, ...v.msg });
              }
            }
          } catch (_) {}
        })
        .catch((error) => {
          console.error('Database query failed:', error.message);
          // Send sessions without contact info
          socket.emit('active_sessions', allSessions);

          // Attempt resend of any pending customer->admin deliveries (admin connected)
          try {
            for (const [k, v] of pendingDeliveries) {
              if (v?.expect === 'admin' && v?.msg) {
                io.to('admins').emit('message', { sessionId: v.sessionId, ...v.msg });
              }
            }
          } catch (_) {}
        });
    }

    // — Customer connects —
    if (role !== 'admin') {
      socket.join(sessionId);
      const existing = sessionMessages.get(sessionId) || { messages: [], customer: {} };
      sessionMessages.set(sessionId, { ...existing, customer: { name, email, timezone } });

      // Notify admins of updated sessions
      const allSessions = Array.from(sessionMessages.keys()).map((sid) => {
        const session = sessionMessages.get(sid) || { messages: [], customer: {} };
        const msgs = session.messages || [];
        const last = msgs[msgs.length - 1];
        return {
          sessionId: sid,
          customer: session.customer,
          createdAt: msgs[0]?.timestamp,
          lastMessageAt: last?.timestamp,
          status: (sessionConnections.get(sid) > 0 ? 'online' : 'offline'),
          unread: 0,
        };
      });

      // Fetch contact info for active sessions (only if DB is available)
      Contact.find({ sessionId: { $in: allSessions.map(s => s.sessionId) } })
        .then((docs) => {
          docs.forEach((doc) => {
            const sess = allSessions.find(s => s.sessionId === doc.sessionId);
            if (sess) {
              sess.customer = { name: doc.name, email: doc.email };
            }
          });
          io.to('admins').emit('active_sessions', allSessions);

          // Attempt resend of pending admin->customer deliveries for this session
          try {
            for (const [k, v] of pendingDeliveries) {
              if (v?.expect === 'customer' && v.sessionId === sessionId && v?.msg) {
                io.to(sessionId).emit('message', { sessionId: v.sessionId, ...v.msg });
              }
            }
          } catch (_) {}
        })
        .catch((error) => {
          console.error('Database query failed:', error.message);
          // Send sessions without contact info
          io.to('admins').emit('active_sessions', allSessions);

          // Attempt resend of pending admin->customer deliveries for this session
          try {
            for (const [k, v] of pendingDeliveries) {
              if (v?.expect === 'customer' && v.sessionId === sessionId && v?.msg) {
                io.to(sessionId).emit('message', { sessionId: v.sessionId, ...v.msg });
              }
            }
          } catch (_) {}
        });

      // Recognize returning customer by email, then persist/update by sessionId
      let returningByEmail = false;
      try {
        const prevByEmail = await Contact.findOne({ email }).lean();
        if (prevByEmail && prevByEmail.sessionId !== sessionId) {
          returningByEmail = true;
        }
      } catch (error) {
        console.error('Database lookup failed:', error.message);
      }
  
      // Persist or update contact info (only if DB is available)
      try {
        await Contact.findOneAndUpdate(
          { sessionId },
          { name, email, timezone, lastActive: Date.now() },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error('Database operation failed:', error.message);
        // Continue without database - chat will still work in memory
      }

      // Track connection count for this session
      const curr = (sessionConnections.get(sessionId) || 0) + 1;
      sessionConnections.set(sessionId, curr);

      // Notify admins a customer went online only when first connection appears
      if (curr === 1) {
        io.to('admins').emit('customer_status', {
          sessionId,
          status: 'online',
          customer: { name, email }
        });

        // If recognized by email as a returning customer, greet on first reconnect
        if (returningByEmail) {
          // Do NOT persist this in session history to avoid showing in admin transcript
          const msg = {
            sender: 'admin',
            user: 'system',
            system: true,
            text: 'Welcome back!',
            timestamp: Date.now(),
          };
          // Broadcast welcome message (customer only; not to admins)
          io.to(sessionId).emit('message', { sessionId, ...msg });
        }
      }
    }

    // — Customer emits message —
    socket.on('message', async ({ sessionId, sender, text, cid }) => {
      const t = (text ?? '').toString().trim();
      if (!t) {
        console.warn('Ignored empty customer message', { sessionId, cid });
        return;
      }

      const msg = { sender, text: t, timestamp: Date.now(), cid };
      const session = sessionMessages.get(sessionId);
      const tz = session?.customer?.timezone || timezone;

      // Decide whether to notify staff by email
      try {
        const inHours = isOfficeHours(tz);
        const adminsOnlineCount = io.sockets.adapter.rooms.get('admins')?.size || 0;
        const adminsOnline = adminsOnlineCount > 0;

        const lastAt = lastNotifyAt.get(sessionId) || 0;
        const canNotify = (Date.now() - lastAt) > NOTIFY_COOLDOWN_MS;

        if (!inHours) {
          // After office hours: notify immediately (throttled)
          if (canNotify) {
            await sendEmail({
              to: process.env.EMAIL_USER,
              subject: `Offline chat from ${session?.customer?.name || name}`,
              html: `
                <h3>New offline chat message</h3>
                <p><strong>Name:</strong> ${session?.customer?.name || name}</p>
                <p><strong>Email:</strong> ${session?.customer?.email || email}</p>
                <p><strong>Message:</strong> ${t}</p>
                <p><em>Timezone:</em> ${tz}</p>
              `,
              templateName: 'offlineChat',
              firm: 'Marhaba Connect',
            });
            lastNotifyAt.set(sessionId, Date.now());
          }
        } else if (!adminsOnline) {
          // During office hours but no admins online: schedule a delayed notify if not already scheduled
          if (!pendingEmailTimers.has(sessionId)) {
            const timer = setTimeout(async () => {
              try {
                const stillAdminsOnline = (io.sockets.adapter.rooms.get('admins')?.size || 0) > 0;
                const okToNotify = ((Date.now() - (lastNotifyAt.get(sessionId) || 0)) > NOTIFY_COOLDOWN_MS);
                if (!stillAdminsOnline && okToNotify) {
                  await sendEmail({
                    to: process.env.EMAIL_USER,
                    subject: `Unattended chat during office hours from ${session?.customer?.name || name}`,
                    html: `
                      <h3>Customer waiting without staff online</h3>
                      <p><strong>Name:</strong> ${session?.customer?.name || name}</p>
                      <p><strong>Email:</strong> ${session?.customer?.email || email}</p>
                      <p><strong>Last Message:</strong> ${t}</p>
                      <p><em>Timezone:</em> ${tz}</p>
                    `,
                    templateName: 'idleChat',
                    firm: 'Marhaba Connect',
                  });
                  lastNotifyAt.set(sessionId, Date.now());
                }
              } catch (e) {
                console.error('Idle notify failed:', e?.message || e);
              } finally {
                pendingEmailTimers.delete(sessionId);
              }
            }, IDLE_NOTIFY_DELAY_MS);
            pendingEmailTimers.set(sessionId, timer);
          }
        } else {
          // In office hours and admins online: do nothing (no email)
        }
      } catch (e) {
        console.error('Notify decision failed:', e?.message || e);
      }

      if (!session) {
        sessionMessages.set(sessionId, { messages: [], customer: {} });
      }
      sessionMessages.get(sessionId).messages.push(msg);

      // Persist to DB (best-effort)
      try {
        const Message = connections['marhabaconnect']?.model('Message');
        if (Message) {
          await Message.create({
            sessionId,
            sender,
            text: t,
            cid,
            timestamp: new Date(msg.timestamp)
          });
        }
      } catch (err) {
        console.error('DB save (customer) failed:', err?.message || err);
      }

      console.log('Customer message:', msg);

      // To customer/admin panels (include cid for de-dup on clients)
      io.to(sessionId).emit('message', { sessionId, ...msg });
      io.to('admins').emit('message', { sessionId, ...msg });

      // Best-effort delivery to admins: retry until an admin ACKs the message
      if (cid) {
        if (!pendingDeliveries.has(cid)) {
          // Store sanitized msg snapshot for reliable resend
          const entry = { sessionId, attempts: 0, timer: null, expect: 'admin', msg: { ...msg } };
          const resend = () => {
            const e = pendingDeliveries.get(cid);
            if (!e) return;
            if (e.attempts >= 8) {
              pendingDeliveries.delete(cid);
              return;
            }
            e.attempts += 1;
            io.to('admins').emit('message', { sessionId: e.sessionId, ...e.msg });
            e.timer = setTimeout(resend, 1500);
          };
          pendingDeliveries.set(cid, entry);
          entry.timer = setTimeout(resend, 1500);
        }
      }
    });

    // — Typing indicator —
    socket.on('typing', ({ sessionId, isTyping, adminName }) => {
      if (role === 'admin') {
        // notify the customer in this session, include adminName for better UX on client
        io.to(sessionId).emit('typing', { sessionId, from: 'admin', isTyping, adminName });
      } else {
        // notify admins
        io.to('admins').emit('typing', { sessionId, from: 'customer', isTyping });
      }
    });

    // — Get session messages (for admin/customer) —
    socket.on('get-session-messages', async ({ sessionId: sid }) => {
      let messages = [];
      try {
        const Message = connections['marhabaconnect']?.model('Message');
        if (Message) {
          const rows = await Message.find({ sessionId: sid })
            .sort({ timestamp: 1, createdAt: 1 })
            .lean();
          const isAdmin = socket.handshake?.query?.role === 'admin';
          messages = (rows || [])
            .filter(r => r && typeof r.text === 'string' && r.text.trim().length > 0)
            .filter(r => (isAdmin ? !(r?.user === 'system' || r?.system) : true))
            .map(r => ({
              sender: r.sender,
              text: r.text.toString().trim(),
              timestamp: new Date(r.timestamp).getTime() || new Date(r.createdAt).getTime() || Date.now(),
              cid: r.cid,
              user: r.user
            }));
        } else {
          // Fallback to in-memory if DB unavailable
          const session = sessionMessages.get(sid);
          const isAdmin = socket.handshake?.query?.role === 'admin';
          messages = (session?.messages || [])
            .filter(m => m && typeof m.text === 'string' && m.text.trim().length > 0)
            .filter(m => (isAdmin ? !(m?.user === 'system' || m?.system) : true))
            .map(m => ({
              ...m,
              text: m.text.toString().trim(),
              timestamp: Number.isFinite(m.timestamp) ? m.timestamp : (new Date(m.timestamp).getTime() || Date.now())
            }));
        }
      } catch (err) {
        console.error('DB load (get-session-messages) failed:', err?.message || err);
        // Fallback to in-memory
        const session = sessionMessages.get(sid);
        const isAdmin = socket.handshake?.query?.role === 'admin';
        messages = (session?.messages || [])
          .filter(m => m && typeof m.text === 'string' && m.text.trim().length > 0)
          .filter(m => (isAdmin ? !(m?.user === 'system' || m?.system) : true))
          .map(m => ({
            ...m,
            text: m.text.toString().trim(),
            timestamp: Number.isFinite(m.timestamp) ? m.timestamp : (new Date(m.timestamp).getTime() || Date.now())
          }));
      }

      socket.emit('session-messages', {
        sessionId: sid,
        messages
      });
    });

    // — Message delivery acknowledgment —
    socket.on('message_ack', ({ sessionId: sid, cid, from }) => {
      if (!cid) return;
      const entry = pendingDeliveries.get(cid);
      if (entry && entry.sessionId === sid && from && entry.expect === from) {
        try { clearTimeout(entry.timer); } catch (_) {}
        pendingDeliveries.delete(cid);
      }
    });

    // — Explicit join from clients (redundant safety) —
    // Some client SDKs may connect before query is ready; allow explicit join to ensure room membership.
    socket.on('join', ({ sessionId: sid, name: n, email: e, role: r }) => {
      if (!sid) return;
      socket.join(sid);

      // If customer provides name/email, update in-memory contact
      if (r !== 'admin') {
        const existing = sessionMessages.get(sid) || { messages: [], customer: {} };
        const customer = {
          name:  n ?? existing.customer?.name,
          email: e ?? existing.customer?.email
        };
        sessionMessages.set(sid, { ...existing, customer });

        // Notify admins customer is online/updated
        io.to('admins').emit('customer_status', {
          sessionId: sid,
          status: 'online',
          customer
        });

        // Attempt resend of pending admin->customer deliveries for this session
        try {
          for (const [k, v] of pendingDeliveries) {
            if (v?.expect === 'customer' && v.sessionId === sid && v?.msg) {
              io.to(sid).emit('message', { sessionId: v.sessionId, ...v.msg });
            }
          }
        } catch (_) {}
      }
    });

    // — Admin message —
    socket.on('admin-message', ({ sessionId, user, text, cid }) => {
      const t = (text ?? '').toString().trim();
      const onlineCount = sessionConnections.get(sessionId) || 0;

      // Any admin activity cancels pending idle notifications for this session
      try {
        const timer = pendingEmailTimers.get(sessionId);
        if (timer) {
          try { clearTimeout(timer); } catch (_) {}
          pendingEmailTimers.delete(sessionId);
        }
      } catch (_) {}

      // If customer is offline, queue for delivery and echo to admins (do NOT create in-memory session)
      if (onlineCount === 0) {
        if (!t) {
          socket.emit('chatError', { message: 'Empty message' });
        } else {
          const msg = { sender: 'admin', text: t, timestamp: Date.now(), user, cid };

          // Persist to DB (best-effort) without touching in-memory session map
          try {
            const Message = connections['marhabaconnect']?.model('Message');
            if (Message) {
              Message.create({
                sessionId,
                sender: 'admin',
                text: t,
                cid,
                timestamp: new Date(Date.now()),
                user: (typeof user === 'object' ? user : undefined)
              }).catch(err => console.error('DB save (admin offline) failed:', err?.message || err));
            }
          } catch (err) {
            console.error('DB save (admin offline) threw:', err?.message || err);
          }

          // Echo only to admins (customer is offline)
          io.to('admins').emit('message', { sessionId, ...msg });

          // Enqueue pending delivery for the customer (pendingDeliveries only)
          if (cid && !pendingDeliveries.has(cid)) {
            const entry = { sessionId, attempts: 0, timer: null, expect: 'customer', msg: { ...msg } };
            const resend = () => {
              const e = pendingDeliveries.get(cid);
              if (!e) return;
              if (e.attempts >= 8) {
                pendingDeliveries.delete(cid);
                return;
              }
              e.attempts += 1;
              io.to(e.sessionId).emit('message', { sessionId: e.sessionId, ...e.msg });
              e.timer = setTimeout(resend, 1500);
            };
            pendingDeliveries.set(cid, entry);
            entry.timer = setTimeout(resend, 1500);
          }
        }
        return;
      }

      // t already computed above
      if (!t) {
        socket.emit('chatError', { message: 'Empty message' });
        console.warn('Ignored empty admin message', { sessionId, cid });
        return;
      }
      const msg = { sender: 'admin', text: t, timestamp: Date.now(), user, cid };
      const session = sessionMessages.get(sessionId);
      if (!session) {
        sessionMessages.set(sessionId, { messages: [], customer: {} });
      }
      sessionMessages.get(sessionId).messages.push(msg);

      // Persist to DB (best-effort)
      try {
        const Message = connections['marhabaconnect']?.model('Message');
        if (Message) {
          Message.create({
            sessionId,
            sender: 'admin',
            text: t,
            cid,
            timestamp: new Date(msg.timestamp),
            user: (typeof user === 'object' ? user : undefined)
          }).catch(err => console.error('DB save (admin) failed:', err?.message || err));
        }
      } catch (err) {
        console.error('DB save (admin) threw:', err?.message || err);
      }

      console.log('Admin message:', msg);

      // To customer and admins (include cid so clients can de-dup)
      io.to(sessionId).emit('message', { sessionId, ...msg });
      io.to('admins').emit('message', { sessionId, ...msg });

      // Safety-net: also push the full (sanitized) transcript to the customer to avoid UI gaps
      try {
        const full = (sessionMessages.get(sessionId)?.messages) || [];
        const safe = full
          .filter(m => m && typeof m.text === 'string' && m.text.trim().length > 0)
          .map(m => ({
            ...m,
            text: m.text.toString().trim(),
            timestamp: Number.isFinite(m.timestamp)
              ? m.timestamp
              : (new Date(m.timestamp).getTime() || Date.now())
          }));
        io.to(sessionId).emit('session-messages', { sessionId, messages: safe });
      } catch (_) { /* ignore */ }

      // Schedule retries to customer until ack or max attempts (best-effort delivery)
      if (cid) {
        if (!pendingDeliveries.has(cid)) {
          // Store sanitized msg snapshot for reliable resend
          const entry = { sessionId, attempts: 0, timer: null, expect: 'customer', msg: { ...msg } };
          const resend = () => {
            const e = pendingDeliveries.get(cid);
            if (!e) return;
            if (e.attempts >= 8) {
              // give up after attempts
              pendingDeliveries.delete(cid);
              return;
            }
            e.attempts += 1;
            io.to(e.sessionId).emit('message', { sessionId: e.sessionId, ...e.msg });
            e.timer = setTimeout(resend, 1500);
          };
          pendingDeliveries.set(cid, entry);
          entry.timer = setTimeout(resend, 1500);
        }
      }
    });

    // — On disconnect —
    socket.on('disconnect', () => {
      if (role !== 'admin') {
        socket.leave(sessionId);

        // Decrement connection count and only set offline when it reaches 0
        const prev = sessionConnections.get(sessionId) || 1;
        const next = Math.max(0, prev - 1);
        sessionConnections.set(sessionId, next);

        if (next === 0) {
          // Clear any pending delivery retries for this session (prevent leaks)
          try {
            for (const [k, v] of pendingDeliveries) {
              if (v?.sessionId === sessionId) {
                try { clearTimeout(v.timer); } catch (_) {}
                pendingDeliveries.delete(k);
              }
            }
          } catch (_) {}

          // Remove in-memory transcript for this session to avoid stale totals/UI residue
          sessionMessages.delete(sessionId);

          // Delete temporary messages from DB for this session (best-effort)
          try {
            const Message = connections['marhabaconnect']?.model('Message');
            if (Message) {
              Message.deleteMany({ sessionId })
                .catch(err => console.error('DB delete (on disconnect) failed:', err?.message || err));
            }
          } catch (err) {
            console.error('DB delete (on disconnect) threw:', err?.message || err);
          }

          io.to('admins').emit('customer_status', {
            sessionId,
            status: 'offline'
          });
        }
      }
    });
  });
}