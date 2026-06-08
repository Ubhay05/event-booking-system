const pool  = require('../config/db');
const redis = require('../config/redis');
const { randomUUID: uuidv4 } = require('crypto');

// POST /api/v1/bookings
const createBooking = async (req, res, next) => {
  const client = await pool.connect(); // grab a dedicated client for the transaction
  try {
    const { event_id, seats_wanted, idempotency_key } = req.body;

    if (!event_id || !seats_wanted)
      return res.status(400).json({ success: false, error: 'event_id and seats_wanted are required' });

    // Idempotency check — if same request is sent twice, return the original result
    const iKey = idempotency_key || uuidv4();
    const cached = await redis.get(`idempotency:${iKey}`);
    if (cached) {
      return res.status(200).json({ success: true, booking: JSON.parse(cached), idempotent: true });
    }

    await client.query('BEGIN');

    // Lock the event row so no other transaction can modify it until we commit
    // This is the key line that prevents double-booking
    const { rows: events } = await client.query(
      `SELECT * FROM events WHERE id = $1 FOR UPDATE`,
      [event_id]
    );

    if (!events.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const event = events[0];

    if (event.status !== 'published') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Event is not available for booking' });
    }

    if (event.available_seats < seats_wanted) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: `Only ${event.available_seats} seats available` });
    }

    // Deduct seats
    await client.query(
      `UPDATE events SET available_seats = available_seats - $1 WHERE id = $2`,
      [seats_wanted, event_id]
    );

    // Create booking
    const { rows: bookings } = await client.query(
      `INSERT INTO bookings (user_id, event_id, seats_booked, idempotency_key)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, event_id, seats_wanted, iKey]
    );

    await client.query('COMMIT');

    const booking = bookings[0];

    // Cache result for idempotency (24 hours)
    await redis.setex(`idempotency:${iKey}`, 86400, JSON.stringify(booking));

    res.status(201).json({ success: true, booking });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release(); // always release back to pool
  }
};

// GET /api/v1/bookings — my bookings
const getMyBookings = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, e.title, e.starts_at, e.location
       FROM bookings b
       JOIN events e ON e.id = b.event_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, count: rows.length, bookings: rows });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/bookings/:id — cancel booking
const cancelBooking = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = rows[0];

    if (booking.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Booking already cancelled' });
    }

    // Mark booking cancelled
    await client.query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1`,
      [booking.id]
    );

    // Restore seats back to event
    await client.query(
      `UPDATE events SET available_seats = available_seats + $1 WHERE id = $2`,
      [booking.seats_booked, booking.event_id]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: 'Booking cancelled and seats restored' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { createBooking, getMyBookings, cancelBooking };