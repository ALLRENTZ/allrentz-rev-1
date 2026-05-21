import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EquipmentCard from '@/components/EquipmentCard';
import EquipmentTeaserCard from '@/components/EquipmentTeaserCard';
import {
  useEquipmentSearch,
  type FullEquipmentRow,
  type PublicEquipmentRow,
} from '@/hooks/useEquipmentSearch';
import { resolveCategoryGroup } from '@/data/categoryGroupMap';
import { equipmentCategories } from '@/data/equipmentCategories';
import type { Equipment } from '@/types/equipment';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop&auto=format';

const mapToEquipment = (row: FullEquipmentRow): Equipment => ({
  id: row.id,
  title: row.title ?? 'Untitled Equipment',
  description: row.description ?? '',
  category: row.category ?? '',
  daily_rate: Number(row.daily_rate ?? 0),
  location: row.location ?? '—',
  image_url: row.image_url ?? PLACEHOLDER_IMAGE,
  specifications: (row.specifications as Record<string, unknown>) ?? {},
  vendor_name: undefined,
  compliance_score: undefined,
  response_time_hours: row.response_time_hours ?? undefined,
  compliance_tags: row.compliance_tags ?? [],
} as Equipment);

const BrowseResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryParam = searchParams.get('category') ?? 'all';
  const urlQ = searchParams.get('q') ?? '';

  const [inputQuery, setInputQuery] = useState(urlQ);
  const [activeQuery, setActiveQuery] = useState(urlQ);
  const debounceRef = useRef<number | null>(null);

  const categories = resolveCategoryGroup(categoryParam);
  const categoryInfo = equipmentCategories.find((c) => c.category === categoryParam);

  const { data, loading, error, isAuthed, refetch } = useEquipmentSearch(activeQuery, categories);

  // Sync activeQuery → URL ?q=
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (activeQuery) next.set('q', activeQuery);
    else next.delete('q');
    if ((searchParams.get('q') ?? '') !== activeQuery) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuery]);

  const handleQueryChange = (value: string) => {
    setInputQuery(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setActiveQuery(value.trim());
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setActiveQuery(inputQuery.trim());
  };

  const goToSignIn = () => navigate('/auth');

  const showSkeleton = loading;
  const showEmpty = !loading && !error && data.length === 0;
  const headerTitle = categoryInfo ? categoryInfo.title : 'Browse Equipment';
  const headerDescription = categoryInfo
    ? categoryInfo.description
    : 'Find verified industrial equipment from trusted vendors';

  return (
    <div className="min-h-screen bg-allrentz-gray-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-4">
            <Link
              to="/browse"
              className="inline-flex items-center text-sm text-gray-600 hover:text-allrentz-red transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Equipment Categories
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-allrentz-gray">
                {activeQuery ? `Search results for "${activeQuery}"` : headerTitle}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeQuery
                  ? `${data.length} match${data.length === 1 ? '' : 'es'} in ${headerTitle}`
                  : headerDescription}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={inputQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search within this category..."
                  className="pl-10"
                />
              </div>
              <Button type="submit" className="bg-allrentz-red hover:bg-allrentz-red-dark text-white">
                Search
              </Button>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">Active Filters:</span>
            {categoryParam !== 'all' && (
              <span className="bg-allrentz-red text-white px-2 py-1 rounded">
                {categoryInfo?.title ?? categoryParam}
              </span>
            )}
            {activeQuery && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Query: {activeQuery}
              </span>
            )}
            {!isAuthed && (
              <span className="ml-auto text-xs text-gray-500">
                Showing public previews —{' '}
                <Link to="/auth" className="text-allrentz-red font-medium hover:underline">
                  sign in for full details
                </Link>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800 flex items-center justify-between">
            <span className="text-sm">Equipment query failed: {error}</span>
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        )}

        {showSkeleton ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="industrial-card overflow-hidden">
                <Skeleton className="w-full h-48 rounded-none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : showEmpty ? (
          <div className="text-center py-16">
            <p className="text-gray-700 font-medium mb-2">No equipment found</p>
            <p className="text-sm text-gray-500 mb-4">
              {activeQuery
                ? <>No matches for <span className="font-semibold">"{activeQuery}"</span> in {headerTitle}.</>
                : <>No listings available in {headerTitle} yet.</>}
            </p>
            <Link to="/browse">
              <Button variant="outline">Back to all categories</Button>
            </Link>
          </div>
        ) : isAuthed ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(data as FullEquipmentRow[]).map((row) => (
              <EquipmentCard key={row.id} equipment={mapToEquipment(row)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(data as PublicEquipmentRow[]).map((row) => (
              <EquipmentTeaserCard key={row.id} item={row} onSignInClick={goToSignIn} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseResults;
