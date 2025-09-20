import express from 'express';
import { login, logout, signup, updateProfile, authenticated } from '../controllers/auth.controller.js';
import  verifyRoute  from '../middleware/verifyRoute.js';
import { connectDomain } from '../middleware/connectionMiddleware.js';
const router = express.Router();
router.post('/signup', connectDomain, signup );
router.post('/login', login);   
router.get('/logout', logout);

router.put('/update', verifyRoute, updateProfile);
router.get("/authenticated", verifyRoute, authenticated);
   
export default  router ;
