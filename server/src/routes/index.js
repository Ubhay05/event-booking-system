const router          = require('express').Router();
const authRoutes      = require('./auth');
const eventRoutes     = require('./events');
const bookingRoutes   = require('./bookings');
const waitlistRoutes  = require('./waitlist');
const adminRoutes     = require('./admin');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

router.use('/auth',     authRoutes);
router.use('/events',   eventRoutes);
router.use('/bookings', bookingRoutes);
router.use('/waitlist', waitlistRoutes);
router.use('/admin',    adminRoutes);

module.exports = router;