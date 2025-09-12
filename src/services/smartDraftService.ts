
interface SmartDraftRequest {
  equipmentType: string;
  jobType: string;
  deliveryZipCode: string;
  deliveryStartDate: string;
  deliveryEndDate: string;
  durationDays: number;
  siteRequirements: string[];
  specialInstructions: string;
}

interface SmartDraftResult {
  matchedVendorId: string;
  matchedVendorName: string;
  matchedVendorLocation: string;
  estimatedDailyRate: number;
  estimatedDeliveryFee: number;
  complianceNotes: string[];
  responseTime: string;
  equipmentDescription: string;
}

// Placeholder pricing data for different equipment types
const equipmentPricing: Record<string, { baseRate: number; deliveryFee: number }> = {
  'Air Compressor': { baseRate: 120, deliveryFee: 150 },
  'Light Tower': { baseRate: 85, deliveryFee: 100 },
  'Generator': { baseRate: 200, deliveryFee: 200 },
  'Crane': { baseRate: 450, deliveryFee: 350 },
  'Excavator': { baseRate: 380, deliveryFee: 250 },
  'Scaffolding': { baseRate: 65, deliveryFee: 180 },
  'Welding Equipment': { baseRate: 95, deliveryFee: 80 },
  'Pressure Washer': { baseRate: 55, deliveryFee: 60 },
  'Forklift': { baseRate: 165, deliveryFee: 120 },
  'Boom Lift': { baseRate: 285, deliveryFee: 200 },
  'Scissor Lift': { baseRate: 195, deliveryFee: 150 },
  'Concrete Mixer': { baseRate: 145, deliveryFee: 140 }
};

// Mock vendor data
const mockVendors = [
  { id: 'v1', name: 'Gulf Coast Industrial Rentals', location: 'Houston, TX', responseTime: '2-4 hours' },
  { id: 'v2', name: 'Lone Star Equipment Co.', location: 'Beaumont, TX', responseTime: '1-3 hours' },
  { id: 'v3', name: 'Coastal Rental Solutions', location: 'Galveston, TX', responseTime: '3-5 hours' },
  { id: 'v4', name: 'Industrial Equipment Partners', location: 'Port Arthur, TX', responseTime: '2-4 hours' },
  { id: 'v5', name: 'Bayou Rentals LLC', location: 'Lake Charles, LA', responseTime: '4-6 hours' }
];

const generateComplianceNotes = (siteRequirements: string[]): string[] => {
  const notes: string[] = [];
  
  if (siteRequirements.includes('TWIC Required')) {
    notes.push('⚠️ TWIC card required for all personnel');
  }
  
  if (siteRequirements.includes('HAZMAT Certified')) {
    notes.push('⚠️ HAZMAT certification required');
  }
  
  if (siteRequirements.includes('Certified Startup')) {
    notes.push('⚠️ Certified startup technician required');
  }
  
  if (siteRequirements.includes('Safety Training')) {
    notes.push('⚠️ Site-specific safety training mandatory');
  }
  
  if (siteRequirements.includes('Environmental Compliance')) {
    notes.push('⚠️ Environmental compliance documentation required');
  }
  
  return notes;
};

const selectBestVendor = (zipCode: string, jobType: string): any => {
  // Simple vendor selection logic based on ZIP code and job type
  const texasZips = ['77', '78', '79', '75', '76'];
  const isTexas = texasZips.some(prefix => zipCode.startsWith(prefix));
  
  if (jobType === 'Emergency') {
    return mockVendors[1]; // Fastest response time
  }
  
  if (isTexas) {
    return mockVendors[0]; // Gulf Coast Industrial Rentals
  }
  
  return mockVendors[Math.floor(Math.random() * mockVendors.length)];
};

export const generateSmartDraft = async (request: SmartDraftRequest): Promise<SmartDraftResult> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const selectedVendor = selectBestVendor(request.deliveryZipCode, request.jobType);
  const pricing = equipmentPricing[request.equipmentType] || { baseRate: 100, deliveryFee: 100 };
  
  // Add some variation to pricing based on job type and duration
  let priceMultiplier = 1;
  if (request.jobType === 'Emergency') priceMultiplier = 1.2;
  if (request.jobType === 'Turnaround') priceMultiplier = 1.1;
  if (request.durationDays > 30) priceMultiplier *= 0.9; // Volume discount
  
  const estimatedDailyRate = Math.round(pricing.baseRate * priceMultiplier);
  const estimatedDeliveryFee = pricing.deliveryFee;
  
  const complianceNotes = generateComplianceNotes(request.siteRequirements);
  
  return {
    matchedVendorId: selectedVendor.id,
    matchedVendorName: selectedVendor.name,
    matchedVendorLocation: selectedVendor.location,
    estimatedDailyRate,
    estimatedDeliveryFee,
    complianceNotes,
    responseTime: selectedVendor.responseTime,
    equipmentDescription: `Industrial ${request.equipmentType} - ${request.jobType} Grade`
  };
};
