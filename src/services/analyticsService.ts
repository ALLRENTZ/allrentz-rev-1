import { RepositoryFactory } from '@/repositories/RepositoryFactory';
import { EquipmentRepository } from '@/repositories/EquipmentCsvRepository';
import { BookingRepository } from '@/repositories/BookingCsvRepository';
import { UserRepository } from '@/repositories/UserCsvRepository';
import { equipmentTrackingService } from '@/services/equipmentTrackingService';

export interface OperationalMetrics {
  totalEquipment: number;
  activeRentals: number;
  totalCustomers: number;
  totalVendors: number;
  avgUtilizationRate: number;
  totalRevenue: number;
  revenueGrowth: number;
  topCategories: CategoryPerformance[];
  customerSatisfaction: number;
  equipmentConditionScore: number;
}

export interface CategoryPerformance {
  category: string;
  totalEquipment: number;
  utilizationRate: number;
  revenue: number;
  bookingCount: number;
  avgDailyRate: number;
  growth: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  revenueByMonth: MonthlyRevenue[];
  revenueByCategory: CategoryRevenue[];
  topVendors: VendorRevenue[];
  topCustomers: CustomerRevenue[];
  revenueProjection: number;
  seasonalTrends: SeasonalTrend[];
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  bookings: number;
  growth: number;
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
  percentage: number;
  growth: number;
}

export interface VendorRevenue {
  vendorId: string;
  vendorName: string;
  revenue: number;
  bookings: number;
  avgBookingValue: number;
  growth: number;
}

export interface CustomerRevenue {
  customerId: string;
  customerName: string;
  revenue: number;
  bookings: number;
  avgBookingValue: number;
  lastBooking: string;
}

export interface SeasonalTrend {
  quarter: string;
  revenue: number;
  utilization: number;
  demandFactor: number;
}

export interface UtilizationAnalytics {
  overallUtilization: number;
  utilizationByCategory: CategoryUtilization[];
  utilizationTrends: UtilizationTrend[];
  peakUsagePeriods: PeakPeriod[];
  lowUsagePeriods: LowPeriod[];
  utilizationForecast: UtilizationForecast[];
}

export interface CategoryUtilization {
  category: string;
  utilization: number;
  totalHours: number;
  rentalHours: number;
  equipment_count: number;
  efficiency: number;
}

export interface UtilizationTrend {
  date: string;
  utilization: number;
  activeEquipment: number;
  totalEquipment: number;
}

export interface PeakPeriod {
  period: string;
  utilization: number;
  demand: number;
  avgRate: number;
}

export interface LowPeriod {
  period: string;
  utilization: number;
  opportunity: number;
  suggestedActions: string[];
}

export interface UtilizationForecast {
  month: string;
  predictedUtilization: number;
  confidence: number;
  factors: string[];
}

export interface CustomerAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  customerRetention: number;
  topCustomers: TopCustomer[];
  customerSegments: CustomerSegment[];
  churnRisk: ChurnRiskCustomer[];
  customerLifetimeValue: number;
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  company: string;
  totalSpent: number;
  bookingsCount: number;
  lastBooking: string;
  loyaltyScore: number;
}

export interface CustomerSegment {
  segment: string;
  count: number;
  avgRevenue: number;
  characteristics: string[];
}

export interface ChurnRiskCustomer {
  customerId: string;
  customerName: string;
  company: string;
  lastBooking: string;
  riskScore: number;
  reasons: string[];
}

export interface ComplianceMetrics {
  overallComplianceScore: number;
  certificationStatus: CertificationStatus[];
  complianceIssues: ComplianceIssue[];
  maintenanceCompliance: MaintenanceCompliance;
  safetyMetrics: SafetyMetrics;
  auditResults: AuditResult[];
}

export interface CertificationStatus {
  certificationType: string;
  totalRequired: number;
  currentValid: number;
  expiringSoon: number;
  expired: number;
  complianceRate: number;
}

