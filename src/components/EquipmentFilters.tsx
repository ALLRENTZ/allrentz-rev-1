
import React from 'react';
import { Search, MapPin, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterState, categories, vendorRatingOptions } from '../data/equipmentData';

interface EquipmentFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

const EquipmentFilters: React.FC<EquipmentFiltersProps> = ({ filters, setFilters }) => {
  return (
    <div className="industrial-card p-6 sticky top-8">
      <h2 className="text-lg font-bold text-allrentz-gray mb-6">
        Filters
      </h2>
      
      <div className="space-y-6">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Search Equipment</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              className="pl-10 w-full" 
              placeholder="Search equipment..."
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              className="pl-10 w-full" 
              placeholder="Houston, TX"
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>
        </div>

        {/* Vendor Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
          <Select value={filters.vendorRating} onValueChange={(value) => setFilters(prev => ({ ...prev, vendorRating: value }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any rating" />
            </SelectTrigger>
            <SelectContent>
              {vendorRatingOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Max Daily Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Daily Rate</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              type="number" 
              className="pl-10 w-full" 
              placeholder="1000"
              value={filters.maxRate}
              onChange={(e) => setFilters(prev => ({ ...prev, maxRate: e.target.value }))}
            />
          </div>
        </div>

        <Button className="w-full">
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default EquipmentFilters;
