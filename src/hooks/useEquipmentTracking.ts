import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  equipmentTrackingService,
  EquipmentStatus,
  ReturnSchedule,
  EquipmentUtilization,
  MaintenanceAlert,
  AvailabilityForecast
} from '@/services/equipmentTrackingService';

export const useEquipmentTracking = (vendorId?: string) => {
  const queryClient = useQueryClient();

  // Equipment status queries
  const useEquipmentStatus = (equipmentId: string) => {
    return useQuery({
      queryKey: ['equipment-status', equipmentId],
      queryFn: () => equipmentTrackingService.getEquipmentStatus(equipmentId),
      enabled: !!equipmentId,
      refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      staleTime: 2 * 60 * 1000 // Consider stale after 2 minutes
    });
  };

  // Return schedule query
  const useReturnSchedule = (daysAhead: number = 30) => {
    return useQuery({
      queryKey: ['return-schedule', vendorId, daysAhead],
      queryFn: () => equipmentTrackingService.getReturnSchedule(vendorId, daysAhead),
      refetchInterval: 5 * 60 * 1000,
      staleTime: 2 * 60 * 1000
    });
  };

  // Equipment utilization query
  const useEquipmentUtilization = (days: number = 90) => {
    return useQuery({
      queryKey: ['equipment-utilization', vendorId, days],
      queryFn: () => equipmentTrackingService.getEquipmentUtilization(vendorId, days),
      refetchInterval: 30 * 60 * 1000, // Refresh every 30 minutes
      staleTime: 15 * 60 * 1000 // Consider stale after 15 minutes
    });
  };

  // Maintenance alerts query
  const useMaintenanceAlerts = () => {
    return useQuery({
      queryKey: ['maintenance-alerts', vendorId],
      queryFn: () => equipmentTrackingService.getMaintenanceAlerts(vendorId),
      refetchInterval: 60 * 60 * 1000, // Refresh every hour
      staleTime: 30 * 60 * 1000 // Consider stale after 30 minutes
    });
  };

  // Availability forecast query
  const useAvailabilityForecast = (equipmentId: string, daysAhead: number = 90) => {
    return useQuery({
      queryKey: ['availability-forecast', equipmentId, daysAhead],
      queryFn: () => equipmentTrackingService.getAvailabilityForecast(equipmentId, daysAhead),
      enabled: !!equipmentId,
      refetchInterval: 30 * 60 * 1000,
      staleTime: 15 * 60 * 1000
    });
  };

  // Equipment location history query
  const useEquipmentLocationHistory = (equipmentId: string, days: number = 30) => {
    return useQuery({
      queryKey: ['equipment-location-history', equipmentId, days],
      queryFn: () => equipmentTrackingService.getEquipmentLocationHistory(equipmentId, days),
      enabled: !!equipmentId,
      refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
      staleTime: 5 * 60 * 1000
    });
  };

  // Equipment return mutation
  const useProcessReturn = () => {
    return useMutation({
      mutationFn: ({
        equipmentId,
        bookingId,
        returnData
      }: {
        equipmentId: string;
        bookingId: string;
        returnData: {
          actual_return_date: string;
          condition_on_return: 'excellent' | 'good' | 'fair' | 'needs_repair';
          notes?: string;
          return_location?: string;
        };
      }) => equipmentTrackingService.processEquipmentReturn(equipmentId, bookingId, returnData),
      onSuccess: (success, variables) => {
        if (success) {
          // Invalidate related queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['equipment-status', variables.equipmentId] });
          queryClient.invalidateQueries({ queryKey: ['return-schedule'] });
          queryClient.invalidateQueries({ queryKey: ['equipment-utilization'] });
          queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
          queryClient.invalidateQueries({ queryKey: ['availability-forecast', variables.equipmentId] });
        }
      }
    });
  };

  // Utility functions for aggregated data
  const getOverdueReturns = (returnSchedule: ReturnSchedule[] | undefined) => {
    return returnSchedule?.filter(item => item.is_overdue) || [];
  };

  const getDueSoonReturns = (returnSchedule: ReturnSchedule[] | undefined, days: number = 7) => {
    return returnSchedule?.filter(item => 
      !item.is_overdue && item.days_until_return <= days
    ) || [];
  };

  const getCriticalMaintenanceAlerts = (alerts: MaintenanceAlert[] | undefined) => {
    return alerts?.filter(alert => 
      alert.priority === 'critical' || alert.priority === 'high'
    ) || [];
  };

  const getUtilizationSummary = (utilization: EquipmentUtilization[] | undefined) => {
    if (!utilization || utilization.length === 0) {
      return {
        averageUtilization: 0,
        totalRevenue: 0,
        totalEquipment: 0,
        highPerformers: [],
        lowPerformers: []
      };
    }

    const totalUtilization = utilization.reduce((sum, item) => sum + item.utilization_rate, 0);
    const averageUtilization = Math.round(totalUtilization / utilization.length);
    const totalRevenue = utilization.reduce((sum, item) => sum + item.revenue_generated, 0);
    
    // Sort by utilization rate
    const sorted = [...utilization].sort((a, b) => b.utilization_rate - a.utilization_rate);
    const highPerformers = sorted.filter(item => item.utilization_rate >= 80);
    const lowPerformers = sorted.filter(item => item.utilization_rate < 50);

    return {
      averageUtilization,
      totalRevenue,
      totalEquipment: utilization.length,
      highPerformers,
      lowPerformers
    };
  };

  const getRevenueProjection = (
    utilization: EquipmentUtilization[] | undefined,
    availabilityForecasts: AvailabilityForecast[] | undefined
  ) => {
    const currentRevenue = utilization?.reduce((sum, item) => sum + item.revenue_generated, 0) || 0;
    const projectedRevenue = availabilityForecasts?.reduce((sum, item) => sum + item.revenue_projection, 0) || 0;
    
    return {
      current90Days: currentRevenue,
      projected90Days: projectedRevenue,
      growth: projectedRevenue > 0 ? ((projectedRevenue - currentRevenue) / currentRevenue) * 100 : 0
    };
  };

  // Real-time tracking helpers
  const useRealTimeUpdates = (equipmentIds: string[] = []) => {
    const refreshInterval = 30 * 1000; // 30 seconds for real-time updates

    return useQuery({
      queryKey: ['real-time-status', equipmentIds],
      queryFn: async () => {
        const statusPromises = equipmentIds.map(id => 
          equipmentTrackingService.getEquipmentStatus(id)
        );
        return Promise.all(statusPromises);
      },
      enabled: equipmentIds.length > 0,
      refetchInterval: refreshInterval,
      staleTime: 0 // Always refetch for real-time data
    });
  };

  return {
    // Query hooks
    useEquipmentStatus,
    useReturnSchedule,
    useEquipmentUtilization,
    useMaintenanceAlerts,
    useAvailabilityForecast,
    useEquipmentLocationHistory,
    useRealTimeUpdates,
    
    // Mutation hooks
    useProcessReturn,
    
    // Utility functions
    getOverdueReturns,
    getDueSoonReturns,
    getCriticalMaintenanceAlerts,
    getUtilizationSummary,
    getRevenueProjection,
    
    // Direct service access for complex operations
    trackingService: equipmentTrackingService
  };
};

