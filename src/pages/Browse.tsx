
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CategoryCard from '@/components/CategoryCard';
import { getVisibleCategories } from '@/data/equipmentCategories';

interface BrowseProps {
  showOffshore?: boolean;
}

const Browse: React.FC<BrowseProps> = ({ showOffshore = false }) => {
  const visibleCategories = getVisibleCategories(showOffshore);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Browse Equipment</h1>
            <p className="text-gray-600 mt-2">Discover industrial equipment from verified vendors</p>
          </div>
          <Link to="/smartmatch-demo">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              Try SmartMatch AI
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleCategories.map((category) => (
            <CategoryCard
              key={category.id}
              title={category.title}
              description={category.description}
              image={category.image}
              equipmentCount={category.equipmentCount}
              subItems={category.subItems}
              label={category.label}
              category={category.category}
            />
          ))}
        </div>

        {visibleCategories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No equipment categories found</p>
            <Link to="/smartmatch-demo">
              <Button className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Try SmartMatch to find equipment
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
