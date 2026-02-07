import { useState } from 'react';
import { SearchForm } from './components/SearchForm';
import { Results } from './components/Results';
import './App.css';

function App() {
  const [itineraries, setItineraries] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="app">
      <header className="header">
        <h1>SkyPath</h1>
        <p className="tagline">Flight connection search</p>
      </header>
      <main className="main">
        <SearchForm
          onResults={setItineraries}
          onLoading={setLoading}
          onError={setError}
        />
        <Results itineraries={itineraries} loading={loading} error={error} />
      </main>
    </div>
  );
}

export default App;
