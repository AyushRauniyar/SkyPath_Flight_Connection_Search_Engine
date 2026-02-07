import { useState, useEffect } from 'react';
import { AirportInput } from './AirportInput';
import './SearchForm.css';

const API_BASE = '';

function getCodeFromQuery(query) {
  const t = (query || '').trim();
  if (t.length >= 3 && /^[A-Za-z]{3}$/.test(t.slice(0, 3))) return t.slice(0, 3).toUpperCase();
  const beforeDash = t.split('–')[0].trim();
  if (beforeDash.length === 3 && /^[A-Za-z]{3}$/.test(beforeDash)) return beforeDash.toUpperCase();
  return null;
}

export function SearchForm({ onResults, onLoading, onError }) {
  const [airports, setAirports] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
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
    const originCode = origin?.code ?? getCodeFromQuery(originQuery);
    const destCode = destination?.code ?? getCodeFromQuery(destinationQuery);
    const validCodes = new Set(airports.map((a) => a.code.toUpperCase()));

    if (!origin && !originQuery.trim()) {
      onError('Please select or enter an origin airport.');
      return;
    }
    if (!destination && !destinationQuery.trim()) {
      onError('Please select or enter a destination airport.');
      return;
    }
    if (originCode && !validCodes.has(originCode)) {
      onError(`Invalid airport code for origin: "${originCode}". Please select an airport from the dropdown list or retype a valid 3-letter code.`);
      return;
    }
    if (destCode && !validCodes.has(destCode)) {
      onError(`Invalid airport code for destination: "${destCode}". Please select an airport from the dropdown list or retype a valid 3-letter code.`);
      return;
    }
    if (!origin && !originCode) {
      onError('Please select an origin airport from the dropdown list.');
      return;
    }
    if (!destination && !destCode) {
      onError('Please select a destination airport from the dropdown list.');
      return;
    }
    const o = origin || airports.find((a) => a.code.toUpperCase() === originCode);
    const d = destination || airports.find((a) => a.code.toUpperCase() === destCode);
    if (o && d && o.code === d.code) {
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
      origin: (origin || airports.find((a) => a.code.toUpperCase() === originCode))?.code ?? originCode,
      destination: (destination || airports.find((a) => a.code.toUpperCase() === destCode))?.code ?? destCode,
      date,
    });
    fetch(`${API_BASE}/api/search?${params}`)
      .then((r) => r.json().then((body) => ({ ok: r.ok, status: r.status, body })))
      .then(({ ok, body }) => {
        if (!ok) {
          const isInvalidAirport = body.error === 'Invalid airport' || /invalid airport code/i.test(body.message || '');
          const message = isInvalidAirport
            ? 'Invalid airport code. Please select an airport from the dropdown list or retype a valid 3-letter code.'
            : (body.message || body.error || 'Search failed');
          throw new Error(message);
        }
        return body;
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
          onQueryChange={setOriginQuery}
          placeholder="From (e.g. JFK)"
          label="Origin"
          id="origin"
        />
        <AirportInput
          airports={airports}
          value={destination}
          onChange={setDestination}
          onQueryChange={setDestinationQuery}
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
