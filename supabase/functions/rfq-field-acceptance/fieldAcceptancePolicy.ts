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

export interface FieldAcceptanceStatusInput {
  action: 'status'
  rfqId: string
}

export type FieldAcceptanceStatusValidation = FieldAcceptanceValidation & {
  input?: FieldAcceptanceStatusInput
}

export interface FieldAcceptanceVisibilityContext {
  actorId: string
  actorIsDemo: boolean
  rfq: {
    customerId: string
    customerOrganizationId: string | null
    isSimulated: boolean
  }
  operationsRoles: Array<{ role?: unknown }> | null | undefined
  memberships: Array<{
    organization_id?: unknown
    role?: unknown
  }> | null | undefined
  acceptedVendorOrganizationIds: string[]
}

export interface FieldAcceptanceTimelineRow {
  previous_status?: unknown
  new_status?: unknown
  transitioned_by?: unknown
  actor_role?: unknown
  created_at?: unknown
}

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

export const MAX_CONDITION_NOTES_LENGTH = 4000
export const MAX_EVIDENCE_REFERENCES = 20
export const MAX_EVIDENCE_REFERENCE_LENGTH = 500

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const OPERATIONS_ROLES = new Set(['admin', 'manager'])
const MEMBERSHIP_ROLES = new Set(['owner', 'admin', 'member'])
const FIELD_ACCEPTANCE_STATUSES = new Set([
  'in_transit',
  'on_rent',
  'rental_extended',
  'off_rent_requested',
  'demobilizing',
  'off_rent',
  'completed',
])
const POST_ACCEPTANCE_STATUSES = new Set([
  'on_rent',
  'rental_extended',
  'off_rent_requested',
  'demobilizing',
  'off_rent',
  'completed',
])

export function validateFieldAcceptanceStatus(
  body: Record<string, unknown>,
): FieldAcceptanceStatusValidation {
  if (Object.keys(body).length !== 2 || body['action'] !== 'status') {
    return { valid: false, error: 'Only action and rfq_id are permitted for status requests' }
  }

  const rfqId = body['rfq_id']
  if (typeof rfqId !== 'string' || !UUID_PATTERN.test(rfqId.trim())) {
    return { valid: false, error: 'A valid rfq_id is required' }
  }

  return { valid: true, input: { action: 'status', rfqId: rfqId.trim() } }
}

export function hasFieldAcceptanceProjectionAccess(
  context: FieldAcceptanceVisibilityContext,
): boolean {
  if (context.actorIsDemo !== context.rfq.isSimulated) return false

  if (context.operationsRoles?.some((row) => (
    typeof row.role === 'string' && OPERATIONS_ROLES.has(row.role)
  ))) return true

  const activeOrganizationIds = new Set(context.memberships
    ?.filter((row) => typeof row.organization_id === 'string'
      && typeof row.role === 'string'
      && MEMBERSHIP_ROLES.has(row.role))
    .map((row) => row.organization_id as string) ?? [])

  if (context.rfq.customerId === context.actorId) return true
  if (context.rfq.customerOrganizationId
      && activeOrganizationIds.has(context.rfq.customerOrganizationId)) return true

  return context.acceptedVendorOrganizationIds
    .some((organizationId) => activeOrganizationIds.has(organizationId))
}

export function buildFieldAcceptanceStatusProjection(input: {
  currentStatus: unknown
  onRentAt: unknown
  timelineRows: FieldAcceptanceTimelineRow[] | null | undefined
}): FieldAcceptanceStatusProjection | null {
  if (typeof input.currentStatus !== 'string'
      || !FIELD_ACCEPTANCE_STATUSES.has(input.currentStatus)) return null

  const rows = Array.isArray(input.timelineRows) ? input.timelineRows : []
  const canonicalRows = rows.filter((row) => row.previous_status === 'in_transit'
    && row.new_status === 'on_rent'
    && row.actor_role === 'system'
    && row.transitioned_by === null
    && typeof row.created_at === 'string'
    && Number.isFinite(Date.parse(row.created_at)))
  const hasCanonicalRecord = canonicalRows.length === 1
  const hasValidOnRentAt = typeof input.onRentAt === 'string'
    && Number.isFinite(Date.parse(input.onRentAt))

  let fieldAcceptanceState: FieldAcceptanceStatusProjection['field_acceptance_state']
  let evidenceState: FieldAcceptanceStatusProjection['delivery_evidence_state']
  let onRentDetermination: FieldAcceptanceStatusProjection['on_rent_determination']
  let nextStep: FieldAcceptanceStatusProjection['next_step']
  let acceptedAt: string | null

  if (input.currentStatus === 'in_transit' && canonicalRows.length === 0 && !hasValidOnRentAt) {
    fieldAcceptanceState = 'AWAITING_CUSTOMER'
    evidenceState = 'UNKNOWN'
    onRentDetermination = 'NOT_RECORDED'
    nextStep = 'CUSTOMER_FIELD_ACCEPTANCE'
    acceptedAt = null
  } else if (POST_ACCEPTANCE_STATUSES.has(input.currentStatus)
      && hasCanonicalRecord && hasValidOnRentAt) {
    fieldAcceptanceState = 'RECORDED'
    evidenceState = 'RECORDED_NOT_EXPOSED'
    onRentDetermination = 'SYSTEM_RECORDED'
    nextStep = 'MONITOR_RENTAL'
    acceptedAt = input.onRentAt as string
  } else {
    fieldAcceptanceState = 'REVIEW_REQUIRED'
    evidenceState = 'UNKNOWN'
    onRentDetermination = 'REVIEW_REQUIRED'
    nextStep = 'OPERATIONS_REVIEW'
    acceptedAt = null
  }

  return {
    authority: 'READ_ONLY_FIELD_ACCEPTANCE_PROJECTION',
    scope: 'RFQ_WIDE',
    current_status: input.currentStatus,
    field_acceptance_state: fieldAcceptanceState,
    delivery_evidence_state: evidenceState,
    on_rent_determination: onRentDetermination,
    accepted_at: acceptedAt,
    next_step: nextStep,
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
