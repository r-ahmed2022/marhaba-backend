// routes/leadRoutes.js
import express from 'express';
import { saveLead } from '../controllers/leadController.js';
import { connectDomain } from '../middleware/connectionMiddleware.js';
import { localize } from '../middleware/localize.js';

const router = express.Router();

// Apply connectDomain middleware so req.db and req.firm are set before controller runs
router.post('/', connectDomain, saveLead);

export default router;