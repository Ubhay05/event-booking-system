const pool = require('../config/db');

// GET /api/v1/admin/stats
const getStats = async (req, res, next) => {
  try {
    const [users, events, bookings, revenue] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM events WHERE status = $1', ['published']),
      pool.query('SELECT COUNT(*) FROM bookings WHERE status = $1', ['confirmed']),
      pool.query(`
        SELECT COALESCE(SUM(e.price * b.seats_booked), 0) as total
        FROM bookings b
        JOIN events e ON e.id = b.event_id
        WHERE b.status = 'confirmed'
      `),
    ]);

    res.json({
      success: true,
      stats: {
        total_users:    parseInt(users.rows[0].count),
        total_events:   parseInt(events.rows[0].count),
        total_bookings: parseInt(bookings.rows[0].count),
        total_revenue:  parseFloat(revenue.rows[0].total),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/events
const getAllEvents = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, u.name AS organizer,
        COUNT(b.id) FILTER (WHERE b.status = 'confirmed') AS booking_count
       FROM events e
       JOIN users u ON u.id = e.created_by
       LEFT JOIN bookings b ON b.event_id = e.id
       GROUP BY e.id, u.name
       ORDER BY e.created_at DESC`
    );
    res.json({ success: true, events: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/bookings
const getAllBookings = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, u.name AS user_name, u.email AS user_email, e.title AS event_title
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN events e ON e.id = b.event_id
       ORDER BY b.created_at DESC
       LIMIT 50`
    );
    res.json({ success: true, bookings: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/users
const getAllUsers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
        COUNT(b.id) FILTER (WHERE b.status = 'confirmed') AS booking_count
       FROM users u
       LEFT JOIN bookings b ON b.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    next(err);
  }
};

const updateEventStatus = async (req, res, next) => {
    const client = await pool.connect();
    try {
      const { status } = req.body;
      if (!['draft', 'published', 'cancelled'].includes(status))
        return res.status(400).json({ success: false, error: 'Invalid status' });
  
      await client.query('BEGIN');
  
      const { rows: existing } = await client.query(
        'SELECT * FROM events WHERE id = $1', [req.params.id]
      );
      if (!existing.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Event not found' });
      }
  
      let query, params;
  
      if (status === 'cancelled') {
        // Cancel all confirmed bookings and clear waitlist
        await client.query(
          `UPDATE bookings SET status = 'cancelled' 
           WHERE event_id = $1 AND status = 'confirmed'`,
          [req.params.id]
        );
        await client.query(
          `DELETE FROM waitlist WHERE event_id = $1`,
          [req.params.id]
        );
        query  = 'UPDATE events SET status = $1 WHERE id = $2 RETURNING *';
        params = [status, req.params.id];
      } else if (status === 'published') {
        // Reset available_seats back to total_seats when republishing
        query  = `UPDATE events SET status = $1, available_seats = total_seats WHERE id = $2 RETURNING *`;
        params = [status, req.params.id];
      } else {
        query  = 'UPDATE events SET status = $1 WHERE id = $2 RETURNING *';
        params = [status, req.params.id];
      }
  
      const { rows } = await client.query(query, params);
  
      await client.query('COMMIT');
      res.json({ success: true, event: rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  };

module.exports = { getStats, getAllEvents, getAllBookings, getAllUsers, updateEventStatus };