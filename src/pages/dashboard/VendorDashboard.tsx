
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useCsvAuth } from '@/contexts/CsvAuthContext';
import { useBookingService } from '@/hooks/useBookingService';
import VendorPortal from '@/components/VendorPortal';
import BookingManagement from '@/components/BookingManagement';
import EquipmentTrackingDashboard from '@/components/EquipmentTrackingDashboard';
import EquipmentReturnProcessor from '@/components/EquipmentReturnProcessor';
import OperationalInsightsDashboard from '@/components/OperationalInsightsDashboard';
import { 
  Plus, 
  MapPin, 
  Calendar, 
  FileText, 
  Bell, 
  Settings, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Package,
  Wrench,
  Activity,
  BarChart3
} from 'lucide-react';

const VendorDashboard = () => {
  const { csvUser, profile } = useCsvAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const bookingService = useBookingService();

  const isDemoUser = csvUser?.email === 'demo.vendor@allrentz.com';

  // Get vendor bookings
  const { data: vendorBookings } = useQuery({
    queryKey: ['vendor-bookings', csvUser?.id],
    queryFn: async () => {
      if (!csvUser?.id) return [];
      return await bookingService.getVendorBookings(csvUser.id);
    },
    enabled: !!csvUser?.id
  });

  // Get booking stats for vendor
  const { data: bookingStats } = useQuery({
    queryKey: ['vendor-booking-stats', csvUser?.id],
    queryFn: async () => {
      if (!csvUser?.id) return null;
      return await bookingService.getBookingStats({ vendor_id: csvUser.id });
    },
    enabled: !!csvUser?.id
  });

  // Get recent bookings
  const { data: recentBookings } = useQuery({
    queryKey: ['vendor-recent-bookings', csvUser?.id],
    queryFn: async () => {
      if (!csvUser?.id) return [];
      const bookings = await bookingService.getVendorBookings(csvUser.id);
      return bookings.slice(0, 5); // Get last 5 bookings
    },
    enabled: !!csvUser?.id
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'industrial-badge-approved';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 industrial-badge';
      case 'pending':
        return 'industrial-badge-pending';
      case 'completed':
        return 'bg-gray-100 text-gray-800 industrial-badge';
      case 'cancelled':
        return 'industrial-badge-alert';
      default:
        return 'industrial-badge';
    }
  };

  return (
    <div className="min-h-screen bg-allrentz-gray-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-allrentz-gray">
                Welcome back, {csvUser?.name || profile?.full_name || 'Vendor'}
              </h1>
              <p className="text-gray-600 mt-1">
                {profile?.company_name || csvUser?.company_id || 'Vendor Dashboard'}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Link to="/equipment-management" className="industrial-button inline-flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Equipment</span>
              </Link>
              <button className="industrial-button-secondary inline-flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={activeTab === 'overview' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <TrendingUp className="h-5 w-5" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('portal')}
                className={activeTab === 'portal' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <Activity className="h-5 w-5" />
                <span>Operations Portal</span>
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={activeTab === 'bookings' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <FileText className="h-5 w-5" />
                <span>My Bookings</span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={activeTab === 'analytics' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <BarChart3 className="h-5 w-5" />
                <span>Analytics</span>
              </button>
              <button
                onClick={() => setActiveTab('equipment')}
                className={activeTab === 'equipment' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <Package className="h-5 w-5" />
                <span>Equipment</span>
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={activeTab === 'maintenance' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <Wrench className="h-5 w-5" />
                <span>Maintenance</span>
              </button>
              <button
                onClick={() => setActiveTab('tracking')}
                className={activeTab === 'tracking' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <MapPin className="h-5 w-5" />
                <span>Equipment Tracking</span>
              </button>
              <button
                onClick={() => setActiveTab('returns')}
                className={activeTab === 'returns' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <Package className="h-5 w-5" />
                <span>Process Returns</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={activeTab === 'settings' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Dashboard Statistics */}
                {bookingStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="dashboard-stat">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Bookings</p>
                          <p className="text-2xl font-bold text-allrentz-gray">{bookingStats.total}</p>
                        </div>
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div className="dashboard-stat">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Active Rentals</p>
                          <p className="text-2xl font-bold text-green-600">{bookingStats.active}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    
                    <div className="dashboard-stat">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Pending</p>
                          <p className="text-2xl font-bold text-yellow-600">{bookingStats.pending}</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      </div>
                    </div>
                    
                    <div className="dashboard-stat">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Revenue</p>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(bookingStats.revenue)}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Bookings */}
                <div className="industrial-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-allrentz-gray">Recent Bookings</h2>
                    <button 
                      onClick={() => setActiveTab('bookings')}
                      className="text-allrentz-red hover:text-allrentz-red-dark font-medium"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {recentBookings && recentBookings.length > 0 ? (
                      recentBookings.map((booking) => (
                        <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold text-allrentz-gray">
                                  {booking.equipment?.title || `Equipment ${booking.equipment_id.slice(0, 8)}`}
                                </h3>
                                <span className={getStatusBadge(booking.status)}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                              </div>
                              {booking.customer && (
                                <p className="text-sm text-gray-600 mb-1">Customer: {booking.customer.name}</p>
                              )}
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{booking.location}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(booking.start_date)} - {formatDate(booking.end_date)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 md:mt-0 md:text-right">
                              <div className="text-lg font-semibold text-allrentz-gray mb-2">
                                {formatCurrency(booking.total_amount)}
                              </div>
                              <div className="flex space-x-2">
                                <button className="industrial-button text-sm py-1 px-3">
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Bookings</h3>
                        <p className="text-gray-600">Your recent bookings will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="industrial-card p-6">
                  <h2 className="text-xl font-bold text-allrentz-gray mb-6">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('portal')}
                      className="industrial-button w-full flex items-center justify-center space-x-2 p-4"
                    >
                      <Activity className="h-5 w-5" />
                      <span>Operations Portal</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="industrial-button-secondary w-full flex items-center justify-center space-x-2 p-4"
                    >
                      <FileText className="h-5 w-5" />
                      <span>View All Bookings</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium w-full flex items-center justify-center space-x-2 p-4 rounded-md"
                    >
                      <BarChart3 className="h-5 w-5" />
                      <span>View Analytics</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'portal' && (
              <VendorPortal />
            )}

            {activeTab === 'bookings' && (
              <BookingManagement userRole="vendor" />
            )}

            {activeTab === 'analytics' && (
              <OperationalInsightsDashboard vendorId={csvUser?.id} userRole="vendor" />
            )}

            {activeTab === 'equipment' && (
              <div className="space-y-6">
                <div className="industrial-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-allrentz-gray">Equipment Management</h2>
                    <Link to="/equipment-management" className="industrial-button inline-flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Add Equipment</span>
                    </Link>
                  </div>
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Equipment Management</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Comprehensive equipment inventory management will be available here. 
                      Add, edit, and track your equipment listings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="industrial-card p-6">
                  <h2 className="text-xl font-bold text-allrentz-gray mb-6">Maintenance Management</h2>
                  <div className="text-center py-12">
                    <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Maintenance Scheduler</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Equipment maintenance scheduling and tracking system. 
                      For now, use the Operations Portal to schedule maintenance alerts.
                    </p>
                    <button
                      onClick={() => setActiveTab('portal')}
                      className="industrial-button mt-4"
                    >
                      Go to Operations Portal
                    </button>
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'tracking' && (
              <EquipmentTrackingDashboard vendorId={csvUser?.id} userRole="vendor" />
            )}

            {activeTab === 'returns' && (
              <EquipmentReturnProcessor 
                vendorId={csvUser?.id} 
                onReturnProcessed={(equipmentId, bookingId) => {
                  // Refresh vendor bookings when a return is processed
                  window.location.reload(); // Simple refresh for now
                }}
              />
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="industrial-card p-6">
                  <h2 className="text-xl font-bold text-allrentz-gray mb-6">Vendor Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-allrentz-gray mb-3">Profile Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input 
                            type="text" 
                            className="industrial-input w-full" 
                            defaultValue={csvUser?.name || profile?.full_name || ''}
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input 
                            type="email" 
                            className="industrial-input w-full" 
                            defaultValue={csvUser?.email || profile?.email || ''}
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                          <input 
                            type="text" 
                            className="industrial-input w-full" 
                            defaultValue={profile?.company_name || csvUser?.company_id || ''}
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <input 
                            type="text" 
                            className="industrial-input w-full" 
                            defaultValue={csvUser?.role || profile?.role || ''}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-allrentz-gray mb-3">Compliance Documents</h3>
                      <div className="space-y-3">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-6 w-6 text-allrentz-red" />
                              <div>
                                <h4 className="font-semibold text-allrentz-gray">General Liability Insurance</h4>
                                <p className="text-sm text-gray-600">Expires: December 31, 2024</p>
                              </div>
                            </div>
                            <span className="industrial-badge-approved">Valid</span>
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-6 w-6 text-allrentz-red" />
                              <div>
                                <h4 className="font-semibold text-allrentz-gray">Equipment Safety Certificates</h4>
                                <p className="text-sm text-gray-600">Last updated: June 1, 2024</p>
                              </div>
                            </div>
                            <span className="industrial-badge-approved">Current</span>
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-6 w-6 text-yellow-500" />
                              <div>
                                <h4 className="font-semibold text-allrentz-gray">OSHA Compliance Certificate</h4>
                                <p className="text-sm text-gray-600">Expires: August 15, 2024</p>
                              </div>
                            </div>
                            <span className="industrial-badge-pending">Renewal Due</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-allrentz-gray mb-3">Notifications</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                          <label className="text-sm text-gray-700">New booking requests</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                          <label className="text-sm text-gray-700">Equipment maintenance reminders</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                          <label className="text-sm text-gray-700">Payment notifications</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
