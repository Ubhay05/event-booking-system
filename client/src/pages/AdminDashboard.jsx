import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]       = useState(null);
  const [events, setEvents]     = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers]       = useState([]);
  const [tab, setTab]           = useState('overview');
  const [loading, setLoading]   = useState(true);

  const fetchAll = async () => {
    try {
      const [s, e, b, u] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/events'),
        api.get('/admin/bookings'),
        api.get('/admin/users'),
      ]);
      setStats(s.data.stats);
      setEvents(e.data.events);
      setBookings(b.data.bookings);
      setUsers(u.data.users);
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      if (user && user.role !== 'admin') {
          navigate('/');
          return;
        }
        fetchAll();
    }, [user]);
    
    const handleStatusChange = async (eventId, status) => {
      try {
        await api.patch(`/admin/events/${eventId}/status`, { status });
        toast.success(`Event ${status}`);
        fetchAll();
      } catch (err) {
        toast.error('Failed to update status');
      }
    };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="page">
      <h1>Admin Dashboard</h1>

      <div className="admin-tabs">
        {['overview', 'events', 'bookings', 'users'].map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.total_users}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.total_events}</span>
            <span className="stat-label">Published Events</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.total_bookings}</span>
            <span className="stat-label">Confirmed Bookings</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">₹{stats.total_revenue.toLocaleString()}</span>
            <span className="stat-label">Total Revenue</span>
          </div>
        </div>
      )}

      {tab === 'events' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Location</th>
                <th>Date</th>
                <th>Seats</th>
                <th>Bookings</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>{e.location}</td>
                  <td>{new Date(e.starts_at).toLocaleDateString('en-IN')}</td>
                  <td>{e.available_seats}/{e.total_seats}</td>
                  <td>{e.booking_count}</td>
                  <td><span className={`status-badge ${e.status}`}>{e.status}</span></td>
                  <td>
                    <select
                      value={e.status}
                      onChange={ev => handleStatusChange(e.id, ev.target.value)}
                      className="status-select"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Event</th>
                <th>Seats</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td>{b.user_name}</td>
                  <td>{b.user_email}</td>
                  <td>{b.event_title}</td>
                  <td>{b.seats_booked}</td>
                  <td><span className={`status-badge ${b.status}`}>{b.status}</span></td>
                  <td>{new Date(b.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Bookings</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className={`status-badge ${u.role}`}>{u.role}</span></td>
                  <td>{u.booking_count}</td>
                  <td>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;