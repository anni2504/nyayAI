import { Router } from 'express';
import { handleRegister, handleLogin, handleLogout, handleMe } from '../controllers/authController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/logout', handleLogout);
router.get('/me', authenticateJWT, handleMe);

export default router;
