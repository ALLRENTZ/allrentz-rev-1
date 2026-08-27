import { supabase } from '@/integrations/supabase/client'

export interface FieldAcceptanceStatusProjection {
  authority: 'READ_ONLY_FIELD_ACCEPTANCE_PROJECTION'
  scope: 'RFQ_WIDE'
  current_status: string
  field_acceptance_state: 'AWAITING_CUSTOMER' | 'RECORDED' | 'REVIEW_REQUIRED'
  delivery_evidence_state: 'UNKNOWN' | 'RECORDED_NOT_EXPOSED'
  on_rent_determination: 'NOT_RECORDED' | 'SYSTEM_RECORDED' | 'REVIEW_REQUIRED'
  accepted_at: string | null
  next_step: 'CUSTOMER_FIELD_ACCEPTANCE' | 'MONITOR_RENTAL' | 'OPERATIONS_REVIEW'
  authority_boundary: {
    mutations_permitted: false
    billing_calculation_authority: false
    custody_authority: false
    condition_liability_authority: false
    legal_evidence_sufficiency_authority: false
    granular_object_authority: false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeFieldAcceptanceStatus(
  value: unknown,
): FieldAcceptanceStatusProjection | null {
  if (!isRecord(value)
      || value.authority !== 'READ_ONLY_FIELD_ACCEPTANCE_PROJECTION'
      || value.scope !== 'RFQ_WIDE'
      || typeof value.current_status !== 'string'
      || (value.field_acceptance_state !== 'AWAITING_CUSTOMER'
        && value.field_acceptance_state !== 'RECORDED'
        && value.field_acceptance_state !== 'REVIEW_REQUIRED')
      || (value.delivery_evidence_state !== 'UNKNOWN'
        && value.delivery_evidence_state !== 'RECORDED_NOT_EXPOSED')
      || (value.on_rent_determination !== 'NOT_RECORDED'
        && value.on_rent_determination !== 'SYSTEM_RECORDED'
        && value.on_rent_determination !== 'REVIEW_REQUIRED')
      || (value.next_step !== 'CUSTOMER_FIELD_ACCEPTANCE'
        && value.next_step !== 'MONITOR_RENTAL'
        && value.next_step !== 'OPERATIONS_REVIEW')
      || !isRecord(value.authority_boundary)) return null

  const acceptedAt = value.accepted_at
  if (acceptedAt !== null && (typeof acceptedAt !== 'string'
      || !Number.isFinite(Date.parse(acceptedAt)))) return null

  const boundary = value.authority_boundary
  if (boundary.mutations_permitted !== false
      || boundary.billing_calculation_authority !== false
      || boundary.custody_authority !== false
      || boundary.condition_liability_authority !== false
      || boundary.legal_evidence_sufficiency_authority !== false
      || boundary.granular_object_authority !== false) return null

  if (value.field_acceptance_state === 'RECORDED') {
    if (value.delivery_evidence_state !== 'RECORDED_NOT_EXPOSED'
        || value.on_rent_determination !== 'SYSTEM_RECORDED'
        || value.next_step !== 'MONITOR_RENTAL'
        || acceptedAt === null) return null
  } else if (acceptedAt !== null || value.delivery_evidence_state !== 'UNKNOWN') {
    return null
  }

  if (value.field_acceptance_state === 'AWAITING_CUSTOMER'
      && (value.on_rent_determination !== 'NOT_RECORDED'
        || value.next_step !== 'CUSTOMER_FIELD_ACCEPTANCE')) return null
  if (value.field_acceptance_state === 'REVIEW_REQUIRED'
      && (value.on_rent_determination !== 'REVIEW_REQUIRED'
        || value.next_step !== 'OPERATIONS_REVIEW')) return null

  return {
    authority: 'READ_ONLY_FIELD_ACCEPTANCE_PROJECTION',
    scope: 'RFQ_WIDE',
    current_status: value.current_status,
    field_acceptance_state: value.field_acceptance_state,
    delivery_evidence_state: value.delivery_evidence_state,
    on_rent_determination: value.on_rent_determination,
    accepted_at: acceptedAt,
    next_step: value.next_step,
    authority_boundary: {
      mutations_permitted: false,
      billing_calculation_authority: false,
      custody_authority: false,
      condition_liability_authority: false,
      legal_evidence_sufficiency_authority: false,
      granular_object_authority: false,
    },
  }
}

export async function loadFieldAcceptanceStatus(
  rfqId: string,
): Promise<FieldAcceptanceStatusProjection> {
  const { data, error } = await supabase.functions.invoke('rfq-field-acceptance', {
    body: { action: 'status', rfq_id: rfqId },
  })
  if (error) throw new Error('Unable to load field acceptance status')
  const projection = normalizeFieldAcceptanceStatus(data)
  if (!projection) throw new Error('Field acceptance status requires review')
  return projection
}
