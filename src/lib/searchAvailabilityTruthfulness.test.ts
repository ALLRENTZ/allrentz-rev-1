import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}))

import { smartMatchEngine, type SmartMatchRequest } from '@/services/smartMatchEngine'

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('search availability truthfulness', () => {
  it('does not present catalog discovery as confirmed availability', () => {
    const featured = readSource('../components/FeaturedEquipment.tsx')
    const browse = readSource('../pages/BrowseResults.tsx')
    const equipmentCard = readSource('../components/EquipmentCard.tsx')
    const teaserCard = readSource('../components/EquipmentTeaserCard.tsx')
    const categoryCard = readSource('../components/CategoryCard.tsx')
    const smartMatchGuide = readSource('../components/HowItWorksSection.tsx')
    const howItWorks = readSource('../pages/HowItWorks.tsx')

    expect(`${featured}\n${browse}`).not.toMatch(/live availability/i)
    expect(howItWorks).not.toMatch(/real-time availability/i)
    expect(browse).not.toMatch(/listings? available/i)
    expect(categoryCard).not.toMatch(/units available/i)
    expect(equipmentCard).not.toMatch(/>\s*Available\s*</)
    expect(teaserCard).not.toContain('item.available')
    expect(featured).not.toMatch(/available:\s*row\.available\s*\?\?\s*true/)
    expect(equipmentCard).toContain('Availability unconfirmed')
    expect(teaserCard).toContain('Availability unconfirmed')
    expect(smartMatchGuide).toContain('do not represent vendor-confirmed availability')
    expect(howItWorks).toContain('Availability requires vendor confirmation')
  })

  it('does not manufacture availability or delivery timing in demo matches', async () => {
    const request: SmartMatchRequest = {
      equipment_type: 'Air compressor',
      location: 'Houston',
      urgency: 'immediate',
    }

    const result = await smartMatchEngine.processMatch(request, 'demo-customer', true)

    expect(result.matches.length).toBeGreaterThan(0)
    for (const match of result.matches) {
      expect(match).not.toHaveProperty('availability_status')
      expect(match).not.toHaveProperty('estimated_delivery')
    }
  })
})
