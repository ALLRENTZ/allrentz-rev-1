import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Calendar, FileText, Bell, Settings, Clock, CheckCircle, AlertTriangle, Truck, DollarSign, Wrench, Package, Users } from 'lucide-react';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for active rentals
  const activeRentals = [
    {
      id: 1,
      equipment: 'Steam Boiler - 150 HP',
      vendor: 'Gulf Coast Equipment',
      location: 'Refinery Unit 3',
      status: 'Active',
      startDate: '2024-06-15',
      endDate: '2024-07-15',
      dailyRate: 850,
      image: 'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=300&h=200&fit=crop',
      deliveryETA: 'Delivered'
    },
    {
      id: 2,
      equipment: 'Frac Tank - 21,000 Gal',
      vendor: 'Texas Tank Rental',
      location: 'Tank Terminal A',
      status: 'In Transit',
      startDate: '2024-06-20',
      endDate: '2024-08-20',
      dailyRate: 125,
      image: 'https://images.unsplash.com/photo-1493962853295-0fd70327578a?w=300&h=200&fit=crop',
      deliveryETA: 'Tomorrow 10:00 AM'
    },
    {
      id: 3,
      equipment: 'Confined Space Ventilation',
      vendor: 'Safety First Rentals',
      location: 'Platform B-12',
      status: 'Active',
      startDate: '2024-06-18',
      endDate: '2024-06-25',
      dailyRate: 95,
      image: 'https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=300&h=200&fit=crop',
      deliveryETA: 'Delivered'
    }
  ];

  const notifications = [
    { id: 1, type: 'delivery', message: 'Frac Tank delivery scheduled for tomorrow 10:00 AM', time: '2 hours ago' },
    { id: 2, type: 'alert', message: 'Steam Boiler maintenance due in 3 days', time: '4 hours ago' },
    { id: 3, type: 'extension', message: 'Confined Space equipment rental expires in 7 days', time: '1 day ago' }
  ];

  // Mock data for turnaround projects
  const turnaroundProjects = [
    {
      id: 1,
      name: 'Unit 4 Catalyst Change',
      startDate: '2024-08-15',
      endDate: '2024-09-05',
      status: 'Planning',
      budget: 2500000,
      equipmentCount: 12,
      vendorCount: 6,
      progress: 35
    },
    {
      id: 2,
      name: 'Coker Maintenance 2024',
      startDate: '2024-10-10',
      endDate: '2024-11-02',
      status: 'Equipment Sourcing',
      budget: 1800000,
      equipmentCount: 8,
      vendorCount: 4,
      progress: 60
    }
  ];

  const equipmentPackages = [
    {
      id: 1,
      name: 'Heavy Lifting Package',
      description: 'Cranes, rigging equipment, and lifting accessories',
      equipmentCount: 5,
      estimatedCost: 125000,
      items: ['Mobile Crane 100T', 'Mobile Crane 50T', 'Rigging Kit', 'Chain Hoists', 'Safety Equipment']
    },
    {
      id: 2,
      name: 'Safety & Ventilation',
      description: 'Complete safety and air quality management',
      equipmentCount: 8,
      estimatedCost: 45000,
      items: ['Confined Space Ventilation', 'Gas Monitors', 'Emergency Equipment', 'Fall Protection']
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return 'industrial-badge-approved';
      case 'In Transit':
        return 'industrial-badge-pending';
      default:
        return 'industrial-badge';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle className="h-4 w-4" />;
      case 'In Transit':
        return <Truck className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTurnaroundStatusBadge = (status: string) => {
    switch (status) {
      case 'Planning':
        return 'industrial-badge';
      case 'Equipment Sourcing':
        return 'industrial-badge-pending';
      case 'Ready':
        return 'industrial-badge-approved';
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
              <h1 className="text-2xl font-bold text-allrentz-gray">Customer Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your equipment rentals and requests</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Link 
                to="/browse"
                className="industrial-button inline-flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Request Quote</span>
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
                <MapPin className="h-5 w-5" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={activeTab === 'active' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <CheckCircle className="h-5 w-5" />
                <span>Active Rentals</span>
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={activeTab === 'requests' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <FileText className="h-5 w-5" />
                <span>Quote Requests</span>
              </button>
              <button
                onClick={() => setActiveTab('turnaround')}
                className={activeTab === 'turnaround' ? 'nav-link-active w-full' : 'nav-link w-full'}
              >
                <Wrench className="h-5 w-5" />
                <span>Turnaround Planning</span>
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
                        <p className="text-sm text-gray-600">Active Rentals</p>
                        <p className="text-2xl font-bold text-allrentz-gray">3</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">This Month</p>
                        <p className="text-2xl font-bold text-allrentz-gray">$34,250</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-allrentz-red" />
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Pending Quotes</p>
                        <p className="text-2xl font-bold text-allrentz-gray">2</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Locations</p>
                        <p className="text-2xl font-bold text-allrentz-gray">4</p>
                      </div>
                      <MapPin className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Active Rentals */}
                <div className="industrial-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-allrentz-gray">Active Rentals</h2>
                    <Link to="/browse" className="text-allrentz-red hover:text-allrentz-red-dark font-medium">
                      View All
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {activeRentals.map((rental) => (
                      <div key={rental.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center space-x-4">
                            <img 
                              src={rental.image} 
                              alt={rental.equipment}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                            <div>
                              <h3 className="font-semibold text-allrentz-gray">{rental.equipment}</h3>
                              <p className="text-sm text-gray-600">{rental.vendor}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{rental.location}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 md:mt-0 md:text-right">
                            <div className="flex items-center space-x-2 mb-2">
                              {getStatusIcon(rental.status)}
                              <span className={`${getStatusBadge(rental.status)}`}>
                                {rental.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {rental.status === 'In Transit' ? `ETA: ${rental.deliveryETA}` : rental.deliveryETA}
                            </p>
                            <p className="text-sm font-medium text-allrentz-gray">
                              ${rental.dailyRate}/day
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notifications */}
                <div className="industrial-card p-6">
                  <h2 className="text-xl font-bold text-allrentz-gray mb-6">Recent Notifications</h2>
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {notification.type === 'delivery' && <Truck className="h-5 w-5 text-blue-500" />}
                          {notification.type === 'alert' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                          {notification.type === 'extension' && <Clock className="h-5 w-5 text-orange-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-allrentz-gray">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'active' && (
              <div className="industrial-card p-6">
                <h2 className="text-xl font-bold text-allrentz-gray mb-6">Active Rentals</h2>
                <div className="space-y-6">
                  {activeRentals.map((rental) => (
                    <div key={rental.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="flex items-center space-x-4">
                          <img 
                            src={rental.image} 
                            alt={rental.equipment}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div>
                            <h3 className="font-bold text-allrentz-gray">{rental.equipment}</h3>
                            <p className="text-gray-600">{rental.vendor}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{rental.location}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(rental.status)}
                            <span className={`${getStatusBadge(rental.status)}`}>
                              {rental.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Start:</span> {new Date(rental.startDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">End:</span> {new Date(rental.endDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Rate:</span> ${rental.dailyRate}/day
                          </p>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <button className="industrial-button-secondary text-sm py-2">
                            Extend Rental
                          </button>
                          <button className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md text-sm">
                            Schedule Return
                          </button>
                          <button className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md text-sm">
                            View Location
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="industrial-card p-6">
                <h2 className="text-xl font-bold text-allrentz-gray mb-6">Quote Requests</h2>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-allrentz-gray">Industrial Crane - 50 Ton</h3>
                      <span className="industrial-badge-pending">Pending</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Requested: 2 days ago</p>
                    <p className="text-sm text-gray-600">Location: Offshore Platform C-14</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-allrentz-gray">Generator Set - 500kW</h3>
                      <span className="industrial-badge-approved">Quoted</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Requested: 1 week ago</p>
                    <p className="text-sm text-gray-600">Location: Tank Terminal B</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'turnaround' && (
              <div className="space-y-6">
                {/* Turnaround Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-allrentz-gray">Turnaround Planning</h2>
                    <p className="text-gray-600 mt-1">Plan and manage major maintenance turnarounds</p>
                  </div>
                  <button className="industrial-button inline-flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>New Turnaround</span>
                  </button>
                </div>

                {/* Turnaround Projects */}
                <div className="industrial-card p-6">
                  <h3 className="text-lg font-semibold text-allrentz-gray mb-4">Active Projects</h3>
                  <div className="space-y-4">
                    {turnaroundProjects.map((project) => (
                      <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-semibold text-allrentz-gray">{project.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                            </p>
                            <span className={`inline-block mt-2 ${getTurnaroundStatusBadge(project.status)}`}>
                              {project.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="flex items-center justify-center space-x-1">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span className="font-semibold text-allrentz-gray">{project.equipmentCount}</span>
                              </div>
                              <p className="text-xs text-gray-600">Equipment</p>
                            </div>
                            <div>
                              <div className="flex items-center justify-center space-x-1">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="font-semibold text-allrentz-gray">{project.vendorCount}</span>
                              </div>
                              <p className="text-xs text-gray-600">Vendors</p>
                            </div>
                            <div>
                              <div className="flex items-center justify-center space-x-1">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span className="font-semibold text-allrentz-gray">${(project.budget / 1000)}K</span>
                              </div>
                              <p className="text-xs text-gray-600">Budget</p>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">Progress</span>
                              <span className="text-sm font-medium text-allrentz-gray">{project.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-allrentz-red h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Equipment Packages */}
                <div className="industrial-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-allrentz-gray">Pre-Configured Equipment Packages</h3>
                    <button className="text-allrentz-red hover:text-allrentz-red-dark font-medium">
                      View All Packages
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {equipmentPackages.map((pkg) => (
                      <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-allrentz-gray">{pkg.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                          </div>
                          <Package className="h-6 w-6 text-allrentz-red flex-shrink-0" />
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-600">{pkg.equipmentCount} items</span>
                          <span className="font-semibold text-allrentz-gray">${(pkg.estimatedCost / 1000)}K est.</span>
                        </div>
                        
                        <div className="space-y-1 mb-4">
                          {pkg.items.slice(0, 3).map((item, index) => (
                            <p key={index} className="text-xs text-gray-600">• {item}</p>
                          ))}
                          {pkg.items.length > 3 && (
                            <p className="text-xs text-gray-500">+ {pkg.items.length - 3} more items</p>
                          )}
                        </div>
                        
                        <button className="w-full industrial-button-secondary text-sm py-2">
                          Add to Project
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="industrial-card p-6">
                <h2 className="text-xl font-bold text-allrentz-gray mb-6">Documents</h2>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-allrentz-red" />
                      <div>
                        <h3 className="font-semibold text-allrentz-gray">Safety Compliance Certificate</h3>
                        <p className="text-sm text-gray-600">Steam Boiler - Expires: Dec 2024</p>
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-allrentz-red" />
                      <div>
                        <h3 className="font-semibold text-allrentz-gray">Insurance Certificate</h3>
                        <p className="text-sm text-gray-600">General Liability - Expires: Jan 2025</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="industrial-card p-6">
                <h2 className="text-xl font-bold text-allrentz-gray mb-6">Account Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-allrentz-gray mb-3">Company Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                        <input 
                          type="text" 
                          className="industrial-input w-full" 
                          defaultValue="Gulf Coast Refinery"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                        <input 
                          type="email" 
                          className="industrial-input w-full" 
                          defaultValue="ops@gulfcoast.com"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-allrentz-gray mb-3">Notification Preferences</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                        <span className="text-sm text-gray-700">Email notifications for new quotes</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                        <span className="text-sm text-gray-700">SMS alerts for delivery updates</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded border-gray-300" />
                        <span className="text-sm text-gray-700">Weekly rental summary reports</span>
                      </label>
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

export default CustomerDashboard;
