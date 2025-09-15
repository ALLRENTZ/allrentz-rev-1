import { Booking, Equipment, User, Company } from '@/repositories/interfaces';
import { BookingCsvRepository } from '@/repositories/csv/BookingCsvRepository';
import { EquipmentCsvRepository } from '@/repositories/csv/EquipmentCsvRepository';
import { UserCsvRepository } from '@/repositories/csv/UserCsvRepository';

export interface TurnaroundEvent {
  id: string;
  equipment_id: string;
  booking_id: string;
  event_type: 'pickup' | 'delivery' | 'maintenance' | 'inspection' | 'return';
  scheduled_date: string;
  scheduled_time?: string;
  location: string;
  customer_id: string;
  status: 'scheduled' | 'in_transit' | 'completed' | 'delayed' | 'cancelled';
  notes?: string;
  estimated_duration?: number; // in hours
  crew_assigned?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface EquipmentUtilization {
  equipment_id: string;
  equipment_title: string;
  category: string;
  total_bookings: number;
  active_bookings: number;
  days_rented_ytd: number;
  revenue_ytd: number;
  utilization_rate: number; // percentage
  average_rental_duration: number;
  last_rental_date?: string;
  next_available_date?: string;
  maintenance_due?: string;
  location: string;
}

export interface VendorKPIs {
  total_equipment: number;
  active_rentals: number;
  equipment_utilization_rate: number;
  revenue_this_month: number;
  revenue_ytd: number;
  pending_returns: number;
  upcoming_deliveries: number;
  maintenance_overdue: number;
  customer_satisfaction_score: number;
  average_turnaround_time: number; // in hours
}

export interface UpcomingReturn {
  booking_id: string;
  equipment_id: string;
  equipment_title: string;
  customer_name: string;
  customer_company: string;
  return_date: string;
  location: string;
  rental_duration: number;
  total_revenue: number;
  days_until_return: number;
  status: 'on_schedule' | 'overdue' | 'early_return_requested';
  condition_notes?: string;
}

export interface MaintenanceSchedule {
  equipment_id: string;
  equipment_title: string;
  maintenance_type: 'routine' | 'repair' | 'inspection' | 'compliance';
  due_date: string;
  last_maintenance: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_downtime: number; // in hours
  status: 'scheduled' | 'overdue' | 'in_progress' | 'completed';
  notes?: string;
  cost_estimate?: number;
}

export interface DeliverySchedule {
  id: string;
  booking_id: string;
  equipment_id: string;
  equipment_title: string;
  customer_name: string;
  delivery_date: string;
  delivery_time?: string;
  pickup_location: string;
  delivery_location: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'delayed';
  driver_assigned?: string;
  estimated_duration: number;
  special_requirements?: string[];
}

export interface VendorAlert {
  id: string;
  type: 'maintenance_overdue' | 'return_overdue' | 'delivery_urgent' | 'low_utilization' | 'high_demand';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  equipment_id?: string;
  booking_id?: string;
  action_required: boolean;
  created_date: string;
  resolved: boolean;
}

export class VendorOperationsService {
  private bookingRepository: BookingCsvRepository;
  private equipmentRepository: EquipmentCsvRepository;
  private userRepository: UserCsvRepository;

  constructor(
    bookingRepository: BookingCsvRepository,
    equipmentRepository: EquipmentCsvRepository,
    userRepository: UserCsvRepository
  ) {
    this.bookingRepository = bookingRepository;
    this.equipmentRepository = equipmentRepository;
    this.userRepository = userRepository;
  }

