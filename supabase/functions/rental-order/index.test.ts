import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'supabase/functions/rental-order/index.ts'), 'utf8')

describe('Rental Order Edge authority ordering', () => {
  it('requires an active profile before resolving a Rental Order', () => {
    expect(source).toContain("select('status, is_demo')")
    expect(source).toContain("profileResult.data.status !== 'active'")
    expect(source).toContain("message.includes('Active customer profile authority')")
    expect(source.indexOf("profileResult.data.status !== 'active'"))
      .toBeLessThan(source.indexOf('const callerOrderQuery = selectOrder(userClient)'))
  })

  it('uses the caller RLS client for the root object before privileged child reads', () => {
    expect(source).toContain('const callerOrderQuery = selectOrder(userClient)')
    expect(source.indexOf('const callerOrderQuery = selectOrder(userClient)'))
      .toBeLessThan(source.indexOf("const rfqResult = await svc.from('rental_requests')"))
  })

  it('permits a service root lookup only after a current operations role and collapses hidden with missing', () => {
    expect(source).toContain('if (!rentalOrder && roleResult.data.length > 0)')
    expect(source).toContain("if (!rentalOrder) return jsonError(404, 'Rental Order not found')")
  })
})
