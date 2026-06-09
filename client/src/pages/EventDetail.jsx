import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const EventDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent]   = useState(null);
  const [seats, setSeats]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(res => setEvent(res.data.event))
      .catch(() => toast.error('Event not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = async () => {
    if (!user) return navigate('/login');
    setBooking(true);
    try {
      await api.post('/bookings', { event_id: id, seats_wanted: seats });
      toast.success(`${seats} seat(s) booked!`);
      setEvent(prev => ({ ...prev, available_seats: prev.available_seats - seats }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const handleWaitlist = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post('/waitlist', { event_id: id, seats_wanted: seats });
      toast.success('Added to waitlist!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join waitlist');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!event)  return <div className="loading">Event not found.</div>;

  const isFull = event.available_seats === 0;

  return (
    <div className="page detail-page">
      <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
      <div className="detail-card">
        <h1>{event.title}</h1>
        <p className="detail-description">{event.description}</p>
        <div className="detail-meta">
          <span>📍 {event.location}</span>
          <span>📅 {new Date(event.starts_at).toLocaleString('en-IN')}</span>
          <span>💺 {event.available_seats} / {event.total_seats} seats available</span>
          <span>💰 ₹{event.price}</span>
          <span>🎤 {event.organizer}</span>
        </div>

        <div className="booking-section">
          <label>Seats</label>
          <input
            type="number" min="1"
            max={isFull ? 1 : event.available_seats}
            value={seats}
            onChange={e => setSeats(Number(e.target.value))}
          />
          {isFull ? (
            <button className="btn-waitlist" onClick={handleWaitlist}>
              Join Waitlist
            </button>
          ) : (
            <button className="btn-book" onClick={handleBook} disabled={booking}>
              {booking ? 'Booking...' : 'Book Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetail;