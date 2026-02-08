import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseLocalInTimezone,
  getDepartureDateLocal,
  isLayoverValid,
  layoverDurationMs,
  formatDurationMs,
} from './timezone.js';

describe('timezone', () => {
  describe('parseLocalInTimezone', () => {
    it('parses ISO local string in given timezone and returns epoch ms', () => {
      const ms = parseLocalInTimezone('2024-03-15T08:30:00', 'America/New_York');
      assert.strictEqual(typeof ms, 'number');
      assert.ok(ms > 0);
      // 08:30 Eastern on 2024-03-15 (EDT) -> known offset
      const d = new Date(ms);
      assert.strictEqual(d.getUTCHours(), 12);
      assert.strictEqual(d.getUTCMinutes(), 30);
    });

    it('throws for invalid time string', () => {
      assert.throws(
        () => parseLocalInTimezone('not-a-date', 'America/New_York'),
        /Invalid time/
      );
    });
  });

  describe('getDepartureDateLocal', () => {
    it('returns YYYY-MM-DD in origin timezone', () => {
      const airportByCode = {
        JFK: { code: 'JFK', timezone: 'America/New_York' },
      };
      const flight = { origin: 'JFK', departureTime: '2024-03-15T23:30:00' };
      assert.strictEqual(getDepartureDateLocal(flight, airportByCode), '2024-03-15');
    });

    it('returns null when origin airport unknown', () => {
      const airportByCode = {};
      const flight = { origin: 'XXX', departureTime: '2024-03-15T08:00:00' };
      assert.strictEqual(getDepartureDateLocal(flight, airportByCode), null);
    });
  });

  describe('isLayoverValid', () => {
    const baseArrival = new Date('2024-03-15T12:00:00Z').getTime();

    it('rejects negative layover (departure before arrival)', () => {
      const dep = baseArrival - 60000;
      assert.strictEqual(isLayoverValid(baseArrival, dep, 'US', 'US'), false);
    });

    it('rejects layover over 6 hours', () => {
      const dep = baseArrival + 6 * 60 * 60 * 1000 + 1;
      assert.strictEqual(isLayoverValid(baseArrival, dep, 'US', 'US'), false);
    });

    it('accepts layover exactly 6 hours', () => {
      const dep = baseArrival + 6 * 60 * 60 * 1000;
      assert.strictEqual(isLayoverValid(baseArrival, dep, 'US', 'US'), true);
    });

    it('rejects domestic layover under 45 minutes', () => {
      const dep = baseArrival + 44 * 60 * 1000;
      assert.strictEqual(isLayoverValid(baseArrival, dep, 'US', 'US'), false);
    });

    it('accepts domestic layover of exactly 45 minutes', () => {
      const dep = baseArrival + 45 * 60 * 1000;
      assert.strictEqual(isLayoverValid(baseArrival, dep, 'US', 'US'), true);
    });

    it('rejects international layover under 90 minutes', () => {
      const dep = baseArrival + 89 * 60 * 1000;
      assert.strictEqual(isLayoverValid(baseArrival, dep, 'US', 'JP'), false);
    });

    it('accepts international layover of exactly 90 minutes', () => {
      const dep = baseArrival + 90 * 60 * 1000;
      assert.strictEqual(isLayoverValid(baseArrival, dep, 'US', 'JP'), true);
    });

    it('treats same country as domestic', () => {
      const dep = baseArrival + 50 * 60 * 1000;
      assert.strictEqual(isLayoverValid(baseArrival, dep, 'US', 'US'), true);
    });
  });

  describe('layoverDurationMs', () => {
    it('returns difference in ms', () => {
      const arr = 1000;
      const dep = 1000 + 60 * 60 * 1000; // 1 hour later
      assert.strictEqual(layoverDurationMs(arr, dep), 60 * 60 * 1000);
    });
  });

  describe('formatDurationMs', () => {
    it('formats minutes only when under 1 hour', () => {
      assert.strictEqual(formatDurationMs(30 * 60 * 1000), '30m');
    });
    it('formats hours only when exact', () => {
      assert.strictEqual(formatDurationMs(2 * 60 * 60 * 1000), '2h');
    });
    it('formats hours and minutes', () => {
      assert.strictEqual(formatDurationMs(90 * 60 * 1000), '1h 30m');
    });
    it('rounds to nearest minute', () => {
      assert.strictEqual(formatDurationMs(45 * 60 * 1000 + 30 * 1000), '46m');
    });
  });
});
