// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { localize } from "./middleware/localize.js";
import corsOptions from "./config/corsOptions.js";
import leadRoutes from "./routes/leadRoutes.js";
import queryRoutes from "./routes/queryRoutes.js";
import { initDBConnections } from "./config/db.js";
import { connectDomain } from "./middleware/connectionMiddleware.js";
import { Server } from "socket.io";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import contactRoutes from './routes/contactRoutes.js';
import registerChatSocket from './sockets/chatSocket.js';

dotenv.config();
await initDBConnections();

const app = express();
const httpServer = createServer(app);


const io = new Server(httpServer, {
  path: "/socket.io/chat",
  cors: corsOptions,
  connectionStateRecovery: {
    maxDisconnectionDuration: 60_000
  }
});

app.set("trust proxy", true);
app.use(cors(corsOptions));
app.use(express.json());
app.use(localize);
app.use(cookieParser());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(path.join(__dirname, "public")));
app.options(/^\/.*$/, cors(corsOptions), (req, res) => res.sendStatus(204));

// Routes
app.use(connectDomain);
app.use("/api/interest", leadRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/contacts', contactRoutes);

// server.js (after all routes)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});
// Sockets
registerChatSocket(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on https://marhaba-backend.onrender.com:${PORT}`);
});