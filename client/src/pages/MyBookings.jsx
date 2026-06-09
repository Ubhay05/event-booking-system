import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]  = useState(true);

  const fetchBookings = () => {
    api.get('/bookings/my')
      .then(res => setBookings(res.data.bookings))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await api.delete(`/bookings/${id}`);
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cancel failed');
    }
  };

  if (loading) return <div className="loading">Loading bookings...</div>;

  return (
    <div className="page">
      <h1>My Bookings</h1>
      {bookings.length === 0 ? (
        <p className="empty">No bookings yet.</p>
      ) : (
        <div className="bookings-list">
          {bookings.map(b => (
            <div key={b.id} className={`booking-card ${b.status === 'cancelled' ? 'cancelled' : ''}`}>
              <div className="booking-info">
                <h3>{b.title}</h3>
                <p>📍 {b.location}</p>
                <p>📅 {new Date(b.starts_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}</p>
                <p>💺 {b.seats_booked} seat(s)</p>
              </div>
              <div className="booking-actions">
                <span className={`status-badge ${b.status}`}>{b.status}</span>
                {b.status === 'confirmed' && (
                  <button className="btn-cancel" onClick={() => handleCancel(b.id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;