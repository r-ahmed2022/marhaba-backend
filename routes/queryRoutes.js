import express from 'express';
import { saveQuery } from '../controllers/queryController.js';

const router = express.Router();
router.post('/', saveQuery);

export default router;