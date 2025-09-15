// Enhanced Equipment Service with CSV Repository Integration
// Provides both manual browsing and SmartMatch integration

import repositoryFactory from '../repositories/RepositoryFactory';
import { Equipment, Company, QueryOptions } from '../repositories/interfaces';

export interface EquipmentSearchFilters {
  category?: string;
  location?: string;
  max_daily_rate?: number;
  min_rating?: number;
  compliance_requirements?: string[];
  availability_status?: 'available' | 'reserved' | 'maintenance' | 'all';
  vendor_id?: string;
}

export interface EquipmentWithVendor extends Equipment {
  vendor: Company;
  distance_miles?: number;
  estimated_delivery?: string;
}

export interface EquipmentSearchResult {
  equipment: EquipmentWithVendor[];
  total_count: number;
  has_more: boolean;
  filters_applied: EquipmentSearchFilters;
}

class EquipmentService {
  private equipmentRepo = repositoryFactory.getEquipmentRepository();
  private companyRepo = repositoryFactory.getCompanyRepository();

  /**
   * Get all equipment categories available in the system
   */
  async getCategories(): Promise<string[]> {
    try {
      const equipment = await this.equipmentRepo.getAll();
      const categories = new Set<string>();
      
      equipment.data.forEach(eq => {
        if (eq.category) {
          categories.add(eq.category);
        }
      });
      
      return Array.from(categories).sort();
    } catch (error) {
      console.error('Failed to fetch equipment categories:', error);
      return [
        'frac_tanks',
        'steam_boilers', 
        'pressure_vessels',
        'safety_equipment',
        'power_generation',
        'heavy_machinery'
      ];
    }
  }

