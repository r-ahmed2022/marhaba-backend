import express from 'express';
import { saveLead } from '../controllers/leadController.js';
import { localize } from '../middleware/localize.js';
const router = express.Router();
router.post('/', localize, saveLead);

export default router;