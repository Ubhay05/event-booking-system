const router          = require('express').Router();
const authRoutes      = require('./auth');
const eventRoutes     = require('./events');
const bookingRoutes   = require('./bookings');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

router.use('/auth',     authRoutes);
router.use('/events',   eventRoutes);
router.use('/bookings', bookingRoutes);

module.exports = router;