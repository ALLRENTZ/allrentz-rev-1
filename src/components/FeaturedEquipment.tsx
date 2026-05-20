
import React, { useState } from 'react';
import FeaturedEquipmentHeader from '@/components/FeaturedEquipmentHeader';
import FeaturedEquipmentCard from '@/components/FeaturedEquipmentCard';
import { featuredEquipment, FeaturedEquipmentItem } from '@/data/featuredEquipment';
import { supabase } from '@/integrations/supabase/client';

const FeaturedEquipment: React.FC = () => {
  const [equipmentItems, setEquipmentItems] = useState<FeaturedEquipmentItem[]>(featuredEquipment);
  const [isSearching, setIsSearching] = useState(false);

  const handleImageUpdate = (equipmentId: string, newImageUrl: string) => {
    setEquipmentItems(prevItems =>
      prevItems.map(item =>
        item.id === equipmentId
          ? { ...item, image: newImageUrl }
          : item
      )
    );
  };

  const mapRowToItem = (row: any): FeaturedEquipmentItem => ({
    id: row.id,
    name: row.title ?? 'Untitled Equipment',
    specifications: row.specifications
      ? (typeof row.specifications === 'string'
          ? row.specifications
          : Object.entries(row.specifications).map(([k, v]) => `${k}: ${v}`).join(', '))
      : (row.category ?? ''),
    location: row.location ?? '—',
    rating: 0,
    reviews: 0,
    dailyRate: Number(row.daily_rate ?? 0),
    image: row.image_url ?? 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop&auto=format',
    available: row.available ?? true,
    vendor: '',
  });

  const filterDemo = (q: string) => {
    if (!q) return featuredEquipment;
    const lower = q.toLowerCase();
    return featuredEquipment.filter(item =>
      item.name.toLowerCase().includes(lower) ||
      item.specifications.toLowerCase().includes(lower) ||
      item.vendor.toLowerCase().includes(lower) ||
      item.location.toLowerCase().includes(lower)
    );
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      let req = supabase.from('equipment').select('*');
      if (query) {
        const pattern = `%${query}%`;
        req = req.or(
          `title.ilike.${pattern},category.ilike.${pattern},description.ilike.${pattern}`
        );
      }
      const { data, error } = await req;
      if (error || !data || data.length === 0) {
        setEquipmentItems(filterDemo(query));
      } else {
        setEquipmentItems(data.map(mapRowToItem));
      }
    } catch {
      setEquipmentItems(filterDemo(query));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div>
      {/* Black Header Section */}
      <FeaturedEquipmentHeader onSearch={handleSearch} />

      {/* Featured Equipment Grid */}
      <div className="max-w-7xl mx-auto px-4 mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Equipment</h2>
          <p className="text-gray-600">Hand-picked equipment from our most trusted vendors</p>
        </div>

        {isSearching ? (
          <div className="text-center py-8 text-gray-500">Searching...</div>
        ) : equipmentItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No equipment matches your search.</div>
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
