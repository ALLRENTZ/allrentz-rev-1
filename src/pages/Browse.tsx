
import React from 'react';
import { Shield, Star, CheckCircle } from 'lucide-react';
import SmartMatchButton from '@/components/SmartMatchButton';
import CategoryCard from '@/components/CategoryCard';
import VendorCarousel from '@/components/VendorCarousel';
import { equipmentCategories } from '@/data/equipmentCategories';

const Browse = () => {
  return (
    <div className="min-h-screen bg-allrentz-gray-light">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-allrentz-gray to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Browse Equipment Rentals
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Find verified industrial equipment from trusted vendors. 
              Choose from thousands of units across all major categories.
            </p>
            
            {/* SmartMatch Button */}
            <div className="mb-8">
              <SmartMatchButton />
            </div>

            {/* Badge Bar */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center space-x-2 bg-white bg-opacity-10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Shield className="h-4 w-4 text-blue-300" />
                <span>Intrinsically Safe</span>
              </div>
              <div className="flex items-center space-x-2 bg-white bg-opacity-10 backdrop-blur-sm px-4 py-2 rounded-full">
                <CheckCircle className="h-4 w-4 text-green-300" />
                <span>Refinery Ready</span>
              </div>
              <div className="flex items-center space-x-2 bg-white bg-opacity-10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Star className="h-4 w-4 text-yellow-300" />
                <span>ALLRENTZ Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Grid Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-allrentz-gray mb-4">
            Equipment Categories
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Browse our comprehensive selection of industrial equipment organized by category. 
            Each category features verified, high-quality equipment from trusted vendors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {equipmentCategories.map((category) => (
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
      </div>

      {/* Trusted Vendors Carousel */}
      <VendorCarousel />

      {/* Additional CTA Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-allrentz-gray mb-4">
            Need Help Finding Equipment?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Our equipment specialists are here to help you find exactly what you need for your project. 
            Get personalized recommendations and expert guidance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SmartMatchButton />
            <a 
              href="tel:1-800-ALLRENTZ"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-allrentz-red text-allrentz-red font-semibold rounded-lg hover:bg-allrentz-red hover:text-white transition-colors"
            >
              Call Equipment Specialists
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Browse;
