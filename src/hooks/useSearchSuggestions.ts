import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SuggestionType = 'equipment' | 'category' | 'location';

export interface Suggestion {
  type: SuggestionType;
  value: string;
  count?: number;
}

interface Options {
  isAuthed: boolean;
  category?: string | null;
}

const escapeIlike = (v: string) => v.replace(/[%_,]/g, '\\$&');

export function useSearchSuggestions(term: string, opts: Options) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  const trimmed = term.trim();
  const { isAuthed, category } = opts;

  useEffect(() => {
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      setLoading(true);
      try {
        const esc = escapeIlike(trimmed);
        const table = isAuthed ? 'equipment' : 'equipment_public';
        const cityField = isAuthed ? 'location' : 'city';

        let req = (supabase as any)
          .from(table)
          .select(`title, category, ${cityField}`)
          .limit(50);

        if (category && category !== 'all') {
          req = req.eq('category', category);
        }
        req = req.or(
          `title.ilike.%${esc}%,category.ilike.%${esc}%,${cityField}.ilike.%${esc}%`,
        );

        const { data, error } = await req;
        if (error) throw error;
        if (reqIdRef.current !== myReq) return;

        const lower = trimmed.toLowerCase();
        const titleCounts = new Map<string, number>();
        const catCounts = new Map<string, number>();
        const cityCounts = new Map<string, number>();

        for (const row of (data ?? []) as any[]) {
          const t = row.title as string | null;
          const c = row.category as string | null;
          const city = row[cityField] as string | null;
          if (t && t.toLowerCase().includes(lower)) {
            titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1);
          }
          if (c && c.toLowerCase().includes(lower)) {
            catCounts.set(c, (catCounts.get(c) ?? 0) + 1);
          }
          if (city && city.toLowerCase().includes(lower)) {
            cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
          }
        }

        const seen = new Set<string>();
        const take = (
          map: Map<string, number>,
          type: SuggestionType,
          max: number,
        ): Suggestion[] => {
          const out: Suggestion[] = [];
          for (const [v, c] of [...map.entries()].sort((a, b) => b[1] - a[1])) {
            if (out.length >= max) break;
            const key = `${type}:${v.toLowerCase()}`;
            if (seen.has(v.toLowerCase())) continue;
            seen.add(v.toLowerCase());
            out.push({ type, value: v, count: c });
          }
          return out;
        };

        const eq = take(titleCounts, 'equipment', 5);
        const cat = take(catCounts, 'category', 2);
        const loc = take(cityCounts, 'location', 2);

        setSuggestions([...eq, ...cat, ...loc].slice(0, 8));
      } catch (e) {
        if (reqIdRef.current === myReq) setSuggestions([]);
      } finally {
        if (reqIdRef.current === myReq) setLoading(false);
      }
    }, 150);

    return () => window.clearTimeout(handle);
  }, [trimmed, isAuthed, category]);

  return { suggestions, loading };
}
