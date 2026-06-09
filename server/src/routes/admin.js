const router = require('express').Router();
const { getStats, getAllEvents, getAllBookings, getAllUsers, updateEventStatus } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly); // all admin routes require auth + admin role

router.get('/stats',              getStats);
router.get('/events',             getAllEvents);
router.get('/bookings',           getAllBookings);
router.get('/users',              getAllUsers);
router.patch('/events/:id/status', updateEventStatus);

module.exports = router;