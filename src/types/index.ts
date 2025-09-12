// ALLRENTZ Enterprise Type Definitions
// Centralized type exports for the application

// Equipment Types
export interface Equipment {
  id: string;
  title: string;
  category: string;
  description: string;
  dailyRate: number;
  location: string;
  vendor: {
    name: string;
    rating: number;
    verified: boolean;
  };
  specifications: Record<string, string>;
  compliance: {
    certifications: string[];
    safetyRating: string;
    lastInspection: string;
  };
  availability: {
    status: 'available' | 'reserved' | 'maintenance';
    nextAvailable?: string;
  };
  images: string[];
}

// User Types
export interface User {
  id: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin' | 'manager';
  profile: {
    firstName: string;
    lastName: string;
    company?: string;
    phone?: string;
  };
  preferences: {
    notifications: boolean;
    currency: string;
    timezone: string;
  };
}

// Location Types
export interface Location {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

// Common UI Types
export interface SelectOption {
  value: string;
  label: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}