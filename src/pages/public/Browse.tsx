
import React from 'react';
import { getVisibleCategories } from '@/data/equipmentCategories';
import BrowseHeader from '@/components/BrowseHeader';
import CategoryGrid from '@/components/CategoryGrid';
import EmptyState from '@/components/EmptyState';
import FeaturedEquipment from '@/components/FeaturedEquipment';

interface BrowseProps {
  showOffshore?: boolean;
}

const Browse: React.FC<BrowseProps> = ({ showOffshore = false }) => {
  const visibleCategories = getVisibleCategories(showOffshore);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Featured Equipment Section */}
      <FeaturedEquipment />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BrowseHeader />
        
        {/* Equipment Categories Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Equipment Categories</h2>
          <p className="text-gray-600">Explore our comprehensive catalog organized by industry needs</p>
        </div>
        
        {visibleCategories.length > 0 ? (
          <CategoryGrid categories={visibleCategories} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

export default Browse;
