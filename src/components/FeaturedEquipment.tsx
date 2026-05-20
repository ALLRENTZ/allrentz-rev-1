
import React, { useEffect, useState } from 'react';
import FeaturedEquipmentHeader from '@/components/FeaturedEquipmentHeader';
import FeaturedEquipmentCard from '@/components/FeaturedEquipmentCard';
import { FeaturedEquipmentItem, featuredEquipment as demoEquipment } from '@/data/featuredEquipment';
import { supabase } from '@/integrations/supabase/client';

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
  vendor_name?: string | null;
};

const FeaturedEquipment: React.FC = () => {
  const [equipmentItems, setEquipmentItems] = useState<FeaturedEquipmentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const escapeLikePattern = (value: string) =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/,/g, '\\,')
      .replace(/\./g, '\\.')
      .replace(/:/g, '\\:')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  const handleImageUpdate = (equipmentId: string, newImageUrl: string) => {
    setEquipmentItems(prevItems =>
      prevItems.map(item =>
        item.id === equipmentId
          ? { ...item, image: newImageUrl }
          : item
      )
    );
  };

  const mapRowToItem = (row: EquipmentRow): FeaturedEquipmentItem => ({
    id: row.id,
    name: row.title ?? 'Untitled Equipment',
    specifications: row.specifications
      ? (typeof row.specifications === 'string'
          ? row.specifications
          : Object.entries(row.specifications).map(([k, v]) => `${k}: ${v}`).join(', '))
      : (row.description ?? row.category ?? ''),
    location: row.location ?? '—',
    rating: 0,
    reviews: 0,
    dailyRate: Number(row.daily_rate ?? 0),
    image: row.image_url ?? 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop&auto=format',
    available: row.available ?? true,
    vendor: row.vendor_name ?? row.category ?? '',
  });

  const runSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const trimmedQuery = query.trim();

      let req = supabase
        .from('equipment')
        .select('*')
        .order('daily_rate', { ascending: true })
        .limit(50);

      if (trimmedQuery) {
        const pattern = `%${escapeLikePattern(trimmedQuery)}%`;
        req = req.or(
          `title.ilike.${pattern},category.ilike.${pattern}`
        );
      }

      const { data, error } = await req;

      if (error) {
        throw error;
      }

      setEquipmentItems((data ?? []).map((row) => mapRowToItem(row as EquipmentRow)));
    } catch (err) {
      console.error('Equipment search failed:', err);
      setEquipmentItems([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    void runSearch('');
  }, []);

  return (
    <div>
      {/* Black Header Section */}
      <FeaturedEquipmentHeader onSearch={runSearch} isSearching={isSearching} />

      {/* Featured Equipment Grid */}
      <div className="max-w-7xl mx-auto px-4 mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Equipment</h2>
          <p className="text-gray-600">Hand-picked equipment from our most trusted vendors</p>
        </div>

        {isSearching ? (
          <div className="text-center py-8 text-gray-500">Searching...</div>
        ) : equipmentItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No equipment found.</div>
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
