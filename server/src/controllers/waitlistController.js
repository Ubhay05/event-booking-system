const pool = require('../config/db');

// POST /api/v1/waitlist — join waitlist
const joinWaitlist = async (req, res, next) => {
  try {
    const { event_id, seats_wanted } = req.body;

    if (!event_id || !seats_wanted)
      return res.status(400).json({ success: false, error: 'event_id and seats_wanted are required' });

    // Check event exists
    const { rows: events } = await pool.query(
      'SELECT * FROM events WHERE id = $1', [event_id]
    );
    if (!events.length)
      return res.status(404).json({ success: false, error: 'Event not found' });

    // Check if already booked
    const { rows: existing } = await pool.query(
      `SELECT id FROM bookings 
       WHERE user_id = $1 AND event_id = $2 AND status = 'confirmed'`,
      [req.user.id, event_id]
    );
    if (existing.length)
      return res.status(400).json({ success: false, error: 'You already have a booking for this event' });

    // Check if already on waitlist
    const { rows: onList } = await pool.query(
      'SELECT id FROM waitlist WHERE user_id = $1 AND event_id = $2',
      [req.user.id, event_id]
    );
    if (onList.length)
      return res.status(400).json({ success: false, error: 'You are already on the waitlist' });

    const { rows } = await pool.query(
      `INSERT INTO waitlist (user_id, event_id, seats_wanted)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, event_id, seats_wanted]
    );

    res.status(201).json({ success: true, waitlist: rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/waitlist/my — my waitlist entries
const getMyWaitlist = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.*, e.title, e.starts_at, e.location, e.available_seats
       FROM waitlist w
       JOIN events e ON e.id = w.event_id
       WHERE w.user_id = $1
       ORDER BY w.created_at ASC`,
      [req.user.id]
    );
    res.json({ success: true, count: rows.length, waitlist: rows });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/waitlist/:id — leave waitlist
const leaveWaitlist = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM waitlist WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Waitlist entry not found' });

    res.json({ success: true, message: 'Removed from waitlist' });
  } catch (err) {
    next(err);
  }
};

module.exports = { joinWaitlist, getMyWaitlist, leaveWaitlist };