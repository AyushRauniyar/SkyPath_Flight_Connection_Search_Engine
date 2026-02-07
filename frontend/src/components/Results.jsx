import './Results.css';

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getDatePart(iso) {
  return iso ? iso.slice(0, 10) : '';
}

function formatDateLong(isoDate) {
  if (!isoDate || isoDate.length < 10) return '';
  const d = new Date(isoDate + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function Results({ itineraries, loading, error }) {
  if (error) {
    const isInvalidCode = /invalid airport code/i.test(error);
    return (
      <div className="results results-error" role="alert">
        <p>{error}</p>
        <p className="results-error-hint">
          {isInvalidCode
            ? 'Select an airport from the dropdown list or retype a valid 3-letter code (e.g. LAX, JFK).'
            : 'You can try searching again with the form above.'}
        </p>
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
        {itineraries.map((it, idx) => {
          const firstSeg = it.segments[0];
          const journeyStartDate = firstSeg?.departureTime ? getDatePart(firstSeg.departureTime) : '';
          // Derive arrival date from start + total duration so 24h+ trips show the correct next day
          const journeyEndDate =
            journeyStartDate && it.totalDurationMs != null
              ? (() => {
                  const startMs = new Date(journeyStartDate + 'T12:00:00Z').getTime();
                  const endMs = startMs + it.totalDurationMs;
                  return new Date(endMs).toISOString().slice(0, 10);
                })()
              : (it.segments[it.segments.length - 1]?.arrivalTime
                  ? getDatePart(it.segments[it.segments.length - 1].arrivalTime)
                  : '');
          const isDirect = it.segments.length === 1;
          const stopLabel = isDirect ? 'Direct' : `${it.segments.length - 1} stop${it.segments.length > 2 ? 's' : ''}`;
          return (
            <div key={idx} className="itinerary-card">
              <div className="itinerary-meta">
                <div className="itinerary-meta-left">
                  <span className="itinerary-total-label">Total</span>
                  <span className="itinerary-duration">{it.totalDurationFormatted}</span>
                  {isDirect ? (
                    <span className="itinerary-badge itinerary-badge-direct">Direct · {it.totalDurationFormatted} flight</span>
                  ) : (
                    <span className="itinerary-badge">{stopLabel}</span>
                  )}
                </div>
                <span className="itinerary-price">${Number(it.totalPrice).toFixed(2)}</span>
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
                      {seg.durationFormatted != null && (
                        <span className="segment-duration" title="Flight duration">
                          {seg.durationFormatted}
                        </span>
                      )}
                    </div>
                    {it.layovers[i] && (
                      <div className="layover">
                        <span className="layover-label">Layover at {it.layovers[i].airport}:</span>
                        <span className="layover-duration">{it.layovers[i].durationFormatted}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="itinerary-dates">
                <span className="journey-date journey-start">Departing {formatDateLong(journeyStartDate)}</span>
                <span className="journey-date-sep">→</span>
                <span className="journey-date journey-end">Arriving {formatDateLong(journeyEndDate)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
