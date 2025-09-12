// ALLRENTZ Geographic Intelligence Engine
// Enterprise-grade location-based filtering and compliance system

export interface Location {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface GeographicBounds {
  northeast: Location;
  southwest: Location;
}

export interface IndustrialFacility {
  id: string;
  name: string;
  type: 'refinery' | 'terminal' | 'petrochemical' | 'power-plant' | 'manufacturing' | 'port';
  location: Location;
  twicRequired: boolean;
  hazmatCompliance: string[];
  osha_psmCovered: boolean;
  epa_rmpCovered: boolean;
  specialRequirements: string[];
  complianceZone?: string;
}

export interface ComplianceZone {
  id: string;
  name: string;
  type: 'twic' | 'hazmat' | 'restricted' | 'security';
  bounds: GeographicBounds;
  requirements: string[];
  restrictions: string[];
}

export interface DeliveryZone {
  id: string;
  name: string;
  bounds: GeographicBounds;
  baseCost: number;
  deliveryTime: number; // hours
  specialRequirements: string[];
}

class GeographicIntelligenceEngine {
  private industrialFacilities: Map<string, IndustrialFacility> = new Map();
  private complianceZones: ComplianceZone[] = [];
  private deliveryZones: DeliveryZone[] = [];

  constructor() {
    this.initializeIndustrialFacilities();
    this.initializeComplianceZones();
    this.initializeDeliveryZones();
  }

