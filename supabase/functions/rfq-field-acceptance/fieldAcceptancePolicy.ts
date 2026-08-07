export interface FieldAcceptanceInput {
  rfqId: string
  conditionNotes: string
  evidenceReferences: string[]
  quantitiesConfirmed: boolean
  accessoriesConfirmed: boolean
  documentationConfirmed: boolean
  termsAcknowledged: boolean
}

export interface FieldAcceptanceValidation {
  valid: boolean
  error?: string
}

export const MAX_CONDITION_NOTES_LENGTH = 4000
export const MAX_EVIDENCE_REFERENCES = 20
export const MAX_EVIDENCE_REFERENCE_LENGTH = 500

export function normalizeEvidenceReferences(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((reference): reference is string => typeof reference === 'string')
    .map((reference) => reference.trim())
    .filter(Boolean)
}

export function validateFieldAcceptance(
  body: Record<string, unknown>,
): FieldAcceptanceValidation & { input?: FieldAcceptanceInput } {
  const rfqId = body['rfq_id']
  if (typeof rfqId !== 'string' || !rfqId.trim()) {
    return { valid: false, error: 'rfq_id is required' }
  }

  const conditionNotes = typeof body['condition_notes'] === 'string'
    ? body['condition_notes'].trim()
    : ''
  if (conditionNotes.length < 5) {
    return { valid: false, error: 'condition_notes must contain at least 5 characters' }
  }
  if (conditionNotes.length > MAX_CONDITION_NOTES_LENGTH) {
    return { valid: false, error: `condition_notes cannot exceed ${MAX_CONDITION_NOTES_LENGTH} characters` }
  }

  const evidenceReferences = normalizeEvidenceReferences(body['evidence_references'])
  if (evidenceReferences.length === 0) {
    return { valid: false, error: 'At least one delivery evidence reference is required' }
  }
  if (evidenceReferences.length > MAX_EVIDENCE_REFERENCES) {
    return { valid: false, error: `No more than ${MAX_EVIDENCE_REFERENCES} evidence references are allowed` }
  }
  if (evidenceReferences.some((reference) => reference.length > MAX_EVIDENCE_REFERENCE_LENGTH)) {
    return {
      valid: false,
      error: `Evidence references cannot exceed ${MAX_EVIDENCE_REFERENCE_LENGTH} characters`,
    }
  }

  const confirmations = {
    quantitiesConfirmed: body['quantities_confirmed'] === true,
    accessoriesConfirmed: body['accessories_confirmed'] === true,
    documentationConfirmed: body['documentation_confirmed'] === true,
    termsAcknowledged: body['terms_acknowledged'] === true,
  }
  if (Object.values(confirmations).some((confirmed) => !confirmed)) {
    return { valid: false, error: 'All field acceptance confirmations are required' }
  }

  return {
    valid: true,
    input: {
      rfqId: rfqId.trim(),
      conditionNotes,
      evidenceReferences,
      ...confirmations,
    },
  }
}
