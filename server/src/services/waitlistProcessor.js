const pool  = require('../config/db');
const redis = require('../config/redis');

const processWaitlist = async () => {
  // Find events that have available seats and pending waitlist entries
  const { rows: events } = await pool.query(
    `SELECT DISTINCT e.id, e.available_seats
     FROM events e
     JOIN waitlist w ON w.event_id = e.id
     WHERE e.available_seats > 0 AND w.notified = false`
  );

  for (const event of events) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock event row
      const { rows: locked } = await client.query(
        'SELECT * FROM events WHERE id = $1 FOR UPDATE',
        [event.id]
      );
      const currentEvent = locked[0];

      if (currentEvent.available_seats <= 0) {
        await client.query('ROLLBACK');
        continue;
      }

      // Get next person on waitlist (FIFO)
      const { rows: entries } = await client.query(
        `SELECT * FROM waitlist
         WHERE event_id = $1 AND notified = false
         ORDER BY created_at ASC
         LIMIT 1`,
        [event.id]
      );

      if (!entries.length) {
        await client.query('ROLLBACK');
        continue;
      }

      const entry = entries[0];

      // Check if enough seats available
      if (currentEvent.available_seats < entry.seats_wanted) {
        await client.query('ROLLBACK');
        continue;
      }

      // Auto-book for the waitlisted user
      await client.query(
        `UPDATE events SET available_seats = available_seats - $1 WHERE id = $2`,
        [entry.seats_wanted, event.id]
      );

      await client.query(
        `INSERT INTO bookings (user_id, event_id, seats_booked)
         VALUES ($1, $2, $3)`,
        [entry.user_id, event.id, entry.seats_wanted]
      );

      // Mark as notified
      await client.query(
        `UPDATE waitlist SET notified = true WHERE id = $1`,
        [entry.id]
      );

      await client.query('COMMIT');

      // Cache notification in Redis (in real app you'd send an email here)
      await redis.setex(
        `waitlist:notified:${entry.user_id}:${event.id}`,
        86400,
        JSON.stringify({ event_id: event.id, seats: entry.seats_wanted, promoted_at: new Date() })
      );

      console.log(`✅ Waitlist: user ${entry.user_id} promoted for event ${event.id}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Waitlist processor error:', err.message);
    } finally {
      client.release();
    }
  }
};

// Run every 30 seconds
const startWaitlistProcessor = () => {
  console.log('🔄 Waitlist processor started');
  setInterval(processWaitlist, 30000);
};

module.exports = { startWaitlistProcessor, processWaitlist };