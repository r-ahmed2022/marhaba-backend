import { Router } from "express";
import { getSessions, getSessionMessages } from "../controllers/sessionController.js";

const router = Router();

// GET /api/sessions?status=open|closed
router.get("/", getSessions);

// GET /api/sessions/:sessionId/messages
router.get("/:sessionId/messages", getSessionMessages);

export default router;
