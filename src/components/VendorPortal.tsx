import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCsvAuth } from '@/contexts/CsvAuthContext';
import { useToast } from '@/hooks/use-toast';
import { VendorOperationsService } from '@/services/vendorOperationsService';
import {
  Calendar,
  Clock,
  Truck,
  AlertTriangle,
  CheckCircle,
  Package,
  DollarSign,
  TrendingUp,
  MapPin,
  Wrench,
  RefreshCw,
  Bell,
  Settings,
  BarChart3,
  Activity,
  Target,
  Timer,
  FileText,
  User,
  Zap
} from 'lucide-react';

interface VendorPortalProps {
  className?: string;
}

const VendorPortal: React.FC<VendorPortalProps> = ({ className }) => {
  const { csvUser } = useCsvAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');

  const vendorOperationsService = new VendorOperationsService();

  // Get vendor KPIs
  const { data: vendorKPIs } = useQuery({
    queryKey: ['vendor-kpis', csvUser?.id],
    queryFn: async () => {
      if (!csvUser?.id) return null;
      return await vendorOperationsService.getVendorKPIs(csvUser.id);
    },
    enabled: !!csvUser?.id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Get equipment utilization
  const { data: equipmentUtilization } = useQuery({
    queryKey: ['equipment-utilization', csvUser?.id],
    queryFn: async () => {
      if (!csvUser?.id) return [];
      return await vendorOperationsService.getEquipmentUtilization(csvUser.id);
    },
    enabled: !!csvUser?.id
  });

  // Get upcoming returns
  const { data: upcomingReturns } = useQuery({
    queryKey: ['upcoming-returns', csvUser?.id],
    queryFn: async () => {
      if (!csvUser?.id) return [];
      return await vendorOperationsService.getUpcomingReturns(csvUser.id);
    },
    enabled: !!csvUser?.id,
    refetchInterval: 60000 // Refresh every minute
  });

  // Get maintenance schedule
  const { data: maintenanceSchedule } = useQuery({
    queryKey: ['maintenance-schedule', csvUser?.id],
    queryFn: async () => {
      if (!csvUser?.id) return [];
      return await vendorOperationsService.getMaintenanceSchedule(csvUser.id);
    },
    enabled: !!csvUser?.id
  });

  // Get vendor alerts
  const { data: vendorAlerts } = useQuery({
    queryKey: ['vendor-alerts', csvUser?.id],
    queryFn: async () => {
      if (!csvUser?.id) return [];
      return await vendorOperationsService.getVendorAlerts(csvUser.id);
    },
    enabled: !!csvUser?.id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Schedule maintenance mutation
  const scheduleMaintenanceMutation = useMutation({
    mutationFn: async (data: { equipment_id: string; notes: string; priority: 'low' | 'medium' | 'high' }) => {
      return await vendorOperationsService.scheduleMaintenanceAlert(
        data.equipment_id,
        data.priority,
        data.notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-alerts'] });
      toast({
        title: 'Maintenance Scheduled',
        description: 'Maintenance alert has been scheduled successfully.',
      });
      setSelectedEquipment('');
      setMaintenanceNotes('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Scheduling Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Schedule delivery mutation
  const scheduleDeliveryMutation = useMutation({
    mutationFn: async (data: { equipment_id: string; date: string; location: string }) => {
      const event = await vendorOperationsService.createTurnaroundEvent({
        equipment_id: data.equipment_id,
        event_type: 'delivery',
        scheduled_date: data.date,
        location: data.location,
        vendor_id: csvUser?.id || '',
        status: 'scheduled'
      });
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-returns'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-alerts'] });
      toast({
        title: 'Delivery Scheduled',
        description: 'Equipment delivery has been scheduled successfully.',
      });
      setSelectedEquipment('');
      setDeliveryDate('');
      setDeliveryLocation('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Scheduling Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'maintenance': return <Wrench className="h-4 w-4" />;
      case 'overdue_return': return <AlertTriangle className="h-4 w-4" />;
      case 'delivery_due': return <Truck className="h-4 w-4" />;
      case 'low_utilization': return <TrendingUp className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500'
    };
    return (
      <Badge className={`${colors[priority as keyof typeof colors]} text-white`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  if (!csvUser?.id) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to access the vendor portal.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Operations Portal</h1>
        <p className="text-gray-600">
          Manage your equipment rentals, track turnarounds, and optimize operations
        </p>
      </div>

      {/* KPI Overview */}
      {vendorKPIs && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Equipment</p>
                  <p className="text-2xl font-bold">{vendorKPIs.total_equipment}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Rentals</p>
                  <p className="text-2xl font-bold text-green-600">{vendorKPIs.active_rentals}</p>
                </div>
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Utilization Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(vendorKPIs.utilization_rate * 100)}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(vendorKPIs.monthly_revenue)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert Section */}
      {vendorAlerts && vendorAlerts.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vendorAlerts.slice(0, 5).map((alert) => (
                <Alert key={alert.id} className={getAlertColor(alert.priority)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <AlertDescription className="font-medium">
                          {alert.title}
                        </AlertDescription>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(alert.created_at)}
                        </p>
                      </div>
                    </div>
                    {getPriorityBadge(alert.priority)}
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="turnaround" className="space-y-6">
        <TabsList>
          <TabsTrigger value="turnaround">Turnaround Schedule</TabsTrigger>
          <TabsTrigger value="returns">Upcoming Returns</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="turnaround" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Schedule Delivery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Schedule Equipment Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="delivery-equipment">Equipment</Label>
                  <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipmentUtilization?.map((equipment) => (
                        <SelectItem key={equipment.equipment_id} value={equipment.equipment_id}>
                          {equipment.equipment_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="delivery-date">Delivery Date</Label>
                  <Input
                    id="delivery-date"
                    type="datetime-local"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="delivery-location">Delivery Location</Label>
                  <Input
                    id="delivery-location"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder="Enter delivery address"
                  />
                </div>
                
                <Button
                  onClick={() => scheduleDeliveryMutation.mutate({
                    equipment_id: selectedEquipment,
                    date: deliveryDate,
                    location: deliveryLocation
                  })}
                  disabled={!selectedEquipment || !deliveryDate || !deliveryLocation || scheduleDeliveryMutation.isPending}
                  className="w-full"
                >
                  {scheduleDeliveryMutation.isPending ? 'Scheduling...' : 'Schedule Delivery'}
                </Button>
              </CardContent>
            </Card>

            {/* Schedule Maintenance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Schedule Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="maintenance-equipment">Equipment</Label>
                  <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipmentUtilization?.map((equipment) => (
                        <SelectItem key={equipment.equipment_id} value={equipment.equipment_id}>
                          {equipment.equipment_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="maintenance-notes">Maintenance Notes</Label>
                  <Textarea
                    id="maintenance-notes"
                    value={maintenanceNotes}
                    onChange={(e) => setMaintenanceNotes(e.target.value)}
                    placeholder="Describe the maintenance required..."
                    rows={3}
                  />
                </div>
                
                <Button
                  onClick={() => scheduleMaintenanceMutation.mutate({
                    equipment_id: selectedEquipment,
                    notes: maintenanceNotes,
                    priority: 'medium'
                  })}
                  disabled={!selectedEquipment || !maintenanceNotes || scheduleMaintenanceMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {scheduleMaintenanceMutation.isPending ? 'Scheduling...' : 'Schedule Maintenance'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Upcoming Returns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingReturns && upcomingReturns.length > 0 ? (
                <div className="space-y-4">
                  {upcomingReturns.map((returnItem) => (
                    <div key={returnItem.booking_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{returnItem.equipment_title}</h4>
                        <div className="flex items-center gap-2">
                          {returnItem.is_overdue && (
                            <Badge className="bg-red-500 text-white">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                          <Badge variant={returnItem.days_until_return <= 2 ? "destructive" : "outline"}>
                            {returnItem.days_until_return} days
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {formatDate(returnItem.end_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{returnItem.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{returnItem.customer_name}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Returns</h3>
                  <p className="text-gray-600">All equipment returns are up to date.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Maintenance Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {maintenanceSchedule && maintenanceSchedule.length > 0 ? (
                <div className="space-y-4">
                  {maintenanceSchedule.map((maintenance) => (
                    <div key={maintenance.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{maintenance.equipment_title}</h4>
                        {getPriorityBadge(maintenance.priority)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {maintenance.notes}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Scheduled: {formatDate(maintenance.scheduled_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Status: {maintenance.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Maintenance</h3>
                  <p className="text-gray-600">All equipment is up to date with maintenance.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Equipment Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              {equipmentUtilization && equipmentUtilization.length > 0 ? (
                <div className="space-y-4">
                  {equipmentUtilization.map((equipment) => (
                    <div key={equipment.equipment_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{equipment.equipment_title}</h4>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {Math.round(equipment.utilization_rate * 100)}% Utilization
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {equipment.total_bookings} bookings
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${equipment.utilization_rate * 100}%` }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span>Revenue: {formatCurrency(equipment.total_revenue)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4" />
                          <span>Days Rented: {equipment.total_days_rented}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          <span>Avg Daily Rate: {formatCurrency(equipment.average_daily_rate)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Utilization Data</h3>
                  <p className="text-gray-600">Equipment utilization data will appear here once you have active rentals.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Equipment Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar View Coming Soon</h3>
                <p className="text-gray-600">
                  Interactive calendar view for equipment scheduling will be available in the next update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorPortal;