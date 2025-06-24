
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface CategoryCardProps {
  title: string;
  description: string;
  image: string;
  equipmentCount: number;
  subItems: string[];
  label: 'Core Solutions' | 'Advanced' | 'Tooling';
  category: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  title,
  description,
  image,
  equipmentCount,
  subItems,
  label,
  category
}) => {
  const labelColors = {
    'Core Solutions': 'bg-blue-100 text-blue-800',
    'Advanced': 'bg-purple-100 text-purple-800',
    'Tooling': 'bg-green-100 text-green-800'
  };

  return (
    <div className="industrial-card overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {/* Image */}
      <div className="relative">
        <img 
          src={image} 
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${labelColors[label]}`}>
            {label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="mb-3">
          <h3 className="text-xl font-bold text-allrentz-gray mb-2">{title}</h3>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>

        {/* Sub-items preview */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Popular Equipment:</p>
          <div className="space-y-1">
            {subItems.slice(0, 3).map((item, index) => (
              <p key={index} className="text-xs text-gray-600">• {item}</p>
            ))}
          </div>
        </div>

        {/* Equipment count */}
        <div className="mb-4">
          <p className="text-sm text-gray-500">{equipmentCount} units available</p>
        </div>

        {/* CTA */}
        <Link 
          to={`/browse/results?category=${category}`}
          className="w-full inline-flex items-center justify-center bg-allrentz-red hover:bg-red-700 text-white font-medium py-3 px-4 rounded-md transition-colors group"
        >
          See All Equipment
          <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default CategoryCard;