  // Get comprehensive vendor KPIs
  async getVendorKPIs(vendorId: string): Promise<VendorKPIs> {
    const [allEquipment, allBookings] = await Promise.all([
      this.equipmentRepository.getByVendor(vendorId),
      this.bookingRepository.getByVendor(vendorId)
    ]);

    const activeBookings = allBookings.filter(b => b.status === 'active');
    const completedBookings = allBookings.filter(b => b.status === 'completed');
    
    // Calculate revenue
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const revenueThisMonth = allBookings
      .filter(b => {
        const bookingDate = new Date(b.start_date);
        return bookingDate.getMonth() === currentMonth && 
               bookingDate.getFullYear() === currentYear &&
               b.status === 'completed';
      })
      .reduce((sum, b) => sum + b.total_amount, 0);

    const revenueYTD = completedBookings
      .filter(b => new Date(b.start_date).getFullYear() === currentYear)
      .reduce((sum, b) => sum + b.total_amount, 0);

    // Calculate utilization
    const totalPossibleDays = allEquipment.length * 365;
    const actualRentalDays = completedBookings.reduce((sum, booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    const utilizationRate = totalPossibleDays > 0 ? (actualRentalDays / totalPossibleDays) * 100 : 0;

    // Get upcoming returns
    const upcomingReturns = await this.getUpcomingReturns(vendorId);
    const pendingReturns = upcomingReturns.filter(r => r.days_until_return >= 0).length;
    
    // Get upcoming deliveries
    const deliverySchedule = await this.getDeliverySchedule(vendorId);
    const upcomingDeliveries = deliverySchedule.filter(d => d.status === 'scheduled').length;

    // Mock maintenance overdue (in real implementation, this would be calculated based on maintenance records)
    const maintenanceOverdue = allEquipment.filter(e => {
      // Mock logic: equipment without inspection in last 90 days
      const lastInspection = e.compliance?.lastInspection;
      if (!lastInspection) return true;
      const daysSinceInspection = Math.floor((Date.now() - new Date(lastInspection).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceInspection > 90;
    }).length;

    return {
      total_equipment: allEquipment.length,
      active_rentals: activeBookings.length,
      equipment_utilization_rate: utilizationRate,
      revenue_this_month: revenueThisMonth,
      revenue_ytd: revenueYTD,
      pending_returns: pendingReturns,
      upcoming_deliveries: upcomingDeliveries,
      maintenance_overdue: maintenanceOverdue,
      customer_satisfaction_score: 4.2, // Mock data - would come from customer feedback
      average_turnaround_time: 4.5 // Mock data - hours between pickup and delivery
    };
  }

  // Get equipment utilization analytics
  async getEquipmentUtilization(vendorId: string): Promise<EquipmentUtilization[]> {
    const equipment = await this.equipmentRepository.getByVendor(vendorId);
    const allBookings = await this.bookingRepository.getByVendor(vendorId);
    const currentYear = new Date().getFullYear();

    return equipment.map(eq => {
      const equipmentBookings = allBookings.filter(b => b.equipment_id === eq.id);
      const completedBookings = equipmentBookings.filter(b => b.status === 'completed');
      const activeBookings = equipmentBookings.filter(b => b.status === 'active');
      const ytdBookings = completedBookings.filter(b => new Date(b.start_date).getFullYear() === currentYear);

      // Calculate days rented YTD
      const daysRentedYTD = ytdBookings.reduce((sum, booking) => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);

      // Calculate revenue YTD
      const revenueYTD = ytdBookings.reduce((sum, b) => sum + b.total_amount, 0);

      // Calculate utilization rate (days rented / days available)
      const daysInYear = 365;
      const utilizationRate = (daysRentedYTD / daysInYear) * 100;

      // Calculate average rental duration
      const totalDuration = completedBookings.reduce((sum, booking) => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      const averageRentalDuration = completedBookings.length > 0 ? totalDuration / completedBookings.length : 0;

      // Get last and next rental dates
      const sortedCompletedBookings = completedBookings.sort((a, b) => 
        new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
      );
      const lastRentalDate = sortedCompletedBookings[0]?.end_date;

      const futureBookings = equipmentBookings.filter(b => 
        new Date(b.start_date) > new Date() && (b.status === 'confirmed' || b.status === 'pending')
      ).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      const nextAvailableDate = futureBookings[0]?.end_date || new Date().toISOString().split('T')[0];

      return {
        equipment_id: eq.id,
        equipment_title: eq.title,
        category: eq.category,
        total_bookings: equipmentBookings.length,
        active_bookings: activeBookings.length,
        days_rented_ytd: daysRentedYTD,
        revenue_ytd: revenueYTD,
        utilization_rate: utilizationRate,
        average_rental_duration: averageRentalDuration,
        last_rental_date: lastRentalDate,
        next_available_date: nextAvailableDate,
        maintenance_due: eq.compliance?.lastInspection ? 
          new Date(new Date(eq.compliance.lastInspection).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0],
        location: eq.location
      };
    });
  }

  // Get upcoming equipment returns
  async getUpcomingReturns(vendorId: string, days: number = 30): Promise<UpcomingReturn[]> {
    const bookings = await this.bookingRepository.getByVendor(vendorId);
    const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'confirmed');
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const upcomingReturns: UpcomingReturn[] = [];

    for (const booking of activeBookings) {
      const returnDate = new Date(booking.end_date);
      const daysUntilReturn = Math.ceil((returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (returnDate <= futureDate) {
        const [equipment, customer] = await Promise.all([
          this.equipmentRepository.getById(booking.equipment_id),
          this.userRepository.getById(booking.customer_id)
        ]);

        if (equipment && customer) {
          const startDate = new Date(booking.start_date);
          const rentalDuration = Math.ceil((returnDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

          let status: 'on_schedule' | 'overdue' | 'early_return_requested' = 'on_schedule';
          if (daysUntilReturn < 0) {
            status = 'overdue';
          }

          upcomingReturns.push({
            booking_id: booking.id,
            equipment_id: booking.equipment_id,
            equipment_title: equipment.title,
            customer_name: customer.name,
            customer_company: customer.company_id || 'Independent',
            return_date: booking.end_date,
            location: booking.location,
            rental_duration: rentalDuration,
            total_revenue: booking.total_amount,
            days_until_return: daysUntilReturn,
            status: status
          });
        }
      }
    }

    return upcomingReturns.sort((a, b) => a.days_until_return - b.days_until_return);
  }

  // Get delivery schedule
  async getDeliverySchedule(vendorId: string, days: number = 14): Promise<DeliverySchedule[]> {
    const bookings = await this.bookingRepository.getByVendor(vendorId);
    const upcomingBookings = bookings.filter(b => {
      const startDate = new Date(b.start_date);
      const today = new Date();
      const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilStart >= 0 && daysUntilStart <= days && (b.status === 'confirmed' || b.status === 'pending');
    });

    const deliverySchedule: DeliverySchedule[] = [];

    for (const booking of upcomingBookings) {
      const [equipment, customer] = await Promise.all([
        this.equipmentRepository.getById(booking.equipment_id),
        this.userRepository.getById(booking.customer_id)
      ]);

      if (equipment && customer) {
        deliverySchedule.push({
          id: `delivery_${booking.id}`,
          booking_id: booking.id,
          equipment_id: booking.equipment_id,
          equipment_title: equipment.title,
          customer_name: customer.name,
          delivery_date: booking.start_date,
          pickup_location: equipment.location,
          delivery_location: booking.location,
          status: booking.status === 'confirmed' ? 'scheduled' : 'scheduled',
          estimated_duration: 4, // Mock: 4 hours for delivery
          special_requirements: equipment.compliance?.certifications || []
        });
      }
    }

    return deliverySchedule.sort((a, b) => 
      new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
    );
  }

  // Get maintenance schedule
  async getMaintenanceSchedule(vendorId: string): Promise<MaintenanceSchedule[]> {
    const equipment = await this.equipmentRepository.getByVendor(vendorId);
    const maintenanceSchedule: MaintenanceSchedule[] = [];

    equipment.forEach(eq => {
      const lastInspection = eq.compliance?.lastInspection ? new Date(eq.compliance.lastInspection) : new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
      const daysSinceInspection = Math.floor((Date.now() - lastInspection.getTime()) / (1000 * 60 * 60 * 24));
      
      // Routine maintenance every 90 days
      const routineDue = new Date(lastInspection.getTime() + 90 * 24 * 60 * 60 * 1000);
      const daysUntilRoutine = Math.ceil((routineDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let status: 'scheduled' | 'overdue' | 'in_progress' | 'completed' = 'scheduled';
      
      if (daysUntilRoutine < -30) {
        priority = 'critical';
        status = 'overdue';
      } else if (daysUntilRoutine < -7) {
        priority = 'high';
        status = 'overdue';
      } else if (daysUntilRoutine < 7) {
        priority = 'medium';
      }

      maintenanceSchedule.push({
        equipment_id: eq.id,
        equipment_title: eq.title,
        maintenance_type: 'routine',
        due_date: routineDue.toISOString().split('T')[0],
        last_maintenance: eq.compliance?.lastInspection || '',
        priority: priority,
        estimated_downtime: 8, // 8 hours for routine maintenance
        status: status,
        notes: daysSinceInspection > 90 ? 'Overdue for routine inspection' : 'Regular maintenance cycle',
        cost_estimate: 500 // Mock estimate
      });

      // Add compliance inspections if certifications are present
      if (eq.compliance?.certifications && eq.compliance.certifications.length > 0) {
        const complianceDue = new Date(lastInspection.getTime() + 365 * 24 * 60 * 60 * 1000); // Annual
        const daysUntilCompliance = Math.ceil((complianceDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilCompliance < 60) { // Show if due within 60 days
          maintenanceSchedule.push({
            equipment_id: eq.id,
            equipment_title: eq.title,
            maintenance_type: 'compliance',
            due_date: complianceDue.toISOString().split('T')[0],
            last_maintenance: eq.compliance.lastInspection || '',
            priority: daysUntilCompliance < 0 ? 'critical' : daysUntilCompliance < 30 ? 'high' : 'medium',
            estimated_downtime: 4,
            status: daysUntilCompliance < 0 ? 'overdue' : 'scheduled',
            notes: `Annual compliance inspection for ${eq.compliance.certifications.join(', ')}`,
            cost_estimate: 1200
          });
        }
      }
    });

    return maintenanceSchedule.sort((a, b) => {
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return dateA - dateB;
    });
  }

  // Get vendor alerts
  async getVendorAlerts(vendorId: string): Promise<VendorAlert[]> {
    const [kpis, maintenanceSchedule, upcomingReturns] = await Promise.all([
      this.getVendorKPIs(vendorId),
      this.getMaintenanceSchedule(vendorId),
      this.getUpcomingReturns(vendorId)
    ]);

    const alerts: VendorAlert[] = [];

    // Maintenance overdue alerts
    const overdueMaintenances = maintenanceSchedule.filter(m => m.status === 'overdue');
    overdueMaintenances.forEach(maintenance => {
      alerts.push({
        id: `maintenance_${maintenance.equipment_id}`,
        type: 'maintenance_overdue',
        severity: maintenance.priority === 'critical' ? 'critical' : 'warning',
        title: 'Maintenance Overdue',
        message: `${maintenance.equipment_title} requires ${maintenance.maintenance_type} maintenance`,
        equipment_id: maintenance.equipment_id,
        action_required: true,
        created_date: new Date().toISOString(),
        resolved: false
      });
    });

    // Return overdue alerts
    const overdueReturns = upcomingReturns.filter(r => r.status === 'overdue');
    overdueReturns.forEach(returnItem => {
      alerts.push({
        id: `return_${returnItem.booking_id}`,
        type: 'return_overdue',
        severity: Math.abs(returnItem.days_until_return) > 7 ? 'error' : 'warning',
        title: 'Equipment Return Overdue',
        message: `${returnItem.equipment_title} return is ${Math.abs(returnItem.days_until_return)} days overdue`,
        equipment_id: returnItem.equipment_id,
        booking_id: returnItem.booking_id,
        action_required: true,
        created_date: new Date().toISOString(),
        resolved: false
      });
    });

    // Low utilization alerts
    const utilizationData = await this.getEquipmentUtilization(vendorId);
    const lowUtilizationEquipment = utilizationData.filter(u => u.utilization_rate < 30 && u.total_bookings > 0);
    lowUtilizationEquipment.forEach(equipment => {
      alerts.push({
        id: `utilization_${equipment.equipment_id}`,
        type: 'low_utilization',
        severity: 'info',
        title: 'Low Equipment Utilization',
        message: `${equipment.equipment_title} has ${equipment.utilization_rate.toFixed(1)}% utilization rate`,
        equipment_id: equipment.equipment_id,
        action_required: false,
        created_date: new Date().toISOString(),
        resolved: false
      });
    });

    // High demand alerts (equipment with high booking rate but availability issues)
    const highDemandEquipment = utilizationData.filter(u => u.utilization_rate > 85);
    highDemandEquipment.forEach(equipment => {
      alerts.push({
        id: `demand_${equipment.equipment_id}`,
        type: 'high_demand',
        severity: 'info',
        title: 'High Demand Equipment',
        message: `${equipment.equipment_title} has ${equipment.utilization_rate.toFixed(1)}% utilization - consider adding more units`,
        equipment_id: equipment.equipment_id,
        action_required: false,
        created_date: new Date().toISOString(),
        resolved: false
      });
    });

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  // Generate turnaround events
  async generateTurnaroundSchedule(vendorId: string, days: number = 30): Promise<TurnaroundEvent[]> {
    const [deliveries, returns] = await Promise.all([
      this.getDeliverySchedule(vendorId, days),
      this.getUpcomingReturns(vendorId, days)
    ]);

    const events: TurnaroundEvent[] = [];

    // Add delivery events
    deliveries.forEach(delivery => {
      events.push({
        id: `delivery_${delivery.id}`,
        equipment_id: delivery.equipment_id,
        booking_id: delivery.booking_id,
        event_type: 'delivery',
        scheduled_date: delivery.delivery_date,
        scheduled_time: '08:00',
        location: delivery.delivery_location,
        customer_id: '', // Would need to be passed from delivery data
        status: delivery.status === 'scheduled' ? 'scheduled' : 'scheduled',
        estimated_duration: delivery.estimated_duration,
        priority: 'medium'
      });
    });

    // Add return events
    returns.forEach(returnItem => {
      events.push({
        id: `return_${returnItem.booking_id}`,
        equipment_id: returnItem.equipment_id,
        booking_id: returnItem.booking_id,
        event_type: 'return',
        scheduled_date: returnItem.return_date,
        scheduled_time: '16:00',
        location: returnItem.location,
        customer_id: '', // Would be available from booking data
        status: returnItem.status === 'overdue' ? 'delayed' : 'scheduled',
        estimated_duration: 2,
        priority: returnItem.status === 'overdue' ? 'urgent' : 'medium'
      });
    });

    return events.sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time || '00:00'}`).getTime();
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time || '00:00'}`).getTime();
      return dateA - dateB;
    });
  }
}

export const createVendorOperationsService = (
  bookingRepository: BookingCsvRepository,
  equipmentRepository: EquipmentCsvRepository,
  userRepository: UserCsvRepository
) => {
  return new VendorOperationsService(
    bookingRepository,
    equipmentRepository,
    userRepository
  );
};