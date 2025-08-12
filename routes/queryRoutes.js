import express from 'express';
import { saveQuery } from '../controllers/queryController.js';
import { connectDomain } from '../middleware/connectionMiddleware.js';

const router = express.Router();
router.post('/', connectDomain, saveQuery);

export default router;