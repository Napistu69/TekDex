import { useMemo, useState } from 'react';
import { searchSpecies } from '../engine/values';
import type { Species } from '../engine/types';

export function SpeciesSelect({
  species,
  value,
  onChange,
  hideNoisy,
  breedableOnly = false,
  id = 'species',
}: {
  species: Species[];
  value?: Species;
  onChange: (s: Species) => void;
  hideNoisy: boolean;
  breedableOnly?: boolean;
  id?: string;
}) {
  const [query, setQuery] = useState(value?.displayName ?? '');
  const [open, setOpen] = useState(false);

  const results = useMemo(
    () => searchSpecies(species, query, { hideNoisy, breedableOnly }).slice(0, 80),
    [species, query, hideNoisy, breedableOnly],
  );

  return (
    <div className="species-select">
      <label className="field" htmlFor={id}>
        Species
        <input
          id={id}
          type="search"
          autoComplete="off"
          placeholder="Search species…"
          value={open ? query : value?.displayName ?? query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery(value?.displayName ?? query);
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
      </label>
      {open && (
        <div className="species-list" role="listbox">
          {results.length === 0 && <div className="species-option">No matches</div>}
          {results.map((s) => (
            <button
              type="button"
              key={s.blueprintPath}
              className="species-option"
              aria-selected={s.blueprintPath === value?.blueprintPath}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s);
                setQuery(s.displayName);
                setOpen(false);
              }}
            >
              {s.displayName}
              {s.variants.length > 0 ? `  ·  ${s.variants.join(', ')}` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
