import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useCsvAuth } from '@/contexts/CsvAuthContext';
import { useBookingService } from '@/hooks/useBookingService';
import { BookingDetails, BookingStatusUpdate, CreateBookingRequest, BookingStats, BookingFilters } from '@/services/bookingService';
import { Booking } from '@/repositories/interfaces';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock, 
  User, 
  Building2, 
  Wrench,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle
} from 'lucide-react';

interface BookingManagementProps {
  userRole: 'customer' | 'vendor' | 'admin';
  showCreateBooking?: boolean;
}

const statusConfig = {
  pending: { icon: AlertCircle, color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  confirmed: { icon: CheckCircle, color: 'bg-blue-500', textColor: 'text-blue-700' },
  active: { icon: PlayCircle, color: 'bg-green-500', textColor: 'text-green-700' },
  completed: { icon: CheckCircle, color: 'bg-gray-500', textColor: 'text-gray-700' },
  cancelled: { icon: XCircle, color: 'bg-red-500', textColor: 'text-red-700' }
};

export default function BookingManagement({ userRole, showCreateBooking = true }: BookingManagementProps) {
  const { csvUser, profile } = useCsvAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bookingService = useBookingService();

  const [selectedTab, setSelectedTab] = useState('all');
  const [filters, setFilters] = useState<BookingFilters>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createBookingData, setCreateBookingData] = useState<CreateBookingRequest>({
    customer_id: csvUser?.id || '',
    equipment_id: '',
    start_date: '',
    end_date: '',
    location: '',
    requirements: {}
  });

  // Queries
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', userRole, csvUser?.id, filters],
    queryFn: async () => {
      if (!csvUser?.id) return [];
      
      if (userRole === 'customer') {
        return await bookingService.getCustomerBookings(csvUser.id, filters);
      } else if (userRole === 'vendor') {
        return await bookingService.getVendorBookings(csvUser.id, filters);
      } else {
        // Admin - get all bookings
        const allBookings = await bookingService.searchBookings('', ['id']);
        return allBookings;
      }
    },
    enabled: !!csvUser?.id
  });

  const { data: stats } = useQuery({
    queryKey: ['booking-stats', userRole, csvUser?.id],
    queryFn: async () => {
      return await bookingService.getBookingStats(
        userRole === 'customer' ? { customer_id: csvUser?.id } :
        userRole === 'vendor' ? { vendor_id: csvUser?.id } :
        {}
      );
    },
    enabled: !!csvUser?.id
  });

  const { data: upcomingBookings } = useQuery({
    queryKey: ['upcoming-bookings', csvUser?.id, userRole],
    queryFn: async () => {
      if (!csvUser?.id) return [];
      return await bookingService.getUpcomingBookings(csvUser.id, userRole);
    },
    enabled: !!csvUser?.id
  });

  // Mutations
  const createBookingMutation = useMutation({
    mutationFn: (data: CreateBookingRequest) => bookingService.createBooking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-stats'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
      setShowCreateDialog(false);
      setCreateBookingData({
        customer_id: csvUser?.id || '',
        equipment_id: '',
        start_date: '',
        end_date: '',
        location: '',
        requirements: {}
      });
      toast({
        title: 'Booking Created',
        description: 'Your booking request has been submitted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Booking Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: (update: BookingStatusUpdate) => bookingService.updateBookingStatus(update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-stats'] });
      toast({
        title: 'Booking Updated',
        description: 'Booking status has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const cancelBookingMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      bookingService.cancelBooking(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-stats'] });
      toast({
        title: 'Booking Cancelled',
        description: 'The booking has been cancelled successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cancellation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const confirmBookingMutation = useMutation({
    mutationFn: (bookingId: string) => bookingService.confirmBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-stats'] });
      toast({
        title: 'Booking Confirmed',
        description: 'The booking has been confirmed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Confirmation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Filter bookings based on selected tab
  const filteredBookings = bookings?.filter(booking => {
    if (selectedTab === 'all') return true;
    return booking.status === selectedTab;
  }) || [];

  // Handle create booking
  const handleCreateBooking = () => {
    createBookingMutation.mutate(createBookingData);
  };

  // Handle status updates
  const handleStatusUpdate = (booking: BookingDetails, newStatus: Booking['status']) => {
    updateStatusMutation.mutate({ id: booking.id, status: newStatus });
  };

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

  const getStatusBadge = (status: Booking['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <PlayCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.revenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold">{Math.round(stats.averageDuration)}d</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header with Create Booking */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {userRole === 'customer' ? 'My Bookings' : 
           userRole === 'vendor' ? 'Customer Bookings' : 
           'All Bookings'}
        </h2>
        
        {showCreateBooking && userRole === 'customer' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>Create Booking</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Booking</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="equipment_id">Equipment ID</Label>
                  <Input
                    id="equipment_id"
                    value={createBookingData.equipment_id}
                    onChange={(e) => setCreateBookingData({
                      ...createBookingData,
                      equipment_id: e.target.value
                    })}
                    placeholder="Enter equipment ID"
                  />
                </div>
                
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={createBookingData.start_date}
                    onChange={(e) => setCreateBookingData({
                      ...createBookingData,
                      start_date: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={createBookingData.end_date}
                    onChange={(e) => setCreateBookingData({
                      ...createBookingData,
                      end_date: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={createBookingData.location}
                    onChange={(e) => setCreateBookingData({
                      ...createBookingData,
                      location: e.target.value
                    })}
                    placeholder="Houston, TX"
                  />
                </div>
                
                <Button 
                  onClick={handleCreateBooking}
                  disabled={createBookingMutation.isPending}
                  className="w-full"
                >
                  {createBookingMutation.isPending ? 'Creating...' : 'Create Booking'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Upcoming Bookings Alert */}
      {upcomingBookings && upcomingBookings.length > 0 && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            You have {upcomingBookings.length} upcoming booking{upcomingBookings.length !== 1 ? 's' : ''} 
            in the next 7 days.
          </AlertDescription>
        </Alert>
      )}

      {/* Bookings Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">All ({bookings?.length || 0})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({bookings?.filter(b => b.status === 'pending').length || 0})
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmed ({bookings?.filter(b => b.status === 'confirmed').length || 0})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({bookings?.filter(b => b.status === 'active').length || 0})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({bookings?.filter(b => b.status === 'completed').length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No bookings found for this status.</p>
              </CardContent>
            </Card>
          ) : (
            filteredBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">
                          {booking.equipment?.title || `Equipment ${booking.equipment_id}`}
                        </h3>
                        {getStatusBadge(booking.status)}
                      </div>
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{booking.location}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span>
                            {formatCurrency(booking.daily_rate)}/day • 
                            Total: {formatCurrency(booking.total_amount)}
                          </span>
                        </div>
                        
                        {userRole === 'vendor' && booking.customer && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>Customer: {booking.customer.name}</span>
                          </div>
                        )}
                        
                        {userRole === 'customer' && booking.vendor_company && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>Vendor: {booking.vendor_company.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {userRole === 'vendor' && booking.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => confirmBookingMutation.mutate(booking.id)}
                          disabled={confirmBookingMutation.isPending}
                        >
                          Confirm
                        </Button>
                      )}
                      
                      {userRole === 'vendor' && booking.status === 'confirmed' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(booking, 'active')}
                        >
                          Start
                        </Button>
                      )}
                      
                      {userRole === 'vendor' && booking.status === 'active' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(booking, 'completed')}
                        >
                          Complete
                        </Button>
                      )}
                      
                      {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelBookingMutation.mutate({ id: booking.id })}
                          disabled={cancelBookingMutation.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {booking.equipment?.description && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {booking.equipment.description}
                    </p>
                  )}

                  {booking.confirmed_at && (
                    <div className="text-xs text-green-600">
                      Confirmed: {formatDate(booking.confirmed_at)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}