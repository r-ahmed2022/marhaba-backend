import express from 'express';
import { saveLead } from '../controllers/leadController.js';

const router = express.Router();
router.post('/', saveLead);

export default router;