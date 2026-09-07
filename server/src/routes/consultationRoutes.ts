import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import {
  joinConsultation,
  getUserBookings,
  getConsultationDetails,
  endConsultation,
  addConsultationNotes,
  getConsultationNotes,
  getConsultationMessages,
  addConsultationMessage,
  createBooking,
  updateBookingStatus
} from '../controllers/consultationController.js';

const router = Router();

// Protected Consultation Endpoints
router.get('/bookings', authenticateJWT, getUserBookings);
router.post('/bookings', requireRole('CLIENT'), createBooking);
router.patch('/bookings/:bookingId/status', authenticateJWT, updateBookingStatus);
router.get('/:bookingId', authenticateJWT, getConsultationDetails);
router.post('/:bookingId/join', authenticateJWT, joinConsultation);
router.post('/:bookingId/end', authenticateJWT, endConsultation);
router.post('/:bookingId/notes', requireRole('ADVOCATE'), addConsultationNotes);
router.get('/:bookingId/notes', requireRole('ADVOCATE'), getConsultationNotes);
router.get('/:bookingId/messages', authenticateJWT, getConsultationMessages);
router.post('/:bookingId/messages', authenticateJWT, addConsultationMessage);

export default router;