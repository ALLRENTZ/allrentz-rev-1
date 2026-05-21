
import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FeaturedEquipmentHeaderProps {
  onSearch?: (query: string) => void | Promise<void>;
  onQueryChange?: (query: string) => void;
  initialQuery?: string;
  isSearching?: boolean;
}

const FeaturedEquipmentHeader: React.FC<FeaturedEquipmentHeaderProps> = ({
  onSearch,
  onQueryChange,
  initialQuery = '',
  isSearching = false,
}) => {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const triggerSearch = () => {
    onSearch?.(query.trim());
  };

  return (
    <div className="bg-black text-white py-12 mb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Find the Perfect Equipment</h1>
          <p className="text-xl text-gray-300">
            Browse our extensive catalog of industrial equipment from verified vendors
          </p>
        </div>

        <form
          className="max-w-2xl mx-auto"
          onSubmit={(event) => {
            event.preventDefault();
            triggerSearch();
          }}
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onQueryChange?.(e.target.value);
                }}
                placeholder="Search equipment, categories, or specifications..."
                className="pl-10 py-3 text-black bg-white border-0 focus:ring-2 focus:ring-white/20"
              />
            </div>
            <Button
              type="submit"
              disabled={isSearching}
              className="px-8 py-3 bg-allrentz-red hover:bg-allrentz-red-dark text-white font-semibold"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeaturedEquipmentHeader;
