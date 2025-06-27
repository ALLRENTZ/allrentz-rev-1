
import React from 'react';
import { getVisibleCategories } from '@/data/equipmentCategories';
import BrowseHeader from '@/components/BrowseHeader';
import CategoryGrid from '@/components/CategoryGrid';
import EmptyState from '@/components/EmptyState';

interface BrowseProps {
  showOffshore?: boolean;
}

const Browse: React.FC<BrowseProps> = ({ showOffshore = false }) => {
  const visibleCategories = getVisibleCategories(showOffshore);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BrowseHeader />
        
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
