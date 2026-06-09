import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/events')
      .then(res => setEvents(res.data.events))
      .catch(() => toast.error('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading events...</div>;

  return (
    <div className="page">
      <h1>Upcoming Events</h1>
      {events.length === 0 ? (
        <p className="empty">No events available.</p>
      ) : (
        <div className="events-grid">
          {events.map(event => (
            <div key={event.id} className="event-card" onClick={() => navigate(`/events/${event.id}`)}>
              <div className="event-header">
                <h3>{event.title}</h3>
                <span className={`badge ${event.available_seats === 0 ? 'badge-full' : 'badge-open'}`}>
                  {event.available_seats === 0 ? 'Full' : `${event.available_seats} seats left`}
                </span>
              </div>
              <p className="event-location">📍 {event.location}</p>
              <p className="event-date">📅 {new Date(event.starts_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}</p>
              <p className="event-price">₹{event.price}</p>
              <p className="event-organizer">By {event.organizer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;