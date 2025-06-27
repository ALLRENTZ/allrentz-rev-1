
import React, { useState } from 'react';
import CategoryCard from '@/components/CategoryCard';
import { EquipmentCategory } from '@/data/equipmentCategories';

interface CategoryGridProps {
  categories: EquipmentCategory[];
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ categories }) => {
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});

  // Load saved images from localStorage on component mount
  React.useEffect(() => {
    const savedImages: Record<string, string> = {};
    categories.forEach(category => {
      const savedImage = localStorage.getItem(`category_image_${category.category}`);
      if (savedImage) {
        savedImages[category.category] = savedImage;
      }
    });
    setCategoryImages(savedImages);
  }, [categories]);

  const handleImageUpdate = (categoryId: string, newImageUrl: string) => {
    setCategoryImages(prev => ({
      ...prev,
      [categoryId]: newImageUrl
    }));
    console.log(`Category image updated for ${categoryId}:`, newImageUrl);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          title={category.title}
          description={category.description}
          image={categoryImages[category.category] || category.image}
          equipmentCount={category.equipmentCount}
          subItems={category.subItems}
          label={category.label}
          category={category.category}
          onImageUpdate={handleImageUpdate}
        />
      ))}
    </div>
  );
};

export default CategoryGrid;
