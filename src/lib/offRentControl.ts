export type ContractualStopStatus = 'DETERMINED' | 'BLOCKED' | 'UNKNOWN';
export type BillingCutoffStatus = 'DETERMINED' | 'BLOCKED';

export interface OffRentControlRecord {
  rfq_id: string;
  operational_status: string;
  request: {
    requested_at: string;
    requested_stop_at: string;
    pickup_available_from: string;
    pickup_available_until: string;
    customer_notes: string | null;
    correlation_id: string;
  } | null;
  acknowledgment: {
    acknowledged_at: string;
    pickup_window_start: string;
    pickup_window_end: string;
    vendor_notes: string | null;
    correlation_id: string;
  } | null;
  authority: {
    contractual_status: ContractualStopStatus;
    billing_cutoff_status: BillingCutoffStatus;
    blocker_code: string | null;
    blocker_detail: string | null;
    determined_at: string | null;
    stop_effective_at: string | null;
    billable_through_at: string | null;
    explanation: string;
    determination_version: number | null;
  };
  timeline: Array<{
    id: string;
    event_type: string;
    actor_role: string | null;
    occurred_at: string;
    reason: string | null;
    correlation_id: string;
    state: string | null;
  }>;
}

const UNKNOWN_AUTHORITY: OffRentControlRecord['authority'] = {
  contractual_status: 'UNKNOWN',
  billing_cutoff_status: 'BLOCKED',
  blocker_code: 'STOP_RULE_UNKNOWN',
  blocker_detail: 'No published contractual stop authority is available for this rental.',
  determined_at: null,
  stop_effective_at: null,
  billable_through_at: null,
  explanation: 'No published contractual stop authority is available for this rental. Billing cutoff remains blocked.',
  determination_version: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function normalizeOffRentControlRecord(value: unknown): OffRentControlRecord | null {
  if (!isRecord(value)) return null;
  const rfqId = requiredString(value.rfq_id);
  const operationalStatus = requiredString(value.operational_status);
  if (!rfqId || !operationalStatus) return null;

  const rawAuthority = isRecord(value.authority) ? value.authority : {};
  const contractualStatus = rawAuthority.contractual_status;
  const billingStatus = rawAuthority.billing_cutoff_status;
  let authority = UNKNOWN_AUTHORITY;

  if (contractualStatus === 'DETERMINED'
      && billingStatus === 'DETERMINED'
      && requiredString(rawAuthority.determined_at)
      && requiredString(rawAuthority.stop_effective_at)
      && requiredString(rawAuthority.billable_through_at)
      && requiredString(rawAuthority.explanation)
      && typeof rawAuthority.determination_version === 'number') {
    authority = {
      contractual_status: 'DETERMINED',
      billing_cutoff_status: 'DETERMINED',
      blocker_code: null,
      blocker_detail: null,
      determined_at: rawAuthority.determined_at as string,
      stop_effective_at: rawAuthority.stop_effective_at as string,
      billable_through_at: rawAuthority.billable_through_at as string,
      explanation: rawAuthority.explanation as string,
      determination_version: rawAuthority.determination_version,
    };
  } else if (contractualStatus === 'BLOCKED' && billingStatus === 'BLOCKED') {
    authority = {
      ...UNKNOWN_AUTHORITY,
      contractual_status: 'BLOCKED',
      blocker_code: typeof rawAuthority.blocker_code === 'string' ? rawAuthority.blocker_code : null,
      blocker_detail: typeof rawAuthority.blocker_detail === 'string' ? rawAuthority.blocker_detail : null,
      explanation: typeof rawAuthority.explanation === 'string'
        ? rawAuthority.explanation
        : 'The governed stop-rent evaluation did not establish contractual stop authority.',
    };
  }

  const timeline = Array.isArray(value.timeline)
    ? value.timeline.flatMap((entry) => {
        if (!isRecord(entry)) return [];
        const id = requiredString(entry.id);
        const eventType = requiredString(entry.event_type);
        const occurredAt = requiredString(entry.occurred_at);
        const correlationId = requiredString(entry.correlation_id);
        if (!id || !eventType || !occurredAt || !correlationId) return [];
        return [{
          id,
          event_type: eventType,
          actor_role: typeof entry.actor_role === 'string' ? entry.actor_role : null,
          occurred_at: occurredAt,
          reason: typeof entry.reason === 'string' ? entry.reason : null,
          correlation_id: correlationId,
          state: typeof entry.state === 'string' ? entry.state : null,
        }];
      })
    : [];

  return {
    rfq_id: rfqId,
    operational_status: operationalStatus,
    request: isRecord(value.request) ? value.request as OffRentControlRecord['request'] : null,
    acknowledgment: isRecord(value.acknowledgment)
      ? value.acknowledgment as OffRentControlRecord['acknowledgment']
      : null,
    authority,
    timeline,
  };
}

export function offRentEventLabel(eventType: string, state: string | null): string {
  if (eventType === 'off_rent_requested') return 'Customer submitted off-rent request';
  if (eventType === 'off_rent_acknowledged') return 'Vendor acknowledged pickup coordination';
  if (eventType === 'stoprent.determination_blocked') return 'Contractual stop determination blocked';
  if (eventType === 'stoprent.rule_applied') return 'Published stop rule evaluated';
  if (eventType === 'stoprent.determined') return 'Contractual stop time determined';
  if (eventType === 'status_transition' && state) return `Rental moved to ${state.replace(/_/g, ' ')}`;
  return eventType.replace(/[._]/g, ' ');
}
