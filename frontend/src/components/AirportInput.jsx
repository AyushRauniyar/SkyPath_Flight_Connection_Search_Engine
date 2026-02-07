import { useState, useRef, useEffect } from 'react';

export function AirportInput({ airports, value, onChange, placeholder, label, id }) {
  const [query, setQuery] = useState(value ? `${value.code} – ${value.name}` : '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value) setQuery(`${value.code} – ${value.name}`);
    else setQuery('');
  }, [value]);

  const filtered = query.trim().length < 2
    ? []
    : airports.filter(
        (a) =>
          a.code.toLowerCase().includes(query.toLowerCase()) ||
          a.name.toLowerCase().includes(query.toLowerCase()) ||
          a.city.toLowerCase().includes(query.toLowerCase())
      );

  const select = (airport) => {
    onChange(airport);
    setQuery(`${airport.code} – ${airport.name}`);
    setOpen(false);
    setHighlight(0);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' && filtered.length) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h < filtered.length - 1 ? h + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h > 0 ? h - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' && filtered[highlight]) {
      e.preventDefault();
      select(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="airport-input-wrap">
      <label htmlFor={id} className="input-label">{label}</label>
      <input
        id={id}
        type="text"
        className="airport-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!e.target.value) onChange(null);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => filtered.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="airport-dropdown" role="listbox">
          {filtered.slice(0, 8).map((a, i) => (
            <li
              key={a.code}
              role="option"
              aria-selected={i === highlight}
              className={`airport-option ${i === highlight ? 'highlight' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                select(a);
              }}
            >
              <span className="airport-code">{a.code}</span>
              <span className="airport-desc">{a.city} – {a.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
