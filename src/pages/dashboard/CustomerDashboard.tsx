import React, { useState, useEffect } from 'react';
import { useCsvAuth } from '@/contexts/CsvAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Calendar, DollarSign, Package, Truck, AlertCircle, CheckCircle, Clock, MapPin, FileText, Zap, Settings, Edit, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import DemoTour from '@/components/DemoTour';
import BookingManagement from '@/components/BookingManagement';
import BookingCard from '@/components/BookingCard';
import { useBookingService } from '@/hooks/useBookingService';
import { useQuery } from '@tanstack/react-query';

const CustomerDashboard = () => {
  const { csvUser, profile, showDemoTour, setShowDemoTour } = useCsvAuth();
  const { toast } = useToast();
  const bookingService = useBookingService();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isDemoUser = csvUser?.email === 'demo.customer@allrentz.com';

  // Get recent bookings
  const { data: recentBookings } = useQuery({
    queryKey: ['recent-bookings', csvUser?.id],
    queryFn: async () => {
      if (!csvUser?.id) return [];
      const bookings = await bookingService.getCustomerBookings(csvUser.id);
      return bookings.slice(0, 3); // Get last 3 bookings
    },
    enabled: !!csvUser?.id
  });

  // Get upcoming bookings
  const { data: upcomingBookings } = useQuery({
    queryKey: ['upcoming-bookings', csvUser?.id],
    queryFn: async () => {
      if (!csvUser?.id) return [];
      return await bookingService.getUpcomingBookings(csvUser.id, 'customer');
    },
    enabled: !!csvUser?.id
  });

  // Get booking stats
  const { data: bookingStats } = useQuery({
    queryKey: ['booking-stats', csvUser?.id],
    queryFn: async () => {
      if (!csvUser?.id) return null;
      return await bookingService.getBookingStats({ customer_id: csvUser.id });
    },
    enabled: !!csvUser?.id
  });

  useEffect(() => {
    // Mock notifications for demo
    if (isDemoUser) {
      setNotifications([
        {
          id: 'notif_1',
          title: 'Booking Confirmed',
          message: 'Your Steam Boiler rental has been confirmed',
          created_at: new Date().toISOString(),
          read: false
        },
        {
          id: 'notif_2', 
          title: 'Delivery Scheduled',
          message: 'Equipment delivery scheduled for tomorrow',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          read: false
        }
      ]);
    }
    setLoading(false);
  }, [isDemoUser]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-allrentz-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Demo Tour */}
        {showDemoTour && isDemoUser && (
          <DemoTour 
            userType="customer" 
            onClose={() => setShowDemoTour(false)} 
          />
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {csvUser?.name || profile?.full_name || 'Customer'}
          </h1>
          <p className="text-gray-600 mt-2">
            {profile?.company_name || csvUser?.company_id || 'Your Company'} • Customer Dashboard
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          <Link to="/browse" className="industrial-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-allrentz-red" />
              <div>
                <h3 className="font-semibold text-gray-900">Browse Equipment</h3>
                <p className="text-sm text-gray-600">Find rental equipment</p>
              </div>
            </div>
          </Link>
          
          <Link to="/smartmatch-demo" className="industrial-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">SmartMatch</h3>
                <p className="text-sm text-gray-600">AI-powered matching</p>
              </div>
            </div>
          </Link>
          
          <Link to="/smart-draft" className="industrial-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <Edit className="h-8 w-8 text-teal-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Smart Draft</h3>
                <p className="text-sm text-gray-600">AI quote generation</p>
              </div>
            </div>
          </Link>
          
          <Link to="/turnaround-management" className="industrial-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8 text-orange-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Turnaround</h3>
                <p className="text-sm text-gray-600">Manage turnarounds</p>
              </div>
            </div>
          </Link>
          
          <Link to="/delivery-tracking" className="industrial-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Schedule Delivery</h3>
                <p className="text-sm text-gray-600">Plan your rentals</p>
              </div>
            </div>
          </Link>
          
          <Link to="/documents-management" className="industrial-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-purple-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Documents</h3>
                <p className="text-sm text-gray-600">Manage paperwork</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Dashboard Statistics */}
        {bookingStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                    <p className="text-2xl font-bold">{bookingStats.total}</p>
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
                    <p className="text-2xl font-bold text-green-600">{bookingStats.active}</p>
                  </div>
                  <Truck className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{bookingStats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(bookingStats.revenue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="create">Create Booking</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Bookings */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Truck className="h-5 w-5" />
                      <span>Recent Bookings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentBookings && recentBookings.length > 0 ? (
                      <div className="space-y-4">
                        {recentBookings.map((booking) => (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            userRole="customer"
                            showActions={false}
                            compact={true}
                          />
                        ))}
                        <div className="text-center pt-4">
                          <Button variant="outline" onClick={() => document.querySelector('[data-value="bookings"]')?.click()}>
                            View All Bookings
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Yet</h3>
                        <p className="text-gray-600 mb-4">Start browsing equipment to create your first booking.</p>
                        <Link to="/browse">
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Browse Equipment
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Notifications */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-5 w-5" />
                      <span>Recent Notifications</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notifications.length > 0 ? (
                      <div className="space-y-3">
                        {notifications.map((notification) => (
                          <div key={notification.id} className={`p-3 rounded-lg border ${
                            notification.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="flex items-start space-x-2">
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                notification.read ? 'bg-gray-400' : 'bg-blue-600'
                              }`} />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{notification.title}</h4>
                                <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {new Date(notification.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">No notifications yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <BookingManagement userRole="customer" />
          </TabsContent>

          <TabsContent value="create">
            <div className="max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Booking</CardTitle>
                  <p className="text-muted-foreground">
                    To create a booking, first browse our equipment catalog or use SmartMatch to find the perfect equipment for your needs.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link to="/browse">
                      <Button className="w-full h-20 flex flex-col">
                        <Package className="h-6 w-6 mb-2" />
                        Browse Equipment
                      </Button>
                    </Link>
                    <Link to="/smartmatch-demo">
                      <Button variant="outline" className="w-full h-20 flex flex-col">
                        <Zap className="h-6 w-6 mb-2" />
                        Use SmartMatch
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerDashboard;
