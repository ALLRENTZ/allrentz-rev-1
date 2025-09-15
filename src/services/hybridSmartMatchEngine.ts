// Enhanced SmartMatch Engine with CSV Repository Integration
// Supports both manual search and AI-powered SmartMatch

import repositoryFactory from '../repositories/RepositoryFactory';
import { Equipment, Company, Booking } from '../repositories/interfaces';
import { supabase } from '@/integrations/supabase/client';

export interface SmartMatchRequest {
  equipment_type: string;
  location: string;
  urgency: 'immediate' | 'today' | 'this_week' | 'flexible';
  additional_requirements?: {
    twic_required?: boolean;
    isnet_required?: boolean;
    hazmat_certified?: boolean;
    operator_included?: boolean;
    delivery_required?: boolean;
    max_daily_rate?: number;
    min_rating?: number;
  };
}

export interface MatchedVendor {
  vendor_id: string;
  vendor_name: string;
  company_name: string;
  equipment_id: string;
  equipment_title: string;
  daily_rate: number;
  distance_miles: number;
  response_time_hours: number;
  compliance_score: number;
  performance_rating: number;
  availability_status: 'available' | 'reserved' | 'maintenance';
  estimated_delivery: string;
  compliance_tags: string[];
  match_score: number;
  contact_phone?: string;
  image_url?: string;
}

export interface SmartMatchResult {
  request_id: string;
  total_matches: number;
  matches: MatchedVendor[];
  processing_time_ms: number;
  location_center: {
    lat: number;
    lng: number;
  };
}

export interface ManualSearchFilters {
  category?: string;
  location?: string;
  max_daily_rate?: number;
  min_rating?: number;
  compliance_requirements?: string[];
  availability_status?: 'available' | 'reserved' | 'maintenance' | 'all';
}

export interface ManualSearchResult {
  equipment: Equipment[];
  total_count: number;
  has_more: boolean;
}

class HybridSmartMatchEngine {
  private equipmentRepo = repositoryFactory.getEquipmentRepository();
  private companyRepo = repositoryFactory.getCompanyRepository();
  private bookingRepo = repositoryFactory.getBookingRepository();

  // Location coordinates for major Gulf Coast cities
  private readonly locationCoords: Record<string, { lat: number; lng: number }> = {
    'houston': { lat: 29.7604, lng: -95.3698 },
    'beaumont': { lat: 30.0860, lng: -94.1018 },
    'port arthur': { lat: 29.8850, lng: -93.9399 },
    'corpus christi': { lat: 27.8006, lng: -97.3964 },
    'galveston': { lat: 29.2694, lng: -94.7847 },
    'texas city': { lat: 29.3838, lng: -94.9027 },
    'baytown': { lat: 29.7355, lng: -94.9774 }
  };

