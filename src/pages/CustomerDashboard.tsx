import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, DollarSign, Package, Truck, AlertCircle, CheckCircle, Clock, MapPin, FileText, Zap, Settings, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DemoTour from '@/components/DemoTour';

const CustomerDashboard = () => {
  const { user, profile, showDemoTour, setShowDemoTour } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [rentalRequests, setRentalRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isDemoUser = user?.email === 'demo.customer@allrentz.com';

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchRentalRequests();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchRentalRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_requests')
        .select(`
          *,
          equipment (
            title,
            daily_rate,
            category,
            image_url
          )
        `)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRentalRequests(data || []);
    } catch (error) {
      console.error('Error fetching rental requests:', error);
    } finally {
      setLoading(false);
    }
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
            Welcome back, {profile?.full_name || 'Customer'}
          </h1>
          <p className="text-gray-600 mt-2">
            {profile?.company_name || 'Your Company'} • Customer Dashboard
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
                <p className="text-sm text-gray-600">Find equipment matches</p>
              </div>
            </div>
          </Link>
          
          <Link to="/smart-draft" className="industrial-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3">
              <Edit className="h-8 w-8 text-teal-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Smart Draft</h3>
                <p className="text-sm text-gray-600">Draft a quote request</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Rentals */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5" />
                  <span>Active Rentals</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rentalRequests.length > 0 ? (
                  <div className="space-y-4">
                    {rentalRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {request.equipment?.image_url && (
                              <img 
                                src={request.equipment.image_url} 
                                alt={request.equipment.title}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <h4 className="font-semibold">{request.equipment?.title}</h4>
                              <p className="text-sm text-gray-600">{request.equipment?.category}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(request.status)}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1 capitalize">{request.status}</span>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Start Date</p>
                            <p className="font-medium">{new Date(request.start_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">End Date</p>
                            <p className="font-medium">{new Date(request.end_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Daily Rate</p>
                            <p className="font-medium">${request.equipment?.daily_rate}/day</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Total</p>
                            <p className="font-medium">${request.total_amount}</p>
                          </div>
                        </div>
                        
                        {request.delivery_address && (
                          <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>{request.delivery_address}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Rentals</h3>
                    <p className="text-gray-600 mb-4">Start browsing equipment to create your first rental request.</p>
                    <Link to="/browse">
                      <Button>Browse Equipment</Button>
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
      </div>
    </div>
  );
};

export default CustomerDashboard;
