
export const equipment = [
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
    nextAvailable: null,
    operatorIncluded: false,
    hasPhotos: true,
    specVerified: true
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
    nextAvailable: null,
    operatorIncluded: false,
    hasPhotos: false,
    specVerified: true
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
    specs: ['LED Array', 'Class 1 Div 1', 'ATEX Zone 1'],
    image: 'https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=400&h=300&fit=crop',
    available: false,
    nextAvailable: '2024-07-01',
    operatorIncluded: false,
    hasPhotos: true,
    specVerified: false
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
    specs: ['40,000 PSI', 'Ultra High Pressure', 'Remote Operation'],
    image: 'https://images.unsplash.com/photo-1487252665478-49b61b47f302?w=400&h=300&fit=crop',
    available: true,
    nextAvailable: null,
    operatorIncluded: true,
    hasPhotos: true,
    specVerified: true
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
    specs: ['Complete Skid', 'Variable Flow', 'Remote Monitoring'],
    image: 'https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=400&h=300&fit=crop',
    available: true,
    nextAvailable: null,
    operatorIncluded: true,
    hasPhotos: false,
    specVerified: false
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
    nextAvailable: null,
    operatorIncluded: false,
    hasPhotos: true,
    specVerified: true
  }
];

export const categories = [
  { value: 'all', label: 'All Equipment' },
  { value: 'Boilers', label: 'Steam Boilers' },
  { value: 'Storage', label: 'Storage Tanks' },
  { value: 'Safety', label: 'Safety Equipment' },
  { value: 'Cleaning', label: 'Cleaning Systems' },
  { value: 'Process', label: 'Process Equipment' },
  { value: 'Vessels', label: 'Pressure Vessels' }
];

export const vendorRatingOptions = [
  { value: 'any', label: 'Any Rating' },
  { value: '4.5', label: '4.5+ Stars' },
  { value: '4.0', label: '4.0+ Stars' },
  { value: '3.5', label: '3.5+ Stars' }
];

export interface EquipmentItem {
  id: number;
  name: string;
  category: string;
  vendor: string;
  location: string;
  distance: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  rating: number;
  reviews: number;
  isApproved: boolean;
  specs: string[];
  image: string;
  available: boolean;
  nextAvailable: string | null;
  operatorIncluded: boolean;
  hasPhotos: boolean;
  specVerified: boolean;
}

export interface FilterState {
  category: string;
  location: string;
  maxRate: string;
  vendorRating: string;
}