export interface ComplianceIssue {
  issueId: string;
  equipmentId: string;
  equipmentName: string;
  issueType: 'certification' | 'maintenance' | 'safety' | 'inspection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  dueDate: string;
  daysOverdue?: number;
}

export interface MaintenanceCompliance {
  onTimeRate: number;
  overdueCount: number;
  avgResponseTime: number;
  maintenanceCost: number;
  preventiveMaintenanceRate: number;
}

export interface SafetyMetrics {
  incidentCount: number;
  safetyScore: number;
  trainingComplianceRate: number;
  riskAssessmentScore: number;
}

export interface AuditResult {
  auditDate: string;
  auditType: string;
  score: number;
  findings: string[];
  correctedIssues: number;
  pendingIssues: number;
}

export class AnalyticsService {
  private equipmentRepository: EquipmentRepository;
  private bookingRepository: BookingRepository;
  private userRepository: UserRepository;

  constructor() {
    this.equipmentRepository = RepositoryFactory.getEquipmentRepository();
    this.bookingRepository = RepositoryFactory.getBookingRepository();
    this.userRepository = RepositoryFactory.getUserRepository();
  }

  async getOperationalMetrics(vendorId?: string, days: number = 90): Promise<OperationalMetrics> {
    const [allEquipment, allBookings, allUsers] = await Promise.all([
      vendorId ? this.equipmentRepository.getByVendor(vendorId) : this.equipmentRepository.getAll(),
      this.bookingRepository.getAll(),
      this.userRepository.getAll()
    ]);

    const relevantBookings = vendorId ? 
      allBookings.filter(booking => 
        allEquipment.some(eq => eq.id === booking.equipment_id)
      ) : allBookings;

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const recentBookings = relevantBookings.filter(booking => 
      new Date(booking.created_at) >= startDate
    );

    // Calculate metrics
    const totalEquipment = allEquipment.length;
    const activeRentals = relevantBookings.filter(b => b.status === 'active').length;
    const totalCustomers = allUsers.filter(u => u.role === 'customer').length;
    const totalVendors = allUsers.filter(u => u.role === 'vendor').length;

    // Get utilization data
    const utilizationData = await equipmentTrackingService.getEquipmentUtilization(vendorId, days);
    const avgUtilizationRate = utilizationData.length > 0 ? 
      Math.round(utilizationData.reduce((sum, item) => sum + item.utilization_rate, 0) / utilizationData.length) : 0;

    // Calculate revenue
    const totalRevenue = recentBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);

    // Calculate revenue growth (compare to previous period)
    const previousPeriodStart = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
    const previousBookings = relevantBookings.filter(booking => {
      const bookingDate = new Date(booking.created_at);
      return bookingDate >= previousPeriodStart && bookingDate < startDate;
    });
    const previousRevenue = previousBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Top categories by performance
    const categoryStats = this.calculateCategoryPerformance(allEquipment, recentBookings);
    const topCategories = categoryStats.sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Simulated metrics (would be calculated from real data in production)
    const customerSatisfaction = 4.2; // Out of 5
    const equipmentConditionScore = Math.round(
      allEquipment.reduce((sum, eq) => sum + (eq.condition_score || 85), 0) / allEquipment.length
    );

