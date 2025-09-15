import { EquipmentRepository } from '@/repositories/EquipmentCsvRepository';
import { BookingRepository } from '@/repositories/BookingCsvRepository';
import { RepositoryFactory } from '@/repositories/RepositoryFactory';
import { Equipment, Booking } from '@/repositories/interfaces';

export interface EquipmentStatus {
  equipment_id: string;
  status: 'available' | 'rented' | 'maintenance' | 'transit' | 'reserved';
  current_booking_id?: string;
  location: string;
  last_updated: string;
  estimated_return_date?: string;
  next_maintenance_date?: string;
  utilization_rate: number;
  condition_score: number;
}

export interface ReturnSchedule {
  equipment_id: string;
  equipment_name: string;
  category: string;
  current_booking_id: string;
  customer_name: string;
  customer_company: string;
  scheduled_return_date: string;
  actual_return_date?: string;
  return_location: string;
  condition_on_return?: 'excellent' | 'good' | 'fair' | 'needs_repair';
  days_until_return: number;
  is_overdue: boolean;
  notes?: string;
}

export interface AvailabilityForecast {
  equipment_id: string;
  equipment_name: string;
  category: string;
  available_dates: DateRange[];
  upcoming_bookings: {
    booking_id: string;
    customer: string;
    start_date: string;
    end_date: string;
    duration_days: number;
  }[];
  utilization_percentage: number;
  revenue_projection: number;
}

export interface DateRange {
  start_date: string;
  end_date: string;
  duration_days: number;
}

export interface EquipmentUtilization {
  equipment_id: string;
  equipment_name: string;
  category: string;
  total_days_in_period: number;
  days_rented: number;
  days_available: number;
  days_maintenance: number;
  utilization_rate: number;
  revenue_generated: number;
  avg_daily_rate: number;
  booking_count: number;
}

export interface MaintenanceAlert {
  equipment_id: string;
  equipment_name: string;
  alert_type: 'due' | 'overdue' | 'scheduled' | 'emergency';
  maintenance_type: 'routine' | 'repair' | 'inspection' | 'certification';
  due_date: string;
  days_overdue?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimated_cost: number;
  estimated_downtime_hours: number;
}

export class EquipmentTrackingService {
  private equipmentRepository: EquipmentRepository;
  private bookingRepository: BookingRepository;

  constructor() {
    this.equipmentRepository = RepositoryFactory.getEquipmentRepository();
    this.bookingRepository = RepositoryFactory.getBookingRepository();
  }

