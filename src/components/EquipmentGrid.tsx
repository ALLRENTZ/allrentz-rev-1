
import React from 'react';
import { Map } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EquipmentCard from './EquipmentCard';
import { EquipmentItem } from '@/data/types';
import { Equipment } from '@/types/equipment';

interface EquipmentGridProps {
  equipment: EquipmentItem[];
  totalEquipment: number;
  viewMode: string;
  onRequestPhotos: (equipmentName: string) => void;
  onRequestSpecs: (equipmentName: string) => void;
  onImageUpdate?: (equipmentId: number, newImageUrl: string) => void;
}

const EquipmentGrid: React.FC<EquipmentGridProps> = ({
  equipment,
  totalEquipment,
  viewMode,
  onRequestPhotos,
  onRequestSpecs,
  onImageUpdate
}) => {
  // Convert EquipmentItem to Equipment format
  const convertToEquipment = (item: EquipmentItem): Equipment => ({
    id: item.id.toString(),
    title: item.name,
    description: item.specs.join(', '),
    category: item.category,
    daily_rate: item.dailyRate,
    location: item.location,
    image_url: item.image,
    specifications: {},
    vendor_name: item.vendor,
    compliance_score: item.rating * 20,
    response_time_hours: 4,
    compliance_tags: item.complianceTags
  });

  if (viewMode === 'map') {
    return (
      <div className="industrial-card p-6">
        <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <Map className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Map View</h3>
            <p className="text-gray-500">
              Map view is not available in this version. Use grid view to browse equipment by location.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-600">
            Showing {equipment.length} of {totalEquipment} results
          </p>
        </div>
        <Select defaultValue="relevance">
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Sort by: Relevance</SelectItem>
            <SelectItem value="price-low">Sort by: Price (Low to High)</SelectItem>
            <SelectItem value="price-high">Sort by: Price (High to Low)</SelectItem>
            <SelectItem value="rating">Sort by: Rating</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {equipment.map(item => (
          <EquipmentCard
            key={item.id}
            equipment={convertToEquipment(item)}
            onQuoteRequest={(equipmentId) => {
              console.log(`Quote requested for equipment ${equipmentId}`);
            }}
          />
        ))}
      </div>
    </>
  );
};

export default EquipmentGrid;
