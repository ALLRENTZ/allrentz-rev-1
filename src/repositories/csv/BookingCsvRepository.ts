// Booking-specific CSV repository implementation

import { CsvRepository } from './CsvRepository';
import { Booking, BookingRepository } from '../interfaces';

export class BookingCsvRepository extends CsvRepository<Booking> implements BookingRepository {
  constructor() {
    super('bookings.csv');
  }

  async getByCustomer(customerId: string): Promise<Booking[]> {
    return this.findBy({ customer_id: customerId });
  }

  async getByVendor(vendorId: string): Promise<Booking[]> {
    return this.findBy({ vendor_id: vendorId });
  }

  async getByEquipment(equipmentId: string): Promise<Booking[]> {
    return this.findBy({ equipment_id: equipmentId });
  }

  async getByStatus(status: Booking['status']): Promise<Booking[]> {
    return this.findBy({ status });
  }

  async getByDateRange(startDate: string, endDate: string): Promise<Booking[]> {
    const bookings = await this.readAll();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return bookings.filter(booking => {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);
      
      // Check if booking overlaps with date range
      return bookingStart <= end && bookingEnd >= start;
    });
  }

  async updateStatus(id: string, status: Booking['status']): Promise<Booking | null> {
    const updates: any = { status };
    
    // Set confirmed_at timestamp when status changes to confirmed
    if (status === 'confirmed') {
      updates.confirmed_at = this.getCurrentTimestamp();
    }
    
    return this.update(id, updates);
  }

  async getUpcoming(userId: string, userRole: string): Promise<Booking[]> {
    const bookings = await this.readAll();
    const now = new Date();
    
    return bookings.filter(booking => {
      // Filter by user role
      const isUserBooking = userRole === 'customer' 
        ? booking.customer_id === userId
        : booking.vendor_id === userId;
      
      if (!isUserBooking) return false;
      
      // Only include upcoming bookings
      const startDate = new Date(booking.start_date);
      return startDate > now && ['confirmed', 'active'].includes(booking.status);
    }).sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
  }
}