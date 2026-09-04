export type RequirementDeclaration = boolean | null;

export type RegisterRequirementStatus = 'REQUIRED' | 'NOT REQUIRED' | 'UNKNOWN';
export type RegisterDocumentStatus = 'UNKNOWN' | 'NOT APPLICABLE' | 'REVIEW REQUIRED';

export interface CustomerRequirementSource {
  twic_required: RequirementDeclaration;
  isnet_required: RequirementDeclaration;
  purchase_order_required: RequirementDeclaration;
  updated_at: string | null;
}

export interface ComplianceRegisterItem {
  key: 'twic' | 'isnet' | 'purchase_order';
  label: string;
  description: string;
  requirementStatus: RegisterRequirementStatus;
  documentStatus: RegisterDocumentStatus;
}

export interface ComplianceDocumentRegister {
  authority: 'CUSTOMER PROFILE DECLARATION';
  documentAuthority: 'UNKNOWN';
  legalSufficiency: 'UNKNOWN';
  retentionStatus: 'UNKNOWN';
  approvalAuthority: 'NOT AVAILABLE';
  recordedAt: string | null;
  items: ComplianceRegisterItem[];
}

const classifyRequirement = (
  value: RequirementDeclaration,
): Pick<ComplianceRegisterItem, 'requirementStatus' | 'documentStatus'> => {
  if (value === true) {
    return { requirementStatus: 'REQUIRED', documentStatus: 'UNKNOWN' };
  }
  if (value === false) {
    return { requirementStatus: 'NOT REQUIRED', documentStatus: 'NOT APPLICABLE' };
  }
  return { requirementStatus: 'UNKNOWN', documentStatus: 'REVIEW REQUIRED' };
};

const normalizeTimestamp = (value: string | null): string | null => {
  if (!value) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
};

export const buildComplianceDocumentRegister = (
  source: CustomerRequirementSource,
): ComplianceDocumentRegister => ({
  authority: 'CUSTOMER PROFILE DECLARATION',
  documentAuthority: 'UNKNOWN',
  legalSufficiency: 'UNKNOWN',
  retentionStatus: 'UNKNOWN',
  approvalAuthority: 'NOT AVAILABLE',
  recordedAt: normalizeTimestamp(source.updated_at),
  items: [
    {
      key: 'twic',
      label: 'TWIC access credential',
      description: 'Customer-declared site access requirement.',
      ...classifyRequirement(source.twic_required),
    },
    {
      key: 'isnet',
      label: 'ISNetworld qualification',
      description: 'Customer-declared vendor qualification requirement.',
      ...classifyRequirement(source.isnet_required),
    },
    {
      key: 'purchase_order',
      label: 'Purchase order control',
      description: 'Customer-declared commercial document requirement.',
      ...classifyRequirement(source.purchase_order_required),
    },
  ],
});

export const buildUnknownComplianceDocumentRegister = (): ComplianceDocumentRegister =>
  buildComplianceDocumentRegister({
    twic_required: null,
    isnet_required: null,
    purchase_order_required: null,
    updated_at: null,
  });
