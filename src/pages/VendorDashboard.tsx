
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Calendar, FileText, Bell, Settings, DollarSign, CheckCircle, AlertTriangle, TrendingUp, Package } from 'lucide-react';
import RentalStatusTimeline from '@/components/RentalStatusTimeline';
import DigitalBinder from '@/components/DigitalBinder';

const VendorDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for vendor
  const equipmentInventory = [
    {
      id: 1,
      name: 'Steam Boiler - 150 HP',
      category: 'Boilers',
      status: 'Rented',
      dailyRate: 850,
      location: 'Gulf Coast Refinery',
      rentedUntil: '2024-07-15',
      image: 'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=300&h=200&fit=crop'
    },
    {
      id: 2,
      name: 'Frac Tank - 21,000 Gal',
      category: 'Storage',
      status: 'Available',
      dailyRate: 125,
      location: 'Warehouse A',
      rentedUntil: null,
      image: 'https://images.unsplash.com/photo-1493962853295-0fd70327578a?w=300&h=200&fit=crop'
    },
    {
      id: 3,
      name: 'Industrial Generator - 500kW',
      category: 'Power',
      status: 'Maintenance',
      dailyRate: 450,
      location: 'Service Bay 2',
      rentedUntil: null,
      image: 'https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=300&h=200&fit=crop'
    }
  ];

  const quoteRequests = [
    {
      id: 1,
      customer: 'Gulf Coast Refinery',
      equipment: 'Industrial Crane - 50 Ton',
      requestDate: '2024-06-18',
      location: 'Offshore Platform C-14',
      duration: '30 days',
      status: 'New',
      urgency: 'High'
    },
    {
      id: 2,
      customer: 'Texas Tank Terminal',
      equipment: 'Frac Tank - 15,000 Gal',
      requestDate: '2024-06-17',
      location: 'Terminal B Complex',
      duration: '60 days',
      status: 'Quoted',
      urgency: 'Medium'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Rented':
        return 'industrial-badge-approved';
      case 'Available':
        return 'bg-green-100 text-green-800 industrial-badge';
      case 'Maintenance':
        return 'industrial-badge-alert';
      case 'New':
        return 'industrial-badge-pending';
      case 'Quoted':
        return 'industrial-badge-approved';
      default:
        return 'industrial-badge';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'High':
        return 'bg-red-100 text-red-800 industrial-badge';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 industrial-badge';
      case 'Low':
        return 'bg-green-100 text-green-800 industrial-badge';
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
              <h1 className="text-2xl font-bold text-allrentz-gray">Vendor Dashboard</h1>
              <p className="text-gray-600 mt-1">Gulf Coast Equipment Rentals</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button className="industrial-button inline-flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Equipment</span>
              </button>
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
                onClick={() => setActiveTab('inventory')}
                className={activeTab === 'inventory' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <Package className="h-5 w-5" />
                <span>Equipment</span>
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={activeTab === 'requests' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <FileText className="h-5 w-5" />
                <span>Quote Requests</span>
              </button>
              <button
                onClick={() => setActiveTab('earnings')}
                className={activeTab === 'earnings' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <DollarSign className="h-5 w-5" />
                <span>Earnings</span>
              </button>
              <button
                onClick={() => setActiveTab('tracking')}
                className={activeTab === 'tracking' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <MapPin className="h-5 w-5" />
                <span>Asset Tracking</span>
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={activeTab === 'documents' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <FileText className="h-5 w-5" />
                <span>Documents</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={activeTab === 'settings' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </button>
              <Link to="/turnaround-management" className="nav-link w-full">
                <Settings className="h-5 w-5" />
                <span>Turnaround Management</span>
              </Link>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="dashboard-stat">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Equipment</p>
                        <p className="text-2xl font-bold text-allrentz-gray">24</p>
                      </div>
                      <Package className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Currently Rented</p>
                        <p className="text-2xl font-bold text-allrentz-gray">8</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">This Month</p>
                        <p className="text-2xl font-bold text-allrentz-gray">$45,320</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-allrentz-red" />
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Pending Quotes</p>
                        <p className="text-2xl font-bold text-allrentz-gray">3</p>
                      </div>
                      <FileText className="h-8 w-8 text-yellow-500" />
                    </div>
                  </div>
                </div>

                {/* Recent Quote Requests */}
                <div className="industrial-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-allrentz-gray">Recent Quote Requests</h2>
                    <button className="text-allrentz-red hover:text-allrentz-red-dark font-medium">
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {quoteRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold text-allrentz-gray">{request.equipment}</h3>
                              <span className={getUrgencyBadge(request.urgency)}>
                                {request.urgency} Priority
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">Customer: {request.customer}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-4 w-4" />
                                <span>{request.location}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{request.duration}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 md:mt-0 md:text-right">
                            <span className={`${getStatusBadge(request.status)} mb-2 inline-block`}>
                              {request.status}
                            </span>
                            <div className="flex space-x-2">
                              <button className="industrial-button text-sm py-1 px-3">
                                {request.status === 'New' ? 'Send Quote' : 'View Quote'}
                              </button>
                              <button className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-1 px-3 rounded-md text-sm">
                                Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Rental Status */}
                <div className="industrial-card p-6">
                  <RentalStatusTimeline
                    currentStatus="en_route"
                    rentalData={{
                      scheduledDate: 'Jun 18',
                      dispatchDate: 'Jun 20',
                    }}
                  />
                </div>

                {/* Equipment Overview */}
                <div className="industrial-card p-6">
                  <h2 className="text-xl font-bold text-allrentz-gray mb-6">Equipment Overview</h2>
                  <div className="space-y-4">
                    {equipmentInventory.slice(0, 3).map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-4">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-allrentz-gray">{item.name}</h3>
                            <p className="text-sm text-gray-600">{item.category}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className={getStatusBadge(item.status)}>
                                {item.status}
                              </span>
                              <span className="text-sm text-gray-600">
                                ${item.dailyRate}/day
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span>{item.location}</span>
                            </div>
                            {item.rentedUntil && (
                              <p className="text-xs text-gray-500 mt-1">
                                Until: {new Date(item.rentedUntil).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="industrial-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-allrentz-gray">Equipment Inventory</h2>
                    <button className="industrial-button inline-flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Add Equipment</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {equipmentInventory.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                          <h3 className="font-semibold text-allrentz-gray mb-2">{item.name}</h3>
                          <p className="text-sm text-gray-600 mb-3">{item.category}</p>
                          <div className="flex items-center justify-between mb-3">
                            <span className={getStatusBadge(item.status)}>
                              {item.status}
                            </span>
                            <span className="font-semibold text-allrentz-gray">
                              ${item.dailyRate}/day
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
                            <MapPin className="h-4 w-4" />
                            <span>{item.location}</span>
                          </div>
                          <div className="flex space-x-2">
                            <button className="flex-1 industrial-button-secondary text-sm py-2">
                              Edit
                            </button>
                            <button className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md text-sm">
                              Track
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="industrial-card p-6">
                <h2 className="text-xl font-bold text-allrentz-gray mb-6">Quote Requests</h2>
                <div className="space-y-4">
                  {quoteRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-bold text-allrentz-gray">{request.equipment}</h3>
                            <span className={getUrgencyBadge(request.urgency)}>
                              {request.urgency} Priority
                            </span>
                            <span className={getStatusBadge(request.status)}>
                              {request.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <p><span className="font-medium">Customer:</span> {request.customer}</p>
                              <p><span className="font-medium">Location:</span> {request.location}</p>
                            </div>
                            <div>
                              <p><span className="font-medium">Duration:</span> {request.duration}</p>
                              <p><span className="font-medium">Requested:</span> {new Date(request.requestDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 lg:mt-0 flex flex-col space-y-2">
                          <button className="industrial-button text-sm py-2 px-6">
                            {request.status === 'New' ? 'Send Quote' : 'View Quote'}
                          </button>
                          <button className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-6 rounded-md text-sm">
                            View Details
                          </button>
                          {request.status === 'New' && (
                            <button className="text-red-600 hover:text-red-700 font-medium py-2 px-6 text-sm">
                              Decline
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'earnings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="dashboard-stat">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">This Month</p>
                      <p className="text-3xl font-bold text-allrentz-gray">$45,320</p>
                      <p className="text-sm text-green-600">+12% from last month</p>
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">This Year</p>
                      <p className="text-3xl font-bold text-allrentz-gray">$425,680</p>
                      <p className="text-sm text-green-600">+28% from last year</p>
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Next Payout</p>
                      <p className="text-3xl font-bold text-allrentz-gray">$12,450</p>
                      <p className="text-sm text-gray-600">June 30, 2024</p>
                    </div>
                  </div>
                </div>

                <div className="industrial-card p-6">
                  <h2 className="text-xl font-bold text-allrentz-gray mb-6">Recent Transactions</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-allrentz-gray">Steam Boiler - 150 HP</p>
                        <p className="text-sm text-gray-600">Gulf Coast Refinery • 30 days</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-allrentz-gray">$25,500</p>
                        <p className="text-sm text-gray-600">Completed</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-allrentz-gray">Frac Tank - 21,000 Gal</p>
                        <p className="text-sm text-gray-600">Texas Tank Terminal • 60 days</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-allrentz-gray">$7,500</p>
                        <p className="text-sm text-green-600">Active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tracking' && (
              <div className="industrial-card p-6">
                <h2 className="text-xl font-bold text-allrentz-gray mb-6">Asset Tracking</h2>
                <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center mb-6">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Interactive map showing real-time equipment locations</p>
                    <p className="text-sm text-gray-500 mt-2">GPS tracking for all rented equipment</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-allrentz-gray">Active Equipment Locations</h3>
                  {equipmentInventory.filter(item => item.status === 'Rented').map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium text-allrentz-gray">{item.name}</p>
                          <p className="text-sm text-gray-600">{item.location}</p>
                        </div>
                      </div>
                      <button className="text-allrentz-red hover:text-allrentz-red-dark font-medium text-sm">
                        View on Map
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="industrial-card p-6">
                <DigitalBinder />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="industrial-card p-6">
                <h2 className="text-xl font-bold text-allrentz-gray mb-6">Vendor Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-allrentz-gray mb-3">Company Profile</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                        <input 
                          type="text" 
                          className="industrial-input w-full" 
                          defaultValue="Gulf Coast Equipment Rentals"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                        <input 
                          type="email" 
                          className="industrial-input w-full" 
                          defaultValue="rentals@gulfcoast.com"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-allrentz-gray mb-3">Payout Settings</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Connected to Stripe for secure payments</p>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-700">Account: ****1234</span>
                        <button className="text-allrentz-red hover:text-allrentz-red-dark font-medium text-sm">
                          Update
                        </button>
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
