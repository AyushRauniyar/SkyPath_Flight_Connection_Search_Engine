import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createSearchService } from './searchService.js';

// Minimal fixture: 3 airports, same timezone for simplicity. Flights on 2024-03-15.
const fixtureAirports = [
  { code: 'AAA', name: 'Airport A', city: 'City A', country: 'US', timezone: 'America/New_York' },
  { code: 'BBB', name: 'Airport B', city: 'City B', country: 'US', timezone: 'America/New_York' },
  { code: 'CCC', name: 'Airport C', city: 'City C', country: 'US', timezone: 'America/New_York' },
];

const fixtureFlights = [
  // Direct AAA -> CCC at 08:00 -> 10:00
  {
    flightNumber: 'SP1',
    airline: 'Test',
    origin: 'AAA',
    destination: 'CCC',
    departureTime: '2024-03-15T08:00:00',
    arrivalTime: '2024-03-15T10:00:00',
    price: 100,
    aircraft: 'A320',
  },
  // AAA -> BBB at 08:00 -> 09:00
  {
    flightNumber: 'SP2',
    airline: 'Test',
    origin: 'AAA',
    destination: 'BBB',
    departureTime: '2024-03-15T08:00:00',
    arrivalTime: '2024-03-15T09:00:00',
    price: 50,
    aircraft: 'A320',
  },
  // BBB -> CCC at 10:00 (1h after arrival at BBB = 60 min layover, domestic so 45 min min)
  {
    flightNumber: 'SP3',
    airline: 'Test',
    origin: 'BBB',
    destination: 'CCC',
    departureTime: '2024-03-15T10:00:00',
    arrivalTime: '2024-03-15T11:30:00',
    price: 75,
    aircraft: 'A320',
  },
];

describe('searchService', () => {
  const service = createSearchService(fixtureAirports, fixtureFlights);

  describe('getAirports', () => {
    it('returns all airports', () => {
      const airports = service.getAirports();
      assert.strictEqual(airports.length, 3);
      assert.strictEqual(airports[0].code, 'AAA');
    });
  });

  describe('getAirportByCode', () => {
    it('returns airport for valid code', () => {
      const a = service.getAirportByCode('BBB');
      assert.ok(a);
      assert.strictEqual(a.code, 'BBB');
      assert.strictEqual(a.country, 'US');
    });
    it('returns undefined for unknown code', () => {
      assert.strictEqual(service.getAirportByCode('XXX'), undefined);
    });
  });

  describe('search', () => {
    it('returns empty when origin equals destination', () => {
      const results = service.search('AAA', 'AAA', '2024-03-15');
      assert.strictEqual(results.length, 0);
    });

    it('returns empty for unknown origin', () => {
      const results = service.search('XXX', 'CCC', '2024-03-15');
      assert.strictEqual(results.length, 0);
    });

    it('returns empty for unknown destination', () => {
      const results = service.search('AAA', 'XXX', '2024-03-15');
      assert.strictEqual(results.length, 0);
    });

    it('finds direct flight', () => {
      const results = service.search('AAA', 'CCC', '2024-03-15');
      assert.ok(results.length >= 1);
      const direct = results.find((r) => r.segments.length === 1);
      assert.ok(direct);
      assert.strictEqual(direct.segments[0].flightNumber, 'SP1');
      assert.strictEqual(direct.segments[0].origin, 'AAA');
      assert.strictEqual(direct.segments[0].destination, 'CCC');
      assert.strictEqual(direct.totalPrice, 100);
      assert.ok(direct.totalDurationMs > 0);
      assert.strictEqual(direct.layovers.length, 0);
    });

    it('finds 1-stop connection when layover is valid', () => {
      const results = service.search('AAA', 'CCC', '2024-03-15');
      const oneStop = results.find((r) => r.segments.length === 2);
      assert.ok(oneStop);
      assert.strictEqual(oneStop.segments[0].origin, 'AAA');
      assert.strictEqual(oneStop.segments[0].destination, 'BBB');
      assert.strictEqual(oneStop.segments[1].origin, 'BBB');
      assert.strictEqual(oneStop.segments[1].destination, 'CCC');
      assert.strictEqual(oneStop.layovers.length, 1);
      assert.strictEqual(oneStop.layovers[0].airport, 'BBB');
      assert.strictEqual(oneStop.totalPrice, 50 + 75);
    });

    it('returns itineraries sorted by total duration', () => {
      const results = service.search('AAA', 'CCC', '2024-03-15');
      for (let i = 1; i < results.length; i++) {
        assert.ok(results[i].totalDurationMs >= results[i - 1].totalDurationMs);
      }
    });

    it('each itinerary has segments with durationFormatted and layovers with durationFormatted', () => {
      const results = service.search('AAA', 'CCC', '2024-03-15');
      assert.ok(results.length >= 1);
      for (const it of results) {
        assert.ok(it.totalDurationFormatted);
        for (const seg of it.segments) {
          assert.ok(seg.durationFormatted);
        }
        for (const lay of it.layovers) {
          assert.ok(lay.durationFormatted);
          assert.ok(lay.airport);
        }
      }
    });
  });
});
