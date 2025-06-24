
import React from 'react';

interface Vendor {
  name: string;
  logo: string;
  description: string;
}

const VendorCarousel: React.FC = () => {
  const vendors: Vendor[] = [
    {
      name: "WARE Industries",
      logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&h=60&fit=crop&auto=format",
      description: "Industrial Equipment Specialists"
    },
    {
      name: "Brock Solutions",
      logo: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=120&h=60&fit=crop&auto=format",
      description: "Process Equipment Leaders"
    },
    {
      name: "Rain for Rent",
      logo: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=120&h=60&fit=crop&auto=format",
      description: "Liquid Solutions Provider"
    },
    {
      name: "United Rentals",
      logo: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=120&h=60&fit=crop&auto=format",
      description: "Heavy Equipment Rentals"
    },
    {
      name: "Sunbelt Rentals",
      logo: "https://images.unsplash.com/photo-1574281002596-95d0d6c6e92d?w=120&h=60&fit=crop&auto=format",
      description: "Construction Equipment"
    },
    {
      name: "Baker Hughes",
      logo: "https://images.unsplash.com/photo-1560264357-8d9202250f21?w=120&h=60&fit=crop&auto=format",
      description: "Energy Technology"
    }
  ];

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-allrentz-gray mb-2">Trusted Vendor Partners</h2>
          <p className="text-gray-600">Working with industry-leading equipment providers</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {vendors.map((vendor, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col items-center text-center"
            >
              <img 
                src={vendor.logo} 
                alt={vendor.name}
                className="w-16 h-16 object-cover rounded-lg mb-3"
              />
              <h3 className="font-semibold text-sm text-allrentz-gray mb-1">{vendor.name}</h3>
              <p className="text-xs text-gray-500">{vendor.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendorCarousel;
