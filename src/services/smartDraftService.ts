export interface SmartDraftRequest {
  equipmentType: string;
  jobType: string;
  deliveryZipCode: string;
  deliveryStartDate: string;
  deliveryEndDate: string;
  durationDays: number;
  siteRequirements: string[];
  specialInstructions: string;
}

export interface SmartDraftResult {
  source: 'customer_input';
  request: SmartDraftRequest;
}

export const buildSmartDraft = (request: SmartDraftRequest): SmartDraftResult => ({
  source: 'customer_input',
  request: {
    equipmentType: request.equipmentType,
    jobType: request.jobType,
    deliveryZipCode: request.deliveryZipCode,
    deliveryStartDate: request.deliveryStartDate,
    deliveryEndDate: request.deliveryEndDate,
    durationDays: request.durationDays,
    siteRequirements: [...request.siteRequirements],
    specialInstructions: request.specialInstructions,
  },
});