// Specialized hooks for different user roles
export const useVendorTracking = (vendorId: string) => {
  return useEquipmentTracking(vendorId);
};

export const useCustomerTracking = () => {
  return useEquipmentTracking();
};

// Hook for real-time monitoring dashboard
export const useTrackingDashboard = (vendorId?: string) => {
  const tracking = useEquipmentTracking(vendorId);
  
  const returnSchedule = tracking.useReturnSchedule();
  const utilization = tracking.useEquipmentUtilization();
  const alerts = tracking.useMaintenanceAlerts();
  
  // Compute dashboard statistics
  const dashboardStats = {
    overdue: tracking.getOverdueReturns(returnSchedule.data),
    dueSoon: tracking.getDueSoonReturns(returnSchedule.data),
    criticalAlerts: tracking.getCriticalMaintenanceAlerts(alerts.data),
    utilization: tracking.getUtilizationSummary(utilization.data)
  };
  
  const isLoading = returnSchedule.isLoading || utilization.isLoading || alerts.isLoading;
  const error = returnSchedule.error || utilization.error || alerts.error;
  
  return {
    ...tracking,
    dashboardStats,
    isLoading,
    error,
    refetch: () => {
      returnSchedule.refetch();
      utilization.refetch();
      alerts.refetch();
    }
  };
};