  async getEquipmentStatus(equipmentId: string): Promise<EquipmentStatus | null> {
    const equipment = await this.equipmentRepository.getById(equipmentId);
    if (!equipment) return null;

    const activeBookings = await this.bookingRepository.findBy({
      equipment_id: equipmentId,
      status: 'active'
    });

    const currentBooking = activeBookings[0];
    const now = new Date();

    // Calculate utilization rate (last 90 days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const recentBookings = await this.bookingRepository.findBy({
      equipment_id: equipmentId
    });

    const recentRentals = recentBookings.filter(booking => {
      const startDate = new Date(booking.start_date);
      return startDate >= ninetyDaysAgo && booking.status === 'completed';
    });

    const totalRentalDays = recentRentals.reduce((total, booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      return total + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);

    const utilizationRate = (totalRentalDays / 90) * 100;

    // Determine current status
    let status: EquipmentStatus['status'] = 'available';
    if (currentBooking) {
      status = 'rented';
    } else if (equipment.availability_status === 'maintenance') {
      status = 'maintenance';
    } else if (equipment.availability_status === 'out_of_service') {
      status = 'maintenance';
    }

    // Get next maintenance date (simulate based on usage)
    const lastMaintenanceDate = equipment.last_maintenance_date ? 
      new Date(equipment.last_maintenance_date) : 
      new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 6 months ago if no record

    const nextMaintenanceDate = new Date(lastMaintenanceDate.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months from last

    return {
      equipment_id: equipmentId,
      status,
      current_booking_id: currentBooking?.id,
      location: equipment.location || 'Houston, TX',
      last_updated: now.toISOString(),
      estimated_return_date: currentBooking?.end_date,
      next_maintenance_date: nextMaintenanceDate.toISOString(),
      utilization_rate: Math.round(utilizationRate),
      condition_score: equipment.condition_score || 85
    };
  }

  async getReturnSchedule(vendorId?: string, daysAhead: number = 30): Promise<ReturnSchedule[]> {
    const now = new Date();
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Get all active bookings with return dates in the specified range
    const activeBookings = await this.bookingRepository.findBy({ status: 'active' });
    
    const upcomingReturns = activeBookings.filter(booking => {
      const returnDate = new Date(booking.end_date);
      return returnDate >= now && returnDate <= endDate;
    });

    const returnSchedules: ReturnSchedule[] = [];

    for (const booking of upcomingReturns) {
      const equipment = await this.equipmentRepository.getById(booking.equipment_id);
      if (!equipment || (vendorId && equipment.vendor_id !== vendorId)) continue;

      const returnDate = new Date(booking.end_date);
      const daysUntilReturn = Math.ceil((returnDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntilReturn < 0;

      returnSchedules.push({
        equipment_id: booking.equipment_id,
        equipment_name: equipment.name,
        category: equipment.category,
        current_booking_id: booking.id,
        customer_name: booking.customer_name || 'Unknown Customer',
        customer_company: booking.customer_company || 'Unknown Company',
        scheduled_return_date: booking.end_date,
        return_location: equipment.location || 'Houston, TX',
        days_until_return: daysUntilReturn,
        is_overdue: isOverdue,
        notes: booking.special_requirements
      });
    }

    return returnSchedules.sort((a, b) => a.days_until_return - b.days_until_return);
  }

  async getAvailabilityForecast(equipmentId: string, daysAhead: number = 90): Promise<AvailabilityForecast | null> {
    const equipment = await this.equipmentRepository.getById(equipmentId);
    if (!equipment) return null;

    const now = new Date();
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Get all future bookings for this equipment
    const futureBookings = await this.bookingRepository.findBy({
      equipment_id: equipmentId
    });

    const relevantBookings = futureBookings.filter(booking => {
      const startDate = new Date(booking.start_date);
      return startDate <= endDate && (booking.status === 'confirmed' || booking.status === 'active');
    }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    // Calculate available date ranges
    const availableDates: DateRange[] = [];
    let currentDate = now;

    for (const booking of relevantBookings) {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);

      // If there's a gap before this booking, it's available
      if (currentDate < bookingStart) {
        const duration = Math.ceil((bookingStart.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (duration > 0) {
          availableDates.push({
            start_date: currentDate.toISOString().split('T')[0],
            end_date: bookingStart.toISOString().split('T')[0],
            duration_days: duration
          });
        }
      }

      currentDate = new Date(Math.max(currentDate.getTime(), bookingEnd.getTime() + 24 * 60 * 60 * 1000));
    }

    // Add remaining time if equipment is free until end of forecast period
    if (currentDate < endDate) {
      const duration = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (duration > 0) {
        availableDates.push({
          start_date: currentDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          duration_days: duration
        });
      }
    }

    // Calculate utilization and revenue projection
    const totalDays = daysAhead;
    const bookedDays = relevantBookings.reduce((total, booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      const startInRange = Math.max(start.getTime(), now.getTime());
      const endInRange = Math.min(end.getTime(), endDate.getTime());
      return total + Math.ceil((endInRange - startInRange) / (1000 * 60 * 60 * 24));
    }, 0);

    const utilizationPercentage = Math.round((bookedDays / totalDays) * 100);
    const dailyRate = equipment.daily_rate || 0;
    const revenueProjection = bookedDays * dailyRate;

    return {
      equipment_id: equipmentId,
      equipment_name: equipment.name,
      category: equipment.category,
      available_dates: availableDates,
      upcoming_bookings: relevantBookings.map(booking => ({
        booking_id: booking.id,
        customer: booking.customer_name || 'Unknown',
        start_date: booking.start_date,
        end_date: booking.end_date,
        duration_days: Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24))
      })),
      utilization_percentage: utilizationPercentage,
      revenue_projection: revenueProjection
    };
  }

  async getEquipmentUtilization(vendorId?: string, days: number = 90): Promise<EquipmentUtilization[]> {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get all equipment for the vendor
    const allEquipment = vendorId ? 
      await this.equipmentRepository.getByVendor(vendorId) :
      await this.equipmentRepository.getAll();

    const utilizations: EquipmentUtilization[] = [];

    for (const equipment of allEquipment) {
      // Get bookings for this equipment in the time period
      const bookings = await this.bookingRepository.findBy({
        equipment_id: equipment.id
      });

      const relevantBookings = bookings.filter(booking => {
        const bookingStart = new Date(booking.start_date);
        const bookingEnd = new Date(booking.end_date);
        return bookingEnd >= startDate && bookingStart <= now && booking.status === 'completed';
      });

      // Calculate rental days
      const totalRentalDays = relevantBookings.reduce((total, booking) => {
        const start = Math.max(new Date(booking.start_date).getTime(), startDate.getTime());
        const end = Math.min(new Date(booking.end_date).getTime(), now.getTime());
        return total + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      }, 0);

      // Calculate maintenance days (estimate based on status)
      const maintenanceDays = equipment.availability_status === 'maintenance' ? 
        Math.floor(days * 0.05) : // 5% for maintenance
        Math.floor(days * 0.02);  // 2% for routine maintenance

      const availableDays = days - totalRentalDays - maintenanceDays;
      const utilizationRate = (totalRentalDays / days) * 100;

      // Calculate revenue
      const revenueGenerated = relevantBookings.reduce((total, booking) => {
        const duration = Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24));
        return total + (duration * (equipment.daily_rate || 0));
      }, 0);

      const avgDailyRate = totalRentalDays > 0 ? revenueGenerated / totalRentalDays : equipment.daily_rate || 0;

      utilizations.push({
        equipment_id: equipment.id,
        equipment_name: equipment.name,
        category: equipment.category,
        total_days_in_period: days,
        days_rented: totalRentalDays,
        days_available: Math.max(0, availableDays),
        days_maintenance: maintenanceDays,
        utilization_rate: Math.round(utilizationRate),
        revenue_generated: revenueGenerated,
        avg_daily_rate: avgDailyRate,
        booking_count: relevantBookings.length
      });
    }

    return utilizations.sort((a, b) => b.utilization_rate - a.utilization_rate);
  }

  async getMaintenanceAlerts(vendorId?: string): Promise<MaintenanceAlert[]> {
    const now = new Date();
    const allEquipment = vendorId ? 
      await this.equipmentRepository.getByVendor(vendorId) :
      await this.equipmentRepository.getAll();

    const alerts: MaintenanceAlert[] = [];

    for (const equipment of allEquipment) {
      // Check last maintenance date
      const lastMaintenanceDate = equipment.last_maintenance_date ? 
        new Date(equipment.last_maintenance_date) : 
        new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // Default to 6 months ago

      const daysSinceLastMaintenance = Math.floor((now.getTime() - lastMaintenanceDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine maintenance schedule based on equipment category
      const getMaintenanceInterval = (category: string): number => {
        switch (category.toLowerCase()) {
          case 'aerial equipment':
          case 'cranes':
            return 90; // 3 months for high-risk equipment
          case 'heavy machinery':
          case 'forklifts':
            return 120; // 4 months for heavy equipment
          case 'air compressors':
          case 'pumps':
            return 150; // 5 months for mechanical equipment
          default:
            return 180; // 6 months for other equipment
        }
      };

      const maintenanceInterval = getMaintenanceInterval(equipment.category);
      const nextMaintenanceDate = new Date(lastMaintenanceDate.getTime() + maintenanceInterval * 24 * 60 * 60 * 1000);
      const daysUntilMaintenance = Math.floor((nextMaintenanceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Create alerts based on maintenance schedule
      if (daysUntilMaintenance <= 0) {
        // Overdue maintenance
        alerts.push({
          equipment_id: equipment.id,
          equipment_name: equipment.name,
          alert_type: 'overdue',
          maintenance_type: 'routine',
          due_date: nextMaintenanceDate.toISOString().split('T')[0],
          days_overdue: Math.abs(daysUntilMaintenance),
          priority: Math.abs(daysUntilMaintenance) > 30 ? 'critical' : 'high',
          description: `Routine maintenance overdue by ${Math.abs(daysUntilMaintenance)} days`,
          estimated_cost: this.getMaintenanceCost(equipment.category, 'routine'),
          estimated_downtime_hours: this.getMaintenanceDowntime(equipment.category, 'routine')
        });
      } else if (daysUntilMaintenance <= 14) {
        // Due soon
        alerts.push({
          equipment_id: equipment.id,
          equipment_name: equipment.name,
          alert_type: 'due',
          maintenance_type: 'routine',
          due_date: nextMaintenanceDate.toISOString().split('T')[0],
          priority: daysUntilMaintenance <= 7 ? 'high' : 'medium',
          description: `Routine maintenance due in ${daysUntilMaintenance} days`,
          estimated_cost: this.getMaintenanceCost(equipment.category, 'routine'),
          estimated_downtime_hours: this.getMaintenanceDowntime(equipment.category, 'routine')
        });
      }

      // Check equipment condition for repair needs
      const conditionScore = equipment.condition_score || 85;
      if (conditionScore < 70) {
        alerts.push({
          equipment_id: equipment.id,
          equipment_name: equipment.name,
          alert_type: 'emergency',
          maintenance_type: 'repair',
          due_date: now.toISOString().split('T')[0],
          priority: conditionScore < 50 ? 'critical' : 'high',
          description: `Low condition score (${conditionScore}/100) - requires inspection`,
          estimated_cost: this.getMaintenanceCost(equipment.category, 'repair'),
          estimated_downtime_hours: this.getMaintenanceDowntime(equipment.category, 'repair')
        });
      }

      // Check certification expiration
      if (equipment.compliance_certifications) {
        const certifications = JSON.parse(equipment.compliance_certifications);
        for (const [certType, expDate] of Object.entries(certifications)) {
          if (typeof expDate === 'string') {
            const expirationDate = new Date(expDate);
            const daysUntilExpiration = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiration <= 30 && daysUntilExpiration >= 0) {
              alerts.push({
                equipment_id: equipment.id,
                equipment_name: equipment.name,
                alert_type: 'scheduled',
                maintenance_type: 'certification',
                due_date: expirationDate.toISOString().split('T')[0],
                priority: daysUntilExpiration <= 7 ? 'high' : 'medium',
                description: `${certType} certification expires in ${daysUntilExpiration} days`,
                estimated_cost: 500,
                estimated_downtime_hours: 4
              });
            }
          }
        }
      }
    }

    return alerts.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private getMaintenanceCost(category: string, type: 'routine' | 'repair' | 'inspection' | 'certification'): number {
    const baseCosts = {
      'aerial equipment': { routine: 800, repair: 2500, inspection: 300, certification: 500 },
      'cranes': { routine: 1200, repair: 4000, inspection: 500, certification: 750 },
      'heavy machinery': { routine: 1000, repair: 3500, inspection: 400, certification: 600 },
      'forklifts': { routine: 600, repair: 2000, inspection: 250, certification: 400 },
      'air compressors': { routine: 400, repair: 1500, inspection: 200, certification: 300 },
      'pumps': { routine: 350, repair: 1200, inspection: 150, certification: 250 },
      'light towers': { routine: 250, repair: 800, inspection: 100, certification: 200 }
    };

    const categoryKey = category.toLowerCase() as keyof typeof baseCosts;
    return baseCosts[categoryKey]?.[type] || baseCosts['air compressors'][type];
  }

  private getMaintenanceDowntime(category: string, type: 'routine' | 'repair' | 'inspection' | 'certification'): number {
    const baseHours = {
      'aerial equipment': { routine: 8, repair: 24, inspection: 4, certification: 4 },
      'cranes': { routine: 12, repair: 48, inspection: 6, certification: 6 },
      'heavy machinery': { routine: 10, repair: 36, inspection: 5, certification: 5 },
      'forklifts': { routine: 6, repair: 18, inspection: 3, certification: 3 },
      'air compressors': { routine: 4, repair: 12, inspection: 2, certification: 2 },
      'pumps': { routine: 3, repair: 10, inspection: 2, certification: 2 },
      'light towers': { routine: 2, repair: 8, inspection: 1, certification: 1 }
    };

    const categoryKey = category.toLowerCase() as keyof typeof baseHours;
    return baseHours[categoryKey]?.[type] || baseHours['air compressors'][type];
  }

  async processEquipmentReturn(
    equipmentId: string, 
    bookingId: string, 
    returnData: {
      actual_return_date: string;
      condition_on_return: 'excellent' | 'good' | 'fair' | 'needs_repair';
      notes?: string;
      return_location?: string;
    }
  ): Promise<boolean> {
    try {
      // Update booking status
      const booking = await this.bookingRepository.getById(bookingId);
      if (!booking) return false;

      await this.bookingRepository.update(bookingId, {
        ...booking,
        status: 'completed',
        actual_end_date: returnData.actual_return_date,
        return_notes: returnData.notes
      });

      // Update equipment availability and condition
      const equipment = await this.equipmentRepository.getById(equipmentId);
      if (!equipment) return false;

      const newConditionScore = this.calculateConditionScore(
        equipment.condition_score || 85,
        returnData.condition_on_return
      );

      const newAvailabilityStatus = returnData.condition_on_return === 'needs_repair' ? 
        'maintenance' : 'available';

      await this.equipmentRepository.update(equipmentId, {
        ...equipment,
        availability_status: newAvailabilityStatus,
        condition_score: newConditionScore,
        location: returnData.return_location || equipment.location,
        last_inspection_date: returnData.actual_return_date
      });

      return true;
    } catch (error) {
      console.error('Error processing equipment return:', error);
      return false;
    }
  }

  private calculateConditionScore(currentScore: number, returnCondition: string): number {
    const conditionAdjustments = {
      'excellent': 2,
      'good': 0,
      'fair': -3,
      'needs_repair': -10
    };

    const adjustment = conditionAdjustments[returnCondition as keyof typeof conditionAdjustments] || 0;
    return Math.max(0, Math.min(100, currentScore + adjustment));
  }

  async getEquipmentLocationHistory(equipmentId: string, days: number = 30): Promise<Array<{
    date: string;
    location: string;
    booking_id?: string;
    customer?: string;
    status: string;
  }>> {
    const bookings = await this.bookingRepository.findBy({ equipment_id: equipmentId });
    const equipment = await this.equipmentRepository.getById(equipmentId);
    
    if (!equipment) return [];

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const locationHistory = [];

    // Add current location
    locationHistory.push({
      date: now.toISOString().split('T')[0],
      location: equipment.location || 'Houston, TX',
      status: equipment.availability_status || 'available'
    });

    // Add locations from recent bookings
    const recentBookings = bookings.filter(booking => {
      const endDate = new Date(booking.end_date);
      return endDate >= startDate;
    }).sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

    for (const booking of recentBookings) {
      locationHistory.push({
        date: booking.start_date,
        location: booking.delivery_address || equipment.location || 'Houston, TX',
        booking_id: booking.id,
        customer: booking.customer_name,
        status: 'rented'
      });
    }

    return locationHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

export const equipmentTrackingService = new EquipmentTrackingService();