export type RentalStopAction =
  | 'publish_evaluator'
  | 'publish_rule'
  | 'accept_terms'
  | 'declare_readiness'
  | 'determine'

type JsonObject = Record<string, unknown>

export interface ValidatedRentalStopInput {
  action: RentalStopAction
  rpc: string
  params: Record<string, unknown>
}

export interface RentalStopValidation {
  valid: boolean
  error?: string
  input?: ValidatedRentalStopInput
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256 = /^[0-9a-f]{64}$/
const CODE = /^[a-z0-9][a-z0-9._-]{2,79}$/
const CURRENCY = /^[A-Z]{3}$/

const TRIGGER_BASES = new Set([
  'unknown',
  'request_received',
  'requested_stop',
  'verified_readiness',
  'vendor_acknowledgment',
  'pickup_available',
  'physical_pickup',
  'contract_specific',
])
const BILLING_TREATMENTS = new Set([
  'unknown',
  'exact_timestamp',
  'calendar_day',
  'minimum_period',
  'fixed_cycle',
  'cycle_threshold',
  'possession_based',
  'usage_based',
  'contract_specific',
])
const READINESS_STATES = new Set(['confirmed', 'not_confirmed', 'unknown', 'not_applicable'])

function stringValue(body: JsonObject, key: string): string | null {
  const value = body[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function optionalString(body: JsonObject, key: string): string | null {
  const value = body[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function uuidValue(body: JsonObject, key: string, required = true): string | null | undefined {
  const value = optionalString(body, key)
  if (value === null) return required ? undefined : null
  return UUID.test(value) ? value : undefined
}

function dateValue(body: JsonObject, key: string, required = true): string | null | undefined {
  const value = optionalString(body, key)
  if (value === null) return required ? undefined : null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined
}

function objectValue(value: unknown): JsonObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : null
}

function idempotencyKey(body: JsonObject): string | null {
  const value = stringValue(body, 'idempotency_key')
  return value && value.length >= 8 && value.length <= 200 ? value : null
}

function commonFailure(body: JsonObject): string | null {
  if (!idempotencyKey(body)) return 'idempotency_key must contain between 8 and 200 characters'
  return null
}

export function validateRentalStopAction(body: JsonObject): RentalStopValidation {
  const action = body['action']
  if (typeof action !== 'string' || ![
    'publish_evaluator',
    'publish_rule',
    'accept_terms',
    'declare_readiness',
    'determine',
  ].includes(action)) {
    return { valid: false, error: 'Unsupported rental-stop action' }
  }

  const commonError = commonFailure(body)
  if (commonError) return { valid: false, error: commonError }

  if (action === 'determine') {
    const rfqId = uuidValue(body, 'rfq_id')
    if (!rfqId) return { valid: false, error: 'rfq_id must be a UUID' }
    return {
      valid: true,
      input: {
        action,
        rpc: 'determine_rental_stop_and_transition',
        params: { p_rfq_id: rfqId, p_idempotency_key: idempotencyKey(body) },
      },
    }
  }

  if (action === 'publish_evaluator') {
    const evaluatorKey = stringValue(body, 'evaluator_key')
    const artifactSha256 = stringValue(body, 'artifact_sha256')
    const sourceKind = stringValue(body, 'source_kind')
    const sourceReference = stringValue(body, 'source_reference')
    const sourceSha256 = stringValue(body, 'source_sha256')
    const triggerBases = Array.isArray(body['supported_trigger_bases'])
      ? body['supported_trigger_bases'].filter((item): item is string => typeof item === 'string')
      : []
    const billingTreatment = stringValue(body, 'billing_treatment')
    const definition = objectValue(body['definition'])
    const lifecycleState = stringValue(body, 'lifecycle_state')
    const effectiveFrom = dateValue(body, 'effective_from')
    const effectiveUntil = dateValue(body, 'effective_until', false)
    const expectedPredecessor = uuidValue(body, 'expected_predecessor_id', false)
    if (!evaluatorKey || !CODE.test(evaluatorKey)) {
      return { valid: false, error: 'evaluator_key is invalid' }
    }
    if (!artifactSha256 || !SHA256.test(artifactSha256)) {
      return { valid: false, error: 'artifact_sha256 must be a lowercase SHA-256 digest' }
    }
    if (sourceKind !== 'backend_artifact'
      || !sourceReference || sourceReference.length > 500
      || !sourceSha256 || !SHA256.test(sourceSha256)) {
      return { valid: false, error: 'Evaluator source reference or digest is invalid' }
    }
    if (!triggerBases.length || triggerBases.some((value) => !TRIGGER_BASES.has(value) || value === 'unknown')) {
      return { valid: false, error: 'supported_trigger_bases contains an unsupported value' }
    }
    if (!billingTreatment || !BILLING_TREATMENTS.has(billingTreatment) || billingTreatment === 'unknown') {
      return { valid: false, error: 'billing_treatment is unsupported' }
    }
    if (!definition) return { valid: false, error: 'definition must be an object' }
    if (!lifecycleState || !['active', 'retired'].includes(lifecycleState)) {
      return { valid: false, error: 'lifecycle_state must be active or retired' }
    }
    if (!effectiveFrom || effectiveUntil === undefined || expectedPredecessor === undefined) {
      return { valid: false, error: 'Evaluator date or predecessor value is invalid' }
    }
    return {
      valid: true,
      input: {
        action,
        rpc: 'publish_rental_stop_evaluator_version',
        params: {
          p_evaluator_key: evaluatorKey,
          p_artifact_sha256: artifactSha256,
          p_source_kind: sourceKind,
          p_source_reference: sourceReference,
          p_source_sha256: sourceSha256,
          p_supported_trigger_bases: triggerBases,
          p_billing_treatment: billingTreatment,
          p_definition: definition,
          p_lifecycle_state: lifecycleState,
          p_effective_from: effectiveFrom,
          p_effective_until: effectiveUntil,
          p_is_simulated: body['is_simulated'] === true,
          p_idempotency_key: idempotencyKey(body),
          p_expected_predecessor_id: expectedPredecessor,
        },
      },
    }
  }

  if (action === 'publish_rule') {
    const ruleCode = stringValue(body, 'rule_code')
    const displayName = stringValue(body, 'display_name')
    const visibility = stringValue(body, 'visibility')
    const customerOrgId = uuidValue(body, 'customer_organization_id', false)
    const vendorOrgId = uuidValue(body, 'vendor_organization_id', false)
    const triggerBasis = stringValue(body, 'trigger_basis')
    const billingTreatment = stringValue(body, 'billing_treatment')
    const evaluatorKey = optionalString(body, 'evaluator_key')
    const evaluatorVersion = body['evaluator_version']
    const evaluatorSha256 = optionalString(body, 'evaluator_sha256')
    const ruleParameters = objectValue(body['rule_parameters'])
    const sourceKind = stringValue(body, 'source_kind')
    const sourceReference = stringValue(body, 'source_reference')
    const sourceSha256 = stringValue(body, 'source_sha256')
    const effectiveFrom = dateValue(body, 'effective_from')
    const effectiveUntil = dateValue(body, 'effective_until', false)
    const expectedPredecessor = uuidValue(body, 'expected_predecessor_id', false)
    if (!ruleCode || !CODE.test(ruleCode)) return { valid: false, error: 'rule_code is invalid' }
    if (!displayName || displayName.length < 3 || displayName.length > 160) {
      return { valid: false, error: 'display_name must contain between 3 and 160 characters' }
    }
    if (!visibility || !['platform', 'organization_pair'].includes(visibility)) {
      return { valid: false, error: 'visibility is invalid' }
    }
    if (customerOrgId === undefined || vendorOrgId === undefined) {
      return { valid: false, error: 'Organization identifiers must be UUIDs' }
    }
    if (visibility === 'organization_pair' && (!customerOrgId || !vendorOrgId)) {
      return { valid: false, error: 'organization_pair rules require both organization identifiers' }
    }
    if (visibility === 'platform' && (customerOrgId || vendorOrgId)) {
      return { valid: false, error: 'platform rules cannot name an organization pair' }
    }
    if (!triggerBasis || !TRIGGER_BASES.has(triggerBasis)) return { valid: false, error: 'trigger_basis is invalid' }
    if (!billingTreatment || !BILLING_TREATMENTS.has(billingTreatment)) {
      return { valid: false, error: 'billing_treatment is invalid' }
    }
    const evaluatorPresent = evaluatorKey !== null || evaluatorVersion !== null && evaluatorVersion !== undefined || evaluatorSha256 !== null
    if (evaluatorPresent && (!evaluatorKey || !CODE.test(evaluatorKey)
      || !Number.isInteger(evaluatorVersion) || Number(evaluatorVersion) < 1
      || !evaluatorSha256 || !SHA256.test(evaluatorSha256))) {
      return { valid: false, error: 'Evaluator identity must be complete and valid' }
    }
    if (!ruleParameters) return { valid: false, error: 'rule_parameters must be an object' }
    if (!sourceKind || !['accepted_contract', 'accepted_quote', 'change_order'].includes(sourceKind)) {
      return { valid: false, error: 'source_kind must be evidence-backed; platform_policy is not authorized' }
    }
    if (!sourceReference || sourceReference.length > 500 || !sourceSha256 || !SHA256.test(sourceSha256)) {
      return { valid: false, error: 'Rule source reference or digest is invalid' }
    }
    if (!effectiveFrom || effectiveUntil === undefined || expectedPredecessor === undefined) {
      return { valid: false, error: 'Rule date or predecessor value is invalid' }
    }
    return {
      valid: true,
      input: {
        action,
        rpc: 'publish_rental_stop_rule_version',
        params: {
          p_rule_code: ruleCode,
          p_display_name: displayName,
          p_visibility: visibility,
          p_customer_organization_id: customerOrgId,
          p_vendor_organization_id: vendorOrgId,
          p_trigger_basis: triggerBasis,
          p_billing_treatment: billingTreatment,
          p_evaluator_key: evaluatorKey,
          p_evaluator_version: evaluatorPresent ? evaluatorVersion : null,
          p_evaluator_sha256: evaluatorSha256,
          p_rule_parameters: ruleParameters,
          p_source_kind: sourceKind,
          p_source_reference: sourceReference,
          p_source_sha256: sourceSha256,
          p_effective_from: effectiveFrom,
          p_effective_until: effectiveUntil,
          p_is_simulated: body['is_simulated'] === true,
          p_idempotency_key: idempotencyKey(body),
          p_expected_predecessor_id: expectedPredecessor,
        },
      },
    }
  }

  if (action === 'accept_terms') {
    const rfqId = uuidValue(body, 'rfq_id')
    const quoteId = uuidValue(body, 'accepted_quote_id')
    const ruleId = uuidValue(body, 'rule_version_id')
    const expectedPrior = uuidValue(body, 'expected_supersedes_id', false)
    const timeZone = stringValue(body, 'time_zone')
    const currency = stringValue(body, 'currency_code')?.toUpperCase() ?? null
    const termsPayload = objectValue(body['terms_payload'])
    const termsSha256 = stringValue(body, 'terms_sha256')
    if (!rfqId || !quoteId || !ruleId || expectedPrior === undefined) {
      return { valid: false, error: 'Term relationship identifiers must be UUIDs' }
    }
    if (!timeZone || timeZone.length > 100 || !currency || !CURRENCY.test(currency)) {
      return { valid: false, error: 'time_zone or currency_code is invalid' }
    }
    if (!termsPayload || !termsSha256 || !SHA256.test(termsSha256)) {
      return { valid: false, error: 'terms_payload or terms_sha256 is invalid' }
    }
    return {
      valid: true,
      input: {
        action,
        rpc: 'accept_rental_stop_term_snapshot',
        params: {
          p_rfq_id: rfqId,
          p_accepted_quote_id: quoteId,
          p_rule_version_id: ruleId,
          p_time_zone: timeZone,
          p_currency_code: currency,
          p_terms_payload: termsPayload,
          p_terms_sha256: termsSha256,
          p_idempotency_key: idempotencyKey(body),
          p_expected_supersedes_id: expectedPrior,
        },
      },
    }
  }

  const rfqId = uuidValue(body, 'rfq_id')
  const requestId = uuidValue(body, 'off_rent_request_id')
  const readyAt = dateValue(body, 'ready_at', false)
  const expectedPrior = uuidValue(body, 'expected_supersedes_id', false)
  const states = ['isolation_state', 'drained_state', 'safe_access_state', 'operating_state']
    .map((key) => stringValue(body, key))
  if (!rfqId || !requestId || readyAt === undefined || expectedPrior === undefined) {
    return { valid: false, error: 'Readiness relationship, date, or predecessor value is invalid' }
  }
  if (states.some((value) => !value || !READINESS_STATES.has(value))) {
    return { valid: false, error: 'Readiness states contain an unsupported value' }
  }
  if (!Array.isArray(body['component_manifest']) || !Array.isArray(body['evidence_refs'])) {
    return { valid: false, error: 'component_manifest and evidence_refs must be arrays' }
  }
  const notes = optionalString(body, 'notes')
  const equipmentLocation = optionalString(body, 'equipment_location')
  const declarationSha256 = stringValue(body, 'declaration_sha256')
  if ((notes?.length ?? 0) > 4000 || (equipmentLocation?.length ?? 0) > 1000) {
    return { valid: false, error: 'Readiness notes or equipment_location is too long' }
  }
  if (!declarationSha256 || !SHA256.test(declarationSha256)) {
    return { valid: false, error: 'declaration_sha256 must be a lowercase SHA-256 digest' }
  }
  return {
    valid: true,
    input: {
      action,
      rpc: 'record_rental_stop_readiness_declaration',
      params: {
        p_rfq_id: rfqId,
        p_off_rent_request_id: requestId,
        p_ready_at: readyAt,
        p_equipment_location: equipmentLocation,
        p_isolation_state: states[0],
        p_drained_state: states[1],
        p_safe_access_state: states[2],
        p_operating_state: states[3],
        p_component_manifest: body['component_manifest'],
        p_evidence_refs: body['evidence_refs'],
        p_notes: notes,
        p_declaration_sha256: declarationSha256,
        p_idempotency_key: idempotencyKey(body),
        p_expected_supersedes_id: expectedPrior,
      },
    },
  }
}
