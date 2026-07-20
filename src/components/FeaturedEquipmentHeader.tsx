import React from 'react';
import SearchAutocomplete from '@/components/SearchAutocomplete';

interface FeaturedEquipmentHeaderProps {
  onSearch?: (query: string) => void | Promise<void>;
  initialQuery?: string;
  isSearching?: boolean;
}

const FeaturedEquipmentHeader: React.FC<FeaturedEquipmentHeaderProps> = ({
  onSearch,
  initialQuery = '',
  isSearching = false,
}) => {
  return (
    <div className="bg-black text-white py-12 mb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Find the Perfect Equipment</h1>
          <p className="text-xl text-gray-300">
            Browse our extensive catalog of industrial equipment from verified vendors
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <SearchAutocomplete
            initialValue={initialQuery}
            onCommit={(term) => onSearch?.(term)}
            placeholder="Search equipment, categories, or specifications..."
            isSubmitting={isSearching}
          />
        </div>
      </div>
    </div>
  );
};

export default FeaturedEquipmentHeader;
