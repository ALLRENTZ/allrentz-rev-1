import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FeaturedEquipmentHeader from '@/components/FeaturedEquipmentHeader';
import FeaturedEquipmentCard from '@/components/FeaturedEquipmentCard';
import EquipmentTeaserCard from '@/components/EquipmentTeaserCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEquipmentSearch,
  type FullEquipmentRow,
  type PublicEquipmentRow,
} from '@/hooks/useEquipmentSearch';
import { FeaturedEquipmentItem } from '@/data/featuredEquipment';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop&auto=format';

const mapFullRowToItem = (row: FullEquipmentRow): FeaturedEquipmentItem => ({
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get('q') ?? '';

  const [activeQuery, setActiveQuery] = useState(urlQ);

  const { data, loading, error, isAuthed, refetch } = useEquipmentSearch(activeQuery);

  // Sync activeQuery → URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (activeQuery) next.set('q', activeQuery);
    else next.delete('q');
    if ((searchParams.get('q') ?? '') !== activeQuery) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuery]);

  const handleCommit = (value: string) => {
    setActiveQuery(value.trim());
  };

  const clearSearch = () => {
    setActiveQuery('');
  };

  const goToSignIn = () => navigate('/auth');

  const showSkeleton = loading;
  const showEmpty = !loading && !error && data.length === 0;
  const countLabel = isAuthed
    ? `${data.length} listing${data.length === 1 ? '' : 's'}`
    : `${data.length} listing${data.length === 1 ? '' : 's'} shown — Sign in to see full details`;

  return (
    <div>
      <FeaturedEquipmentHeader
        onSearch={handleCommit}
        initialQuery={urlQ}
        isSearching={loading}
      />


      <div className="max-w-7xl mx-auto px-4 mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {activeQuery ? `Search results for "${activeQuery}"` : 'Featured Equipment'}
          </h2>
          <p className="text-gray-600">
            {activeQuery
              ? `${data.length} match${data.length === 1 ? '' : 'es'}`
              : 'Hand-picked equipment from our most trusted vendors'}
          </p>
        </div>

        {!loading && !error && data.length > 0 && (
          <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
            <span>{countLabel}</span>
            {!isAuthed && (
              <Link to="/auth" className="text-allrentz-red font-medium hover:underline">
                Create a free account →
              </Link>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800 flex items-center justify-between">
            <span className="text-sm">Equipment query failed: {error}</span>
            <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
          </div>
        )}

        {showSkeleton ? (
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
        ) : showEmpty ? (
          <div className="text-center py-12">
            <p className="text-gray-700 font-medium mb-2">No equipment found</p>
            {activeQuery && (
              <p className="text-sm text-gray-500 mb-4">
                No matches for <span className="font-semibold">"{activeQuery}"</span>.
              </p>
            )}
            {activeQuery && (
              <Button variant="outline" onClick={clearSearch}>Clear search</Button>
            )}
          </div>
        ) : isAuthed ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(data as FullEquipmentRow[]).map((row) => (
              <FeaturedEquipmentCard key={row.id} item={mapFullRowToItem(row)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(data as PublicEquipmentRow[]).map((row, idx) => (
              <React.Fragment key={row.id}>
                <EquipmentTeaserCard item={row} onSignInClick={goToSignIn} />
                {idx === 2 && (
                  <div className="industrial-card p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-allrentz-red/5 to-allrentz-red/10 border-2 border-dashed border-allrentz-red/30">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                      See exact pricing & instant quotes
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Unlock vendor names, specs, compliance tags, and live availability.
                    </p>
                    <Button
                      onClick={goToSignIn}
                      className="bg-allrentz-red hover:bg-allrentz-red-dark text-white"
                    >
                      Create a free account
                    </Button>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedEquipment;
