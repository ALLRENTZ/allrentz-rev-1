import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))
import {
  formatLifecycleStatus,
  lifecycleReviewLabel,
  normalizeOperationsLifecycleProjection,
} from './operationsLifecycle'

const projection = {
  authority: 'READ_ONLY_OPERATIONS_PROJECTION',
  scope: 'RFQ_WIDE',
  mode: 'PRODUCTION',
  generated_at: '2026-08-26T12:00:00.000Z',
  authority_boundary: {
    mutations_permitted: false,
    billing_authority: false,
    custody_authority: false,
    granular_object_authority: false,
  },
  items: [{
    rfq_id: 'rfq-1',
    current_status: 'on_rent',
    created_at: '2026-08-25T12:00:00.000Z',
    updated_at: '2026-08-26T11:00:00.000Z',
    timeline: [
      {
        previous_status: 'in_transit',
        new_status: 'on_rent',
        created_at: '2026-08-26T11:00:00.000Z',
      },
    ],
  }],
}

describe('operations lifecycle projection', () => {
  it('accepts the canonical sanitized read-only projection', () => {
    expect(normalizeOperationsLifecycleProjection(projection)).toEqual(projection)
  })

  it('rejects invented status and authority expansion', () => {
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      items: [{ ...projection.items[0], current_status: 'picked_up' }],
    })).toBeNull()
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      authority_boundary: { ...projection.authority_boundary, billing_authority: true },
    })).toBeNull()
  })

  it('rejects contradictory or out-of-order history', () => {
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      items: [{ ...projection.items[0], current_status: 'off_rent' }],
    })).toBeNull()
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      items: [{
        ...projection.items[0],
        timeline: [
          ...projection.items[0].timeline,
          {
            previous_status: 'on_rent',
            new_status: 'rental_extended',
            created_at: '2026-08-25T11:00:00.000Z',
          },
        ],
      }],
    })).toBeNull()
  })

  it('uses non-authoritative operational guidance', () => {
    expect(formatLifecycleStatus('off_rent_requested')).toBe('Off Rent Requested')
    expect(lifecycleReviewLabel('off_rent')).toContain('governed separately')
    expect(lifecycleReviewLabel('draft')).toBe('Review canonical next action')
  })
})
