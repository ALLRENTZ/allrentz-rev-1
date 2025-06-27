
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
  async processMatch(request: SmartMatchRequest, customer_id: string): Promise<SmartMatchResult> {
    const startTime = Date.now();
    
    try {
      // 1. Store the match request
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

      if (requestError) throw requestError;

      // 2. Get location coordinates (simplified - in real world would use geocoding)
      const locationCenter = this.getLocationCoordinates(request.location);

      // 3. Find matching equipment
      let equipmentQuery = supabase
        .from('equipment')
        .select(`
          *,
          vendor_profiles!equipment_vendor_id_fkey (
            user_id,
            response_time_avg,
            compliance_score,
            performance_rating,
            coverage_areas,
            verified,
            profiles!vendor_profiles_user_id_fkey (
              full_name,
              company_name,
              phone
            )
          )
        `)
        .eq('available', true)
        .eq('category', request.equipment_type);

      // Apply filters based on requirements
      if (request.additional_requirements?.hazmat_certified) {
        equipmentQuery = equipmentQuery.eq('hazmat_certified', true);
      }

      if (request.additional_requirements?.max_daily_rate) {
        equipmentQuery = equipmentQuery.lte('daily_rate', request.additional_requirements.max_daily_rate);
      }

      const { data: equipment, error: equipmentError } = await equipmentQuery;

      if (equipmentError) throw equipmentError;

      // 4. Calculate matches and scores
      const matches: MatchedVendor[] = [];

      for (const item of equipment || []) {
        if (!item.vendor_profiles || !item.vendor_profiles.verified) continue;

        const vendor = item.vendor_profiles;
        const profile = vendor.profiles;

        // Calculate distance (simplified calculation)
        const distance = this.calculateDistance(locationCenter, item.location);
        
        // Skip if outside delivery radius
        if (distance > (item.delivery_radius_miles || 50)) continue;

        // Calculate match score
        const matchScore = this.calculateMatchScore({
          distance,
          urgency: request.urgency,
          responseTime: vendor.response_time_avg || 240,
          complianceScore: vendor.compliance_score || 50,
          performanceRating: vendor.performance_rating || 3.0,
          dailyRate: item.daily_rate,
          requirements: request.additional_requirements
        });

        // Skip low-scoring matches
        if (matchScore < 0.3) continue;

        matches.push({
          vendor_id: vendor.user_id,
          vendor_name: profile?.full_name || 'Unknown Vendor',
          company_name: profile?.company_name || 'Unknown Company',
          equipment_id: item.id,
          equipment_title: item.title,
          daily_rate: item.daily_rate,
          distance_miles: Math.round(distance),
          response_time_hours: item.response_time_hours || 4,
          compliance_score: vendor.compliance_score || 50,
          performance_rating: vendor.performance_rating || 3.0,
          availability_status: 'available',
          estimated_delivery: this.calculateEstimatedDelivery(distance, request.urgency),
          compliance_tags: item.compliance_tags || [],
          match_score: Math.round(matchScore * 100),
          contact_phone: profile?.phone,
          image_url: item.image_url
        });
      }

      // 5. Sort by match score and urgency
      matches.sort((a, b) => {
        if (request.urgency === 'immediate') {
          // For immediate needs, prioritize response time and distance
          const aScore = (a.match_score * 0.4) + ((100 - a.distance_miles) * 0.3) + ((10 - a.response_time_hours) * 0.3);
          const bScore = (b.match_score * 0.4) + ((100 - b.distance_miles) * 0.3) + ((10 - b.response_time_hours) * 0.3);
          return bScore - aScore;
        }
        return b.match_score - a.match_score;
      });

      // 6. Update match request with results
      const matchedVendors = matches.slice(0, 10); // Top 10 matches
      
      await supabase
        .from('smart_match_requests')
        .update({
          status: 'completed',
          matched_vendors: matchedVendors
        })
        .eq('id', matchRequest.id);

      const processingTime = Date.now() - startTime;

      return {
        request_id: matchRequest.id,
        total_matches: matches.length,
        matches: matchedVendors,
        processing_time_ms: processingTime,
        location_center: locationCenter
      };

    } catch (error) {
      console.error('SmartMatch processing error:', error);
      throw error;
    }
  }

  private getLocationCoordinates(location: string): { lat: number; lng: number } {
    // Simplified location mapping - in production would use geocoding API
    const locationMap: Record<string, { lat: number; lng: number }> = {
      'houston': { lat: 29.7604, lng: -95.3698 },
      'beaumont': { lat: 30.0802, lng: -94.1266 },
      'port arthur': { lat: 29.8850, lng: -93.9400 },
      'corpus christi': { lat: 27.8006, lng: -97.3964 },
      'galveston': { lat: 29.3013, lng: -94.7977 }
    };

    const key = location.toLowerCase();
    return locationMap[key] || { lat: 29.7604, lng: -95.3698 }; // Default to Houston
  }

  private calculateDistance(center: { lat: number; lng: number }, location: string): number {
    // Simplified distance calculation - in production would use actual coordinates
    // For demo purposes, return random distance between 5-100 miles
    const hash = location.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return Math.abs(hash % 95) + 5; // 5-100 miles
  }

  private calculateMatchScore(params: {
    distance: number;
    urgency: string;
    responseTime: number;
    complianceScore: number;
    performanceRating: number;
    dailyRate: number;
    requirements?: any;
  }): number {
    let score = 0;

    // Distance score (closer is better, max 100 miles)
    const distanceScore = Math.max(0, (100 - params.distance) / 100);
    score += distanceScore * 0.25;

    // Response time score (faster is better, max 24 hours)
    const responseScore = Math.max(0, (24 - (params.responseTime / 60)) / 24);
    score += responseScore * 0.2;

    // Compliance score (0-100 scale)
    score += (params.complianceScore / 100) * 0.25;

    // Performance rating (0-5 scale)
    score += (params.performanceRating / 5) * 0.2;

    // Price competitiveness (lower is better, capped at $2000/day)
    const priceScore = Math.max(0, (2000 - params.dailyRate) / 2000);
    score += priceScore * 0.1;

    // Urgency modifier
    if (params.urgency === 'immediate') {
      score *= 1.2; // Boost for immediate availability
    }

    return Math.min(1, Math.max(0, score));
  }

  private calculateEstimatedDelivery(distance: number, urgency: string): string {
    const baseHours = Math.ceil(distance / 30); // Assume 30 mph average
    
    switch (urgency) {
      case 'immediate':
        return `${baseHours + 1}-${baseHours + 2} hours`;
      case 'today':
        return 'Same day';
      case 'this_week':
        return '1-3 days';
      default:
        return '2-5 days';
    }
  }

  async notifyVendors(matches: MatchedVendor[], requestDetails: SmartMatchRequest): Promise<void> {
    // In production, this would send SMS/Email notifications
    // For now, we'll log the notifications
    console.log('Notifying vendors:', {
      vendorCount: matches.length,
      equipment: requestDetails.equipment_type,
      location: requestDetails.location,
      urgency: requestDetails.urgency
    });

    // TODO: Implement actual SMS/Email notifications via Twilio/Resend
    // This would trigger vendor dashboard alerts and SMS notifications
  }
}

export const smartMatchEngine = new SmartMatchEngine();
