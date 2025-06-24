
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
  refineryAccess: boolean;
  turnaroundCertified: boolean;
  exclusiveRepairOnly: boolean;
  complianceTags: string[];
}

export interface FilterState {
  category: string;
  location: string;
  maxRate: string;
  vendorRating: string;
  refineryReady: boolean;
}
