import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import {
  joinConsultation,
  getUserBookings,
  getConsultationDetails,
  endConsultation,
  addConsultationNotes,
  createBooking
} from '../controllers/consultationController.js';

const router = Router();

// Protected Consultation Endpoints
router.get('/bookings', authenticateJWT, getUserBookings);
router.post('/bookings', requireRole('CLIENT'), createBooking);
router.get('/:bookingId', authenticateJWT, getConsultationDetails);
router.post('/:bookingId/join', authenticateJWT, joinConsultation);
router.post('/:bookingId/end', authenticateJWT, endConsultation);
router.post('/:bookingId/notes', requireRole('ADVOCATE'), addConsultationNotes);

export default router;
