// Equipment-specific CSV repository implementation

import { CsvRepository } from './CsvRepository';
import { Equipment, EquipmentRepository } from '../interfaces';

export class EquipmentCsvRepository extends CsvRepository<Equipment> implements EquipmentRepository {
  constructor() {
    super('equipment.csv');
  }

  async getByCategory(category: string): Promise<Equipment[]> {
    return this.findBy({ category });
  }

  async getByVendor(vendorId: string): Promise<Equipment[]> {
    return this.findBy({ vendor_id: vendorId });
  }

  async getAvailable(): Promise<Equipment[]> {
    return this.findBy({ availability_status: 'available' });
  }

  async searchByLocation(location: string, radiusMiles: number = 50): Promise<Equipment[]> {
    // For CSV implementation, we'll do a simple text match on location
    // In Supabase implementation, we'd use PostGIS for proper geo queries
    const equipment = await this.readAll();
    const searchLocation = location.toLowerCase();
    
    return equipment.filter(eq => 
      eq.location.toLowerCase().includes(searchLocation)
    );
  }

  async getByCompliance(certifications: string[]): Promise<Equipment[]> {
    const equipment = await this.readAll();
    
    return equipment.filter(eq => {
      const equipmentCerts = eq.compliance?.certifications || [];
      return certifications.some(cert => 
        equipmentCerts.includes(cert)
      );
    });
  }

  async updateAvailability(
    id: string, 
    status: Equipment['availability_status'], 
    nextAvailable?: string
  ): Promise<Equipment | null> {
    const updates: any = { availability_status: status };
    if (nextAvailable) {
      updates.next_available = nextAvailable;
    }
    
    return this.update(id, updates);
  }
}