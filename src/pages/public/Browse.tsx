
import React, { useState } from 'react';
import { getVisibleCategories } from '@/data/equipmentCategories';
import BrowseHeader from '@/components/BrowseHeader';
import CategoryGrid from '@/components/CategoryGrid';
import EmptyState from '@/components/EmptyState';
import FeaturedEquipment from '@/components/FeaturedEquipment';
import HybridSearchInterface from '@/components/HybridSearchInterface';

interface BrowseProps {
  showOffshore?: boolean;
}

const Browse: React.FC<BrowseProps> = ({ showOffshore = false }) => {
  const visibleCategories = getVisibleCategories(showOffshore);
  const [searchResults, setSearchResults] = useState<any>(null);

  const handleSearchResults = (results: any) => {
    setSearchResults(results);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Featured Equipment Section */}
      <FeaturedEquipment />
      
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        <BrowseHeader />
        
        {/* Hybrid Search Interface */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <HybridSearchInterface 
            onResults={handleSearchResults}
            defaultTab="smart"
          />
        </div>
        
        {/* Equipment Categories Section - Only show if no search results */}
        {!searchResults && (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Equipment Categories</h2>
              <p className="text-gray-600">Explore our comprehensive catalog organized by industry needs</p>
            </div>
            
            {visibleCategories.length > 0 ? (
              <CategoryGrid categories={visibleCategories} />
            ) : (
              <EmptyState />
            )}
          </>
        )}
        
        {/* Search Results Summary */}
        {searchResults && (
          <div className="text-center bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Search completed! 
            </h3>
            <p className="text-gray-600">
              {searchResults.total_matches || searchResults.equipment?.length || 0} results found. 
              Scroll up to see detailed matches.
            </p>
            <button 
              onClick={() => setSearchResults(null)}
              className="mt-4 text-allrentz-red hover:text-red-700 font-medium"
            >
              Clear results and browse categories
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
