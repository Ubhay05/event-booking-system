const router   = require('express').Router();
const authRoutes = require('./auth');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

router.use('/auth', authRoutes);

module.exports = router;