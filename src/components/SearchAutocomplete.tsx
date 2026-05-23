import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSearchSuggestions,
  type Suggestion,
  type SuggestionType,
} from '@/hooks/useSearchSuggestions';
import { cn } from '@/lib/utils';

interface SearchAutocompleteProps {
  initialValue?: string;
  onCommit: (term: string) => void;
  category?: string | null;
  placeholder?: string;
  buttonLabel?: string;
  isSubmitting?: boolean;
  className?: string;
}

const typeLabel: Record<SuggestionType, string> = {
  equipment: 'Equipment',
  category: 'Category',
  location: 'Location',
};

const sectionTitle: Record<SuggestionType, string> = {
  equipment: 'EQUIPMENT',
  category: 'CATEGORY',
  location: 'LOCATION',
};

function highlightMatch(value: string, term: string) {
  const t = term.trim();
  if (!t) return <span>{value}</span>;
  const i = value.toLowerCase().indexOf(t.toLowerCase());
  if (i === -1) return <span>{value}</span>;
  return (
    <span>
      {value.slice(0, i)}
      <span className="font-bold">{value.slice(i, i + t.length)}</span>
      {value.slice(i + t.length)}
    </span>
  );
}

const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  initialValue = '',
  onCommit,
  category = null,
  placeholder = 'Search equipment, categories, or locations...',
  buttonLabel = 'Search',
  isSubmitting = false,
  className,
}) => {
  const { user } = useAuth();
  const isAuthed = !!user;

  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const { suggestions, loading } = useSearchSuggestions(open ? value : '', {
    isAuthed,
    category,
  });

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlight(-1);
  }, [suggestions]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const commit = (term: string) => {
    setValue(term);
    setOpen(false);
    setHighlight(-1);
    onCommit(term.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!open || suggestions.length === 0) return;
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      if (!open || suggestions.length === 0) return;
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && highlight >= 0 && suggestions[highlight]) {
        commit(suggestions[highlight].value);
      } else {
        commit(value);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const trimmed = value.trim();
  const showDropdown = open && trimmed.length >= 2;
  const hasResults = suggestions.length > 0;

  const grouped: Array<[SuggestionType, Suggestion[]]> = [
    ['equipment', suggestions.filter((s) => s.type === 'equipment')],
    ['category', suggestions.filter((s) => s.type === 'category')],
    ['location', suggestions.filter((s) => s.type === 'location')],
  ];

  // Compute display index for highlight (flat index matches order in `suggestions`)
  let flatIdx = -1;

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (open && highlight >= 0 && suggestions[highlight]) {
            commit(suggestions[highlight].value);
          } else {
            commit(value);
          }
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          <Input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (trimmed.length >= 2) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            className="pl-10 py-3 text-black bg-white border-0 focus:ring-2 focus:ring-white/20"
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-3 bg-allrentz-red hover:bg-allrentz-red-dark text-white font-semibold"
        >
          {isSubmitting ? 'Searching...' : buttonLabel}
        </Button>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden text-left">
          {loading && suggestions.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching inventory…
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-3 text-sm text-gray-500 italic">
              No matches in current inventory
            </div>
          ) : (
            <div className="py-1 max-h-96 overflow-y-auto">
              {grouped.map(([type, items]) =>
                items.length === 0 ? null : (
                  <div key={type}>
                    <div className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-gray-400">
                      {sectionTitle[type]}
                    </div>
                    {items.map((s) => {
                      flatIdx += 1;
                      const idx = flatIdx;
                      const isActive = idx === highlight;
                      return (
                        <button
                          key={`${type}-${s.value}`}
                          type="button"
                          onMouseEnter={() => setHighlight(idx)}
                          onMouseDown={(e) => {
                            // mousedown so it fires before input blur
                            e.preventDefault();
                            commit(s.value);
                          }}
                          className={cn(
                            'w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-left text-gray-800',
                            isActive && 'bg-gray-100',
                          )}
                        >
                          <span className="truncate">
                            {highlightMatch(s.value, trimmed)}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            {s.count != null && s.type !== 'location' && (
                              <span className="text-xs text-gray-400">
                                {s.count}
                              </span>
                            )}
                            <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {typeLabel[s.type]}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
