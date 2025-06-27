
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const FeaturedEquipmentHeader: React.FC = () => {
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search equipment, categories, or specifications..."
                className="pl-10 py-3 text-black bg-white border-0 focus:ring-2 focus:ring-white/20"
              />
            </div>
            <Button className="px-8 py-3 bg-allrentz-red hover:bg-allrentz-red-dark text-white font-semibold">
              Search
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedEquipmentHeader;
