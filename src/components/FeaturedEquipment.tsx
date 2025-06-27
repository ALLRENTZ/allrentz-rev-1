
import React from 'react';
import FeaturedEquipmentHeader from '@/components/FeaturedEquipmentHeader';
import FeaturedEquipmentCard from '@/components/FeaturedEquipmentCard';
import { featuredEquipment } from '@/data/featuredEquipment';

const FeaturedEquipment: React.FC = () => {
  return (
    <div>
      {/* Black Header Section */}
      <FeaturedEquipmentHeader />
      
      {/* Featured Equipment Grid */}
      <div className="max-w-7xl mx-auto px-4 mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Equipment</h2>
          <p className="text-gray-600">Hand-picked equipment from our most trusted vendors</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featuredEquipment.map((item) => (
            <FeaturedEquipmentCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedEquipment;
