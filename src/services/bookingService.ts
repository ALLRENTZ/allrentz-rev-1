import { Booking, Equipment, User, Company } from '@/repositories/interfaces';
import { BookingCsvRepository } from '@/repositories/csv/BookingCsvRepository';
import { EquipmentCsvRepository } from '@/repositories/csv/EquipmentCsvRepository';
import { UserCsvRepository } from '@/repositories/csv/UserCsvRepository';
import { CompanyCsvRepository } from '@/repositories/csv/CompanyCsvRepository';

export interface CreateBookingRequest {
  customer_id: string;
  equipment_id: string;
  start_date: string;
  end_date: string;
  location: string;
  requirements?: Record<string, any>;
}

export interface BookingDetails extends Booking {
  equipment?: Equipment;
  customer?: User;
  vendor?: User;
  vendor_company?: Company;
}

export interface BookingStatusUpdate {
  id: string;
  status: Booking['status'];
  notes?: string;
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  active: number;
  completed: number;
  cancelled: number;
  revenue: number;
  averageDuration: number;
}

export interface BookingFilters {
  status?: Booking['status'];
  customer_id?: string;
  vendor_id?: string;
  equipment_id?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export class BookingService {
  private bookingRepository: BookingCsvRepository;
  private equipmentRepository: EquipmentCsvRepository;
  private userRepository: UserCsvRepository;
  private companyRepository: CompanyCsvRepository;

  constructor(
    bookingRepository: BookingCsvRepository,
    equipmentRepository: EquipmentCsvRepository,
    userRepository: UserCsvRepository,
    companyRepository: CompanyCsvRepository
  ) {
    this.bookingRepository = bookingRepository;
    this.equipmentRepository = equipmentRepository;
    this.userRepository = userRepository;
    this.companyRepository = companyRepository;
  }

  // Create new booking
  async createBooking(request: CreateBookingRequest): Promise<BookingDetails> {
    // Validate equipment availability
    const equipment = await this.equipmentRepository.getById(request.equipment_id);
    if (!equipment) {
      throw new Error('Equipment not found');
    }

    if (equipment.availability_status !== 'available') {
      throw new Error('Equipment is not available');
    }

    // Get customer details
    const customer = await this.userRepository.getById(request.customer_id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate rental duration and cost
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (durationDays <= 0) {
      throw new Error('End date must be after start date');
    }

    const totalAmount = equipment.daily_rate * durationDays;

    // Create booking
    const bookingData = {
      customer_id: request.customer_id,
      equipment_id: request.equipment_id,
      vendor_id: equipment.vendor_id,
      status: 'pending' as const,
      start_date: request.start_date,
      end_date: request.end_date,
      daily_rate: equipment.daily_rate,
      total_amount: totalAmount,
      location: request.location,
      requirements: request.requirements || {}
    };

    const booking = await this.bookingRepository.create(bookingData);

    // Update equipment availability
    await this.equipmentRepository.updateAvailability(
      equipment.id,
      'reserved',
      request.end_date
    );

    return await this.enrichBookingDetails(booking);
  }

  // Get booking with full details
  async getBookingById(id: string): Promise<BookingDetails | null> {
    const booking = await this.bookingRepository.getById(id);
    if (!booking) return null;

    return await this.enrichBookingDetails(booking);
  }

  // Get bookings for a customer
  async getCustomerBookings(customerId: string, filters?: BookingFilters): Promise<BookingDetails[]> {
    let bookings = await this.bookingRepository.getByCustomer(customerId);
    
    bookings = this.applyFilters(bookings, filters);
    
    return await Promise.all(
      bookings.map(booking => this.enrichBookingDetails(booking))
    );
  }

  // Get bookings for a vendor
  async getVendorBookings(vendorId: string, filters?: BookingFilters): Promise<BookingDetails[]> {
    let bookings = await this.bookingRepository.getByVendor(vendorId);
    
    bookings = this.applyFilters(bookings, filters);
    
    return await Promise.all(
      bookings.map(booking => this.enrichBookingDetails(booking))
    );
  }

  // Get bookings by status
  async getBookingsByStatus(status: Booking['status']): Promise<BookingDetails[]> {
    const bookings = await this.bookingRepository.getByStatus(status);
    
    return await Promise.all(
      bookings.map(booking => this.enrichBookingDetails(booking))
    );
  }

  // Update booking status
  async updateBookingStatus(update: BookingStatusUpdate): Promise<BookingDetails | null> {
    const booking = await this.bookingRepository.getById(update.id);
    if (!booking) return null;

    const updatedBooking = await this.bookingRepository.updateStatus(update.id, update.status);
    if (!updatedBooking) return null;

    // Handle equipment availability updates based on status
    await this.handleEquipmentAvailabilityForStatusChange(updatedBooking, booking.status);

    return await this.enrichBookingDetails(updatedBooking);
  }

  // Confirm booking (vendor accepts)
  async confirmBooking(bookingId: string): Promise<BookingDetails | null> {
    const booking = await this.bookingRepository.getById(bookingId);
    if (!booking || booking.status !== 'pending') {
      throw new Error('Booking cannot be confirmed');
    }

    const confirmedBooking = await this.bookingRepository.updateStatus(bookingId, 'confirmed');
    if (!confirmedBooking) return null;

    // Update confirmed timestamp
    const updatedBooking = await this.bookingRepository.update(bookingId, {
      confirmed_at: new Date().toISOString()
    });

    return updatedBooking ? await this.enrichBookingDetails(updatedBooking) : null;
  }

  // Cancel booking
  async cancelBooking(bookingId: string, reason?: string): Promise<BookingDetails | null> {
    const booking = await this.bookingRepository.getById(bookingId);
    if (!booking) return null;

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new Error('Booking cannot be cancelled');
    }

    const cancelledBooking = await this.bookingRepository.updateStatus(bookingId, 'cancelled');
    if (!cancelledBooking) return null;

    // Free up the equipment
    await this.equipmentRepository.updateAvailability(
      booking.equipment_id,
      'available'
    );

    // Add cancellation reason to requirements
    if (reason) {
      await this.bookingRepository.update(bookingId, {
        requirements: {
          ...booking.requirements,
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString()
        }
      });
    }

    return await this.enrichBookingDetails(cancelledBooking);
  }

  // Get upcoming bookings for user
  async getUpcomingBookings(userId: string, userRole: string): Promise<BookingDetails[]> {
    const bookings = await this.bookingRepository.getUpcoming(userId, userRole);
    
    return await Promise.all(
      bookings.map(booking => this.enrichBookingDetails(booking))
    );
  }

  // Get bookings in date range
  async getBookingsInDateRange(startDate: string, endDate: string): Promise<BookingDetails[]> {
    const bookings = await this.bookingRepository.getByDateRange(startDate, endDate);
    
    return await Promise.all(
      bookings.map(booking => this.enrichBookingDetails(booking))
    );
  }

  // Get booking statistics
  async getBookingStats(filters?: BookingFilters): Promise<BookingStats> {
    const allBookings = await this.bookingRepository.getAll();
    let filteredBookings = this.applyFilters(allBookings.data, filters);

    const stats: BookingStats = {
      total: filteredBookings.length,
      pending: filteredBookings.filter(b => b.status === 'pending').length,
      confirmed: filteredBookings.filter(b => b.status === 'confirmed').length,
      active: filteredBookings.filter(b => b.status === 'active').length,
      completed: filteredBookings.filter(b => b.status === 'completed').length,
      cancelled: filteredBookings.filter(b => b.status === 'cancelled').length,
      revenue: filteredBookings
        .filter(b => b.status === 'completed')
        .reduce((total, b) => total + b.total_amount, 0),
      averageDuration: 0
    };

    // Calculate average duration
    if (stats.total > 0) {
      const totalDuration = filteredBookings.reduce((total, booking) => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return total + duration;
      }, 0);
      
      stats.averageDuration = totalDuration / stats.total;
    }

    return stats;
  }

