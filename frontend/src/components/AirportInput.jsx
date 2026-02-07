import { useState, useRef, useEffect } from 'react';

export function AirportInput({ airports, value, onChange, onQueryChange, placeholder, label, id }) {
  const [query, setQuery] = useState(value ? `${value.code} – ${value.name}` : '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (value) {
      const s = `${value.code} – ${value.name}`;
      setQuery(s);
      onQueryChange?.(s);
    } else {
      setQuery('');
      onQueryChange?.('');
    }
  }, [value]);

  // Show all airports when empty (on click/focus), or filter from 1 letter
  const q = query.trim().toLowerCase();
  const filtered = q.length === 0
    ? [...airports]
    : airports
        .filter(
          (a) =>
            a.code.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q) ||
            a.city.toLowerCase().includes(q)
        )
        .sort((a, b) => {
          const codeA = a.code.toLowerCase();
          const codeB = b.code.toLowerCase();
          const rank = (code) =>
            code.startsWith(q) ? 0 : code.includes(q) ? 1 : 2;
          const r = rank(codeA) - rank(codeB);
          if (r !== 0) return r;
          return codeA.localeCompare(codeB);
        });

  const select = (airport) => {
    const s = `${airport.code} – ${airport.name}`;
    onChange(airport);
    setQuery(s);
    onQueryChange?.(s);
    setOpen(false);
    setHighlight(0);
  };

  // Keep highlight in valid range when filtered list changes
  useEffect(() => {
    setHighlight((h) => (filtered.length ? Math.min(h, filtered.length - 1) : 0));
  }, [filtered.length]);

  // Scroll highlighted option into view when using arrow keys
  useEffect(() => {
    if (!open || !listRef.current || !filtered.length) return;
    const el = listRef.current.children[highlight];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, [highlight, open, filtered.length]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onKeyDown = (e) => {
    if (!open) {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && filtered.length) setOpen(true);
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

  const showList = open && filtered.length > 0;

  return (
    <div ref={wrapperRef} className="airport-input-wrap">
      <label htmlFor={id} className="input-label">{label}</label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className="airport-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          if (!v) onChange(null);
          onQueryChange?.(v);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => {
          setOpen(true);
          if (query) inputRef.current?.select();
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {showList && (
        <ul ref={listRef} className="airport-dropdown" role="listbox">
          {filtered.map((a, i) => (
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
