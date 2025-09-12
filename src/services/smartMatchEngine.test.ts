import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { smartMatchEngine } from './smartMatchEngine'
import type { SmartMatchRequest } from './smartMatchEngine'

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 'test-request-1' }, 
            error: null 
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ 
          data: null, 
          error: null 
        }))
      }))
    }))
  }
}))

describe('SmartMatchEngine', () => {
  let mockRequest: SmartMatchRequest

  beforeEach(() => {
    mockRequest = {
      equipment_type: 'Steam Boiler',
      location: 'Houston',
      urgency: 'today' as const,
      additional_requirements: {
        twic_required: true,
        hazmat_certified: true,
        max_daily_rate: 500,
        min_rating: 4.5
      }
    }
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('processMatch', () => {
    it('should process a match request and return results for demo user', async () => {
      const result = await smartMatchEngine.processMatch(mockRequest, 'demo-customer')

      expect(result).toBeDefined()
      expect(result.request_id).toBe('demo-request')
      expect(result.total_matches).toBeGreaterThan(4)
      expect(result.matches).toHaveLength(4)
      expect(result.processing_time_ms).toBeGreaterThan(0)
      expect(result.location_center).toEqual({ lat: 29.7604, lng: -95.3698 })
    })

    it('should process a match request for authenticated user', async () => {
      const result = await smartMatchEngine.processMatch(mockRequest, 'user-123')

      expect(result).toBeDefined()
      expect(result.request_id).toMatch(/^request-\d+$/)
      expect(result.total_matches).toBeGreaterThan(4)
      expect(result.matches).toHaveLength(4)
      expect(result.processing_time_ms).toBeGreaterThan(0)
    })

    it('should filter vendors by TWIC requirement', async () => {
      const requestWithTWIC = {
        ...mockRequest,
        additional_requirements: { twic_required: true }
      }

      const result = await smartMatchEngine.processMatch(requestWithTWIC, 'demo-customer')
      
      result.matches.forEach(match => {
        expect(match.compliance_tags).toContain('TWIC')
      })
    })

    it('should filter vendors by HAZMAT certification', async () => {
      const requestWithHAZMAT = {
        ...mockRequest,
        additional_requirements: { hazmat_certified: true }
      }

      const result = await smartMatchEngine.processMatch(requestWithHAZMAT, 'demo-customer')
      
      result.matches.forEach(match => {
        expect(match.compliance_tags).toContain('HAZMAT')
      })
    })

    it('should filter vendors by maximum daily rate', async () => {
      const requestWithMaxRate = {
        ...mockRequest,
        additional_requirements: { max_daily_rate: 450 }
      }

      const result = await smartMatchEngine.processMatch(requestWithMaxRate, 'demo-customer')
      
      result.matches.forEach(match => {
        expect(match.daily_rate).toBeLessThanOrEqual(450)
      })
    })

    it('should sort by response time for immediate urgency', async () => {
      const immediateRequest = {
        ...mockRequest,
        urgency: 'immediate' as const
      }

      const result = await smartMatchEngine.processMatch(immediateRequest, 'demo-customer')
      
      // Verify sorting by response time for immediate requests
      for (let i = 0; i < result.matches.length - 1; i++) {
        expect(result.matches[i].response_time_hours)
          .toBeLessThanOrEqual(result.matches[i + 1].response_time_hours)
      }
    })

    it('should sort by match score for non-immediate urgency', async () => {
      const flexibleRequest = {
        ...mockRequest,
        urgency: 'flexible' as const
      }

      const result = await smartMatchEngine.processMatch(flexibleRequest, 'demo-customer')
      
      // Verify sorting by match score for non-immediate requests
      for (let i = 0; i < result.matches.length - 1; i++) {
        expect(result.matches[i].match_score)
          .toBeGreaterThanOrEqual(result.matches[i + 1].match_score)
      }
    })

    it('should handle different locations correctly', async () => {
      const locations = ['Houston', 'Beaumont', 'Port Arthur', 'Corpus Christi', 'Galveston']
      
      for (const location of locations) {
        const request = { ...mockRequest, location }
        const result = await smartMatchEngine.processMatch(request, 'demo-customer')
        
        expect(result.location_center).toBeDefined()
        expect(result.location_center.lat).toBeTypeOf('number')
        expect(result.location_center.lng).toBeTypeOf('number')
      }
    })

    it('should fallback to Houston coordinates for unknown locations', async () => {
      const unknownLocationRequest = {
        ...mockRequest,
        location: 'Unknown City'
      }

      const result = await smartMatchEngine.processMatch(unknownLocationRequest, 'demo-customer')
      
      // Should default to Houston coordinates
      expect(result.location_center).toEqual({ lat: 29.7604, lng: -95.3698 })
    })

    it('should handle equipment type in vendor titles', async () => {
      const equipmentTypes = ['Steam Boiler', 'Frac Tank', 'Safety Equipment']
      
      for (const equipmentType of equipmentTypes) {
        const request = { ...mockRequest, equipment_type: equipmentType }
        const result = await smartMatchEngine.processMatch(request, 'demo-customer')
        
        result.matches.forEach(match => {
          expect(match.equipment_title).toContain(equipmentType)
        })
      }
    })

    it('should handle database failures gracefully', async () => {
      // Mock Supabase to fail
      vi.doMock('@/integrations/supabase/client', () => ({
        supabase: {
          from: vi.fn(() => ({
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: { message: 'Database error' }
                }))
              }))
            }))
          }))
        }
      }))

      const result = await smartMatchEngine.processMatch(mockRequest, 'user-123')
      
      // Should still return results even with database failure
      expect(result).toBeDefined()
      expect(result.matches).toHaveLength(4)
    })
  })

  describe('notifyVendors', () => {
    it('should notify vendors with match results', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const mockMatches = [{
        vendor_id: 'vendor-1',
        vendor_name: 'John Smith',
        company_name: 'Gulf Coast Equipment',
        equipment_id: 'eq-1',
        equipment_title: 'Steam Boiler - Industrial Grade',
        daily_rate: 450,
        distance_miles: 12,
        response_time_hours: 2,
        compliance_score: 95,
        performance_rating: 4.8,
        availability_status: 'available' as const,
        estimated_delivery: '2-3 hours',
        compliance_tags: ['TWIC', 'HAZMAT'],
        match_score: 96
      }]

      await smartMatchEngine.notifyVendors(mockMatches, mockRequest)

      expect(consoleSpy).toHaveBeenCalledWith('🚀 SmartMatch Notifications Sent:', {
        vendorCount: 1,
        equipment: 'Steam Boiler',
        location: 'Houston',
        urgency: 'today'
      })

      consoleSpy.mockRestore()
    })

    it('should handle notification delays', async () => {
      const startTime = Date.now()
      
      await smartMatchEngine.notifyVendors([], mockRequest)
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeGreaterThanOrEqual(500)
    })
  })

  describe('Vendor matching logic', () => {
    it('should return all required vendor properties', async () => {
      const result = await smartMatchEngine.processMatch(mockRequest, 'demo-customer')

      result.matches.forEach(vendor => {
        expect(vendor).toHaveProperty('vendor_id')
        expect(vendor).toHaveProperty('vendor_name')
        expect(vendor).toHaveProperty('company_name')
        expect(vendor).toHaveProperty('equipment_id')
        expect(vendor).toHaveProperty('equipment_title')
        expect(vendor).toHaveProperty('daily_rate')
        expect(vendor).toHaveProperty('distance_miles')
        expect(vendor).toHaveProperty('response_time_hours')
        expect(vendor).toHaveProperty('compliance_score')
        expect(vendor).toHaveProperty('performance_rating')
        expect(vendor).toHaveProperty('availability_status')
        expect(vendor).toHaveProperty('estimated_delivery')
        expect(vendor).toHaveProperty('compliance_tags')
        expect(vendor).toHaveProperty('match_score')
      })
    })

    it('should maintain realistic compliance scores', async () => {
      const result = await smartMatchEngine.processMatch(mockRequest, 'demo-customer')

      result.matches.forEach(vendor => {
        expect(vendor.compliance_score).toBeGreaterThanOrEqual(80)
        expect(vendor.compliance_score).toBeLessThanOrEqual(100)
      })
    })

    it('should maintain realistic performance ratings', async () => {
      const result = await smartMatchEngine.processMatch(mockRequest, 'demo-customer')

      result.matches.forEach(vendor => {
        expect(vendor.performance_rating).toBeGreaterThanOrEqual(4.0)
        expect(vendor.performance_rating).toBeLessThanOrEqual(5.0)
      })
    })

    it('should have reasonable distance ranges for Houston area', async () => {
      const result = await smartMatchEngine.processMatch(mockRequest, 'demo-customer')

      result.matches.forEach(vendor => {
        expect(vendor.distance_miles).toBeGreaterThan(0)
        expect(vendor.distance_miles).toBeLessThanOrEqual(50) // Reasonable for Houston metro
      })
    })

    it('should validate compliance tags are industrial standards', async () => {
      const result = await smartMatchEngine.processMatch(mockRequest, 'demo-customer')
      const validTags = ['TWIC', 'HAZMAT', 'API-653', 'ISNET', 'OSHA-30', 'PEC-SafeLand', 'API-570', 'ASME']

      result.matches.forEach(vendor => {
        vendor.compliance_tags.forEach(tag => {
          expect(validTags).toContain(tag)
        })
      })
    })
  })

  describe('Performance requirements', () => {
    it('should complete processing within 2 seconds', async () => {
      const startTime = Date.now()
      
      await smartMatchEngine.processMatch(mockRequest, 'demo-customer')
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(2000)
    })

    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () => 
        smartMatchEngine.processMatch(mockRequest, 'demo-customer')
      )

      const results = await Promise.all(requests)
      
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result.matches).toHaveLength(4)
      })
    })
  })
})