import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Star, CheckCircle, Calendar, DollarSign, Map, Shield, Zap, Award, Users, Navigation, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGeolocation } from '@/hooks/useGeolocation';
import { calculateDistance, getEmergencyStatus, getEquipmentCoordinates, getHotSwapStatus, milesToDriveTime } from '@/utils/geofencing';
import { toast } from '@/components/ui/use-toast';
import EquipmentVerificationSystem from '@/components/EquipmentVerificationSystem';
import SmartFilteringSystem from '@/components/SmartFilteringSystem';

const Browse = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    category: 'all',
    location: '',
    dateRange: '',
    maxRate: '',
    compliance: [] as string[],
    vendorRating: 'any',
    smartMatch: false,
    proximityRadius: 60, // in minutes drive time
    emergencyOnly: false
  });

  const { latitude, longitude, error, loading, getCurrentLocation } = useGeolocation();

  // Enhanced equipment data with coordinates and emergency status
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
      hasSmartMatch: true,
      compliance: ['ASME Certified', 'OSHA Ready', 'EPA Compliant'],
      specs: ['150 HP', 'Natural Gas', 'ASME Certified'],
      image: 'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=400&h=300&fit=crop',
      available: true,
      nextAvailable: null,
      operatorIncluded: false,
      // Anti-failure system data
      hasPhotos: true,
      specVerified: true,
      preDispatchConfirmed: true,
      vendorQualityScore: 94
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
      hasSmartMatch: false,
      compliance: ['DOT Approved', 'Hazmat Approved'],
      specs: ['21,000 Gal', 'Steel Construction', 'DOT Approved'],
      image: 'https://images.unsplash.com/photo-1493962853295-0fd70327578a?w=400&h=300&fit=crop',
      available: true,
      nextAvailable: null,
      operatorIncluded: false,
      // Anti-failure system data
      hasPhotos: false,
      specVerified: true,
      preDispatchConfirmed: false,
      vendorQualityScore: 87
    },
    {
      id: 3,
      name: 'Intrinsically Safe LED Light Tower',
      category: 'Safety',
      vendor: 'SafeLight Industrial',
      location: 'Galveston, TX',
      distance: '35 miles',
      dailyRate: 285,
      weeklyRate: 1710,
      monthlyRate: 6840,
      rating: 4.8,
      reviews: 156,
      isApproved: true,
      hasSmartMatch: true,
      compliance: ['ATEX Certified', 'OSHA Ready', 'Intrinsically Safe'],
      specs: ['LED Array', 'Class 1 Div 1', 'ATEX Zone 1'],
      image: 'https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=400&h=300&fit=crop',
      available: false,
      nextAvailable: '2024-07-01',
      operatorIncluded: false,
      // Anti-failure system data
      hasPhotos: true,
      specVerified: false,
      preDispatchConfirmed: true,
      vendorQualityScore: 96
    },
    {
      id: 4,
      name: 'UHP Water Jetting System - 40,000 PSI',
      category: 'Cleaning',
      vendor: 'Precision Cleaning Co',
      location: 'Texas City, TX',
      distance: '18 miles',
      dailyRate: 1200,
      weeklyRate: 7200,
      monthlyRate: 28800,
      rating: 4.9,
      reviews: 203,
      isApproved: true,
      hasSmartMatch: true,
      compliance: ['OSHA Ready', 'Includes Operator', 'Hazmat Approved'],
      specs: ['40,000 PSI', 'Ultra High Pressure', 'Remote Operation'],
      image: 'https://images.unsplash.com/photo-1487252665478-49b61b47f302?w=400&h=300&fit=crop',
      available: true,
      nextAvailable: null,
      operatorIncluded: true,
      // Anti-failure system data
      hasPhotos: true,
      specVerified: true,
      preDispatchConfirmed: true,
      vendorQualityScore: 98
    },
    {
      id: 5,
      name: 'Flushing Skid - Complete System',
      category: 'Process',
      vendor: 'Process Solutions LLC',
      location: 'Pasadena, TX',
      distance: '8 miles',
      dailyRate: 950,
      weeklyRate: 5700,
      monthlyRate: 22800,
      rating: 4.6,
      reviews: 94,
      isApproved: true,
      hasSmartMatch: false,
      compliance: ['ASME Certified', 'API Compliant', 'OSHA Ready'],
      specs: ['Complete Skid', 'Variable Flow', 'Remote Monitoring'],
      image: 'https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=400&h=300&fit=crop',
      available: true,
      nextAvailable: null,
      operatorIncluded: true,
      // Anti-failure system data
      hasPhotos: false,
      specVerified: false,
      preDispatchConfirmed: false,
      vendorQualityScore: 82
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
      hasSmartMatch: true,
      compliance: ['API Certified', 'ASME Certified', 'OSHA Ready'],
      specs: ['500 PSI Rating', 'Stainless Steel', 'API Certified'],
      image: 'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=400&h=300&fit=crop',
      available: true,
      nextAvailable: null,
      operatorIncluded: false,
      // Anti-failure system data
      hasPhotos: true,
      specVerified: true,
      preDispatchConfirmed: false,
      vendorQualityScore: 91
    }
  ];

  // Calculate enhanced equipment data with geofencing info
  const enhancedEquipment = equipment.map(item => {
    const equipmentCoords = getEquipmentCoordinates(item.id);
    let distanceInMiles = null;
    let emergencyStatus = null;
    let driveTimeMinutes = null;

    if (latitude && longitude) {
      distanceInMiles = calculateDistance(latitude, longitude, equipmentCoords.lat, equipmentCoords.lng);
      driveTimeMinutes = milesToDriveTime(distanceInMiles);
      emergencyStatus = getEmergencyStatus(distanceInMiles);
    }

    const hotSwapStatus = getHotSwapStatus(item.category, item.id);

    return {
      ...item,
      distanceInMiles,
      driveTimeMinutes,
      emergencyStatus,
      hotSwapStatus
    };
  });

  // Show hot swap notifications
  useEffect(() => {
    if (latitude && longitude) {
      const hotSwapItems = enhancedEquipment.filter(item => 
        item.hotSwapStatus?.isHotSwap && 
        item.driveTimeMinutes && 
        item.driveTimeMinutes <= 30
      );

      if (hotSwapItems.length > 0) {
        toast({
          title: "🔄 Hot Swap Alert!",
          description: `${hotSwapItems.length} equipment item(s) recently returned nearby`,
        });
      }
    }
  }, [latitude, longitude]);

  const categories = [
    { value: 'all', label: 'All Equipment' },
    { value: 'Boilers', label: 'Steam Boilers' },
    { value: 'Storage', label: 'Storage Tanks' },
    { value: 'Safety', label: 'Safety Equipment' },
    { value: 'Cleaning', label: 'Cleaning Systems' },
    { value: 'Process', label: 'Process Equipment' },
    { value: 'Vessels', label: 'Pressure Vessels' }
  ];

  const complianceOptions = [
    'ATEX Certified',
    'OSHA Ready',
    'Hazmat Approved',
    'Includes Operator',
    'ASME Certified',
    'API Compliant',
    'EPA Compliant',
    'Intrinsically Safe'
  ];

  const vendorRatingOptions = [
    { value: 'any', label: 'Any Rating' },
    { value: '4.5', label: '4.5+ Stars' },
    { value: '4.0', label: '4.0+ Stars' },
    { value: '3.5', label: '3.5+ Stars' }
  ];

  const proximityOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 999, label: 'Any distance' }
  ];

  const filteredEquipment = enhancedEquipment.filter(item => {
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.location && !item.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.maxRate && item.dailyRate > parseInt(filters.maxRate)) return false;
    if (filters.vendorRating && filters.vendorRating !== 'any' && item.rating < parseFloat(filters.vendorRating)) return false;
    if (filters.smartMatch && !item.hasSmartMatch) return false;
    if (filters.emergencyOnly && (!item.emergencyStatus || item.emergencyStatus.status === 'nearby')) return false;
    if (item.driveTimeMinutes && filters.proximityRadius !== 999 && item.driveTimeMinutes > filters.proximityRadius) return false;
    if (filters.compliance.length > 0) {
      const hasRequiredCompliance = filters.compliance.every(comp => 
        item.compliance.includes(comp)
      );
      if (!hasRequiredCompliance) return false;
    }
    return true;
  });

  const toggleCompliance = (compliance: string) => {
    setFilters(prev => ({
      ...prev,
      compliance: prev.compliance.includes(compliance)
        ? prev.compliance.filter(c => c !== compliance)
        : [...prev.compliance, compliance]
    }));
  };

  const getComplianceIcon = (compliance: string) => {
    switch (compliance) {
      case 'ATEX Certified':
      case 'Intrinsically Safe':
        return <Zap className="h-3 w-3" />;
      case 'OSHA Ready':
        return <Shield className="h-3 w-3" />;
      case 'Includes Operator':
        return <Users className="h-3 w-3" />;
      default:
        return <Award className="h-3 w-3" />;
    }
  };

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
              <Button
                onClick={() => setFilters(prev => ({ ...prev, emergencyOnly: !prev.emergencyOnly }))}
                variant={filters.emergencyOnly ? "default" : "outline"}
                className="font-medium"
              >
                <Clock className="h-4 w-4 mr-2" />
                Emergency Only
              </Button>
              <Button
                onClick={() => setFilters(prev => ({ ...prev, smartMatch: !prev.smartMatch }))}
                variant={filters.smartMatch ? "default" : "outline"}
                className="font-medium"
              >
                <Zap className="h-4 w-4 mr-2" />
                Smart Match Only
              </Button>
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
          {/* Enhanced Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="industrial-card p-6 sticky top-8">
              <h2 className="text-lg font-bold text-allrentz-gray mb-6 flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Advanced Filters
              </h2>
              
              <div className="space-y-6">
                {/* Smart Filtering System */}
                <SmartFilteringSystem 
                  onFiltersChange={(smartFilters) => {
                    console.log('Smart filters changed:', smartFilters);
                    // You can integrate this with the main filters state
                  }} 
                />

                {/* Location & Proximity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Location</label>
                  <div className="space-y-3">
                    <Button 
                      onClick={getCurrentLocation}
                      disabled={loading}
                      variant="outline"
                      className="w-full"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      {loading ? 'Getting Location...' : 'Use My Location'}
                    </Button>
                    {error && (
                      <p className="text-sm text-red-600">{error}</p>
                    )}
                    {latitude && longitude && (
                      <p className="text-sm text-green-600">✓ Location detected</p>
                    )}
                  </div>
                </div>

                {/* Proximity Radius */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Drive Time</label>
                  <Select 
                    value={filters.proximityRadius.toString()} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, proximityRadius: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Any distance" />
                    </SelectTrigger>
                    <SelectContent>
                      {proximityOptions.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Equipment</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      className="pl-10 w-full" 
                      placeholder="Flushing skids, UHP systems..."
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Category</label>
                  <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Traditional Location Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location (Text)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      className="pl-10 w-full" 
                      placeholder="Houston, TX"
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Compliance Certifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Compliance & Certifications</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {complianceOptions.map(compliance => (
                      <label key={compliance} className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300" 
                          checked={filters.compliance.includes(compliance)}
                          onChange={() => toggleCompliance(compliance)}
                        />
                        <span className="text-sm text-gray-700 flex items-center space-x-1">
                          {getComplianceIcon(compliance)}
                          <span>{compliance}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Vendor Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Vendor Rating</label>
                  <Select value={filters.vendorRating} onValueChange={(value) => setFilters(prev => ({ ...prev, vendorRating: value }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Any rating" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorRatingOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rental Period</label>
                  <div className="space-y-2">
                    <Input type="date" className="w-full" />
                    <Input type="date" className="w-full" />
                  </div>
                </div>

                {/* Max Daily Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Daily Rate</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      type="number" 
                      className="pl-10 w-full" 
                      placeholder="1000"
                      value={filters.maxRate}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxRate: e.target.value }))}
                    />
                  </div>
                </div>

                <Button className="w-full">
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {viewMode === 'grid' ? (
              <>
                {/* Results Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-gray-600">
                      Showing {filteredEquipment.length} of {equipment.length} results
                    </p>
                    {filters.smartMatch && (
                      <p className="text-sm text-allrentz-red font-medium mt-1">
                        <Zap className="h-4 w-4 inline mr-1" />
                        Smart Match results prioritized
                      </p>
                    )}
                    {filters.emergencyOnly && (
                      <p className="text-sm text-red-600 font-medium mt-1">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Showing emergency equipment only
                      </p>
                    )}
                  </div>
                  <Select defaultValue="relevance">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Sort by: Relevance</SelectItem>
                      <SelectItem value="proximity">Sort by: Distance</SelectItem>
                      <SelectItem value="price-low">Sort by: Price (Low to High)</SelectItem>
                      <SelectItem value="price-high">Sort by: Price (High to Low)</SelectItem>
                      <SelectItem value="rating">Sort by: Rating</SelectItem>
                    </SelectContent>
                  </Select>
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
                        <div className="absolute top-3 left-3 flex flex-col space-y-2">
                          {item.isApproved && (
                            <span className="industrial-badge-approved inline-flex items-center space-x-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>ALLRENTZ Verified</span>
                            </span>
                          )}
                          {item.hasSmartMatch && (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full inline-flex items-center space-x-1">
                              <Zap className="h-3 w-3" />
                              <span>SmartMatch Available</span>
                            </span>
                          )}
                          {item.emergencyStatus && (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full inline-flex items-center space-x-1 ${item.emergencyStatus.color}`}>
                              <Clock className="h-3 w-3" />
                              <span>{item.emergencyStatus.label}</span>
                            </span>
                          )}
                          {item.hotSwapStatus && (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full inline-flex items-center space-x-1 ${item.hotSwapStatus.color}`}>
                              <span>{item.hotSwapStatus.label}</span>
                            </span>
                          )}
                        </div>
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
                          {item.driveTimeMinutes && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="font-medium text-allrentz-red">
                                {item.driveTimeMinutes} min drive
                              </span>
                            </>
                          )}
                        </div>

                        {/* Equipment Verification System */}
                        <div className="mb-4">
                          <EquipmentVerificationSystem 
                            equipment={{
                              id: item.id.toString(),
                              name: item.name,
                              hasPhotos: item.hasPhotos,
                              specVerified: item.specVerified,
                              preDispatchConfirmed: item.preDispatchConfirmed,
                              vendorQualityScore: item.vendorQualityScore
                            }}
                            onPhotoUpload={() => console.log('Photo upload requested for', item.name)}
                            onSpecVerify={() => console.log('Spec verification requested for', item.name)}
                            onPreDispatchConfirm={() => console.log('Pre-dispatch confirmation requested for', item.name)}
                          />
                        </div>

                        {/* Compliance Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.compliance.slice(0, 3).map((comp, index) => (
                            <span key={index} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full inline-flex items-center space-x-1">
                              {getComplianceIcon(comp)}
                              <span>{comp}</span>
                            </span>
                          ))}
                          {item.compliance.length > 3 && (
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                              +{item.compliance.length - 3} more
                            </span>
                          )}
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
                              {item.operatorIncluded && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-sm text-blue-600">Operator Included</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 mb-4">
                              <Calendar className="h-4 w-4 text-orange-500" />
                              <span className="text-sm text-orange-600">
                                Next available: {new Date(item.nextAvailable!).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          {/* Anti-failure guarantee message */}
                          {item.hasPhotos && item.specVerified && item.preDispatchConfirmed && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                              <div className="flex items-center space-x-2">
                                <Shield className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">Failure Prevention Guaranteed</span>
                              </div>
                              <p className="text-xs text-green-700 mt-1">
                                This equipment has passed all verification checks
                              </p>
                            </div>
                          )}

                          {/* CTA Button */}
                          <Link 
                            to="/customer-onboarding"
                            className={`w-full text-center inline-block font-medium py-3 px-6 rounded-md transition-colors ${
                              item.hasSmartMatch 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'industrial-button'
                            }`}
                          >
                            {item.hasSmartMatch ? 'Get Smart Quote' : 'Request Quote'}
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
                      View equipment locations, compliance status, and get directions to vendor locations
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Enhanced with real-time availability and compliance filtering
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
