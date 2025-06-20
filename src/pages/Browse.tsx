
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Star, CheckCircle, Calendar, DollarSign, Map } from 'lucide-react';

const Browse = () => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  const [filters, setFilters] = useState({
    category: 'all',
    location: '',
    dateRange: '',
    maxRate: ''
  });

  // Mock equipment data
  const equipment = [
    {
      id: 1,
      name: 'Steam Boiler - 150 HP',
      category: 'Boilers',
      vendor: 'Gulf Coast Equipment',
      location: 'Houston, TX',
      distance: '12 miles',
      dailyRate: 850,
      weeklyRate: 5100,
      monthlyRate: 18000,
      rating: 4.9,
      reviews: 127,
      isApproved: true,
      specs: ['150 HP', 'Natural Gas', 'ASME Certified'],
      image: 'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=400&h=300&fit=crop',
      available: true,
      nextAvailable: null
    },
    {
      id: 2,
      name: 'Frac Tank - 21,000 Gallon',
      category: 'Storage',
      vendor: 'Texas Tank Rentals',
      location: 'Beaumont, TX',
      distance: '25 miles',
      dailyRate: 125,
      weeklyRate: 750,
      monthlyRate: 2800,
      rating: 4.7,
      reviews: 89,
      isApproved: true,
      specs: ['21,000 Gal', 'Steel Construction', 'DOT Approved'],
      image: 'https://images.unsplash.com/photo-1493962853295-0fd70327578a?w=400&h=300&fit=crop',
      available: true,
      nextAvailable: null
    },
    {
      id: 3,
      name: 'Industrial Generator - 500kW',
      category: 'Power',
      vendor: 'Power Solutions Inc',
      location: 'Galveston, TX',
      distance: '35 miles',
      dailyRate: 450,
      weeklyRate: 2700,
      monthlyRate: 10800,
      rating: 4.8,
      reviews: 156,
      isApproved: true,
      specs: ['500kW', 'Diesel', 'Tier 4 Compliant'],
      image: 'https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=400&h=300&fit=crop',
      available: false,
      nextAvailable: '2024-07-01'
    },
    {
      id: 4,
      name: 'Confined Space Ventilation System',
      category: 'Safety',
      vendor: 'Safety First Rentals',
      location: 'Texas City, TX',
      distance: '18 miles',
      dailyRate: 95,
      weeklyRate: 570,
      monthlyRate: 2280,
      rating: 4.9,
      reviews: 203,
      isApproved: true,
      specs: ['High CFM', 'Explosion Proof', 'OSHA Compliant'],
      image: 'https://images.unsplash.com/photo-1487252665478-49b61b47f302?w=400&h=300&fit=crop',
      available: true,
      nextAvailable: null
    },
    {
      id: 5,
      name: 'Mobile Crane - 50 Ton',
      category: 'Construction',
      vendor: 'Heavy Lift Solutions',
      location: 'Pasadena, TX',
      distance: '8 miles',
      dailyRate: 1200,
      weeklyRate: 7200,
      monthlyRate: 28800,
      rating: 4.6,
      reviews: 94,
      isApproved: true,
      specs: ['50 Ton Capacity', 'All Terrain', 'Certified Operator'],
      image: 'https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=400&h=300&fit=crop',
      available: true,
      nextAvailable: null
    },
    {
      id: 6,
      name: 'Pressure Vessel - 500 PSI',
      category: 'Vessels',
      vendor: 'Industrial Vessels Co',
      location: 'Deer Park, TX',
      distance: '15 miles',
      dailyRate: 320,
      weeklyRate: 1920,
      monthlyRate: 7680,
      rating: 4.8,
      reviews: 67,
      isApproved: true,
      specs: ['500 PSI Rating', 'Stainless Steel', 'API Certified'],
      image: 'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=400&h=300&fit=crop',
      available: true,
      nextAvailable: null
    }
  ];

  const categories = [
    { value: 'all', label: 'All Equipment' },
    { value: 'Boilers', label: 'Steam Boilers' },
    { value: 'Storage', label: 'Storage Tanks' },
    { value: 'Power', label: 'Generators' },
    { value: 'Safety', label: 'Safety Equipment' },
    { value: 'Construction', label: 'Construction' },
    { value: 'Vessels', label: 'Pressure Vessels' }
  ];

  const filteredEquipment = equipment.filter(item => {
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.location && !item.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.maxRate && item.dailyRate > parseInt(filters.maxRate)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-allrentz-gray-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-allrentz-gray">Browse Equipment</h1>
              <p className="text-gray-600 mt-1">Find verified industrial equipment from trusted vendors</p>
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="industrial-card p-6 sticky top-8">
              <h2 className="text-lg font-bold text-allrentz-gray mb-6 flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filters
              </h2>
              
              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      className="industrial-input pl-10 w-full" 
                      placeholder="Search equipment..."
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select 
                    className="industrial-input w-full"
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      className="industrial-input pl-10 w-full" 
                      placeholder="City, State"
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rental Period</label>
                  <div className="space-y-2">
                    <input 
                      type="date" 
                      className="industrial-input w-full" 
                      placeholder="Start Date"
                    />
                    <input 
                      type="date" 
                      className="industrial-input w-full" 
                      placeholder="End Date"
                    />
                  </div>
                </div>

                {/* Max Daily Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Daily Rate</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="number" 
                      className="industrial-input pl-10 w-full" 
                      placeholder="1000"
                      value={filters.maxRate}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxRate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Vendor Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Type</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                      <span className="text-sm text-gray-700">Approved Vendors Only</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="text-sm text-gray-700">Premium Certified</span>
                    </label>
                  </div>
                </div>

                <button className="w-full industrial-button">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {viewMode === 'grid' ? (
              <>
                {/* Results Header */}
                <div className="flex items-center justify-between mb-6">
                  <p className="text-gray-600">
                    Showing {filteredEquipment.length} of {equipment.length} results
                  </p>
                  <select className="industrial-input">
                    <option>Sort by: Relevance</option>
                    <option>Sort by: Price (Low to High)</option>
                    <option>Sort by: Price (High to Low)</option>
                    <option>Sort by: Distance</option>
                    <option>Sort by: Rating</option>
                  </select>
                </div>

                {/* Equipment Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredEquipment.map((item) => (
                    <div key={item.id} className="industrial-card overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Image */}
                      <div className="relative">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-48 object-cover"
                        />
                        {item.isApproved && (
                          <div className="absolute top-3 left-3">
                            <span className="industrial-badge-approved inline-flex items-center space-x-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>Approved Vendor</span>
                            </span>
                          </div>
                        )}
                        {!item.available && (
                          <div className="absolute top-3 right-3">
                            <span className="industrial-badge-alert">
                              Not Available
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-allrentz-gray mb-1">{item.name}</h3>
                            <p className="text-sm text-gray-600">{item.vendor}</p>
                          </div>
                          <div className="flex items-center space-x-1 text-sm">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="font-medium">{item.rating}</span>
                            <span className="text-gray-500">({item.reviews})</span>
                          </div>
                        </div>

                        {/* Location & Distance */}
                        <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
                          <MapPin className="h-4 w-4" />
                          <span>{item.location}</span>
                          <span className="text-gray-400">•</span>
                          <span>{item.distance}</span>
                        </div>

                        {/* Specs */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {item.specs.map((spec, index) => (
                            <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                              {spec}
                            </span>
                          ))}
                        </div>

                        {/* Pricing */}
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-2xl font-bold text-allrentz-gray">
                                ${item.dailyRate.toLocaleString()}
                                <span className="text-sm font-normal text-gray-600">/day</span>
                              </p>
                              <p className="text-sm text-gray-600">
                                ${item.weeklyRate.toLocaleString()}/week • ${item.monthlyRate.toLocaleString()}/month
                              </p>
                            </div>
                          </div>

                          {/* Availability */}
                          {item.available ? (
                            <div className="flex items-center space-x-2 mb-4">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600 font-medium">Available Now</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 mb-4">
                              <Calendar className="h-4 w-4 text-orange-500" />
                              <span className="text-sm text-orange-600">
                                Next available: {new Date(item.nextAvailable!).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          {/* CTA Button */}
                          <Link 
                            to="/customer-onboarding"
                            className="w-full industrial-button text-center inline-block"
                          >
                            Request Quote
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Map View */
              <div className="industrial-card p-6">
                <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                  <div className="text-center">
                    <Map className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Interactive Equipment Map</h3>
                    <p className="text-gray-500">
                      View equipment locations, availability, and get directions to vendor locations
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Map integration with real-time equipment tracking
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Browse;
