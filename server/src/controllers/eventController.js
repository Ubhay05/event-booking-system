const pool = require('../config/db');

// GET /api/v1/events — list all published events
const getEvents = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, u.name AS organizer
       FROM events e
       JOIN users u ON u.id = e.created_by
       WHERE e.status = 'published'
       ORDER BY e.starts_at ASC`
    );
    res.json({ success: true, count: rows.length, events: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/events/:id — single event
const getEvent = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, u.name AS organizer
       FROM events e
       JOIN users u ON u.id = e.created_by
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Event not found' });

    res.json({ success: true, event: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/events — create event (admin only)
const createEvent = async (req, res, next) => {
  try {
    const { title, description, location, starts_at, ends_at, total_seats, price } = req.body;

    if (!title || !starts_at || !ends_at || !total_seats)
      return res.status(400).json({ success: false, error: 'title, starts_at, ends_at, total_seats are required' });

    if (new Date(starts_at) >= new Date(ends_at))
      return res.status(400).json({ success: false, error: 'ends_at must be after starts_at' });

    const { rows } = await pool.query(
      `INSERT INTO events
         (title, description, location, starts_at, ends_at, total_seats, available_seats, price, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8)
       RETURNING *`,
      [title, description, location, starts_at, ends_at, total_seats, price || 0, req.user.id]
    );

    res.status(201).json({ success: true, event: rows[0] });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/events/:id — update event (admin only)
const updateEvent = async (req, res, next) => {
  try {
    const { title, description, location, starts_at, ends_at, price, status } = req.body;

    const { rows: existing } = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (!existing.length)
      return res.status(404).json({ success: false, error: 'Event not found' });

    const e = existing[0];

    const { rows } = await pool.query(
      `UPDATE events SET
         title       = $1,
         description = $2,
         location    = $3,
         starts_at   = $4,
         ends_at     = $5,
         price       = $6,
         status      = $7
       WHERE id = $8
       RETURNING *`,
      [
        title       || e.title,
        description ?? e.description,
        location    ?? e.location,
        starts_at   || e.starts_at,
        ends_at     || e.ends_at,
        price       ?? e.price,
        status      || e.status,
        req.params.id,
      ]
    );

    res.json({ success: true, event: rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/events/:id — delete event (admin only)
const deleteEvent = async (req, res, next) => {
  try {
    const { rows } = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Event not found' });

    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEvents, getEvent, createEvent, updateEvent, deleteEvent };