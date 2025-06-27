
export interface FeaturedEquipmentItem {
  id: string;
  name: string;
  specifications: string;
  location: string;
  rating: number;
  reviews: number;
  dailyRate: number;
  image: string;
  available: boolean;
  vendor: string;
}

export const featuredEquipment: FeaturedEquipmentItem[] = [
  {
    id: 'steam-boiler-1',
    name: 'Industrial Steam Boiler',
    specifications: '150 HP',
    location: 'Houston, TX',
    rating: 4.8,
    reviews: 24,
    dailyRate: 850,
    image: 'https://images.unsplash.com/photo-1565008447742-97f6717d4e89?w=400&h=300&fit=crop&auto=format',
    available: true,
    vendor: 'Industrial Boiler Solutions'
  },
  {
    id: 'frac-tank-1',
    name: '21K Gallon Frac Tank',
    specifications: '21,000 Gallon Capacity',
    location: 'Midland, TX',
    rating: 4.9,
    reviews: 18,
    dailyRate: 425,
    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&h=300&fit=crop&auto=format',
    available: true,
    vendor: 'Tank Rental Pros'
  },
  {
    id: 'diesel-generator-1',
    name: 'Diesel Generator',
    specifications: '500 KW',
    location: 'Dallas, TX',
    rating: 4.7,
    reviews: 31,
    dailyRate: 675,
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop&auto=format',
    available: true,
    vendor: 'Power Solutions LLC'
  },
  {
    id: 'excavator-1',
    name: 'Hydraulic Excavator',
    specifications: '320 CAT Equivalent',
    location: 'Austin, TX',
    rating: 4.6,
    reviews: 22,
    dailyRate: 950,
    image: 'https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?w=400&h=300&fit=crop&auto=format',
    available: true,
    vendor: 'Heavy Equipment Rentals'
  }
];
