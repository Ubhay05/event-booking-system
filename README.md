# Event Booking System

A full-stack event booking platform built with Node.js, PostgreSQL, Redis, and React. Designed to handle real-world challenges like concurrent seat booking, waitlist management, and role-based access control.

---


## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend | Node.js + Express | Fast, lightweight REST API |
| Database | PostgreSQL + raw `pg` | ACID transactions, row-level locking |
| Cache | Redis (ioredis) | Idempotency keys, fast key-value store |
| Frontend | React + Vite | Fast dev experience, component-based UI |
| Auth | JWT (jsonwebtoken) | Stateless, scalable authentication |
| Password | bcryptjs | Secure hashing with salt rounds |

---

## Features

- **User Auth** — Register, login, JWT-protected routes
- **Events** — Browse, view, and book upcoming events
- **Concurrent Booking** — PostgreSQL row-level locking prevents double-booking
- **Idempotency** — Duplicate booking requests are safely deduplicated via Redis
- **Waitlist** — Users join a waitlist when events are full
- **Background Jobs** — Auto-promotes waitlisted users when seats free up
- **Booking Management** — View and cancel your bookings
- **Admin Dashboard** — Manage events, view all bookings, users, and revenue stats

---

## Architecture

```
event-booking/
├── server/                  ← Express REST API
│   └── src/
│       ├── config/
│       │   ├── db.js        ← PostgreSQL connection pool
│       │   └── redis.js     ← Redis client
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── eventController.js
│       │   ├── bookingController.js
│       │   ├── waitlistController.js
│       │   └── adminController.js
│       ├── middleware/
│       │   ├── auth.js          ← JWT verification + role guard
│       │   └── errorHandler.js  ← Central error handler
│       ├── routes/
│       │   ├── auth.js
│       │   ├── events.js
│       │   ├── bookings.js
│       │   ├── waitlist.js
│       │   └── admin.js
│       ├── services/
│       │   └── waitlistProcessor.js  ← Background job (runs every 30s)
│       ├── db/
│       │   └── schema.sql       ← All table definitions
│       ├── app.js
│       └── server.js
└── client/                  ← React + Vite frontend
    └── src/
        ├── api/
        │   └── axios.js     ← Axios instance with auth interceptor
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── Events.jsx
            ├── EventDetail.jsx
            ├── Login.jsx
            ├── Register.jsx
            ├── MyBookings.jsx
            └── AdminDashboard.jsx
```

---

## Key Technical Decisions

### 1. PostgreSQL over MongoDB
This project handles concurrent booking operations that require ACID transactions and row-level locking. PostgreSQL's `SELECT FOR UPDATE` locks a row inside a transaction so no two requests can book the same seat simultaneously — something MongoDB cannot handle as reliably.

### 2. Raw `pg` over an ORM
Using raw `pg` gives full control over transactions. ORMs like Sequelize abstract away `BEGIN`, `COMMIT`, and `ROLLBACK` which are critical for the concurrency logic in this project.

### 3. Idempotency with Redis
If a user double-clicks "Book Now" and sends two identical requests, the second request returns the original booking instead of creating a duplicate. Each booking request carries an idempotency key cached in Redis for 24 hours.

### 4. Background Waitlist Processor
A `setInterval` job runs every 30 seconds, finds events with available seats and pending waitlist entries, and automatically promotes the first user in FIFO order — all inside a transaction with row-level locking.

---

## Database Schema

```sql
users       — id, name, email, password_hash, role, created_at
events      — id, title, description, location, starts_at, ends_at,
              total_seats, available_seats, price, status, created_by
bookings    — id, user_id, event_id, seats_booked, status, idempotency_key
waitlist    — id, user_id, event_id, seats_wanted, notified
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/login` | Login and get JWT |
| GET | `/api/v1/auth/me` | Get current user |

### Events
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/events` | List all published events | Public |
| GET | `/api/v1/events/:id` | Get single event | Public |
| POST | `/api/v1/events` | Create event | Admin |
| PATCH | `/api/v1/events/:id` | Update event | Admin |
| DELETE | `/api/v1/events/:id` | Delete event | Admin |

### Bookings
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/bookings` | Book seats | User |
| GET | `/api/v1/bookings/my` | My bookings | User |
| DELETE | `/api/v1/bookings/:id` | Cancel booking | User |

### Waitlist
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/waitlist` | Join waitlist | User |
| GET | `/api/v1/waitlist/my` | My waitlist entries | User |
| DELETE | `/api/v1/waitlist/:id` | Leave waitlist | User |

### Admin
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/admin/stats` | Overview stats | Admin |
| GET | `/api/v1/admin/events` | All events | Admin |
| GET | `/api/v1/admin/bookings` | All bookings | Admin |
| GET | `/api/v1/admin/users` | All users | Admin |
| PATCH | `/api/v1/admin/events/:id/status` | Update event status | Admin |

---

## Running Locally

### Prerequisites
- Node.js v20.19+
- PostgreSQL 16
- Redis

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/event-booking-system.git
cd event-booking-system
```

### 2. Setup the server
```bash
cd server
npm install
```

Create a `.env` file:
```
PORT=8000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=eventbooking
DB_USER=your_mac_username
DB_PASSWORD=

JWT_SECRET=supersecretkey_changethisinproduction
JWT_EXPIRES_IN=7d

REDIS_URL=redis://localhost:6379
```

Run the database migration:
```bash
npm run migrate
```

Start the server:
```bash
npm run dev
```

### 3. Setup the client
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default 8000) |
| `DB_HOST` | PostgreSQL host |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | JWT expiry duration |
| `REDIS_URL` | Redis connection URL |

---