  /**
   * Search equipment with advanced filtering
   */
  async searchEquipment(
    filters: EquipmentSearchFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<EquipmentSearchResult> {
    try {
      // Build query options for repository
      const queryOptions: QueryOptions = {
        limit,
        offset,
        filters: {}
      };

      // Apply basic filters at repository level
      if (filters.category) {
        queryOptions.filters!.category = filters.category;
      }

      if (filters.vendor_id) {
        queryOptions.filters!.vendor_id = filters.vendor_id;
      }

      if (filters.availability_status && filters.availability_status !== 'all') {
        queryOptions.filters!.status = filters.availability_status;
      }

      // Get equipment from CSV
      const equipmentResult = await this.equipmentRepo.getAll(queryOptions);
      let equipmentList = equipmentResult.data;

      // Apply additional filters in memory (until we enhance CSV querying)
      if (filters.max_daily_rate) {
        equipmentList = equipmentList.filter(eq => eq.daily_rate <= filters.max_daily_rate!);
      }

      if (filters.compliance_requirements && filters.compliance_requirements.length > 0) {
        equipmentList = equipmentList.filter(eq => {
          const equipmentCompliance = eq.compliance_certifications || [];
          return filters.compliance_requirements!.some(req => 
            equipmentCompliance.some(cert => cert.includes(req))
          );
        });
      }

      // Get vendor information for each equipment
      const equipmentWithVendors = await Promise.all(
        equipmentList.map(async (equipment): Promise<EquipmentWithVendor | null> => {
          try {
            const vendor = await this.companyRepo.getById(equipment.vendor_id);
            if (!vendor) return null;

            return {
              ...equipment,
              vendor,
              distance_miles: filters.location ? this.calculateDistance(filters.location, vendor.headquarters) : undefined,
              estimated_delivery: this.calculateEstimatedDelivery(equipment, vendor, filters.location)
            };
          } catch (error) {
            console.warn(`Failed to fetch vendor for equipment ${equipment.id}:`, error);
            return null;
          }
        })
      );

      const validEquipment = equipmentWithVendors.filter(Boolean) as EquipmentWithVendor[];

      // Apply vendor-level filters
      let filteredEquipment = validEquipment;
      
      if (filters.min_rating) {
        filteredEquipment = filteredEquipment.filter(eq => 
          eq.vendor.rating && eq.vendor.rating >= filters.min_rating!
        );
      }

      // Sort by relevance (rating, distance, availability)
      filteredEquipment.sort((a, b) => {
        // Available equipment first
        if (a.status !== b.status) {
          if (a.status === 'available') return -1;
          if (b.status === 'available') return 1;
        }

        // Then by vendor rating
        const ratingDiff = (b.vendor.rating || 0) - (a.vendor.rating || 0);
        if (Math.abs(ratingDiff) > 0.1) return ratingDiff;

        // Then by distance if location provided
        if (filters.location && a.distance_miles && b.distance_miles) {
          return a.distance_miles - b.distance_miles;
        }

        // Finally by daily rate (lower first)
        return a.daily_rate - b.daily_rate;
      });

      return {
        equipment: filteredEquipment,
        total_count: filteredEquipment.length,
        has_more: offset + limit < filteredEquipment.length,
        filters_applied: filters
      };

    } catch (error) {
      console.error('Equipment search error:', error);
      return {
        equipment: [],
        total_count: 0,
        has_more: false,
        filters_applied: filters
      };
    }
  }

  /**
   * Get equipment by ID with vendor information
   */
  async getEquipmentById(id: string): Promise<EquipmentWithVendor | null> {
    try {
      const equipment = await this.equipmentRepo.getById(id);
      if (!equipment) return null;

      const vendor = await this.companyRepo.getById(equipment.vendor_id);
      if (!vendor) return null;

      return {
        ...equipment,
        vendor,
        estimated_delivery: this.calculateEstimatedDelivery(equipment, vendor)
      };
    } catch (error) {
      console.error(`Failed to fetch equipment ${id}:`, error);
      return null;
    }
  }

  /**
   * Get equipment by vendor
   */
  async getEquipmentByVendor(vendorId: string, limit: number = 20): Promise<EquipmentWithVendor[]> {
    try {
      const [equipment, vendor] = await Promise.all([
        this.equipmentRepo.getAll({ 
          filters: { vendor_id: vendorId },
          limit 
        }),
        this.companyRepo.getById(vendorId)
      ]);

      if (!vendor) return [];

      return equipment.data.map(eq => ({
        ...eq,
        vendor,
        estimated_delivery: this.calculateEstimatedDelivery(eq, vendor)
      }));
    } catch (error) {
      console.error(`Failed to fetch equipment for vendor ${vendorId}:`, error);
      return [];
    }
  }

  /**
   * Get featured equipment (high-rated, available)
   */
  async getFeaturedEquipment(limit: number = 6): Promise<EquipmentWithVendor[]> {
    try {
      const equipment = await this.equipmentRepo.getAll({
        filters: { status: 'available' },
        limit: limit * 2 // Get more to filter from
      });

      // Get vendors and build featured list
      const featuredEquipment = await Promise.all(
        equipment.data.map(async (eq): Promise<EquipmentWithVendor | null> => {
          const vendor = await this.companyRepo.getById(eq.vendor_id);
          if (!vendor || !vendor.rating || vendor.rating < 4.0) return null;

          return {
            ...eq,
            vendor,
            estimated_delivery: this.calculateEstimatedDelivery(eq, vendor)
          };
        })
      );

      return featuredEquipment
        .filter(Boolean)
        .slice(0, limit) as EquipmentWithVendor[];
    } catch (error) {
      console.error('Failed to fetch featured equipment:', error);
      return [];
    }
  }

  /**
   * Get equipment recommendations based on user history
   */
  async getRecommendations(
    userId: string, 
    userRole: string, 
    limit: number = 4
  ): Promise<EquipmentWithVendor[]> {
    try {
      // For now, return popular equipment in user's area
      // In the future, this would use ML-based recommendations
      return this.getFeaturedEquipment(limit);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * Check equipment availability for date range
   */
  async checkAvailability(
    equipmentId: string, 
    startDate: string, 
    endDate: string
  ): Promise<{ available: boolean; conflicting_bookings?: string[] }> {
    try {
      // This would check against booking repository in a real implementation
      const equipment = await this.equipmentRepo.getById(equipmentId);
      if (!equipment || equipment.status !== 'available') {
        return { available: false };
      }

      // For now, assume available if equipment status is available
      // TODO: Implement booking conflict checking
      return { available: true };
    } catch (error) {
      console.error(`Failed to check availability for equipment ${equipmentId}:`, error);
      return { available: false };
    }
  }

  // Utility methods
  private calculateDistance(location1?: string, location2?: string): number {
    // Simplified distance calculation
    // In production, would use proper geospatial calculations
    if (!location1 || !location2) return 50; // Default distance

    const coords1 = this.getLocationCoords(location1);
    const coords2 = this.getLocationCoords(location2);

    const latDiff = coords1.lat - coords2.lat;
    const lngDiff = coords1.lng - coords2.lng;
    return Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69); // Rough miles
  }

  private getLocationCoords(location: string): { lat: number; lng: number } {
    const locationCoords: Record<string, { lat: number; lng: number }> = {
      'houston': { lat: 29.7604, lng: -95.3698 },
      'beaumont': { lat: 30.0860, lng: -94.1018 },
      'port arthur': { lat: 29.8850, lng: -93.9399 },
      'corpus christi': { lat: 27.8006, lng: -97.3964 },
      'galveston': { lat: 29.2694, lng: -94.7847 }
    };

    const normalized = location.toLowerCase();
    return locationCoords[normalized] || locationCoords['houston'];
  }

  private calculateEstimatedDelivery(
    equipment: Equipment, 
    vendor: Company, 
    customerLocation?: string
  ): string {
    // Calculate estimated delivery time based on distance and vendor response time
    const baseHours = 4; // Base delivery time
    const distance = customerLocation ? 
      this.calculateDistance(customerLocation, vendor.headquarters) : 25;
    
    const travelTime = distance / 50; // Assume 50 mph average
    const totalHours = baseHours + travelTime;

    const deliveryDate = new Date();
    deliveryDate.setHours(deliveryDate.getHours() + totalHours);
    
    return deliveryDate.toISOString();
  }
}

// Export singleton instance
export const equipmentService = new EquipmentService();
export default equipmentService;