import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PublicEquipmentRow {
  id: string;
  title: string | null;
  category: string | null;
  image_url: string | null;
  description_teaser: string | null;
  city: string | null;
  price_band: string | null;
  price_range_label: string | null;
  available: boolean | null;
}

export interface FullEquipmentRow {
  id: string;
  vendor_id: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  daily_rate: number | string | null;
  image_url: string | null;
  location: string | null;
  available: boolean | null;
  specifications: unknown;
  compliance_tags: string[] | null;
  response_time_hours: number | null;
}

interface UseEquipmentSearchResult {
  data: PublicEquipmentRow[] | FullEquipmentRow[];
  loading: boolean;
  error: string | null;
  isAuthed: boolean;
  refetch: () => void;
}

const escapeIlike = (v: string) => v.replace(/[%_,]/g, '\\$&');

export function useEquipmentSearch(query: string): UseEquipmentSearchResult {
  const { user } = useAuth();
  const isAuthed = !!user;

  const [data, setData] = useState<PublicEquipmentRow[] | FullEquipmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  const run = useCallback(async () => {
    const myReq = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const term = query.trim();
      const escaped = term ? escapeIlike(term) : '';

      if (isAuthed) {
        let req = supabase
          .from('equipment')
          .select('*')
          .order('daily_rate', { ascending: true })
          .limit(48);
        if (term) {
          req = req.or(
            `title.ilike.%${escaped}%,category.ilike.%${escaped}%,description.ilike.%${escaped}%`,
          );
        }
        const { data: rows, error: e } = await req;
        console.log('equipment query', { tier: 'authed', count: rows?.length, error: e });
        if (e) throw e;
        if (reqIdRef.current === myReq) setData((rows ?? []) as FullEquipmentRow[]);
      } else {
        let req = (supabase as any)
          .from('equipment_public')
          .select('*')
          .order('id', { ascending: true })
          .limit(12);
        if (term) {
          req = req.or(
            `title.ilike.%${escaped}%,category.ilike.%${escaped}%,description_teaser.ilike.%${escaped}%`,
          );
        }
        const { data: rows, error: e } = await req;
        console.log('equipment query', { tier: 'anon', count: rows?.length, error: e });
        if (e) throw e;
        if (reqIdRef.current === myReq) setData((rows ?? []) as PublicEquipmentRow[]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('equipment query failed', err);
      if (reqIdRef.current === myReq) {
        setError(msg);
        setData([]);
      }
    } finally {
      if (reqIdRef.current === myReq) setLoading(false);
    }
  }, [query, isAuthed]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, isAuthed, refetch: run };
}
