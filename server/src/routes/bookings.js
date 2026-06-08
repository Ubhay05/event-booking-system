const router = require('express').Router();
const { createBooking, getMyBookings, cancelBooking } = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

router.post('/',        protect, createBooking);
router.get('/my',       protect, getMyBookings);
router.delete('/:id',   protect, cancelBooking);

module.exports = router;