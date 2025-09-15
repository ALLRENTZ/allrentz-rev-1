import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  TrendingUp, 
  Calendar, 
  Settings,
  Search,
  Filter,
  Download,
  RefreshCw,
  Wrench,
  DollarSign,
  BarChart3,
  Activity
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  equipmentTrackingService, 
  EquipmentStatus, 
  ReturnSchedule, 
  EquipmentUtilization, 
  MaintenanceAlert,
  AvailabilityForecast
} from '@/services/equipmentTrackingService';

interface EquipmentTrackingDashboardProps {
  vendorId?: string;
  userRole?: 'customer' | 'vendor' | 'admin';
}

const EquipmentTrackingDashboard: React.FC<EquipmentTrackingDashboardProps> = ({ 
  vendorId, 
  userRole = 'vendor' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch return schedule
  const { data: returnSchedule, isLoading: loadingReturns } = useQuery({
    queryKey: ['return-schedule', vendorId],
    queryFn: () => equipmentTrackingService.getReturnSchedule(vendorId, 30),
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  // Fetch equipment utilization
  const { data: utilizationData, isLoading: loadingUtilization } = useQuery({
    queryKey: ['equipment-utilization', vendorId],
    queryFn: () => equipmentTrackingService.getEquipmentUtilization(vendorId, 90),
    refetchInterval: 30 * 60 * 1000 // Refresh every 30 minutes
  });

  // Fetch maintenance alerts
  const { data: maintenanceAlerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['maintenance-alerts', vendorId],
    queryFn: () => equipmentTrackingService.getMaintenanceAlerts(vendorId),
    refetchInterval: 60 * 60 * 1000 // Refresh every hour
  });

  // Fetch availability forecast for selected equipment
  const { data: availabilityForecast } = useQuery({
    queryKey: ['availability-forecast', selectedEquipmentId],
    queryFn: () => selectedEquipmentId ? 
      equipmentTrackingService.getAvailabilityForecast(selectedEquipmentId, 90) : 
      null,
    enabled: !!selectedEquipmentId
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['return-schedule'] });
    queryClient.invalidateQueries({ queryKey: ['equipment-utilization'] });
    queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'rented': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredReturns = returnSchedule?.filter(item => {
    const matchesSearch = item.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'overdue' && item.is_overdue) ||
                         (statusFilter === 'due_soon' && item.days_until_return <= 7 && !item.is_overdue);
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  }) || [];

  const filteredUtilization = utilizationData?.filter(item => {
    const matchesSearch = item.equipment_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  }) || [];

  // Calculate summary statistics
  const summaryStats = {
    totalEquipment: utilizationData?.length || 0,
    activeRentals: returnSchedule?.filter(r => !r.is_overdue).length || 0,
    overdueReturns: returnSchedule?.filter(r => r.is_overdue).length || 0,
    maintenanceNeeded: maintenanceAlerts?.filter(a => a.priority === 'critical' || a.priority === 'high').length || 0,
    avgUtilization: utilizationData ? Math.round(utilizationData.reduce((sum, item) => sum + item.utilization_rate, 0) / utilizationData.length) : 0,
    totalRevenue: utilizationData?.reduce((sum, item) => sum + item.revenue_generated, 0) || 0
  };

  if (loadingReturns && loadingUtilization && loadingAlerts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-allrentz-red" />
          <p className="text-gray-600">Loading equipment tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipment Tracking Dashboard</h1>
          <p className="text-gray-600 mt-2">Real-time equipment availability and return tracking</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Equipment</p>
                <p className="text-xl font-bold">{summaryStats.totalEquipment}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active Rentals</p>
                <p className="text-xl font-bold text-green-600">{summaryStats.activeRentals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Overdue Returns</p>
                <p className="text-xl font-bold text-red-600">{summaryStats.overdueReturns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Maintenance Alerts</p>
                <p className="text-xl font-bold text-yellow-600">{summaryStats.maintenanceNeeded}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Utilization</p>
                <p className={`text-xl font-bold ${getUtilizationColor(summaryStats.avgUtilization)}`}>
                  {summaryStats.avgUtilization}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Revenue (90d)</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(summaryStats.totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search equipment or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="overdue">Overdue Returns</SelectItem>
                <SelectItem value="due_soon">Due Soon</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Aerial Equipment">Aerial Equipment</SelectItem>
                <SelectItem value="Forklifts">Forklifts</SelectItem>
                <SelectItem value="Heavy Machinery">Heavy Machinery</SelectItem>
                <SelectItem value="Air Compressors">Air Compressors</SelectItem>
                <SelectItem value="Light Towers">Light Towers</SelectItem>
                <SelectItem value="Pumps">Pumps</SelectItem>
                <SelectItem value="Cranes">Cranes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="returns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="returns">Return Schedule</TabsTrigger>
          <TabsTrigger value="utilization">Equipment Utilization</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Alerts</TabsTrigger>
          <TabsTrigger value="forecast">Availability Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Equipment Return Schedule (Next 30 Days)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredReturns.length > 0 ? (
                  filteredReturns.map((returnItem) => (
                    <div key={returnItem.current_booking_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-lg">{returnItem.equipment_name}</h3>
                            <Badge className={getStatusColor(returnItem.category)}>
                              {returnItem.category}
                            </Badge>
                            {returnItem.is_overdue && (
                              <Badge className="bg-red-100 text-red-800">
                                OVERDUE
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <p><strong>Customer:</strong> {returnItem.customer_name}</p>
                              <p><strong>Company:</strong> {returnItem.customer_company}</p>
                            </div>
                            <div>
                              <p><strong>Return Date:</strong> {new Date(returnItem.scheduled_return_date).toLocaleDateString()}</p>
                              <p><strong>Location:</strong> {returnItem.return_location}</p>
                            </div>
                          </div>
                          {returnItem.notes && (
                            <p className="mt-2 text-sm text-gray-600">
                              <strong>Notes:</strong> {returnItem.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${returnItem.is_overdue ? 'text-red-600' : 'text-green-600'}`}>
                            {returnItem.is_overdue ? 
                              `${Math.abs(returnItem.days_until_return)} days overdue` :
                              `${returnItem.days_until_return} days`
                            }
                          </div>
                          <Button size="sm" className="mt-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            Track
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Returns Scheduled</h3>
                    <p className="text-gray-600">No equipment returns found for the selected filters.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Equipment Utilization (Last 90 Days)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUtilization.length > 0 ? (
                  filteredUtilization.map((item) => (
                    <div key={item.equipment_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-lg">{item.equipment_name}</h3>
                            <Badge className={getStatusColor(item.category)}>
                              {item.category}
                            </Badge>
                          </div>
                          <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Utilization</p>
                              <p className={`font-bold ${getUtilizationColor(item.utilization_rate)}`}>
                                {item.utilization_rate}%
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Days Rented</p>
                              <p className="font-bold">{item.days_rented} / {item.total_days_in_period}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Revenue Generated</p>
                              <p className="font-bold text-green-600">{formatCurrency(item.revenue_generated)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Avg Daily Rate</p>
                              <p className="font-bold">{formatCurrency(item.avg_daily_rate)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedEquipmentId(item.equipment_id)}
                          >
                            View Forecast
                          </Button>
                        </div>
                      </div>
                      
                      {/* Utilization Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Utilization Breakdown</span>
                          <span>{item.booking_count} bookings</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="flex h-full rounded-full">
                            <div 
                              className="bg-green-500 rounded-l-full" 
                              style={{ width: `${(item.days_rented / item.total_days_in_period) * 100}%` }}
                            ></div>
                            <div 
                              className="bg-yellow-500" 
                              style={{ width: `${(item.days_maintenance / item.total_days_in_period) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span className="text-green-600">Rented: {item.days_rented}d</span>
                          <span className="text-yellow-600">Maintenance: {item.days_maintenance}d</span>
                          <span className="text-gray-500">Available: {item.days_available}d</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Utilization Data</h3>
                    <p className="text-gray-600">No equipment utilization data found for the selected filters.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wrench className="h-5 w-5" />
                <span>Maintenance Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {maintenanceAlerts && maintenanceAlerts.length > 0 ? (
                  maintenanceAlerts.map((alert) => (
                    <div key={`${alert.equipment_id}-${alert.maintenance_type}`} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-lg">{alert.equipment_name}</h3>
                            <Badge className={getPriorityColor(alert.priority)}>
                              {alert.priority.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {alert.maintenance_type}
                            </Badge>
                          </div>
                          <p className="mt-2 text-gray-700">{alert.description}</p>
                          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Due Date</p>
                              <p className="font-bold">{new Date(alert.due_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Estimated Cost</p>
                              <p className="font-bold">{formatCurrency(alert.estimated_cost)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Downtime</p>
                              <p className="font-bold">{alert.estimated_downtime_hours}h</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Button size="sm">
                            <Settings className="h-4 w-4 mr-1" />
                            Schedule
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Up to Date</h3>
                    <p className="text-gray-600">No maintenance alerts at this time.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Availability Forecast</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availabilityForecast ? (
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-4">{availabilityForecast.equipment_name}</h3>
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Utilization (90 days)</p>
                        <p className={`text-2xl font-bold ${getUtilizationColor(availabilityForecast.utilization_percentage)}`}>
                          {availabilityForecast.utilization_percentage}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Revenue Projection</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(availabilityForecast.revenue_projection)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Upcoming Bookings</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {availabilityForecast.upcoming_bookings.length}
                        </p>
                      </div>
                    </div>

                    {/* Available Periods */}
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">Available Periods</h4>
                      <div className="space-y-2">
                        {availabilityForecast.available_dates.map((period, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                            <span className="text-green-800">
                              {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                            </span>
                            <Badge className="bg-green-100 text-green-800">
                              {period.duration_days} days
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Upcoming Bookings */}
                    <div>
                      <h4 className="font-semibold mb-3">Upcoming Bookings</h4>
                      <div className="space-y-2">
                        {availabilityForecast.upcoming_bookings.map((booking) => (
                          <div key={booking.booking_id} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                            <div>
                              <span className="font-medium">{booking.customer}</span>
                              <span className="text-gray-600 ml-2">
                                {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                              </span>
                            </div>
                            <Badge className="bg-blue-100 text-blue-800">
                              {booking.duration_days} days
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select Equipment</h3>
                  <p className="text-gray-600">Select equipment from the Utilization tab to view availability forecast.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EquipmentTrackingDashboard;