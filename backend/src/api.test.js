import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from './app.js';
import { createSearchService } from './services/searchService.js';

const fixtureAirports = [
  { code: 'AAA', name: 'Airport A', city: 'City A', country: 'US', timezone: 'America/New_York' },
  { code: 'BBB', name: 'Airport B', city: 'City B', country: 'US', timezone: 'America/New_York' },
  { code: 'CCC', name: 'Airport C', city: 'City C', country: 'US', timezone: 'America/New_York' },
];

const fixtureFlights = [
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
];

const searchService = createSearchService(fixtureAirports, fixtureFlights);
const app = createApp(searchService);

describe('API', () => {
  describe('GET /api/airports', () => {
    it('returns 200 and list of airports', async () => {
      const res = await request(app).get('/api/airports');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 3);
      assert.strictEqual(res.body[0].code, 'AAA');
    });
  });

  describe('GET /api/search', () => {
    it('returns 400 when origin is missing', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ destination: 'CCC', date: '2024-03-15' });
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
      assert.ok(/origin|required/i.test(res.body.message || ''));
    });

    it('returns 400 when destination is missing', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ origin: 'AAA', date: '2024-03-15' });
      assert.strictEqual(res.status, 400);
      assert.ok(/destination|required/i.test(res.body.message || ''));
    });

    it('returns 400 when origin equals destination', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ origin: 'AAA', destination: 'AAA', date: '2024-03-15' });
      assert.strictEqual(res.status, 400);
      assert.ok(/different/i.test(res.body.message || ''));
    });

    it('returns 400 when date format is invalid', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ origin: 'AAA', destination: 'CCC', date: '03-15-2024' });
      assert.strictEqual(res.status, 400);
      assert.ok(/date|YYYY|MM|DD/i.test(res.body.message || ''));
    });

    it('returns 400 for invalid origin airport code', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ origin: 'XXX', destination: 'CCC', date: '2024-03-15' });
      assert.strictEqual(res.status, 400);
      assert.ok(/invalid airport/i.test(res.body.error || ''));
    });

    it('returns 400 for invalid destination airport code', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ origin: 'AAA', destination: 'XXX', date: '2024-03-15' });
      assert.strictEqual(res.status, 400);
      assert.ok(/invalid airport/i.test(res.body.error || ''));
    });

    it('returns 200 and itineraries for valid search', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ origin: 'AAA', destination: 'CCC', date: '2024-03-15' });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.hasOwnProperty('itineraries'));
      assert.ok(Array.isArray(res.body.itineraries));
      assert.ok(res.body.itineraries.length >= 1);
      const it = res.body.itineraries[0];
      assert.ok(it.segments);
      assert.ok(Array.isArray(it.segments));
      assert.strictEqual(it.segments[0].origin, 'AAA');
      assert.strictEqual(it.segments[0].destination, 'CCC');
      assert.ok(it.totalDurationMs >= 0);
      assert.ok(it.totalDurationFormatted);
      assert.ok(typeof it.totalPrice === 'number');
    });

    it('accepts lowercase origin/destination and returns 200', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ origin: 'aaa', destination: 'ccc', date: '2024-03-15' });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.itineraries.length >= 1);
    });
  });
});
