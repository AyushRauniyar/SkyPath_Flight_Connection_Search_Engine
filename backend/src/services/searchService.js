import { DateTime } from 'luxon';
import {
  parseLocalInTimezone,
  getDepartureDateLocal,
  isLayoverValid,
  layoverDurationMs,
  formatDurationMs,
} from '../utils/timezone.js';

export function createSearchService(airports, flights) {
  const airportByCode = Object.fromEntries(airports.map((a) => [a.code, a]));
  const flightsByDepartureDate = new Map();

  for (const flight of flights) {
    const date = getDepartureDateLocal(flight, airportByCode);
    if (!date) continue;
    if (!flightsByDepartureDate.has(date)) {
      flightsByDepartureDate.set(date, []);
    }
    flightsByDepartureDate.get(date).push(flight);
  }

  function getFlightsFrom(airportCode, searchDate, includeNextDay = false) {
    const list = flightsByDepartureDate.get(searchDate) || [];
    let out = list.filter((f) => f.origin === airportCode);
    if (includeNextDay) {
      const next = getNextDay(searchDate);
      if (next) {
        const nextList = flightsByDepartureDate.get(next) || [];
        out = out.concat(nextList.filter((f) => f.origin === airportCode));
      }
    }
    return out;
  }

  function getNextDay(isoDate) {
    const dt = DateTime.fromISO(isoDate, { zone: 'utc' });
    if (!dt.isValid) return null;
    return dt.plus({ days: 1 }).toISODate();
  }

  function getArrivalTimeMs(flight) {
    const dest = airportByCode[flight.destination];
    if (!dest) return null;
    return parseLocalInTimezone(flight.arrivalTime, dest.timezone);
  }

  function getDepartureTimeMs(flight) {
    const origin = airportByCode[flight.origin];
    if (!origin) return null;
    return parseLocalInTimezone(flight.departureTime, origin.timezone);
  }

  function buildItinerary(segments) {
    const first = segments[0];
    const last = segments[segments.length - 1];
    const depMs = getDepartureTimeMs(first);
    const arrMs = getArrivalTimeMs(last);
    if (depMs == null || arrMs == null) return null;
    const totalDurationMs = arrMs - depMs;
    if (totalDurationMs < 0) return null;
    const totalPrice = segments.reduce((sum, s) => sum + s.price, 0);

    const layovers = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const arr = getArrivalTimeMs(segments[i]);
      const dep = getDepartureTimeMs(segments[i + 1]);
      if (arr == null || dep == null) return null;
      layovers.push({
        airport: segments[i].destination,
        durationMs: layoverDurationMs(arr, dep),
        durationFormatted: formatDurationMs(layoverDurationMs(arr, dep)),
      });
    }

    const segmentsWithDuration = segments.map((f) => {
      const dep = getDepartureTimeMs(f);
      const arr = getArrivalTimeMs(f);
      const durationMs = dep != null && arr != null ? arr - dep : 0;
      return {
        flightNumber: f.flightNumber,
        airline: f.airline,
        origin: f.origin,
        destination: f.destination,
        departureTime: f.departureTime,
        arrivalTime: f.arrivalTime,
        price: f.price,
        aircraft: f.aircraft,
        durationMs,
        durationFormatted: formatDurationMs(durationMs),
      };
    });

    return {
      segments: segmentsWithDuration,
      layovers,
      totalDurationMs,
      totalDurationFormatted: formatDurationMs(totalDurationMs),
      totalPrice,
    };
  }

  function search(origin, destination, date) {
    const results = [];
    const searchDate = date;

    if (origin === destination) return results;
    if (!airportByCode[origin] || !airportByCode[destination]) return results;

    const allFlightsOnDate = flightsByDepartureDate.get(searchDate) || [];

    // Direct
    for (const f of allFlightsOnDate) {
      if (f.origin === origin && f.destination === destination) {
        const it = buildItinerary([f]);
        if (it) results.push(it);
      }
    }

    // 1-stop (include next-day departures from connection for overnight arrivals)
    const fromOrigin = getFlightsFrom(origin, searchDate);
    for (const first of fromOrigin) {
      const arrMs = getArrivalTimeMs(first);
      if (arrMs == null) continue;
      const connectionAirport = first.destination;
      if (connectionAirport === destination) continue;
      const arrivingCountry = airportByCode[first.origin]?.country;

      const fromConnection = getFlightsFrom(connectionAirport, searchDate, true);
      for (const second of fromConnection) {
        if (second.destination !== destination) continue;
        const depMs = getDepartureTimeMs(second);
        if (depMs == null) continue;
        const departingCountry = airportByCode[second.destination]?.country;
        if (
          isLayoverValid(arrMs, depMs, arrivingCountry, departingCountry)
        ) {
          const it = buildItinerary([first, second]);
          if (it) results.push(it);
        }
      }
    }

    // 2-stop (include next-day at each connection)
    for (const first of fromOrigin) {
      const arr1Ms = getArrivalTimeMs(first);
      if (arr1Ms == null) continue;
      const conn1 = first.destination;
      if (conn1 === destination) continue;
      const country1 = airportByCode[first.origin]?.country;

      const fromConn1 = getFlightsFrom(conn1, searchDate, true);
      for (const second of fromConn1) {
        const arr2Ms = getArrivalTimeMs(second);
        if (arr2Ms == null) continue;
        const conn2 = second.destination;
        if (conn2 === destination) continue;
        const country2 = airportByCode[second.origin]?.country;

        const dep2Ms = getDepartureTimeMs(second);
        if (dep2Ms == null) continue;
        if (!isLayoverValid(arr1Ms, dep2Ms, country1, country2)) continue;

        const fromConn2 = getFlightsFrom(conn2, searchDate, true);
        for (const third of fromConn2) {
          if (third.destination !== destination) continue;
          const dep3Ms = getDepartureTimeMs(third);
          if (dep3Ms == null) continue;
          const country3 = airportByCode[third.destination]?.country;
          if (
            isLayoverValid(arr2Ms, dep3Ms, country2, country3)
          ) {
            const it = buildItinerary([first, second, third]);
            if (it) results.push(it);
          }
        }
      }
    }

    // Filter out itineraries that return to origin before final destination (e.g. JFK → YYZ → JFK → LAX)
    const valid = results.filter((it) => {
      for (let i = 1; i < it.segments.length; i++) {
        if (it.segments[i].destination === origin) return false;
      }
      return true;
    });

    valid.sort((a, b) => a.totalDurationMs - b.totalDurationMs);
    return valid;
  }

  return {
    search,
    getAirports: () => airports,
    getAirportByCode: (code) => airportByCode[code],
  };
}
