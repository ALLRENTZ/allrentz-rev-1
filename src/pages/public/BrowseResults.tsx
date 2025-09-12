
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ChevronLeft, Map } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import EquipmentFilters from '@/components/EquipmentFilters';
import EquipmentGrid from '@/components/EquipmentGrid';
import { equipment as originalEquipment } from '@/data/equipment';
import { FilterState, EquipmentItem } from '@/data/types';
import { equipmentCategories } from '@/data/equipmentCategories';

const BrowseResults = () => {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  const [viewMode, setViewMode] = useState('grid');
  const [equipment, setEquipment] = useState<EquipmentItem[]>(originalEquipment);
  const [filters, setFilters] = useState<FilterState>({
    category: category,
    location: '',
    maxRate: '',
    vendorRating: 'any',
    refineryReady: false
  });

  const { toast } = useToast();

  // Load saved images from localStorage on component mount
  useEffect(() => {
    const updatedEquipment = originalEquipment.map(item => {
      const savedImage = localStorage.getItem(`equipment_image_${item.id}`);
      return savedImage ? { ...item, image: savedImage } : item;
    });
    setEquipment(updatedEquipment);
  }, []);

  // Update filters when category changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, category }));
  }, [category]);

  const filteredEquipment = equipment.filter(item => {
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.location && !item.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.maxRate && item.dailyRate > parseInt(filters.maxRate)) return false;
    if (filters.vendorRating && filters.vendorRating !== 'any' && item.rating < parseFloat(filters.vendorRating)) return false;
    if (filters.refineryReady && !item.refineryAccess) return false;
    return true;
  });

  const categoryInfo = equipmentCategories.find(cat => cat.category === category);

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

  const handleImageUpdate = (equipmentId: number, newImageUrl: string) => {
    setEquipment(prevEquipment => 
      prevEquipment.map(item => 
        item.id === equipmentId 
          ? { ...item, image: newImageUrl }
          : item
      )
    );
    console.log(`Image updated for equipment ${equipmentId}:`, newImageUrl);
  };

  return (
    <div className="min-h-screen bg-allrentz-gray-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link 
              to="/browse" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-allrentz-red transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Equipment Categories
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-allrentz-gray">
                {categoryInfo ? categoryInfo.title : 'Browse Equipment'}
              </h1>
              <p className="text-gray-600 mt-1">
                {categoryInfo ? categoryInfo.description : 'Find verified industrial equipment from trusted vendors'}
              </p>
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

          {/* Filter Summary Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">Active Filters:</span>
            {filters.category !== 'all' && (
              <span className="bg-allrentz-red text-white px-2 py-1 rounded">
                {categoryInfo?.title || filters.category}
              </span>
            )}
            {filters.location && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Location: {filters.location}
              </span>
            )}
            {filters.refineryReady && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                Refinery-Ready
              </span>
            )}
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
              onImageUpdate={handleImageUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseResults;
