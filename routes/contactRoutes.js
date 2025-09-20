import express from 'express';
import { upsertContact, listContacts } from '../controllers/contactController.js';

const router = express.Router();

// Called on "join" to capture name/email
router.post('/', upsertContact);

// Admin can list recent contacts
router.get('/', listContacts);

export default router;