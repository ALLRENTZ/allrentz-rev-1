
import React from 'react';
import CategoryCard from '@/components/CategoryCard';
import { EquipmentCategory } from '@/data/equipmentCategories';

interface CategoryGridProps {
  categories: EquipmentCategory[];
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ categories }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {categories.map((category) => (
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
  );
};

export default CategoryGrid;
