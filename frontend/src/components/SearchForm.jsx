import { useState, useEffect } from 'react';
import { AirportInput } from './AirportInput';
import './SearchForm.css';

const API_BASE = '';

export function SearchForm({ onResults, onLoading, onError }) {
  const [airports, setAirports] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [date, setDate] = useState('2024-03-15');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/airports`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load airports');
        return r.json();
      })
      .then(setAirports)
      .catch((e) => {
        console.error('[SkyPath] Failed to load airports:', e.message);
        setFetchError(e.message);
      });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!origin || !destination) {
      onError('Please select both origin and destination.');
      return;
    }
    if (origin.code === destination.code) {
      onError('Origin and destination must be different.');
      return;
    }
    if (!date) {
      onError('Please select a date.');
      return;
    }
    onError(null);
    onResults(null);
    setLoading(true);
    onLoading(true);
    const params = new URLSearchParams({
      origin: origin.code,
      destination: destination.code,
      date,
    });
    fetch(`${API_BASE}/api/search?${params}`)
      .then((r) => {
        if (!r.ok) return r.json().then((body) => { throw new Error(body.message || body.error || 'Search failed'); });
        return r.json();
      })
      .then((data) => {
        onResults(data.itineraries || []);
        onLoading(false);
      })
      .catch((err) => {
        const message = err.message || 'Something went wrong. Please try again.';
        console.error('[SkyPath] Search failed:', { origin: origin?.code, destination: destination?.code, date, message });
        onError(message);
        onResults([]);
        onLoading(false);
      })
      .finally(() => setLoading(false));
  };

  const handleRetryAirports = () => {
    setFetchError(null);
    fetch(`${API_BASE}/api/airports`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load airports');
        return r.json();
      })
      .then(setAirports)
      .catch((e) => {
    console.error('[SkyPath] Retry airports failed:', e.message);
    setFetchError(e.message);
  });
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      {fetchError && (
        <div className="form-error" role="alert">
          {fetchError}
          <button type="button" className="retry-btn" onClick={handleRetryAirports}>
            Retry
          </button>
        </div>
      )}
      <div className="form-row">
        <AirportInput
          airports={airports}
          value={origin}
          onChange={setOrigin}
          placeholder="From (e.g. JFK)"
          label="Origin"
          id="origin"
        />
        <AirportInput
          airports={airports}
          value={destination}
          onChange={setDestination}
          placeholder="To (e.g. LAX)"
          label="Destination"
          id="destination"
        />
        <div className="date-wrap">
          <label htmlFor="date" className="input-label">Date</label>
          <input
            id="date"
            type="date"
            className="date-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min="2024-03-15"
            max="2024-03-16"
          />
        </div>
      </div>
      <button type="submit" className="submit-btn" disabled={loading || airports.length === 0}>
        {loading ? 'Searching…' : 'Search flights'}
      </button>
    </form>
  );
}
