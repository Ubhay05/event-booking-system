const router = require('express').Router();
const { joinWaitlist, getMyWaitlist, leaveWaitlist } = require('../controllers/waitlistController');
const { protect } = require('../middleware/auth');

router.post('/',      protect, joinWaitlist);
router.get('/my',     protect, getMyWaitlist);
router.delete('/:id', protect, leaveWaitlist);

module.exports = router;