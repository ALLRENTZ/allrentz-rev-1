
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

class SmartMatchEngine {
  private getMockMatches(request: SmartMatchRequest): MatchedVendor[] {
    const mockVendors: MatchedVendor[] = [
      {
        vendor_id: 'vendor-1',
        vendor_name: 'John Smith',
        company_name: 'Gulf Coast Equipment',
        equipment_id: 'eq-1',
        equipment_title: `${request.equipment_type} - Industrial Grade`,
        daily_rate: 450,
        distance_miles: 12,
        response_time_hours: 2,
        compliance_score: 95,
        performance_rating: 4.8,
        availability_status: 'available',
        estimated_delivery: request.urgency === 'immediate' ? '2-3 hours' : 'Same day',
        compliance_tags: ['TWIC', 'HAZMAT', 'API-653'],
        match_score: 96,
        contact_phone: '(713) 555-0123',
        image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop'
      },
      {
        vendor_id: 'vendor-2',
        vendor_name: 'Sarah Johnson',
        company_name: 'Lone Star Rentals',
        equipment_id: 'eq-2',
        equipment_title: `${request.equipment_type} - Premium Series`,
        daily_rate: 380,
        distance_miles: 8,
        response_time_hours: 1,
        compliance_score: 88,
        performance_rating: 4.6,
        availability_status: 'available',
        estimated_delivery: request.urgency === 'immediate' ? '1-2 hours' : 'Same day',
        compliance_tags: ['TWIC', 'ISNET', 'OSHA-30'],
        match_score: 92,
        contact_phone: '(281) 555-0156',
        image_url: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=300&fit=crop'
      },
      {
        vendor_id: 'vendor-3',
        vendor_name: 'Mike Rodriguez',
        company_name: 'Bayou Industrial Supply',
        equipment_id: 'eq-3',
        equipment_title: `${request.equipment_type} - Heavy Duty`,
        daily_rate: 520,
        distance_miles: 18,
        response_time_hours: 3,
        compliance_score: 91,
        performance_rating: 4.7,
        availability_status: 'available',
        estimated_delivery: request.urgency === 'immediate' ? '3-4 hours' : 'Same day',
        compliance_tags: ['TWIC', 'HAZMAT', 'PEC-SafeLand'],
        match_score: 89,
        contact_phone: '(409) 555-0189',
        image_url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=300&fit=crop'
      },
      {
        vendor_id: 'vendor-4',
        vendor_name: 'Lisa Chen',
        company_name: 'Refinery Solutions LLC',
        equipment_id: 'eq-4',
        equipment_title: `${request.equipment_type} - Certified Unit`,
        daily_rate: 425,
        distance_miles: 25,
        response_time_hours: 4,
        compliance_score: 93,
        performance_rating: 4.9,
        availability_status: 'available',
        estimated_delivery: request.urgency === 'immediate' ? '4-5 hours' : 'Next day',
        compliance_tags: ['TWIC', 'HAZMAT', 'API-570', 'ASME'],
        match_score: 87,
        contact_phone: '(832) 555-0167',
        image_url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&h=300&fit=crop'
      }
    ];

    // Apply filters based on requirements
    let filteredVendors = mockVendors;

    if (request.additional_requirements?.max_daily_rate) {
      filteredVendors = filteredVendors.filter(v => v.daily_rate <= request.additional_requirements!.max_daily_rate!);
    }

    if (request.additional_requirements?.twic_required) {
      filteredVendors = filteredVendors.filter(v => v.compliance_tags.includes('TWIC'));
    }

    if (request.additional_requirements?.hazmat_certified) {
      filteredVendors = filteredVendors.filter(v => v.compliance_tags.includes('HAZMAT'));
    }

    // Sort by match score and urgency
    return filteredVendors.sort((a, b) => {
      if (request.urgency === 'immediate') {
        return a.response_time_hours - b.response_time_hours;
      }
      return b.match_score - a.match_score;
    });
  }

  async processMatch(request: SmartMatchRequest, customer_id: string, is_demo: boolean): Promise<SmartMatchResult> {
    const startTime = Date.now();

    try {
      if (is_demo) {
        const matches = this.getMockMatches(request);
        return {
          request_id: 'demo-request',
          total_matches: matches.length,
          matches: matches.slice(0, 4),
          processing_time_ms: Date.now() - startTime,
          location_center: this.getLocationCoordinates(request.location)
        };
      }

      // Authenticated production user: store the request, return no mock results
      const { data: matchRequest, error: requestError } = await supabase
        .from('smart_match_requests')
        .insert({
          customer_id,
          equipment_type: request.equipment_type,
          location: request.location,
          urgency: request.urgency,
          additional_requirements: request.additional_requirements || {},
          status: 'processing'
        })
        .select()
        .single();

      if (requestError) {
        console.error('SmartMatch: failed to store request', requestError);
      }

      if (matchRequest) {
        await supabase
          .from('smart_match_requests')
          .update({ status: 'completed', matched_vendors: [] })
          .eq('id', matchRequest.id);
      }

      return {
        request_id: 'request-' + Date.now(),
        total_matches: 0,
        matches: [],
        processing_time_ms: Date.now() - startTime,
        location_center: this.getLocationCoordinates(request.location)
      };

    } catch (error) {
      console.error('SmartMatch processing error:', error);
      return {
        request_id: 'request-' + Date.now(),
        total_matches: 0,
        matches: [],
        processing_time_ms: Date.now() - startTime,
        location_center: this.getLocationCoordinates(request.location)
      };
    }
  }

  private getLocationCoordinates(location: string): { lat: number; lng: number } {
    const locationMap: Record<string, { lat: number; lng: number }> = {
      'houston': { lat: 29.7604, lng: -95.3698 },
      'beaumont': { lat: 30.0802, lng: -94.1266 },
      'port arthur': { lat: 29.8850, lng: -93.9400 },
      'corpus christi': { lat: 27.8006, lng: -97.3964 },
      'galveston': { lat: 29.3013, lng: -94.7977 }
    };

    const key = location.toLowerCase();
    return locationMap[key] || { lat: 29.7604, lng: -95.3698 };
  }

  async notifyVendors(matches: MatchedVendor[], requestDetails: SmartMatchRequest): Promise<void> {
    // Simulate vendor notifications
    console.log('🚀 SmartMatch Notifications Sent:', {
      vendorCount: matches.length,
      equipment: requestDetails.equipment_type,
      location: requestDetails.location,
      urgency: requestDetails.urgency
    });

    // Simulate realistic delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

export const smartMatchEngine = new SmartMatchEngine();
