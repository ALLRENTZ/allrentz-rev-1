
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, MapPin, Calendar, FileText, Bell, Settings, DollarSign, CheckCircle, AlertTriangle, TrendingUp, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const VendorDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [quotingId, setQuotingId] = useState<number | null>(null);
  const [quoteForm, setQuoteForm] = useState({ amount: '', notes: '' });

  const { user, profile } = useAuth();
  const isDemoUser = profile?.is_demo ?? false;
  const [pendingRfqs, setPendingRfqs] = useState<any[]>([]);
  const [vendorOrgId, setVendorOrgId] = useState<string | null>(null);
  const [quotingRealId, setQuotingRealId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [realQuoteForm, setRealQuoteForm] = useState({ daily_rate: '', vendor_notes: '', compliance_confirmed: false });

  const equipmentInventory = [
    {
      id: 1,
      name: '600 CFM Diesel Air Compressor',
      category: 'Air Compressors',
      status: 'Rented',
      dailyRate: 365,
      location: 'Gulf Coast Refinery — Port Arthur, TX',
      rentedUntil: '2026-06-12',
      image: 'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=300&h=200&fit=crop'
    },
    {
      id: 2,
      name: 'Zone 2 Explosion-Proof Light Tower',
      category: 'Lighting Equipment',
      status: 'Available',
      dailyRate: 210,
      location: 'Yard — Beaumont, TX',
      rentedUntil: null,
      image: 'https://images.unsplash.com/photo-1493962853295-0fd70327578a?w=300&h=200&fit=crop'
    },
    {
      id: 3,
      name: '40K PSI UHP Water Blasting Pump',
      category: 'Pressure Equipment',
      status: 'Maintenance',
      dailyRate: 800,
      location: 'Service Bay 1 — Beaumont, TX',
      rentedUntil: null,
      image: 'https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=300&h=200&fit=crop'
    }
  ];

  const [quoteRequests, setQuoteRequests] = useState([
    {
      id: 1,
      customer: 'Bayou Bend Petroleum',
      equipment: 'Confined Space Ventilation Fan (x2)',
      requestDate: '2026-05-22',
      location: 'Texas City Refinery — Texas City, TX',
      duration: '21 days',
      status: 'New',
      urgency: 'High'
    },
    {
      id: 2,
      customer: 'Flint Hills Resources',
      equipment: 'Diesel Rollback Generator — 250kW',
      requestDate: '2026-05-21',
      location: 'Corpus Christi Refinery — Corpus Christi, TX',
      duration: '45 days',
      status: 'Quoted',
      urgency: 'Medium'
    },
    {
      id: 3,
      customer: 'LyondellBasell',
      equipment: 'Vacuum Box System',
      requestDate: '2026-05-20',
      location: 'Houston Refinery — Channelview, TX',
      duration: '14 days',
      status: 'New',
      urgency: 'Medium'
    }
  ]);

  const handleSendQuote = (id: number) => {
    if (!quoteForm.amount) {
      toast.info('Enter a quote amount to proceed.');
      return;
    }
    setQuoteRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Quoted' } : r));
    setQuotingId(null);
    setQuoteForm({ amount: '', notes: '' });
    toast.success('Quote sent to customer.');
  };

  const fetchPendingRfqs = async () => {
    const { data } = await supabase
      .from('rental_requests')
      .select('id, operational_status, created_at, start_date, end_date, delivery_address, notes, equipment(title, category)')
      .eq('operational_status', 'pending_vendor_review')
      .order('created_at', { ascending: false });
    setPendingRfqs(data || []);
  };

  const fetchVendorOrg = async () => {
    const { data } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user!.id)
      .is('archived_at', null)
      .in('role', ['owner', 'admin', 'member'])
      .limit(1)
      .maybeSingle();
    if (data) setVendorOrgId(data.organization_id);
  };

  const handleSubmitRealQuote = async (rfqId: string) => {
    if (!realQuoteForm.daily_rate) {
      toast.warning('Enter a daily rate to proceed.');
      return;
    }
    if (!vendorOrgId || !user) {
      toast.error('Vendor organization not found. Contact support.');
      return;
    }
    setSubmittingId(rfqId);
    const { error } = await supabase.from('vendor_quote_responses').insert({
      rfq_id: rfqId,
      vendor_organization_id: vendorOrgId,
      submitted_by: user.id,
      status: 'submitted',
      daily_rate: parseFloat(realQuoteForm.daily_rate),
      vendor_notes: realQuoteForm.vendor_notes || null,
      compliance_confirmed: realQuoteForm.compliance_confirmed,
      submitted_at: new Date().toISOString(),
    });
    setSubmittingId(null);
    if (error) {
      toast.error('Failed to submit quote: ' + (error.message || 'Unknown error'));
      return;
    }
    const { error: transitionError } = await supabase.functions.invoke('rfq-transition', {
      body: { rfq_id: rfqId, new_status: 'vendor_quote_received' },
    });
    if (transitionError) {
      toast.error('Quote saved but RFQ status update failed. Contact support.');
      return;
    }
    toast.success('Quote submitted successfully.');
    setQuotingRealId(null);
    setRealQuoteForm({ daily_rate: '', vendor_notes: '', compliance_confirmed: false });
    fetchPendingRfqs();
  };

  useEffect(() => {
    if (user && !isDemoUser) {
      fetchPendingRfqs();
      fetchVendorOrg();
    }
  }, [user]);

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
              <button onClick={() => toast.info("Feature scheduled for upcoming release")} className="industrial-button inline-flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Equipment</span>
              </button>
              <button onClick={() => toast.info("Feature scheduled for upcoming release")} className="industrial-button-secondary inline-flex items-center space-x-2">
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
                        <p className="text-2xl font-bold text-allrentz-gray">14</p>
                      </div>
                      <Package className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Currently Rented</p>
                        <p className="text-2xl font-bold text-allrentz-gray">5</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">This Month</p>
                        <p className="text-2xl font-bold text-allrentz-gray">$38,640</p>
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
                    <button onClick={() => toast.info("Feature scheduled for upcoming release")} className="text-allrentz-red hover:text-allrentz-red-dark font-medium">
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
                              <button
                                onClick={() => request.status === 'New' ? setQuotingId(request.id) : toast.info("Feature scheduled for upcoming release")}
                                className="industrial-button text-sm py-1 px-3"
                              >
                                {request.status === 'New' ? 'Send Quote' : 'View Quote'}
                              </button>
                              <button onClick={() => toast.info("Feature scheduled for upcoming release")} className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-1 px-3 rounded-md text-sm">
                                Details
                              </button>
                            </div>
                          </div>
                        </div>
                        {quotingId === request.id && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Quote Amount ($)</label>
                              <input
                                type="number"
                                value={quoteForm.amount}
                                onChange={e => setQuoteForm(prev => ({ ...prev, amount: e.target.value }))}
                                className="industrial-input w-full"
                                placeholder="e.g. 12600"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Response Note</label>
                              <textarea
                                value={quoteForm.notes}
                                onChange={e => setQuoteForm(prev => ({ ...prev, notes: e.target.value }))}
                                className="industrial-input w-full"
                                rows={2}
                                placeholder="Availability, delivery window, certifications..."
                              />
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSendQuote(request.id)}
                                className="industrial-button text-sm py-1 px-4"
                              >
                                Confirm Quote
                              </button>
                              <button
                                onClick={() => { setQuotingId(null); setQuoteForm({ amount: '', notes: '' }); }}
                                className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-1 px-4 rounded-md text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
                    <button onClick={() => toast.info("Feature scheduled for upcoming release")} className="industrial-button inline-flex items-center space-x-2">
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
                            <button onClick={() => toast.info("Feature scheduled for upcoming release")} className="flex-1 industrial-button-secondary text-sm py-2">
                              Edit
                            </button>
                            <button onClick={() => toast.info("Feature scheduled for upcoming release")} className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md text-sm">
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
                {!isDemoUser && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-allrentz-gray mb-3">Pending from Platform</h3>
                    {pendingRfqs.length === 0 ? (
                      <p className="text-sm text-gray-500 py-2">No pending quote requests from the platform.</p>
                    ) : (
                      <div className="space-y-3">
                        {pendingRfqs.map((rfq) => (
                          <div key={rfq.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-allrentz-gray">{rfq.equipment?.title || 'Equipment Request'}</h4>
                                {rfq.equipment?.category && <p className="text-sm text-gray-500">{rfq.equipment.category}</p>}
                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-2">
                                  {rfq.delivery_address && <div><span className="font-medium">Location: </span>{rfq.delivery_address}</div>}
                                  {rfq.start_date && <div><span className="font-medium">Start: </span>{new Date(rfq.start_date).toLocaleDateString()}</div>}
                                  {rfq.end_date && <div><span className="font-medium">End: </span>{new Date(rfq.end_date).toLocaleDateString()}</div>}
                                </div>
                                {rfq.notes && <p className="text-sm text-gray-600 mt-1">{rfq.notes}</p>}
                              </div>
                              <div className="mt-3 lg:mt-0">
                                <button
                                  onClick={() => setQuotingRealId(quotingRealId === rfq.id ? null : rfq.id)}
                                  className="industrial-button text-sm py-1 px-4"
                                >
                                  {quotingRealId === rfq.id ? 'Cancel' : 'Submit Quote'}
                                </button>
                              </div>
                            </div>
                            {quotingRealId === rfq.id && (
                              <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Daily Rate ($) *</label>
                                    <input
                                      type="number"
                                      value={realQuoteForm.daily_rate}
                                      onChange={e => setRealQuoteForm(prev => ({ ...prev, daily_rate: e.target.value }))}
                                      className="industrial-input w-full"
                                      placeholder="e.g. 850"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Vendor Notes</label>
                                    <textarea
                                      value={realQuoteForm.vendor_notes}
                                      onChange={e => setRealQuoteForm(prev => ({ ...prev, vendor_notes: e.target.value }))}
                                      className="industrial-input w-full"
                                      rows={2}
                                      placeholder="Availability, delivery window, certifications..."
                                    />
                                  </div>
                                </div>
                                <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={realQuoteForm.compliance_confirmed}
                                    onChange={e => setRealQuoteForm(prev => ({ ...prev, compliance_confirmed: e.target.checked }))}
                                    className="rounded"
                                  />
                                  <span>Compliance confirmed for this request</span>
                                </label>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleSubmitRealQuote(rfq.id)}
                                    disabled={submittingId === rfq.id}
                                    className="industrial-button text-sm py-1 px-4"
                                  >
                                    {submittingId === rfq.id ? 'Submitting...' : 'Confirm Quote'}
                                  </button>
                                  <button
                                    onClick={() => { setQuotingRealId(null); setRealQuoteForm({ daily_rate: '', vendor_notes: '', compliance_confirmed: false }); }}
                                    className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-1 px-4 rounded-md text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                          <button
                            onClick={() => request.status === 'New' ? setQuotingId(request.id) : toast.info("Feature scheduled for upcoming release")}
                            className="industrial-button text-sm py-2 px-6"
                          >
                            {request.status === 'New' ? 'Send Quote' : 'View Quote'}
                          </button>
                          <button onClick={() => toast.info("Feature scheduled for upcoming release")} className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-6 rounded-md text-sm">
                            View Details
                          </button>
                          {request.status === 'New' && (
                            <button onClick={() => toast.info("Feature scheduled for upcoming release")} className="text-red-600 hover:text-red-700 font-medium py-2 px-6 text-sm">
                              Decline
                            </button>
                          )}
                        </div>
                      </div>
                      {quotingId === request.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Quote Amount ($)</label>
                              <input
                                type="number"
                                value={quoteForm.amount}
                                onChange={e => setQuoteForm(prev => ({ ...prev, amount: e.target.value }))}
                                className="industrial-input w-full"
                                placeholder="e.g. 12600"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Response Note</label>
                              <textarea
                                value={quoteForm.notes}
                                onChange={e => setQuoteForm(prev => ({ ...prev, notes: e.target.value }))}
                                className="industrial-input w-full"
                                rows={2}
                                placeholder="Availability, delivery window, certifications..."
                              />
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSendQuote(request.id)}
                              className="industrial-button text-sm py-2 px-6"
                            >
                              Confirm Quote
                            </button>
                            <button
                              onClick={() => { setQuotingId(null); setQuoteForm({ amount: '', notes: '' }); }}
                              className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-6 rounded-md text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
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
                      <p className="text-3xl font-bold text-allrentz-gray">$38,640</p>
                      <p className="text-sm text-green-600">+14% from last month</p>
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">This Year</p>
                      <p className="text-3xl font-bold text-allrentz-gray">$187,320</p>
                      <p className="text-sm text-green-600">+22% from last year</p>
                    </div>
                  </div>
                  <div className="dashboard-stat">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Next Payout</p>
                      <p className="text-3xl font-bold text-allrentz-gray">$14,210</p>
                      <p className="text-sm text-gray-600">June 30, 2026</p>
                    </div>
                  </div>
                </div>

                <div className="industrial-card p-6">
                  <h2 className="text-xl font-bold text-allrentz-gray mb-6">Recent Transactions</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-allrentz-gray">600 CFM Diesel Air Compressor</p>
                        <p className="text-sm text-gray-600">Gulf Coast Refinery — Port Arthur, TX • 21 days</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-allrentz-gray">$7,665</p>
                        <p className="text-sm text-green-600">Active</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-allrentz-gray">40K PSI UHP Water Blasting Pump</p>
                        <p className="text-sm text-gray-600">Flint Hills Resources — Corpus Christi, TX • 16 days</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-allrentz-gray">$12,800</p>
                        <p className="text-sm text-gray-600">Completed</p>
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
                      <button onClick={() => toast.info("Feature scheduled for upcoming release")} className="text-allrentz-red hover:text-allrentz-red-dark font-medium text-sm">
                        View on Map
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="industrial-card p-6">
                <h2 className="text-xl font-bold text-allrentz-gray mb-6">Compliance Documents</h2>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-6 w-6 text-allrentz-red" />
                        <div>
                          <h3 className="font-semibold text-allrentz-gray">General Liability Insurance</h3>
                          <p className="text-sm text-gray-600">Expires: December 31, 2026</p>
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
                          <h3 className="font-semibold text-allrentz-gray">Equipment Safety Certificates</h3>
                          <p className="text-sm text-gray-600">Last updated: May 1, 2026</p>
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
                          <h3 className="font-semibold text-allrentz-gray">OSHA Compliance Certificate</h3>
                          <p className="text-sm text-gray-600">Expires: July 31, 2026</p>
                        </div>
                      </div>
                      <span className="industrial-badge-pending">Renewal Due</span>
                    </div>
                  </div>
                </div>
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
                        <button onClick={() => toast.info("Feature scheduled for upcoming release")} className="text-allrentz-red hover:text-allrentz-red-dark font-medium text-sm">
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
