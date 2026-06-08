-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'user'
                  CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  location         VARCHAR(255),
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  total_seats      INTEGER NOT NULL CHECK (total_seats > 0),
  available_seats  INTEGER NOT NULL CHECK (available_seats >= 0),
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           VARCHAR(20) NOT NULL DEFAULT 'published'
                     CHECK (status IN ('draft','published','cancelled')),
  created_by       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seats_check CHECK (available_seats <= total_seats)
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  seats_booked     INTEGER NOT NULL CHECK (seats_booked > 0),
  status           VARCHAR(20) NOT NULL DEFAULT 'confirmed'
                     CHECK (status IN ('confirmed','cancelled')),
  idempotency_key  TEXT UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WAITLIST
CREATE TABLE IF NOT EXISTS waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  seats_wanted INTEGER NOT NULL CHECK (seats_wanted > 0),
  notified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT waitlist_unique UNIQUE (user_id, event_id)
);

-- Indexes for hot query paths
CREATE INDEX IF NOT EXISTS idx_bookings_event   ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user    ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_event   ON waitlist(event_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);