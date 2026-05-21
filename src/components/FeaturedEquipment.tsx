
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FeaturedEquipmentHeader from '@/components/FeaturedEquipmentHeader';
import FeaturedEquipmentCard from '@/components/FeaturedEquipmentCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface CardItem {
  id: string;
  name: string;
  specifications: string;
  location: string;
  rating: number;
  reviews: number;
  dailyRate: number;
  image: string;
  available: boolean;
  vendor: string;
}

type EquipmentRow = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  daily_rate: number | string | null;
  image_url: string | null;
  location: string | null;
  available: boolean | null;
  specifications: unknown;
};

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop&auto=format';

const mapRowToItem = (row: EquipmentRow): CardItem => ({
  id: row.id,
  name: row.title ?? 'Untitled Equipment',
  specifications: row.specifications
    ? typeof row.specifications === 'string'
      ? row.specifications
      : Object.entries(row.specifications as Record<string, unknown>)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
    : row.description ?? row.category ?? '',
  location: row.location ?? '—',
  rating: 0,
  reviews: 0,
  dailyRate: Number(row.daily_rate ?? 0),
  image: row.image_url ?? PLACEHOLDER_IMAGE,
  available: row.available ?? true,
  vendor: row.category ?? '',
});

const FeaturedEquipment: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';

  const [equipmentItems, setEquipmentItems] = useState<CardItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTerm, setLastTerm] = useState<string>(initialQ);
  const [currentInput, setCurrentInput] = useState<string>(initialQ);
  const debounceRef = useRef<number | null>(null);

  const handleImageUpdate = (equipmentId: string, newImageUrl: string) => {
    setEquipmentItems((prev) =>
      prev.map((item) => (item.id === equipmentId ? { ...item, image: newImageUrl } : item)),
    );
  };

  const runSearch = useCallback(
    async (rawQuery: string) => {
      const trimmed = rawQuery.trim();
      setLastTerm(trimmed);
      setIsSearching(true);
      setError(null);

      // sync URL
      const next = new URLSearchParams(searchParams);
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      setSearchParams(next, { replace: true });

      try {
        let req = supabase
          .from('equipment')
          .select('*')
          .order('daily_rate', { ascending: true })
          .limit(48);

        if (trimmed) {
          const escaped = trimmed.replace(/[%_,]/g, '\\$&');
          req = req.or(
            `title.ilike.%${escaped}%,category.ilike.%${escaped}%,description.ilike.%${escaped}%`,
          );
        }

        const { data, error: queryError } = await req;
        if (queryError) throw queryError;

        setEquipmentItems((data ?? []).map((row) => mapRowToItem(row as EquipmentRow)));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('equipment query failed', err);
        setError(message);
        setEquipmentItems([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchParams, setSearchParams],
  );

  // initial load
  useEffect(() => {
    void runSearch(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced typing
  const handleQueryChange = (value: string) => {
    setCurrentInput(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void runSearch(value);
    }, 300);
  };

  const handleSubmitSearch = (value: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    void runSearch(value);
  };

  const clearSearch = () => {
    setCurrentInput('');
    void runSearch('');
  };

  return (
    <div>
      <FeaturedEquipmentHeader
        onSearch={handleSubmitSearch}
        onQueryChange={handleQueryChange}
        initialQuery={initialQ}
        isSearching={isSearching}
      />

      <div className="max-w-7xl mx-auto px-4 mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Equipment</h2>
          <p className="text-gray-600">Hand-picked equipment from our most trusted vendors</p>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800 flex items-center justify-between">
            <span className="text-sm">Equipment query failed: {error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runSearch(lastTerm)}
            >
              Retry
            </Button>
          </div>
        )}

        {isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="industrial-card overflow-hidden">
                <Skeleton className="w-full h-48 rounded-none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : equipmentItems.length === 0 && !error ? (
          <div className="text-center py-12">
            <p className="text-gray-700 font-medium mb-2">No equipment found</p>
            {lastTerm && (
              <p className="text-sm text-gray-500 mb-4">
                No matches for <span className="font-semibold">"{lastTerm}"</span>.
              </p>
            )}
            {lastTerm && (
              <Button variant="outline" onClick={clearSearch}>
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {equipmentItems.map((item) => (
              <FeaturedEquipmentCard
                key={item.id}
                item={item}
                onImageUpdate={handleImageUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedEquipment;