  // Calculate distance between two points using Haversine formula
  public calculateDistance(point1: Location, point2: Location): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLon = this.toRadians(point2.lng - point1.lng);

    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) * 
      Math.cos(this.toRadians(point2.lat)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Find nearby industrial facilities within radius
  public findNearbyFacilities(
    location: Location, 
    radiusMiles: number = 50,
    facilityTypes?: Array<IndustrialFacility['type']>
  ): Array<IndustrialFacility & { distance: number }> {
    const nearbyFacilities = [];

    for (const facility of this.industrialFacilities.values()) {
      if (facilityTypes && !facilityTypes.includes(facility.type)) {
        continue;
      }

      const distance = this.calculateDistance(location, facility.location);
      if (distance <= radiusMiles) {
        nearbyFacilities.push({
          ...facility,
          distance
        });
      }
    }

    return nearbyFacilities.sort((a, b) => a.distance - b.distance);
  }

  // Check if location is within compliance zones
  public getComplianceRequirements(location: Location): {
    zones: ComplianceZone[];
    requirements: string[];
    restrictions: string[];
    twicRequired: boolean;
    hazmatRestrictions: string[];
  } {
    const applicableZones = this.complianceZones.filter(zone => 
      this.isPointInBounds(location, zone.bounds)
    );

    const allRequirements = new Set<string>();
    const allRestrictions = new Set<string>();
    const hazmatRestrictions = new Set<string>();
    let twicRequired = false;

    applicableZones.forEach(zone => {
      zone.requirements.forEach(req => allRequirements.add(req));
      zone.restrictions.forEach(res => allRestrictions.add(res));
      
      if (zone.type === 'twic') {
        twicRequired = true;
      }
      
      if (zone.type === 'hazmat') {
        zone.restrictions.forEach(res => hazmatRestrictions.add(res));
      }
    });

    return {
      zones: applicableZones,
      requirements: Array.from(allRequirements),
      restrictions: Array.from(allRestrictions),
      twicRequired,
      hazmatRestrictions: Array.from(hazmatRestrictions)
    };
  }

  // Calculate delivery cost and time based on location
  public calculateDeliveryMetrics(
    origin: Location,
    destination: Location,
    equipmentType: string,
    weight?: number
  ): {
    distance: number;
    estimatedCost: number;
    estimatedTime: number;
    deliveryZone?: DeliveryZone;
    specialRequirements: string[];
    complianceIssues: string[];
  } {
    const distance = this.calculateDistance(origin, destination);
    const deliveryZone = this.findDeliveryZone(destination);
    const compliance = this.getComplianceRequirements(destination);
    
    let baseCost = deliveryZone?.baseCost || 2.5; // per mile
    let baseTime = deliveryZone?.deliveryTime || 24; // hours

    // Adjust for equipment type
    const equipmentMultipliers: Record<string, number> = {
      'steam-boiler': 1.5,
      'frac-tank': 1.3,
      'heavy-machinery': 1.8,
      'pressure-vessel': 1.4,
      'generator': 1.2,
      'safety-equipment': 1.0
    };

    const multiplier = equipmentMultipliers[equipmentType] || 1.0;
    
    // Weight adjustments
    const weightMultiplier = weight ? Math.max(1.0, weight / 10000) : 1.0;

    const estimatedCost = distance * baseCost * multiplier * weightMultiplier;
    const estimatedTime = baseTime + (distance / 50) * 24; // Assume 50mph average

    // Check for compliance issues
    const complianceIssues = [];
    if (compliance.twicRequired) {
      complianceIssues.push('TWIC card required for delivery');
    }
    if (compliance.hazmatRestrictions.length > 0) {
      complianceIssues.push('Hazmat restrictions apply');
    }

    return {
      distance,
      estimatedCost,
      estimatedTime,
      deliveryZone,
      specialRequirements: [
        ...(deliveryZone?.specialRequirements || []),
        ...compliance.requirements
      ],
      complianceIssues
    };
  }

  // Filter equipment based on geographic constraints
  public filterEquipmentByLocation(
    equipment: any[],
    userLocation: Location,
    maxDistance: number = 100
  ): Array<any & {
    distance: number;
    deliveryMetrics: ReturnType<GeographicIntelligenceEngine['calculateDeliveryMetrics']>;
    complianceStatus: 'compliant' | 'requires-permits' | 'restricted';
  }> {
    return equipment
      .map(item => {
        const vendorLocation = this.parseLocationFromVendor(item.vendor);
        const distance = this.calculateDistance(userLocation, vendorLocation);
        
        if (distance > maxDistance) return null;

        const deliveryMetrics = this.calculateDeliveryMetrics(
          vendorLocation,
          userLocation,
          item.type,
          item.weight
        );

        const complianceStatus = this.determineComplianceStatus(
          userLocation,
          item.certifications,
          deliveryMetrics.complianceIssues
        );

        return {
          ...item,
          distance,
          deliveryMetrics,
          complianceStatus
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);
  }

  // Advanced search with geographic intelligence
  public intelligentEquipmentSearch(params: {
    location: Location;
    equipmentType?: string;
    maxDistance?: number;
    urgency?: 'standard' | 'urgent' | 'emergency';
    complianceRequirements?: string[];
    facilityType?: IndustrialFacility['type'];
  }): {
    equipment: any[];
    nearbyFacilities: Array<IndustrialFacility & { distance: number }>;
    complianceAnalysis: ReturnType<GeographicIntelligenceEngine['getComplianceRequirements']>;
    recommendations: string[];
  } {
    const {
      location,
      equipmentType,
      maxDistance = 50,
      urgency = 'standard',
      complianceRequirements = [],
      facilityType
    } = params;

    // Find nearby facilities
    const nearbyFacilities = this.findNearbyFacilities(
      location,
      maxDistance * 2, // Wider search for context
      facilityType ? [facilityType] : undefined
    );

    // Get compliance analysis
    const complianceAnalysis = this.getComplianceRequirements(location);

    // Mock equipment data (in real implementation, this would query the database)
    const mockEquipment = this.getMockEquipmentData();
    
    const filteredEquipment = this.filterEquipmentByLocation(
      mockEquipment,
      location,
      maxDistance
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      location,
      nearbyFacilities,
      complianceAnalysis,
      urgency,
      equipmentType
    });

    return {
      equipment: filteredEquipment,
      nearbyFacilities,
      complianceAnalysis,
      recommendations
    };
  }

  // Private helper methods
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private isPointInBounds(point: Location, bounds: GeographicBounds): boolean {
    return (
      point.lat >= bounds.southwest.lat &&
      point.lat <= bounds.northeast.lat &&
      point.lng >= bounds.southwest.lng &&
      point.lng <= bounds.northeast.lng
    );
  }

  private findDeliveryZone(location: Location): DeliveryZone | undefined {
    return this.deliveryZones.find(zone => 
      this.isPointInBounds(location, zone.bounds)
    );
  }

  private parseLocationFromVendor(vendor: any): Location {
    // Mock implementation - in real app, parse from vendor data
    return {
      lat: 29.7604 + (Math.random() - 0.5) * 2,
      lng: -95.3698 + (Math.random() - 0.5) * 2,
      city: 'Houston',
      state: 'TX'
    };
  }

  private determineComplianceStatus(
    location: Location,
    certifications: string[],
    complianceIssues: string[]
  ): 'compliant' | 'requires-permits' | 'restricted' {
    if (complianceIssues.length === 0) return 'compliant';
    
    const hasCriticalIssues = complianceIssues.some(issue => 
      issue.includes('restricted') || issue.includes('prohibited')
    );
    
    if (hasCriticalIssues) return 'restricted';
    return 'requires-permits';
  }

  private generateRecommendations(params: {
    location: Location;
    nearbyFacilities: Array<IndustrialFacility & { distance: number }>;
    complianceAnalysis: ReturnType<GeographicIntelligenceEngine['getComplianceRequirements']>;
    urgency: string;
    equipmentType?: string;
  }): string[] {
    const recommendations = [];

    if (params.complianceAnalysis.twicRequired) {
      recommendations.push('Ensure all personnel have valid TWIC cards');
    }

    if (params.nearbyFacilities.length > 0) {
      const closestFacility = params.nearbyFacilities[0];
      recommendations.push(
        `Consider equipment from vendors near ${closestFacility.name} (${closestFacility.distance.toFixed(1)} miles away)`
      );
    }

    if (params.urgency === 'emergency') {
      recommendations.push('Filter for vendors with 24/7 emergency delivery');
    }

    if (params.complianceAnalysis.hazmatRestrictions.length > 0) {
      recommendations.push('Review hazmat handling requirements for this location');
    }

    return recommendations;
  }

  private getMockEquipmentData(): any[] {
    // Mock equipment data for demonstration
    return [
      {
        id: 'eq-001',
        type: 'steam-boiler',
        name: 'Industrial Steam Boiler 500HP',
        vendor: { name: 'Houston Industrial', location: 'Houston, TX' },
        weight: 15000,
        certifications: ['ASME', 'API-510']
      },
      {
        id: 'eq-002',
        type: 'frac-tank',
        name: '21,000 Gallon Frac Tank',
        vendor: { name: 'Beaumont Equipment', location: 'Beaumont, TX' },
        weight: 8000,
        certifications: ['DOT', 'EPA']
      }
    ];
  }

  // Initialize Gulf Coast industrial facilities
  private initializeIndustrialFacilities(): void {
    const facilities: IndustrialFacility[] = [
      {
        id: 'motiva-port-arthur',
        name: 'Motiva Port Arthur Refinery',
        type: 'refinery',
        location: { lat: 29.8833, lng: -93.9333 },
        twicRequired: true,
        hazmatCompliance: ['EPA-RMP', 'OSHA-PSM'],
        osha_psmCovered: true,
        epa_rmpCovered: true,
        specialRequirements: ['HAZMAT', 'Confined Space', 'Hot Work'],
        complianceZone: 'hazmat-required'
      },
      {
        id: 'exxon-beaumont',
        name: 'ExxonMobil Beaumont Refinery',
        type: 'refinery',
        location: { lat: 30.0803, lng: -94.1018 },
        twicRequired: true,
        hazmatCompliance: ['EPA-RMP', 'OSHA-PSM'],
        osha_psmCovered: true,
        epa_rmpCovered: true,
        specialRequirements: ['TWIC', 'Safety Orientation', 'Drug Testing'],
        complianceZone: 'refinery'
      },
      {
        id: 'phillips-66-houston',
        name: 'Phillips 66 Houston Refinery',
        type: 'refinery',
        location: { lat: 29.7372, lng: -95.2503 },
        twicRequired: true,
        hazmatCompliance: ['EPA-RMP', 'OSHA-PSM'],
        osha_psmCovered: true,
        epa_rmpCovered: true,
        specialRequirements: ['Background Check', 'Safety Training'],
        complianceZone: 'refinery'
      },
      {
        id: 'valero-houston',
        name: 'Valero Houston Refinery',
        type: 'refinery',
        location: { lat: 29.7375, lng: -95.2833 },
        twicRequired: true,
        hazmatCompliance: ['EPA-RMP', 'OSHA-PSM'],
        osha_psmCovered: true,
        epa_rmpCovered: true,
        specialRequirements: ['Medical Clearance', 'Respiratory Fit Test'],
        complianceZone: 'petrochemical'
      },
      {
        id: 'port-houston',
        name: 'Port of Houston',
        type: 'port',
        location: { lat: 29.7372, lng: -95.2897 },
        twicRequired: true,
        hazmatCompliance: ['DOT', 'USCG'],
        osha_psmCovered: false,
        epa_rmpCovered: false,
        specialRequirements: ['TWIC', 'Port Security'],
        complianceZone: 'twic-required'
      }
    ];

    facilities.forEach(facility => {
      this.industrialFacilities.set(facility.id, facility);
    });
  }

  private initializeComplianceZones(): void {
    this.complianceZones = [
      {
        id: 'houston-ship-channel-twic',
        name: 'Houston Ship Channel TWIC Zone',
        type: 'twic',
        bounds: {
          northeast: { lat: 29.8, lng: -95.0 },
          southwest: { lat: 29.65, lng: -95.35 }
        },
        requirements: ['TWIC Card', 'Background Check'],
        restrictions: ['No unescorted access', 'Restricted areas']
      },
      {
        id: 'beaumont-hazmat-zone',
        name: 'Beaumont Hazmat Restricted Zone',
        type: 'hazmat',
        bounds: {
          northeast: { lat: 30.12, lng: -94.05 },
          southwest: { lat: 30.05, lng: -94.15 }
        },
        requirements: ['HAZMAT Certification', 'DOT Compliance'],
        restrictions: ['Route restrictions', 'Time windows']
      },
      {
        id: 'galveston-port-security',
        name: 'Port of Galveston Security Zone',
        type: 'security',
        bounds: {
          northeast: { lat: 29.35, lng: -94.75 },
          southwest: { lat: 29.25, lng: -94.85 }
        },
        requirements: ['TWIC Card', 'Port Security Clearance'],
        restrictions: ['Escort required', 'Scheduled access only']
      }
    ];
  }

  private initializeDeliveryZones(): void {
    this.deliveryZones = [
      {
        id: 'houston-metro',
        name: 'Houston Metropolitan Area',
        bounds: {
          northeast: { lat: 30.0, lng: -95.0 },
          southwest: { lat: 29.5, lng: -95.8 }
        },
        baseCost: 2.0,
        deliveryTime: 4,
        specialRequirements: ['Traffic considerations', 'Urban delivery protocols']
      },
      {
        id: 'gulf-coast-industrial',
        name: 'Gulf Coast Industrial Corridor',
        bounds: {
          northeast: { lat: 30.2, lng: -93.8 },
          southwest: { lat: 29.3, lng: -95.8 }
        },
        baseCost: 2.5,
        deliveryTime: 8,
        specialRequirements: ['Industrial site access', 'Security clearance', 'Safety protocols']
      }
    ];
  }
}

// Export singleton instance
export const geographicIntelligence = new GeographicIntelligenceEngine();

// Hook for React components
export const useGeographicIntelligence = () => {
  return {
    calculateDistance: geographicIntelligence.calculateDistance.bind(geographicIntelligence),
    findNearbyFacilities: geographicIntelligence.findNearbyFacilities.bind(geographicIntelligence),
    getComplianceRequirements: geographicIntelligence.getComplianceRequirements.bind(geographicIntelligence),
    calculateDeliveryMetrics: geographicIntelligence.calculateDeliveryMetrics.bind(geographicIntelligence),
    filterEquipmentByLocation: geographicIntelligence.filterEquipmentByLocation.bind(geographicIntelligence),
    intelligentEquipmentSearch: geographicIntelligence.intelligentEquipmentSearch.bind(geographicIntelligence)
  };
};

// Direct function exports for testing
export const calculateDistance = (point1: Location, point2: Location): number => {
  return geographicIntelligence.calculateDistance(point1, point2);
};

export const findNearbyIndustrialFacilities = (
  location: Location, 
  radius: number
): Array<IndustrialFacility & { distance: number }> => {
  if (radius <= 0) return [];
  return geographicIntelligence.findNearbyFacilities(location, radius);
};

export const filterByDeliveryRadius = <T extends { location: Location }>(
  equipment: T[],
  customerLocation: Location,
  radius: number
): Array<T & { distance: number }> => {
  return equipment
    .map(item => ({
      ...item,
      distance: calculateDistance(customerLocation, item.location)
    }))
    .filter(item => item.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
};

export const isInTWICZone = (location: Location): boolean => {
  const complianceReq = geographicIntelligence.getComplianceRequirements(location);
  return complianceReq.twicRequired;
};

export const getComplianceRequirements = (location: Location) => {
  const baseReq = geographicIntelligence.getComplianceRequirements(location);
  
  // Transform to match test expectations
  return {
    twicRequired: baseReq.twicRequired,
    hazmatCertification: baseReq.hazmatRestrictions.length > 0,
    isnetRequired: baseReq.requirements.includes('ISNET'),
    additionalCertifications: baseReq.requirements.filter(req => 
      req.includes('API') || req.includes('ASME') || req.includes('OSHA')
    ),
    specialHandling: baseReq.restrictions.filter(res =>
      res.includes('handling') || res.includes('transport')
    ),
    environmentalRestrictions: baseReq.restrictions.filter(res =>
      res.includes('water') || res.includes('marine') || res.includes('environmental')
    )
  };
};

export default geographicIntelligence;