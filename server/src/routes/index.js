const router      = require('express').Router();
const authRoutes  = require('./auth');
const eventRoutes = require('./events');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

router.use('/auth',   authRoutes);
router.use('/events', eventRoutes);

module.exports = router;