
import React from 'react';
import { Star, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FeaturedEquipmentItem } from '@/data/featuredEquipment';

interface FeaturedEquipmentCardProps {
  item: FeaturedEquipmentItem;
}

const FeaturedEquipmentCard: React.FC<FeaturedEquipmentCardProps> = ({ item }) => {
  return (
    <div className="industrial-card overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative">
        <img 
          src={item.image} 
          alt={item.name}
          className="w-full h-48 object-cover"
        />
        
        {/* Available Badge */}
        {item.available && (
          <div className="absolute top-3 left-3">
            <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">
              Available
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
          <p className="text-sm text-gray-600">{item.specifications}</p>
        </div>

        {/* Location and Rating */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{item.location}</span>
          </div>
          <div className="flex items-center space-x-1 text-sm">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="font-medium">{item.rating}</span>
            <span className="text-gray-500">({item.reviews})</span>
          </div>
        </div>

        {/* Vendor */}
        <p className="text-sm text-gray-500 mb-3">{item.vendor}</p>

        {/* Pricing */}
        <div className="border-t border-gray-200 pt-3 mb-4">
          <p className="text-xl font-bold text-gray-900">
            ${item.dailyRate.toLocaleString()}
            <span className="text-sm font-normal text-gray-600">/day</span>
          </p>
        </div>

        {/* CTA Button */}
        <Link to="/customer-onboarding">
          <Button className="w-full industrial-button font-medium py-2">
            Request Quote
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default FeaturedEquipmentCard;
