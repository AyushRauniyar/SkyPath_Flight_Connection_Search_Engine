import './Results.css';

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function Results({ itineraries, loading, error }) {
  if (error) {
    return (
      <div className="results results-error" role="alert">
        <p>{error}</p>
        <p className="results-error-hint">You can try searching again with the form above.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="results results-loading">
        <div className="spinner" aria-hidden="true" />
        <p>Searching for flights…</p>
      </div>
    );
  }

  if (!itineraries || itineraries.length === 0) {
    return (
      <div className="results results-empty">
        <p>No flights found for this route and date.</p>
        <p className="results-empty-hint">Try another date or different airports.</p>
      </div>
    );
  }

  return (
    <div className="results">
      <h2 className="results-heading">{itineraries.length} {itineraries.length === 1 ? 'itinerary' : 'itineraries'} found</h2>
      <div className="results-list">
        {itineraries.map((it, idx) => (
          <div key={idx} className="itinerary-card">
            <div className="itinerary-meta">
              <span className="itinerary-duration">{it.totalDurationFormatted}</span>
              <span className="itinerary-price">${it.totalPrice.toFixed(2)}</span>
            </div>
            <div className="itinerary-segments">
              {it.segments.map((seg, i) => (
                <div key={i} className="segment">
                  <div className="segment-route">
                    <span className="segment-airport">{seg.origin}</span>
                    <span className="segment-time">{formatTime(seg.departureTime)}</span>
                    <span className="segment-flight">{seg.flightNumber}</span>
                    <span className="segment-time">{formatTime(seg.arrivalTime)}</span>
                    <span className="segment-airport">{seg.destination}</span>
                  </div>
                  {it.layovers[i] && (
                    <div className="layover">
                      Layover at {it.layovers[i].airport}: {it.layovers[i].durationFormatted}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
