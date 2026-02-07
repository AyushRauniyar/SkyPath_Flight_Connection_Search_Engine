import express from 'express';
import cors from 'cors';
import { loadFlightsData } from './data/loadData.js';
import { createSearchService } from './services/searchService.js';

const app = express();
app.use(cors());
app.use(express.json());

let searchService;

try {
  const { airports, flights } = loadFlightsData();
  searchService = createSearchService(airports, flights);
  console.log(`Loaded ${airports.length} airports and ${flights.length} flights`);
} catch (err) {
  console.error('Failed to load flights.json:', err.message);
  process.exit(1);
}

app.get('/api/airports', (req, res) => {
  const airports = searchService.getAirports();
  res.json(airports);
});

app.get('/api/search', (req, res) => {
  const origin = (req.query.origin || '').toUpperCase().trim();
  const destination = (req.query.destination || '').toUpperCase().trim();
  const date = (req.query.date || '').trim();

  if (!origin || !destination) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'Origin and destination are required.',
    });
  }

  if (origin === destination) {
    return res.status(400).json({
      error: 'Invalid search',
      message: 'Origin and destination must be different.',
    });
  }

  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  if (!isoDate) {
    return res.status(400).json({
      error: 'Invalid date',
      message: 'Date must be in YYYY-MM-DD format.',
    });
  }

  const airportByCode = (code) => searchService.getAirportByCode(code);
  if (!airportByCode(origin)) {
    return res.status(400).json({
      error: 'Invalid airport',
      message: `Unknown origin airport code: ${origin}.`,
    });
  }
  if (!airportByCode(destination)) {
    return res.status(400).json({
      error: 'Invalid airport',
      message: `Unknown destination airport code: ${destination}.`,
    });
  }

  try {
    const itineraries = searchService.search(origin, destination, isoDate);
    res.json({ itineraries });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({
      error: 'Search failed',
      message: err.message || 'An error occurred while searching. Please try again.',
    });
  }
});

// Global error handler for unhandled route errors and async failures
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong. Please try again.',
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SkyPath API listening on port ${PORT}`);
});
