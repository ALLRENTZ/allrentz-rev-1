import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  calculateDistance,
  findNearbyIndustrialFacilities,
  filterByDeliveryRadius,
  isInTWICZone,
  getComplianceRequirements,
  type Location,
  type IndustrialFacility
} from './geographicIntelligence'

describe('Geographic Intelligence System', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Houston to Dallas (approximately 240 miles)
      const houston: Location = { lat: 29.7604, lng: -95.3698 }
      const dallas: Location = { lat: 32.7767, lng: -96.7970 }
      
      const distance = calculateDistance(houston, dallas)
      
      // Allow for some variance due to Earth's curvature calculations
      expect(distance).toBeGreaterThan(200)
      expect(distance).toBeLessThan(280)
    })

    it('should return 0 for identical locations', () => {
      const location: Location = { lat: 29.7604, lng: -95.3698 }
      
      const distance = calculateDistance(location, location)
      
      expect(distance).toBe(0)
    })

    it('should handle negative coordinates', () => {
      const location1: Location = { lat: -33.8688, lng: 151.2093 } // Sydney
      const location2: Location = { lat: -37.8136, lng: 144.9631 } // Melbourne
      
      const distance = calculateDistance(location1, location2)
      
      expect(distance).toBeGreaterThan(700)
      expect(distance).toBeLessThan(900)
    })

    it('should handle coordinates across the prime meridian', () => {
      const london: Location = { lat: 51.5074, lng: -0.1278 }
      const paris: Location = { lat: 48.8566, lng: 2.3522 }
      
      const distance = calculateDistance(london, paris)
      
      expect(distance).toBeGreaterThan(300)
      expect(distance).toBeLessThan(400)
    })
  })

  describe('findNearbyIndustrialFacilities', () => {
    it('should find facilities within specified radius', () => {
      const houstonDowntown: Location = { lat: 29.7604, lng: -95.3698 }
      const radius = 50 // miles
      
      const facilities = findNearbyIndustrialFacilities(houstonDowntown, radius)
      
      expect(facilities).toBeInstanceOf(Array)
      expect(facilities.length).toBeGreaterThan(0)
      
      facilities.forEach(facility => {
        expect(facility.distance).toBeLessThanOrEqual(radius)
        expect(facility).toHaveProperty('name')
        expect(facility).toHaveProperty('type')
        expect(facility).toHaveProperty('location')
        expect(facility).toHaveProperty('complianceZone')
      })
    })

    it('should sort facilities by distance', () => {
      const houstonDowntown: Location = { lat: 29.7604, lng: -95.3698 }
      const radius = 100
      
      const facilities = findNearbyIndustrialFacilities(houstonDowntown, radius)
      
      // Verify sorted by distance
      for (let i = 0; i < facilities.length - 1; i++) {
        expect(facilities[i].distance).toBeLessThanOrEqual(facilities[i + 1].distance)
      }
    })

    it('should return empty array for very small radius', () => {
      const houstonDowntown: Location = { lat: 29.7604, lng: -95.3698 }
      const radius = 0.1 // very small radius
      
      const facilities = findNearbyIndustrialFacilities(houstonDowntown, radius)
      
      expect(facilities).toHaveLength(0)
    })

    it('should include Gulf Coast refineries in Houston area search', () => {
      const houstonShipChannel: Location = { lat: 29.7372, lng: -95.2719 }
      const radius = 30
      
      const facilities = findNearbyIndustrialFacilities(houstonShipChannel, radius)
      
      const refineryNames = facilities.map(f => f.name)
      expect(refineryNames.some(name => name.includes('Refinery'))).toBe(true)
    })

    it('should categorize different facility types correctly', () => {
      const houstonArea: Location = { lat: 29.7604, lng: -95.3698 }
      const radius = 50
      
      const facilities = findNearbyIndustrialFacilities(houstonArea, radius)
      const facilityTypes = [...new Set(facilities.map(f => f.type))]
      
      const expectedTypes = ['refinery', 'petrochemical', 'terminal', 'port']
      expectedTypes.forEach(expectedType => {
        expect(facilityTypes.some(type => 
          type.toLowerCase().includes(expectedType)
        )).toBe(true)
      })
    })
  })

  describe('filterByDeliveryRadius', () => {
    let mockEquipment: Array<{ id: string; location: Location; name: string }>

    beforeEach(() => {
      mockEquipment = [
        { id: '1', location: { lat: 29.7604, lng: -95.3698 }, name: 'Houston Equipment' },
        { id: '2', location: { lat: 30.0686, lng: -94.1257 }, name: 'Beaumont Equipment' },
        { id: '3', location: { lat: 32.7767, lng: -96.7970 }, name: 'Dallas Equipment' },
        { id: '4', location: { lat: 27.8006, lng: -97.3964 }, name: 'Corpus Equipment' }
      ]
    })

    it('should filter equipment within delivery radius', () => {
      const customerLocation: Location = { lat: 29.7604, lng: -95.3698 } // Houston
      const radius = 100
      
      const filteredEquipment = filterByDeliveryRadius(mockEquipment, customerLocation, radius)
      
      expect(filteredEquipment.length).toBeLessThanOrEqual(mockEquipment.length)
      filteredEquipment.forEach(equipment => {
        const distance = calculateDistance(customerLocation, equipment.location)
        expect(distance).toBeLessThanOrEqual(radius)
      })
    })

    it('should include distance information in results', () => {
      const customerLocation: Location = { lat: 29.7604, lng: -95.3698 }
      const radius = 200
      
      const filteredEquipment = filterByDeliveryRadius(mockEquipment, customerLocation, radius)
      
      filteredEquipment.forEach(equipment => {
        expect(equipment).toHaveProperty('distance')
        expect(equipment.distance).toBeTypeOf('number')
        expect(equipment.distance).toBeGreaterThanOrEqual(0)
      })
    })

    it('should sort results by distance', () => {
      const customerLocation: Location = { lat: 29.7604, lng: -95.3698 }
      const radius = 500
      
      const filteredEquipment = filterByDeliveryRadius(mockEquipment, customerLocation, radius)
      
      for (let i = 0; i < filteredEquipment.length - 1; i++) {
        expect(filteredEquipment[i].distance).toBeLessThanOrEqual(filteredEquipment[i + 1].distance)
      }
    })

    it('should return empty array when no equipment is within radius', () => {
      const remoteLocation: Location = { lat: 40.7128, lng: -74.0060 } // New York
      const radius = 10 // Very small radius
      
      const filteredEquipment = filterByDeliveryRadius(mockEquipment, remoteLocation, radius)
      
      expect(filteredEquipment).toHaveLength(0)
    })
  })

  describe('isInTWICZone', () => {
    it('should identify TWIC-required zones correctly', () => {
      // Port of Houston locations should require TWIC
      const portLocation: Location = { lat: 29.7372, lng: -95.2719 }
      expect(isInTWICZone(portLocation)).toBe(true)
      
      // Galveston port should require TWIC
      const galvestonPort: Location = { lat: 29.3013, lng: -94.7977 }
      expect(isInTWICZone(galvestonPort)).toBe(true)
      
      // Beaumont port should require TWIC
      const beaumontPort: Location = { lat: 30.0686, lng: -94.1257 }
      expect(isInTWICZone(beaumontPort)).toBe(true)
    })

    it('should not require TWIC for inland locations', () => {
      // Houston downtown (away from port)
      const downtown: Location = { lat: 29.7604, lng: -95.3698 }
      expect(isInTWICZone(downtown)).toBe(false)
      
      // Austin (inland city)
      const austin: Location = { lat: 30.2672, lng: -97.7431 }
      expect(isInTWICZone(austin)).toBe(false)
    })

    it('should handle edge cases near TWIC zone boundaries', () => {
      // Location just outside typical port security perimeter
      const nearPort: Location = { lat: 29.75, lng: -95.25 }
      const result = isInTWICZone(nearPort)
      
      // Should be deterministic
      expect(typeof result).toBe('boolean')
    })
  })

  describe('getComplianceRequirements', () => {
    it('should return comprehensive compliance requirements for refinery locations', () => {
      const refineryLocation: Location = { lat: 29.7486, lng: -95.0586 } // Near refineries
      
      const requirements = getComplianceRequirements(refineryLocation)
      
      expect(requirements).toHaveProperty('twicRequired')
      expect(requirements).toHaveProperty('hazmatCertification')
      expect(requirements).toHaveProperty('isnetRequired')
      expect(requirements).toHaveProperty('additionalCertifications')
      expect(requirements).toHaveProperty('specialHandling')
      expect(requirements).toHaveProperty('environmentalRestrictions')
      
      expect(Array.isArray(requirements.additionalCertifications)).toBe(true)
      expect(Array.isArray(requirements.specialHandling)).toBe(true)
      expect(Array.isArray(requirements.environmentalRestrictions)).toBe(true)
    })

    it('should require TWIC for port and marine facility locations', () => {
      const portLocation: Location = { lat: 29.7372, lng: -95.2719 }
      
      const requirements = getComplianceRequirements(portLocation)
      
      expect(requirements.twicRequired).toBe(true)
    })

    it('should require HAZMAT certification for petrochemical areas', () => {
      const petrochemicalLocation: Location = { lat: 29.7486, lng: -95.0586 }
      
      const requirements = getComplianceRequirements(petrochemicalLocation)
      
      expect(requirements.hazmatCertification).toBe(true)
    })

    it('should include relevant API standards for oil and gas facilities', () => {
      const oilAndGasLocation: Location = { lat: 29.6516, lng: -95.1467 }
      
      const requirements = getComplianceRequirements(oilAndGasLocation)
      
      const apiStandards = requirements.additionalCertifications.filter(cert => 
        cert.includes('API')
      )
      expect(apiStandards.length).toBeGreaterThan(0)
    })

    it('should have minimal requirements for non-industrial locations', () => {
      const residentialLocation: Location = { lat: 29.8174, lng: -95.6814 } // Katy, TX
      
      const requirements = getComplianceRequirements(residentialLocation)
      
      expect(requirements.twicRequired).toBe(false)
      expect(requirements.hazmatCertification).toBe(false)
      expect(requirements.isnetRequired).toBe(false)
      expect(requirements.additionalCertifications).toHaveLength(0)
    })

    it('should provide environmental restrictions for sensitive areas', () => {
      const coastalLocation: Location = { lat: 29.3013, lng: -94.7977 }
      
      const requirements = getComplianceRequirements(coastalLocation)
      
      expect(requirements.environmentalRestrictions.length).toBeGreaterThan(0)
      expect(requirements.environmentalRestrictions.some(restriction => 
        restriction.includes('water') || restriction.includes('marine')
      )).toBe(true)
    })
  })

  describe('Performance and scalability', () => {
    it('should handle large datasets efficiently', () => {
      const startTime = Date.now()
      const testLocation: Location = { lat: 29.7604, lng: -95.3698 }
      
      // Test with large radius to get more results
      const facilities = findNearbyIndustrialFacilities(testLocation, 200)
      
      const endTime = Date.now()
      const processingTime = endTime - startTime
      
      expect(processingTime).toBeLessThan(100) // Should complete within 100ms
      expect(facilities.length).toBeGreaterThan(0)
    })

    it('should handle multiple concurrent requests', async () => {
      const testLocation: Location = { lat: 29.7604, lng: -95.3698 }
      
      const requests = Array.from({ length: 10 }, () => 
        Promise.resolve(findNearbyIndustrialFacilities(testLocation, 50))
      )
      
      const results = await Promise.all(requests)
      
      expect(results).toHaveLength(10)
      results.forEach(facilities => {
        expect(facilities.length).toBeGreaterThan(0)
      })
    })

    it('should maintain consistent results for same inputs', () => {
      const testLocation: Location = { lat: 29.7604, lng: -95.3698 }
      const radius = 50
      
      const result1 = findNearbyIndustrialFacilities(testLocation, radius)
      const result2 = findNearbyIndustrialFacilities(testLocation, radius)
      
      expect(result1).toEqual(result2)
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle invalid coordinates gracefully', () => {
      const invalidLocation: Location = { lat: 999, lng: 999 }
      
      expect(() => findNearbyIndustrialFacilities(invalidLocation, 50)).not.toThrow()
      expect(() => getComplianceRequirements(invalidLocation)).not.toThrow()
    })

    it('should handle negative radius values', () => {
      const testLocation: Location = { lat: 29.7604, lng: -95.3698 }
      
      const facilities = findNearbyIndustrialFacilities(testLocation, -10)
      
      expect(facilities).toHaveLength(0)
    })

    it('should handle zero radius', () => {
      const testLocation: Location = { lat: 29.7604, lng: -95.3698 }
      
      const facilities = findNearbyIndustrialFacilities(testLocation, 0)
      
      expect(facilities).toHaveLength(0)
    })

    it('should handle extremely large radius values', () => {
      const testLocation: Location = { lat: 29.7604, lng: -95.3698 }
      
      expect(() => findNearbyIndustrialFacilities(testLocation, 10000)).not.toThrow()
    })
  })
})