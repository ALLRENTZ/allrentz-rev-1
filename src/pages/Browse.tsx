
import { useState } from 'react';
import { Map } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import EquipmentFilters from '@/components/EquipmentFilters';
import EquipmentGrid from '@/components/EquipmentGrid';
import { equipment, FilterState } from '@/data/equipmentData';

const Browse = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    location: '',
    maxRate: '',
    vendorRating: 'any'
  });

  const { toast } = useToast();

  const filteredEquipment = equipment.filter(item => {
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.location && !item.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.maxRate && item.dailyRate > parseInt(filters.maxRate)) return false;
    if (filters.vendorRating && filters.vendorRating !== 'any' && item.rating < parseFloat(filters.vendorRating)) return false;
    return true;
  });

  const handleRequestPhotos = (equipmentName: string) => {
    toast({
      title: "Photos Requested",
      description: `We've notified the vendor to upload photos for ${equipmentName}. You'll be updated once they're available.`,
    });
  };

  const handleRequestSpecs = (equipmentName: string) => {
    toast({
      title: "Spec Verification Requested",
      description: `We've asked the vendor to verify specifications for ${equipmentName}. You'll be notified when completed.`,
    });
  };

  return (
    <div className="min-h-screen bg-allrentz-gray-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-allrentz-gray">Browse Equipment</h1>
              <p className="text-gray-600 mt-1">Find verified industrial equipment from trusted vendors</p>
            </div>
            <div className="mt-4 lg:mt-0 flex items-center space-x-3">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-allrentz-red text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  viewMode === 'map' 
                    ? 'bg-allrentz-red text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Map className="h-4 w-4 inline mr-2" />
                Map View
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <EquipmentFilters filters={filters} setFilters={setFilters} />
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <EquipmentGrid
              equipment={filteredEquipment}
              totalEquipment={equipment.length}
              viewMode={viewMode}
              onRequestPhotos={handleRequestPhotos}
              onRequestSpecs={handleRequestSpecs}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Browse;
