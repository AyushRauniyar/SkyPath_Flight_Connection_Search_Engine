import { loadFlightsData } from './data/loadData.js';
import { createSearchService } from './services/searchService.js';
import { createApp } from './app.js';

let searchService;

try {
  const { airports, flights } = loadFlightsData();
  searchService = createSearchService(airports, flights);
  console.log(`[Startup] Loaded ${airports.length} airports and ${flights.length} flights`);
} catch (err) {
  console.error('[Startup] Failed to load flights.json:', err.message, err.stack);
  process.exit(1);
}

const app = createApp(searchService);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Startup] SkyPath API listening on port ${PORT}`);
});