  /**
   * HYBRID APPROACH: Manual Equipment Search
   * Allows customers to browse and filter equipment manually
   */
  async manualSearch(
    filters: ManualSearchFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<ManualSearchResult> {
    try {
      // Build query options for repository
      const queryOptions: any = {
        limit,
        offset,
        filters: {}
      };

      // Apply category filter
      if (filters.category) {
        queryOptions.filters.category = filters.category;
      }

      // Apply compliance filters
      if (filters.compliance_requirements && filters.compliance_requirements.length > 0) {
        // This would need custom filtering logic since our CSV doesn't support complex nested queries yet
        // For now, we'll get all equipment and filter in memory
      }

      // Get equipment from CSV
      const equipmentResult = await this.equipmentRepo.getAll(queryOptions);
      let equipmentList = equipmentResult.data;

      // Apply additional filters in memory
      if (filters.max_daily_rate) {
        equipmentList = equipmentList.filter(eq => eq.daily_rate <= filters.max_daily_rate!);
      }

      if (filters.compliance_requirements && filters.compliance_requirements.length > 0) {
        equipmentList = equipmentList.filter(eq => {
          const equipmentCompliance = eq.compliance_certifications || [];
          return filters.compliance_requirements!.every(req => 
            equipmentCompliance.some(cert => cert.includes(req))
          );
        });
      }

      // Filter by availability
      if (filters.availability_status && filters.availability_status !== 'all') {
        equipmentList = equipmentList.filter(eq => eq.status === filters.availability_status);
      }

      return {
        equipment: equipmentList,
        total_count: equipmentList.length,
        has_more: offset + limit < equipmentList.length
      };

    } catch (error) {
      console.error('Manual search error:', error);
      return { equipment: [], total_count: 0, has_more: false };
    }
  }

  /**
   * HYBRID APPROACH: AI-Powered SmartMatch
   * Uses machine learning-like scoring to find optimal matches
   */
  async smartMatch(request: SmartMatchRequest, customer_id: string): Promise<SmartMatchResult> {
    const startTime = Date.now();
    const isDemoUser = customer_id === 'demo-customer';
    
    try {
      // Get all available equipment and companies from CSV
      const [equipmentResult, companies] = await Promise.all([
        this.equipmentRepo.getAll({ filters: { status: 'available' } }),
        this.companyRepo.getActiveVendors()
      ]);

      // Filter equipment by type/category
      const matchingEquipment = equipmentResult.data.filter(equipment => 
        this.matchesEquipmentType(equipment, request.equipment_type)
      );

      // Build vendor matches from CSV data
      const vendorMatches: MatchedVendor[] = await Promise.all(
        matchingEquipment.map(async (equipment) => {
          const vendor = companies.find(company => company.id === equipment.vendor_id);
          if (!vendor) return null;

          return this.buildVendorMatch(equipment, vendor, request);
        })
      ).then(matches => matches.filter(Boolean) as MatchedVendor[]);

      // Apply SmartMatch filtering and scoring
      const filteredMatches = this.applySmartFiltering(vendorMatches, request);
      const scoredMatches = this.calculateMatchScores(filteredMatches, request);

      // Sort by match score and urgency
      const sortedMatches = this.sortMatchesByRelevance(scoredMatches, request);

      // Store request for analytics (skip for demo users)
      if (!isDemoUser) {
        try {
          await supabase
            .from('smart_match_requests')
            .insert({
              customer_id,
              equipment_type: request.equipment_type,
              location: request.location,
              urgency: request.urgency,
              additional_requirements: request.additional_requirements || {},
              total_matches: sortedMatches.length
            });
        } catch (error) {
          console.warn('Failed to log SmartMatch request:', error);
        }
      }

      const locationCenter = this.getLocationCoords(request.location);
      const processingTime = Date.now() - startTime;

      return {
        request_id: `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        total_matches: sortedMatches.length,
        matches: sortedMatches,
        processing_time_ms: processingTime,
        location_center: locationCenter
      };

    } catch (error) {
      console.error('SmartMatch processing error:', error);
      // Fallback to minimal response
      return {
        request_id: `error_${Date.now()}`,
        total_matches: 0,
        matches: [],
        processing_time_ms: Date.now() - startTime,
        location_center: this.getLocationCoords(request.location)
      };
    }
  }

  /**
   * Check if equipment matches the requested type/category
   */
  private matchesEquipmentType(equipment: Equipment, requestedType: string): boolean {
    const normalizedType = requestedType.toLowerCase();
    const category = equipment.category?.toLowerCase() || '';
    const title = equipment.title?.toLowerCase() || '';
    const description = equipment.description?.toLowerCase() || '';

    return category.includes(normalizedType) || 
           title.includes(normalizedType) || 
           description.includes(normalizedType);
  }

  /**
   * Build a vendor match object from equipment and company data
   */
  private async buildVendorMatch(
    equipment: Equipment, 
    vendor: Company, 
    request: SmartMatchRequest
  ): Promise<MatchedVendor> {
    const locationCoords = this.getLocationCoords(request.location);
    const vendorCoords = this.getLocationCoords(vendor.headquarters || 'houston');
    
    // Calculate distance (simplified - in production would use proper geolocation)
    const distance = this.calculateDistance(locationCoords, vendorCoords);
    
    // Calculate response time based on distance and urgency
    const responseTime = this.calculateResponseTime(distance, request.urgency);
    
    // Get compliance tags from equipment certifications
    const complianceTags = equipment.compliance_certifications || [];

    return {
      vendor_id: vendor.id,
      vendor_name: vendor.contact_person || 'Equipment Manager',
      company_name: vendor.name,
      equipment_id: equipment.id,
      equipment_title: equipment.title,
      daily_rate: equipment.daily_rate,
      distance_miles: Math.round(distance),
      response_time_hours: responseTime,
      compliance_score: vendor.compliance_score || 85,
      performance_rating: vendor.rating || 4.2,
      availability_status: equipment.status as 'available' | 'reserved' | 'maintenance',
      estimated_delivery: this.calculateDeliveryTime(responseTime, request.urgency),
      compliance_tags: complianceTags,
      match_score: 0, // Will be calculated later
      contact_phone: vendor.phone,
      image_url: equipment.image_url || '/equipment-placeholder.jpg'
    };
  }

  /**
   * Apply SmartMatch filtering based on requirements
   */
  private applySmartFiltering(matches: MatchedVendor[], request: SmartMatchRequest): MatchedVendor[] {
    let filtered = matches;

    if (request.additional_requirements) {
      const req = request.additional_requirements;

      if (req.twic_required) {
        filtered = filtered.filter(m => m.compliance_tags.includes('TWIC'));
      }

      if (req.isnet_required) {
        filtered = filtered.filter(m => m.compliance_tags.includes('ISNET'));
      }

      if (req.hazmat_certified) {
        filtered = filtered.filter(m => m.compliance_tags.includes('HAZMAT'));
      }

      if (req.max_daily_rate) {
        filtered = filtered.filter(m => m.daily_rate <= req.max_daily_rate!);
      }

      if (req.min_rating) {
        filtered = filtered.filter(m => m.performance_rating >= req.min_rating!);
      }
    }

    return filtered;
  }

  /**
   * Calculate AI-powered match scores
   */
  private calculateMatchScores(matches: MatchedVendor[], request: SmartMatchRequest): MatchedVendor[] {
    return matches.map(match => ({
      ...match,
      match_score: this.calculateIndividualScore(match, request)
    }));
  }

  private calculateIndividualScore(match: MatchedVendor, request: SmartMatchRequest): number {
    let score = 0;

    // Distance score (closer is better) - 30%
    const maxDistance = 200; // miles
    const distanceScore = Math.max(0, (maxDistance - match.distance_miles) / maxDistance) * 30;
    score += distanceScore;

    // Rating score - 25%
    score += (match.performance_rating / 5) * 25;

    // Compliance score - 20%
    score += (match.compliance_score / 100) * 20;

    // Response time score (faster is better) - 15%
    const maxResponseTime = 48; // hours
    const responseScore = Math.max(0, (maxResponseTime - match.response_time_hours) / maxResponseTime) * 15;
    score += responseScore;

    // Price competitiveness - 10%
    const avgDailyRate = 500; // rough industry average
    const priceScore = Math.max(0, (avgDailyRate - match.daily_rate) / avgDailyRate) * 10;
    score += Math.max(priceScore, 0);

    return Math.round(Math.min(score, 100)); // Cap at 100
  }

  private sortMatchesByRelevance(matches: MatchedVendor[], request: SmartMatchRequest): MatchedVendor[] {
    return matches.sort((a, b) => {
      // For immediate urgency, prioritize response time
      if (request.urgency === 'immediate') {
        const timeDiff = a.response_time_hours - b.response_time_hours;
        if (Math.abs(timeDiff) > 2) return timeDiff;
      }
      
      // Otherwise prioritize match score
      return b.match_score - a.match_score;
    }).slice(0, 8); // Limit to top 8 matches
  }

  // Utility methods
  private getLocationCoords(location: string): { lat: number; lng: number } {
    const normalized = location.toLowerCase();
    return this.locationCoords[normalized] || this.locationCoords['houston'];
  }

  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    // Simplified distance calculation - in production would use proper geospatial
    const latDiff = coord1.lat - coord2.lat;
    const lngDiff = coord1.lng - coord2.lng;
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69; // Rough miles conversion
  }

  private calculateResponseTime(distance: number, urgency: string): number {
    let baseTime = 2; // hours
    
    switch (urgency) {
      case 'immediate': baseTime = 1; break;
      case 'today': baseTime = 4; break;
      case 'this_week': baseTime = 24; break;
      case 'flexible': baseTime = 48; break;
    }

    return baseTime + (distance / 50); // Add travel time factor
  }

  private calculateDeliveryTime(responseTime: number, urgency: string): string {
    const deliveryHours = Math.ceil(responseTime);
    const deliveryDate = new Date();
    deliveryDate.setHours(deliveryDate.getHours() + deliveryHours);
    
    return deliveryDate.toISOString();
  }
}

// Export singleton instance
export const hybridSmartMatchEngine = new HybridSmartMatchEngine();
export default hybridSmartMatchEngine;