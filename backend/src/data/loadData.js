import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadFlightsData() {
  const candidates = [
    join(__dirname, '../../../flights.json'),
    join(__dirname, '../../flights.json'),
    join(process.cwd(), 'flights.json'),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) throw new Error('flights.json not found. Tried: ' + candidates.join(', '));
  console.log('[LoadData] Using flights.json at', path);
  const raw = readFileSync(path, 'utf-8');
  const data = JSON.parse(raw);
  if (!data.airports?.length || !data.flights?.length) {
    console.warn('[LoadData] Data may be incomplete:', { airports: data.airports?.length, flights: data.flights?.length });
  }
  return data;
}
