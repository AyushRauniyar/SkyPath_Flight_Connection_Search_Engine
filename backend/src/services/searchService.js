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

  function getFlightsFrom(airportCode, searchDate) {
    const list = flightsByDepartureDate.get(searchDate) || [];
    return list.filter((f) => f.origin === airportCode);
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
    const totalDurationMs = arrMs - depMs;
    const totalPrice = segments.reduce((sum, s) => sum + s.price, 0);

    const layovers = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const arr = getArrivalTimeMs(segments[i]);
      const dep = getDepartureTimeMs(segments[i + 1]);
      layovers.push({
        airport: segments[i].destination,
        durationMs: layoverDurationMs(arr, dep),
        durationFormatted: formatDurationMs(layoverDurationMs(arr, dep)),
      });
    }

    return {
      segments: segments.map((f) => ({
        flightNumber: f.flightNumber,
        airline: f.airline,
        origin: f.origin,
        destination: f.destination,
        departureTime: f.departureTime,
        arrivalTime: f.arrivalTime,
        price: f.price,
        aircraft: f.aircraft,
      })),
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
        results.push(buildItinerary([f]));
      }
    }

    // 1-stop
    const fromOrigin = getFlightsFrom(origin, searchDate);
    for (const first of fromOrigin) {
      const arrMs = getArrivalTimeMs(first);
      const connectionAirport = first.destination;
      if (connectionAirport === destination) continue;
      const arrivingCountry = airportByCode[first.origin]?.country;

      const fromConnection = getFlightsFrom(connectionAirport, searchDate);
      for (const second of fromConnection) {
        if (second.destination !== destination) continue;
        const depMs = getDepartureTimeMs(second);
        const departingCountry = airportByCode[second.destination]?.country;
        if (
          isLayoverValid(arrMs, depMs, arrivingCountry, departingCountry)
        ) {
          results.push(buildItinerary([first, second]));
        }
      }
    }

    // 2-stop
    for (const first of fromOrigin) {
      const arr1Ms = getArrivalTimeMs(first);
      const conn1 = first.destination;
      if (conn1 === destination) continue;
      const country1 = airportByCode[first.origin]?.country;

      const fromConn1 = getFlightsFrom(conn1, searchDate);
      for (const second of fromConn1) {
        const arr2Ms = getArrivalTimeMs(second);
        const conn2 = second.destination;
        if (conn2 === destination) continue;
        const country2 = airportByCode[second.origin]?.country;

        const dep2Ms = getDepartureTimeMs(second);
        if (!isLayoverValid(arr1Ms, dep2Ms, country1, country2)) continue;

        const fromConn2 = getFlightsFrom(conn2, searchDate);
        for (const third of fromConn2) {
          if (third.destination !== destination) continue;
          const dep3Ms = getDepartureTimeMs(third);
          const country3 = airportByCode[third.destination]?.country;
          if (
            isLayoverValid(arr2Ms, dep3Ms, country2, country3)
          ) {
            results.push(buildItinerary([first, second, third]));
          }
        }
      }
    }

    results.sort((a, b) => a.totalDurationMs - b.totalDurationMs);
    return results;
  }

  return {
    search,
    getAirports: () => airports,
    getAirportByCode: (code) => airportByCode[code],
  };
}