  // Search bookings
  async searchBookings(query: string, fields: string[]): Promise<BookingDetails[]> {
    const bookings = await this.bookingRepository.search(query, fields);
    
    return await Promise.all(
      bookings.map(booking => this.enrichBookingDetails(booking))
    );
  }

  // Private helper methods

  private async enrichBookingDetails(booking: Booking): Promise<BookingDetails> {
    const [equipment, customer, vendor, vendorCompany] = await Promise.all([
      this.equipmentRepository.getById(booking.equipment_id),
      this.userRepository.getById(booking.customer_id),
      this.userRepository.getById(booking.vendor_id),
      this.getVendorCompany(booking.vendor_id)
    ]);

    return {
      ...booking,
      equipment: equipment || undefined,
      customer: customer || undefined,
      vendor: vendor || undefined,
      vendor_company: vendorCompany || undefined
    };
  }

  private async getVendorCompany(vendorId: string): Promise<Company | null> {
    try {
      const vendor = await this.userRepository.getById(vendorId);
      if (vendor?.company_id) {
        return await this.companyRepository.getById(vendor.company_id);
      }
    } catch (error) {
      console.warn('Could not fetch vendor company:', error);
    }
    return null;
  }

  private applyFilters(bookings: Booking[], filters?: BookingFilters): Booking[] {
    if (!filters) return bookings;

    return bookings.filter(booking => {
      if (filters.status && booking.status !== filters.status) return false;
      if (filters.customer_id && booking.customer_id !== filters.customer_id) return false;
      if (filters.vendor_id && booking.vendor_id !== filters.vendor_id) return false;
      if (filters.equipment_id && booking.equipment_id !== filters.equipment_id) return false;
      if (filters.location && !booking.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      
      if (filters.date_range) {
        const bookingStart = new Date(booking.start_date);
        const filterStart = new Date(filters.date_range.start);
        const filterEnd = new Date(filters.date_range.end);
        
        if (bookingStart < filterStart || bookingStart > filterEnd) return false;
      }
      
      return true;
    });
  }

  private async handleEquipmentAvailabilityForStatusChange(
    booking: Booking, 
    oldStatus: Booking['status']
  ): Promise<void> {
    switch (booking.status) {
      case 'confirmed':
        if (oldStatus === 'pending') {
          // Keep equipment reserved
          await this.equipmentRepository.updateAvailability(
            booking.equipment_id,
            'reserved',
            booking.end_date
          );
        }
        break;
      
      case 'active':
        // Equipment is now in use
        await this.equipmentRepository.updateAvailability(
          booking.equipment_id,
          'maintenance', // or a custom 'in_use' status if you add it
          booking.end_date
        );
        break;
      
      case 'completed':
        // Free up equipment
        await this.equipmentRepository.updateAvailability(
          booking.equipment_id,
          'available'
        );
        break;
      
      case 'cancelled':
        // Free up equipment
        await this.equipmentRepository.updateAvailability(
          booking.equipment_id,
          'available'
        );
        break;
    }
  }
}

// Default service instance factory
export const createBookingService = (
  bookingRepository: BookingCsvRepository,
  equipmentRepository: EquipmentCsvRepository,
  userRepository: UserCsvRepository,
  companyRepository: CompanyCsvRepository
) => {
  return new BookingService(
    bookingRepository,
    equipmentRepository,
    userRepository,
    companyRepository
  );
};