    return {
      totalEquipment,
      activeRentals,
      totalCustomers,
      totalVendors,
      avgUtilizationRate,
      totalRevenue,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      topCategories,
      customerSatisfaction,
      equipmentConditionScore
    };
  }

  async getRevenueAnalytics(vendorId?: string, months: number = 12): Promise<RevenueAnalytics> {
    const allEquipment = vendorId ? 
      await this.equipmentRepository.getByVendor(vendorId) : 
      await this.equipmentRepository.getAll();
    
    const allBookings = await this.bookingRepository.getAll();
    const relevantBookings = vendorId ? 
      allBookings.filter(booking => 
        allEquipment.some(eq => eq.id === booking.equipment_id)
      ) : allBookings;

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Monthly revenue
    const monthlyRevenue = this.calculateMonthlyRevenue(relevantBookings, startDate, months);
    
    // Revenue by category
    const categoryRevenue = this.calculateCategoryRevenue(allEquipment, relevantBookings);
    
    // Top vendors (if not filtered by vendor)
    const topVendors = vendorId ? [] : await this.calculateTopVendors(relevantBookings, allEquipment);
    
    // Top customers
    const topCustomers = await this.calculateTopCustomers(relevantBookings);
    
    // Total revenue
    const totalRevenue = relevantBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
    
    // Revenue projection (simple trend-based)
    const revenueProjection = this.calculateRevenueProjection(monthlyRevenue);
    
    // Seasonal trends
    const seasonalTrends = this.calculateSeasonalTrends(monthlyRevenue);

    return {
      totalRevenue,
      revenueByMonth: monthlyRevenue,
      revenueByCategory: categoryRevenue,
      topVendors,
      topCustomers,
      revenueProjection,
      seasonalTrends
    };
  }

  async getUtilizationAnalytics(vendorId?: string, days: number = 90): Promise<UtilizationAnalytics> {
    const utilizationData = await equipmentTrackingService.getEquipmentUtilization(vendorId, days);
    
    const overallUtilization = utilizationData.length > 0 ? 
      Math.round(utilizationData.reduce((sum, item) => sum + item.utilization_rate, 0) / utilizationData.length) : 0;

    // Group by category
    const categoryMap = new Map<string, CategoryUtilization>();
    utilizationData.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, {
          category: item.category,
          utilization: 0,
          totalHours: 0,
          rentalHours: 0,
          equipment_count: 0,
          efficiency: 0
        });
      }
      
      const existing = categoryMap.get(item.category)!;
      existing.equipment_count += 1;
      existing.utilization += item.utilization_rate;
      existing.totalHours += item.total_days_in_period * 24;
      existing.rentalHours += item.days_rented * 24;
    });

    const utilizationByCategory = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      utilization: Math.round(cat.utilization / cat.equipment_count),
      efficiency: cat.totalHours > 0 ? Math.round((cat.rentalHours / cat.totalHours) * 100) : 0
    }));

    // Simulated trends (would be calculated from historical data)
    const utilizationTrends = this.generateUtilizationTrends(days, overallUtilization);
    
    // Peak and low periods
    const peakUsagePeriods = this.identifyPeakPeriods(utilizationTrends);
    const lowUsagePeriods = this.identifyLowPeriods(utilizationTrends);
    
    // Forecast
    const utilizationForecast = this.generateUtilizationForecast();

    return {
      overallUtilization,
      utilizationByCategory,
      utilizationTrends,
      peakUsagePeriods,
      lowUsagePeriods,
      utilizationForecast
    };
  }

  async getCustomerAnalytics(vendorId?: string): Promise<CustomerAnalytics> {
    const allUsers = await this.userRepository.getAll();
    const allBookings = await this.bookingRepository.getAll();
    
    let relevantBookings = allBookings;
    if (vendorId) {
      const vendorEquipment = await this.equipmentRepository.getByVendor(vendorId);
      relevantBookings = allBookings.filter(booking => 
        vendorEquipment.some(eq => eq.id === booking.equipment_id)
      );
    }

    const customers = allUsers.filter(u => u.role === 'customer');
    const totalCustomers = customers.length;
    
    // Active customers (booked in last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const activeCustomerIds = new Set(
      relevantBookings
        .filter(booking => new Date(booking.created_at) >= ninetyDaysAgo)
        .map(booking => booking.customer_id)
    );
    const activeCustomers = activeCustomerIds.size;
    
    // New customers (first booking in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newCustomers = this.calculateNewCustomers(relevantBookings, thirtyDaysAgo);
    
    // Customer retention (simplified)
    const customerRetention = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;
    
    // Top customers
    const topCustomers = this.calculateTopCustomers(relevantBookings, customers);
    
    // Customer segments (simplified categorization)
    const customerSegments = this.categorizeCustomers(relevantBookings, customers);
    
    // Churn risk (customers who haven't booked in 60+ days)
    const churnRisk = this.identifyChurnRisk(relevantBookings, customers);
    
    // Customer lifetime value
    const customerLifetimeValue = relevantBookings.length > 0 ? 
      relevantBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) / activeCustomers : 0;

    return {
      totalCustomers,
      activeCustomers,
      newCustomers,
      customerRetention: Math.round(customerRetention * 100) / 100,
      topCustomers,
      customerSegments,
      churnRisk,
      customerLifetimeValue: Math.round(customerLifetimeValue)
    };
  }

  async getComplianceMetrics(vendorId?: string): Promise<ComplianceMetrics> {
    const allEquipment = vendorId ? 
      await this.equipmentRepository.getByVendor(vendorId) : 
      await this.equipmentRepository.getAll();

    const maintenanceAlerts = await equipmentTrackingService.getMaintenanceAlerts(vendorId);

    // Certification status
    const certificationStatus = this.analyzeCertificationStatus(allEquipment);
    
    // Compliance issues
    const complianceIssues = this.identifyComplianceIssues(allEquipment, maintenanceAlerts);
    
    // Maintenance compliance
    const maintenanceCompliance = this.calculateMaintenanceCompliance(maintenanceAlerts);
    
    // Safety metrics (simulated)
    const safetyMetrics: SafetyMetrics = {
      incidentCount: 0,
      safetyScore: 95,
      trainingComplianceRate: 98,
      riskAssessmentScore: 92
    };
    
    // Overall compliance score
    const overallComplianceScore = this.calculateOverallComplianceScore(
      certificationStatus,
      maintenanceCompliance,
      safetyMetrics
    );
    
    // Audit results (simulated)
    const auditResults: AuditResult[] = [
      {
        auditDate: '2024-06-01',
        auditType: 'Safety Compliance',
        score: 94,
        findings: ['Minor documentation gaps', 'Excellent safety protocols'],
        correctedIssues: 3,
        pendingIssues: 1
      },
      {
        auditDate: '2024-03-15',
        auditType: 'Equipment Certification',
        score: 97,
        findings: ['All certifications current', 'Outstanding maintenance records'],
        correctedIssues: 0,
        pendingIssues: 0
      }
    ];

    return {
      overallComplianceScore,
      certificationStatus,
      complianceIssues,
      maintenanceCompliance,
      safetyMetrics,
      auditResults
    };
  }

  // Private helper methods
  private calculateCategoryPerformance(equipment: any[], bookings: any[]): CategoryPerformance[] {
    const categoryMap = new Map<string, CategoryPerformance>();
    
    equipment.forEach(eq => {
      if (!categoryMap.has(eq.category)) {
        categoryMap.set(eq.category, {
          category: eq.category,
          totalEquipment: 0,
          utilizationRate: 0,
          revenue: 0,
          bookingCount: 0,
          avgDailyRate: 0,
          growth: 0
        });
      }
      
      const category = categoryMap.get(eq.category)!;
      category.totalEquipment += 1;
      category.avgDailyRate += eq.daily_rate || 0;
    });

    bookings.forEach(booking => {
      const equipment = equipment.find(eq => eq.id === booking.equipment_id);
      if (equipment && categoryMap.has(equipment.category)) {
        const category = categoryMap.get(equipment.category)!;
        category.revenue += booking.total_amount || 0;
        category.bookingCount += 1;
      }
    });

    return Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      avgDailyRate: cat.totalEquipment > 0 ? cat.avgDailyRate / cat.totalEquipment : 0,
      utilizationRate: 75 // Simplified - would calculate from actual utilization data
    }));
  }

  private calculateMonthlyRevenue(bookings: any[], startDate: Date, months: number): MonthlyRevenue[] {
    const monthlyData = new Map<string, MonthlyRevenue>();
    
    for (let i = 0; i < months; i++) {
      const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const monthKey = date.toISOString().substring(0, 7);
      monthlyData.set(monthKey, {
        month: monthKey,
        revenue: 0,
        bookings: 0,
        growth: 0
      });
    }

    bookings.forEach(booking => {
      const monthKey = booking.created_at.substring(0, 7);
      if (monthlyData.has(monthKey)) {
        const month = monthlyData.get(monthKey)!;
        month.revenue += booking.total_amount || 0;
        month.bookings += 1;
      }
    });

    const result = Array.from(monthlyData.values());
    
    // Calculate growth rates
    for (let i = 1; i < result.length; i++) {
      const current = result[i];
      const previous = result[i - 1];
      current.growth = previous.revenue > 0 ? 
        ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0;
    }

    return result;
  }

  private calculateCategoryRevenue(equipment: any[], bookings: any[]): CategoryRevenue[] {
    const categoryRevenue = new Map<string, number>();
    let totalRevenue = 0;

    bookings.forEach(booking => {
      const eq = equipment.find(e => e.id === booking.equipment_id);
      if (eq) {
        const revenue = booking.total_amount || 0;
        categoryRevenue.set(eq.category, (categoryRevenue.get(eq.category) || 0) + revenue);
        totalRevenue += revenue;
      }
    });

    return Array.from(categoryRevenue.entries()).map(([category, revenue]) => ({
      category,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      growth: 5 // Simplified - would calculate from historical data
    }));
  }

  private async calculateTopVendors(bookings: any[], equipment: any[]): Promise<VendorRevenue[]> {
    const vendorStats = new Map<string, VendorRevenue>();
    const allUsers = await this.userRepository.getAll();

    bookings.forEach(booking => {
      const eq = equipment.find(e => e.id === booking.equipment_id);
      if (eq && eq.vendor_id) {
        if (!vendorStats.has(eq.vendor_id)) {
          const vendor = allUsers.find(u => u.id === eq.vendor_id);
          vendorStats.set(eq.vendor_id, {
            vendorId: eq.vendor_id,
            vendorName: vendor?.name || 'Unknown',
            revenue: 0,
            bookings: 0,
            avgBookingValue: 0,
            growth: 0
          });
        }
        
        const stats = vendorStats.get(eq.vendor_id)!;
        stats.revenue += booking.total_amount || 0;
        stats.bookings += 1;
      }
    });

    return Array.from(vendorStats.values())
      .map(vendor => ({
        ...vendor,
        avgBookingValue: vendor.bookings > 0 ? vendor.revenue / vendor.bookings : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private async calculateTopCustomers(bookings: any[]): Promise<CustomerRevenue[]> {
    const customerStats = new Map<string, CustomerRevenue>();
    const allUsers = await this.userRepository.getAll();

    bookings.forEach(booking => {
      if (booking.customer_id) {
        if (!customerStats.has(booking.customer_id)) {
          const customer = allUsers.find(u => u.id === booking.customer_id);
          customerStats.set(booking.customer_id, {
            customerId: booking.customer_id,
            customerName: customer?.name || 'Unknown',
            revenue: 0,
            bookings: 0,
            avgBookingValue: 0,
            lastBooking: booking.created_at
          });
        }
        
        const stats = customerStats.get(booking.customer_id)!;
        stats.revenue += booking.total_amount || 0;
        stats.bookings += 1;
        
        // Update last booking if this one is more recent
        if (booking.created_at > stats.lastBooking) {
          stats.lastBooking = booking.created_at;
        }
      }
    });

    return Array.from(customerStats.values())
      .map(customer => ({
        ...customer,
        avgBookingValue: customer.bookings > 0 ? customer.revenue / customer.bookings : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private calculateRevenueProjection(monthlyRevenue: MonthlyRevenue[]): number {
    if (monthlyRevenue.length < 3) return 0;
    
    const lastThreeMonths = monthlyRevenue.slice(-3);
    const avgRevenue = lastThreeMonths.reduce((sum, month) => sum + month.revenue, 0) / 3;
    const avgGrowth = lastThreeMonths.reduce((sum, month) => sum + month.growth, 0) / 3;
    
    return avgRevenue * (1 + avgGrowth / 100);
  }

  private calculateSeasonalTrends(monthlyRevenue: MonthlyRevenue[]): SeasonalTrend[] {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    return quarters.map((quarter, index) => ({
      quarter,
      revenue: monthlyRevenue
        .filter((_, i) => Math.floor(i / 3) === index)
        .reduce((sum, month) => sum + month.revenue, 0),
      utilization: 75 + (index * 5), // Simulated
      demandFactor: 1 + (index * 0.1)
    }));
  }

  private generateUtilizationTrends(days: number, avgUtilization: number): UtilizationTrend[] {
    const trends: UtilizationTrend[] = [];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < days; i += 7) { // Weekly data points
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      trends.push({
        date: date.toISOString().split('T')[0],
        utilization: avgUtilization + (Math.random() - 0.5) * 20, // Simulated variance
        activeEquipment: Math.floor(Math.random() * 50) + 20,
        totalEquipment: 100
      });
    }
    
    return trends;
  }

  private identifyPeakPeriods(trends: UtilizationTrend[]): PeakPeriod[] {
    const avgUtilization = trends.reduce((sum, t) => sum + t.utilization, 0) / trends.length;
    const threshold = avgUtilization * 1.2;
    
    return [
      { period: 'March-May', utilization: 85, demand: 120, avgRate: 450 },
      { period: 'September-November', utilization: 88, demand: 130, avgRate: 475 }
    ];
  }

  private identifyLowPeriods(trends: UtilizationTrend[]): LowPeriod[] {
    return [
      {
        period: 'December-February',
        utilization: 45,
        opportunity: 35,
        suggestedActions: ['Promotional pricing', 'Winter maintenance packages', 'Indoor equipment focus']
      },
      {
        period: 'June-August',
        utilization: 55,
        opportunity: 25,
        suggestedActions: ['Summer construction campaigns', 'HVAC equipment promotion']
      }
    ];
  }

  private generateUtilizationForecast(): UtilizationForecast[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      predictedUtilization: 70 + Math.random() * 20,
      confidence: 80 + Math.random() * 15,
      factors: ['Historical trends', 'Market conditions', 'Seasonal patterns']
    }));
  }

  private calculateNewCustomers(bookings: any[], startDate: Date): number {
    const customerFirstBooking = new Map<string, Date>();
    
    bookings.forEach(booking => {
      if (booking.customer_id) {
        const bookingDate = new Date(booking.created_at);
        if (!customerFirstBooking.has(booking.customer_id) || 
            bookingDate < customerFirstBooking.get(booking.customer_id)!) {
          customerFirstBooking.set(booking.customer_id, bookingDate);
        }
      }
    });
    
    return Array.from(customerFirstBooking.values())
      .filter(date => date >= startDate).length;
  }

  private calculateTopCustomers(bookings: any[], customers: any[]): TopCustomer[] {
    const customerStats = new Map<string, any>();
    
    bookings.forEach(booking => {
      if (booking.customer_id) {
        if (!customerStats.has(booking.customer_id)) {
          customerStats.set(booking.customer_id, {
            totalSpent: 0,
            bookingsCount: 0,
            lastBooking: booking.created_at
          });
        }
        
        const stats = customerStats.get(booking.customer_id)!;
        stats.totalSpent += booking.total_amount || 0;
        stats.bookingsCount += 1;
        
        if (booking.created_at > stats.lastBooking) {
          stats.lastBooking = booking.created_at;
        }
      }
    });

    return Array.from(customerStats.entries())
      .map(([customerId, stats]) => {
        const customer = customers.find(c => c.id === customerId);
        return {
          customerId,
          customerName: customer?.name || 'Unknown',
          company: customer?.company_id || 'Unknown',
          totalSpent: stats.totalSpent,
          bookingsCount: stats.bookingsCount,
          lastBooking: stats.lastBooking,
          loyaltyScore: Math.min(100, stats.bookingsCount * 10 + (stats.totalSpent / 1000))
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }

  private categorizeCustomers(bookings: any[], customers: any[]): CustomerSegment[] {
    // Simplified customer segmentation
    return [
      {
        segment: 'Enterprise',
        count: Math.floor(customers.length * 0.2),
        avgRevenue: 15000,
        characteristics: ['High volume', 'Long-term contracts', 'Multiple locations']
      },
      {
        segment: 'SMB',
        count: Math.floor(customers.length * 0.6),
        avgRevenue: 5000,
        characteristics: ['Moderate volume', 'Project-based', 'Price-sensitive']
      },
      {
        segment: 'Occasional',
        count: Math.floor(customers.length * 0.2),
        avgRevenue: 1500,
        characteristics: ['Infrequent rentals', 'Small projects', 'One-time needs']
      }
    ];
  }

  private identifyChurnRisk(bookings: any[], customers: any[]): ChurnRiskCustomer[] {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const customerLastBooking = new Map<string, string>();
    
    bookings.forEach(booking => {
      if (booking.customer_id) {
        if (!customerLastBooking.has(booking.customer_id) || 
            booking.created_at > customerLastBooking.get(booking.customer_id)!) {
          customerLastBooking.set(booking.customer_id, booking.created_at);
        }
      }
    });

    return Array.from(customerLastBooking.entries())
      .filter(([_, lastBooking]) => new Date(lastBooking) < sixtyDaysAgo)
      .map(([customerId, lastBooking]) => {
        const customer = customers.find(c => c.id === customerId);
        return {
          customerId,
          customerName: customer?.name || 'Unknown',
          company: customer?.company_id || 'Unknown',
          lastBooking,
          riskScore: 75, // Simplified risk scoring
          reasons: ['Long period of inactivity', 'Declining booking frequency']
        };
      })
      .slice(0, 10);
  }

  private analyzeCertificationStatus(equipment: any[]): CertificationStatus[] {
    const certTypes = ['Safety', 'Environmental', 'Quality', 'Operational'];
    
    return certTypes.map(certType => {
      const required = equipment.length;
      const valid = Math.floor(required * 0.85);
      const expiringSoon = Math.floor(required * 0.1);
      const expired = required - valid - expiringSoon;
      
      return {
        certificationType: certType,
        totalRequired: required,
        currentValid: valid,
        expiringSoon,
        expired,
        complianceRate: (valid / required) * 100
      };
    });
  }

  private identifyComplianceIssues(equipment: any[], maintenanceAlerts: any[]): ComplianceIssue[] {
    return maintenanceAlerts
      .filter(alert => alert.priority === 'critical' || alert.priority === 'high')
      .map((alert, index) => ({
        issueId: `CI_${index + 1}`,
        equipmentId: alert.equipment_id,
        equipmentName: alert.equipment_name,
        issueType: alert.maintenance_type as any,
        severity: alert.priority as any,
        description: alert.description,
        dueDate: alert.due_date,
        daysOverdue: alert.days_overdue
      }));
  }

  private calculateMaintenanceCompliance(maintenanceAlerts: any[]): MaintenanceCompliance {
    const totalAlerts = maintenanceAlerts.length;
    const overdueAlerts = maintenanceAlerts.filter(alert => alert.alert_type === 'overdue').length;
    
    return {
      onTimeRate: totalAlerts > 0 ? ((totalAlerts - overdueAlerts) / totalAlerts) * 100 : 100,
      overdueCount: overdueAlerts,
      avgResponseTime: 24, // hours
      maintenanceCost: maintenanceAlerts.reduce((sum, alert) => sum + alert.estimated_cost, 0),
      preventiveMaintenanceRate: 85
    };
  }

  private calculateOverallComplianceScore(
    certificationStatus: CertificationStatus[],
    maintenanceCompliance: MaintenanceCompliance,
    safetyMetrics: SafetyMetrics
  ): number {
    const avgCertCompliance = certificationStatus.reduce((sum, cert) => sum + cert.complianceRate, 0) / certificationStatus.length;
    const maintenanceScore = maintenanceCompliance.onTimeRate;
    const safetyScore = safetyMetrics.safetyScore;
    
    return Math.round((avgCertCompliance + maintenanceScore + safetyScore) / 3);
  }
}

export const analyticsService = new AnalyticsService();