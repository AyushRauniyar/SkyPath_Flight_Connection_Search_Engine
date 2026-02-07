import { DateTime } from 'luxon';

const MIN_LAYOVER_DOMESTIC_MS = 45 * 60 * 1000;
const MIN_LAYOVER_INTERNATIONAL_MS = 90 * 60 * 1000;
const MAX_LAYOVER_MS = 6 * 60 * 60 * 1000;

/**
 * Parse ISO time string as local time in the given timezone.
 * Returns milliseconds since epoch (UTC) for consistent duration math.
 */
export function parseLocalInTimezone(isoLocalString, timezone) {
  const dt = DateTime.fromISO(isoLocalString, { zone: timezone });
  if (!dt.isValid) throw new Error(`Invalid time: ${isoLocalString} in ${timezone}`);
  return dt.toMillis();
}

/**
 * Get departure date (YYYY-MM-DD) in the origin airport's timezone for a flight.
 */
export function getDepartureDateLocal(flight, airportByCode) {
  const origin = airportByCode[flight.origin];
  if (!origin) return null;
  const dt = DateTime.fromISO(flight.departureTime, { zone: origin.timezone });
  return dt.toISODate();
}

/**
 * Check if a connecting flight can follow a previous arrival:
 * - Same airport (no airport change)
 * - Layover >= min (45 domestic / 90 international)
 * - Layover <= 6 hours
 */
export function isLayoverValid(
  arrivalTimeMs,
  departureTimeMs,
  arrivingFlightOriginCountry,
  departingFlightDestinationCountry
) {
  const layoverMs = departureTimeMs - arrivalTimeMs;
  if (layoverMs < 0) return false;
  if (layoverMs > MAX_LAYOVER_MS) return false;
  const isDomestic =
    arrivingFlightOriginCountry && departingFlightDestinationCountry &&
    arrivingFlightOriginCountry === departingFlightDestinationCountry;
  const minMs = isDomestic ? MIN_LAYOVER_DOMESTIC_MS : MIN_LAYOVER_INTERNATIONAL_MS;
  return layoverMs >= minMs;
}

export function layoverDurationMs(arrivalTimeMs, departureTimeMs) {
  return departureTimeMs - arrivalTimeMs;
}

export function formatDurationMs(ms) {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
