
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, MapPin, Calendar, FileText, Bell, Settings, DollarSign, CheckCircle, AlertTriangle, TrendingUp, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getOperationalAuthority, requireOperationalProfile } from '@/lib/operationalAuthority';
import { getVendorLifecycleAction, getVendorLifecycleLabel } from '@/lib/vendorLifecycle';
import {
  CHARGE_STATUSES,
  CHARGE_TYPES,
  RATE_BASES,
  REQUIRED_CHARGE_TYPES,
  buildUsdPricingPayload,
  chargeTypeLabel,
  createGovernedChargeLine,
  createGovernedRateTerm,
  emptyGovernedQuoteDraft,
  rateBasisLabel,
  type GovernedChargeLineDraft,
  type GovernedQuoteDraft,
  type GovernedRateTermDraft,
} from '@/lib/monetaryContract';
import OffRentControlPanel from '@/components/OffRentControlPanel';
import PickupTaskControlPanel from '@/components/PickupTaskControlPanel';
import PickupExceptionReviewQueue from '@/components/PickupExceptionReviewQueue';
import DeliveryAcceptanceStatusPanel from '@/components/DeliveryAcceptanceStatusPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const VendorDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [quotingId, setQuotingId] = useState<number | null>(null);
  const [quoteForm, setQuoteForm] = useState({ amount: '', notes: '' });

  const { user, profile, loading: authLoading } = useAuth();
  const authority = getOperationalAuthority({ user, authLoading, profile });
  const isDemoUser = profile?.is_demo === true;
  const showBlockedToast = ({ title, description }: { title: string; description: string }) => {
    toast.error(title, { description });
  };
  const [pendingRfqs, setPendingRfqs] = useState<any[]>([]);
  const [lifecycleRfqs, setLifecycleRfqs] = useState<any[]>([]);
  const [vendorOrgId, setVendorOrgId] = useState<string | null>(null);
  const [quotingRealId, setQuotingRealId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [pendingOffRentAcknowledgmentId, setPendingOffRentAcknowledgmentId] = useState<string | null>(null);
  const [acknowledgingOffRentId, setAcknowledgingOffRentId] = useState<string | null>(null);
  const [pickupWindowStart, setPickupWindowStart] = useState('');
  const [pickupWindowEnd, setPickupWindowEnd] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [offRentRefreshVersion, setOffRentRefreshVersion] = useState(0);
  const [realQuoteDrafts, setRealQuoteDrafts] = useState<Record<string, GovernedQuoteDraft>>({});
  const [quoteIntents, setQuoteIntents] = useState<Record<string, { payload: string; key: string }>>({});
  const [pendingRfqsError, setPendingRfqsError] = useState(false);
  const [lifecycleRfqsError, setLifecycleRfqsError] = useState(false);
  const updateRealQuoteDraft = (rfqId: string, patch: Partial<GovernedQuoteDraft>) => {
    setRealQuoteDrafts((current) => ({
      ...current,
      [rfqId]: { ...(current[rfqId] || emptyGovernedQuoteDraft()), ...patch },
    }));
  };
  const updateRateTerm = (rfqId: string, lineKey: string, patch: Partial<GovernedRateTermDraft>) => {
    const draft = realQuoteDrafts[rfqId] || emptyGovernedQuoteDraft();
    updateRealQuoteDraft(rfqId, {
      rateTerms: draft.rateTerms.map((term) => term.lineKey === lineKey ? { ...term, ...patch } : term),
    });
  };
  const updateChargeLine = (rfqId: string, lineKey: string, patch: Partial<GovernedChargeLineDraft>) => {
    const draft = realQuoteDrafts[rfqId] || emptyGovernedQuoteDraft();
    updateRealQuoteDraft(rfqId, {
      chargeLines: draft.chargeLines.map((line) => line.lineKey === lineKey ? { ...line, ...patch } : line),
    });
  };
  const addRateTerm = (rfqId: string) => {
    const draft = realQuoteDrafts[rfqId] || emptyGovernedQuoteDraft();
    let sequence = draft.rateTerms.length + 1;
    while (draft.rateTerms.some((term) => term.lineKey === `rate_${sequence}`)) sequence += 1;
    updateRealQuoteDraft(rfqId, { rateTerms: [...draft.rateTerms, createGovernedRateTerm(`rate_${sequence}`)] });
  };
  const addChargeLine = (rfqId: string) => {
    const draft = realQuoteDrafts[rfqId] || emptyGovernedQuoteDraft();
    let sequence = draft.chargeLines.length + 1;
    while (draft.chargeLines.some((line) => line.lineKey === `other_${sequence}`)) sequence += 1;
    updateRealQuoteDraft(rfqId, {
      chargeLines: [...draft.chargeLines, createGovernedChargeLine(`other_${sequence}`, 'other', 'Other charge')],
    });
  };
  const pickupExceptionSources = useMemo(() => lifecycleRfqs
    .filter((rfq) => ['demobilizing', 'off_rent'].includes(rfq.operational_status))
    .map((rfq) => ({
      rfqId: String(rfq.id),
      title: rfq.equipment?.title || 'Equipment request',
      location: rfq.delivery_address || null,
    })), [lifecycleRfqs]);

  const toLocalDateTimeInput = (value: string | null | undefined) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
  };

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
    const { data, error } = await supabase
      .from('rental_requests')
      .select('id, operational_status, created_at, start_date, end_date, delivery_address, special_requirements, equipment(title, category)')
      .eq('operational_status', 'pending_vendor_review')
      .order('created_at', { ascending: false });
    if (error) {
      setPendingRfqsError(true);
      toast.error('Failed to load pending quote requests: ' + (error.message || 'Unknown error'));
      return;
    }
    setPendingRfqsError(false);
    setPendingRfqs(data || []);
  };

  const fetchLifecycleRfqs = async () => {
    const { data, error } = await supabase
      .from('rental_requests')
      .select(`
        id,
        operational_status,
        start_date,
        end_date,
        delivery_address,
        special_requirements,
        equipment(title, category),
        rental_off_rent_requests(
          requested_at,
          requested_stop_at,
          pickup_available_from,
          pickup_available_until,
          customer_notes
        )
      `)
      .in('operational_status', [
        'quote_accepted',
        'vendor_confirmed',
        'mobilizing',
        'in_transit',
        'on_rent',
        'rental_extended',
        'off_rent_requested',
        'demobilizing',
        'off_rent',
      ])
      .order('created_at', { ascending: false });
    if (error) {
      setLifecycleRfqsError(true);
      toast.error('Failed to load active fulfillment: ' + (error.message || 'Unknown error'));
      return;
    }
    setLifecycleRfqsError(false);
    setLifecycleRfqs(data || []);
  };

  const fetchVendorOrg = async () => {
    const { data: memberships, error: membershipsError } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user!.id)
      .is('archived_at', null)
      .in('role', ['owner', 'admin', 'member']);

    if (membershipsError) {
      setVendorOrgId(null);
      toast.error('Failed to resolve vendor organization: ' + membershipsError.message);
      return;
    }

    const memberOrgIds = (memberships || []).map((membership) => membership.organization_id);
    if (memberOrgIds.length === 0) {
      setVendorOrgId(null);
      return;
    }

    const { data: vendorOrg, error: vendorOrgError } = await supabase
      .from('organizations')
      .select('id')
      .in('id', memberOrgIds)
      .in('org_type', ['vendor', 'both'])
      .is('archived_at', null)
      .limit(1)
      .maybeSingle();

    if (vendorOrgError) {
      setVendorOrgId(null);
      toast.error('Failed to resolve vendor organization: ' + vendorOrgError.message);
      return;
    }

    setVendorOrgId(vendorOrg?.id || null);
  };

  const handleSubmitRealQuote = async (rfqId: string) => {
    if (!requireOperationalProfile({ user, authLoading, profile, toast: showBlockedToast })) {
      return;
    }
    const draft = realQuoteDrafts[rfqId] || emptyGovernedQuoteDraft();
    let pricingPayload: ReturnType<typeof buildUsdPricingPayload>;
    try {
      pricingPayload = buildUsdPricingPayload(draft);
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : 'Quote pricing is invalid.');
      return;
    }
    if (!vendorOrgId || !user) {
      toast.error('Vendor organization not found. Contact support.');
      return;
    }
    const serializedPayload = JSON.stringify({
      pricing: pricingPayload,
      vendorNotes: draft.vendorNotes,
      complianceConfirmed: draft.complianceConfirmed,
    });
    const existingIntent = quoteIntents[rfqId];
    const intent = existingIntent?.payload === serializedPayload
      ? existingIntent
      : { payload: serializedPayload, key: crypto.randomUUID() };
    if (intent !== existingIntent) {
      setQuoteIntents((current) => ({ ...current, [rfqId]: intent }));
    }

    setSubmittingId(rfqId);
    const { data, error } = await supabase.rpc('submit_vendor_quote', {
      p_rfq_id: rfqId,
      p_vendor_organization_id: vendorOrgId,
      p_idempotency_key: intent.key,
      p_pricing: pricingPayload,
      p_vendor_notes: draft.vendorNotes || undefined,
      p_compliance_confirmed: draft.complianceConfirmed,
    });
    setSubmittingId(null);
    if (error) {
      toast.error('Quote submission was not confirmed. Retry without changing pricing to reuse this intent; after a reload, verify quote history before retrying.');
      return;
    }
    const outcome = Array.isArray(data) ? data[0] : null;
    if (!outcome?.quote_id
      || !outcome?.correlation_id
      || outcome.currency_code !== 'USD'
      || !Number.isInteger(outcome.quote_version)
      || outcome.quote_version < 1
      || !['acceptance_ready', 'incomplete', 'requires_acknowledgment'].includes(outcome.pricing_state)
      || typeof outcome.replayed !== 'boolean') {
      toast.error('Quote outcome could not be verified. Keep pricing unchanged and retry this intent, or verify quote history first.');
      return;
    }
    toast.success(outcome.replayed ? 'Existing quote submission confirmed.' : 'Quote submitted successfully.');
    setQuotingRealId(null);
    setRealQuoteDrafts((current) => {
      const next = { ...current };
      delete next[rfqId];
      return next;
    });
    setQuoteIntents((current) => {
      const next = { ...current };
      delete next[rfqId];
      return next;
    });
    fetchPendingRfqs();
    fetchLifecycleRfqs();
  };

  const handleAdvanceRfq = async (rfqId: string, currentStatus: string) => {
    if (!requireOperationalProfile({ user, authLoading, profile, toast: showBlockedToast })) {
      return;
    }
    const action = getVendorLifecycleAction(currentStatus);
    if (!action) {
      toast.error('No vendor action is authorized for this lifecycle state.');
      return;
    }
    setTransitioningId(rfqId);
    try {
      const { error } = await supabase.functions.invoke('rfq-transition', {
        body: { rfq_id: rfqId, new_status: action.nextStatus },
      });
      if (error) {
        toast.error('Lifecycle update failed: ' + (error.message || 'Unknown error'));
        return;
      }
      toast.success(action.successMessage);
      fetchLifecycleRfqs();
      fetchPendingRfqs();
    } finally {
      setTransitioningId(null);
    }
  };

  const resetOffRentAcknowledgment = () => {
    setPendingOffRentAcknowledgmentId(null);
    setPickupWindowStart('');
    setPickupWindowEnd('');
    setPickupNotes('');
  };

  const openOffRentAcknowledgment = (rfq: any) => {
    const request = Array.isArray(rfq.rental_off_rent_requests)
      ? rfq.rental_off_rent_requests[0]
      : rfq.rental_off_rent_requests;
    setPendingOffRentAcknowledgmentId(rfq.id);
    setPickupWindowStart(toLocalDateTimeInput(request?.pickup_available_from));
    setPickupWindowEnd(toLocalDateTimeInput(request?.pickup_available_until));
    setPickupNotes('');
  };

  const handleAcknowledgeOffRent = async () => {
    if (!pendingOffRentAcknowledgmentId) return;
    if (!requireOperationalProfile({ user, authLoading, profile, toast: showBlockedToast })) return;

    const pickupStart = Date.parse(pickupWindowStart);
    const pickupEnd = Date.parse(pickupWindowEnd);
    if (!Number.isFinite(pickupStart) || !Number.isFinite(pickupEnd) || pickupEnd <= pickupStart) {
      toast.error('Record a valid vendor pickup window before acknowledging the request.');
      return;
    }

    setAcknowledgingOffRentId(pendingOffRentAcknowledgmentId);
    try {
      const { error } = await supabase.functions.invoke('rfq-off-rent', {
        body: {
          action: 'acknowledge',
          rfq_id: pendingOffRentAcknowledgmentId,
          pickup_window_start: new Date(pickupStart).toISOString(),
          pickup_window_end: new Date(pickupEnd).toISOString(),
          notes: pickupNotes,
        },
      });
      if (error) {
        toast.error('Off-rent acknowledgment failed: ' + (error.message || 'Unknown error'));
        return;
      }
      toast.success('Off-rent request acknowledged and pickup coordination recorded.');
      resetOffRentAcknowledgment();
      await fetchLifecycleRfqs();
      setOffRentRefreshVersion((version) => version + 1);
    } finally {
      setAcknowledgingOffRentId(null);
    }
  };

  useEffect(() => {
    if (authority.canUseOperationalData) {
      fetchPendingRfqs();
      fetchLifecycleRfqs();
      fetchVendorOrg();
    }
  }, [authority.canUseOperationalData]);

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
                {isDemoUser ? (
                <>
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
                </>
                ) : (
                  <div className="industrial-card p-6">
                    <p className="text-gray-600">Live equipment and quote metrics are not yet available.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="space-y-6">
                {isDemoUser ? (
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
                ) : (
                  <div className="industrial-card p-6">
                    <p className="text-gray-600">Equipment inventory management is not yet available.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="industrial-card p-6">
                <h2 className="text-xl font-bold text-allrentz-gray mb-6">Quote Requests</h2>
                {authority.canUseOperationalData && (
                  <PickupExceptionReviewQueue sources={pickupExceptionSources} />
                )}
                {authority.canUseOperationalData && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-allrentz-gray mb-3">Active Fulfillment</h3>
                    {lifecycleRfqsError ? (
                      <p className="text-sm text-red-600 py-2">Unable to load active fulfillment. Please refresh or contact support.</p>
                    ) : lifecycleRfqs.length === 0 ? (
                      <p className="text-sm text-gray-500 py-2">No accepted rentals are awaiting fulfillment.</p>
                    ) : (
                    <div className="space-y-3">
                      {lifecycleRfqs.map((rfq) => {
                        const action = getVendorLifecycleAction(rfq.operational_status);
                        const offRentRequest = Array.isArray(rfq.rental_off_rent_requests)
                          ? rfq.rental_off_rent_requests[0]
                          : rfq.rental_off_rent_requests;
                        return (
                        <div key={rfq.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-allrentz-gray">{rfq.equipment?.title || 'Equipment Request'}</h4>
                              {rfq.equipment?.category && <p className="text-sm text-gray-500">{rfq.equipment.category}</p>}
                              <p className="text-sm font-medium text-green-800 mt-1">
                                {getVendorLifecycleLabel(rfq.operational_status)}
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-2">
                                {rfq.delivery_address && <div><span className="font-medium">Location: </span>{rfq.delivery_address}</div>}
                                {rfq.start_date && <div><span className="font-medium">Start: </span>{new Date(rfq.start_date).toLocaleDateString()}</div>}
                                {rfq.end_date && <div><span className="font-medium">End: </span>{new Date(rfq.end_date).toLocaleDateString()}</div>}
                              </div>
                              {rfq.special_requirements && <p className="text-sm text-gray-600 mt-1">{rfq.special_requirements}</p>}
                              {rfq.operational_status === 'off_rent_requested' && offRentRequest && (
                                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                  <p className="font-medium">Customer pickup availability</p>
                                  <p className="mt-1">
                                    Requested stop: {new Date(offRentRequest.requested_stop_at).toLocaleString()}
                                  </p>
                                  <p>
                                    Window: {new Date(offRentRequest.pickup_available_from).toLocaleString()} –{' '}
                                    {new Date(offRentRequest.pickup_available_until).toLocaleString()}
                                  </p>
                                  {offRentRequest.customer_notes && (
                                    <p className="mt-1 text-amber-800">{offRentRequest.customer_notes}</p>
                                  )}
                                </div>
                              )}
                            </div>
                            {action && <div className="mt-3 lg:mt-0">
                              <button
                                onClick={() => handleAdvanceRfq(rfq.id, rfq.operational_status)}
                                disabled={transitioningId === rfq.id}
                                className="industrial-button text-sm py-1 px-4 disabled:opacity-50"
                              >
                                {transitioningId === rfq.id ? action.pendingLabel : action.label}
                              </button>
                            </div>}
                            {rfq.operational_status === 'off_rent_requested' && (
                              <div className="mt-3 lg:mt-0">
                                <button
                                  onClick={() => openOffRentAcknowledgment(rfq)}
                                  disabled={acknowledgingOffRentId === rfq.id}
                                  className="industrial-button text-sm py-1 px-4 disabled:opacity-50"
                                >
                                  {acknowledgingOffRentId === rfq.id ? 'Recording...' : 'Acknowledge Pickup Request'}
                                </button>
                              </div>
                            )}
                          </div>
                          {['on_rent', 'off_rent_requested', 'demobilizing', 'off_rent'].includes(rfq.operational_status) && (
                            <OffRentControlPanel
                              rfqId={rfq.id}
                              refreshKey={offRentRefreshVersion}
                            />
                          )}
                          {['demobilizing', 'off_rent'].includes(rfq.operational_status) && (
                            <PickupTaskControlPanel rfqId={rfq.id} actorMode="vendor" />
                          )}
                          {[
                            'in_transit',
                            'on_rent',
                            'rental_extended',
                            'off_rent_requested',
                            'demobilizing',
                            'off_rent',
                          ].includes(rfq.operational_status) && (
                            <DeliveryAcceptanceStatusPanel rfqId={rfq.id} />
                          )}
                        </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                )}
                {authority.canUseOperationalData && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-allrentz-gray mb-3">Pending from Platform</h3>
                    {pendingRfqsError ? (
                      <p className="text-sm text-red-600 py-2">Unable to load pending quote requests. Please refresh or contact support.</p>
                    ) : pendingRfqs.length === 0 ? (
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
                                {rfq.special_requirements && <p className="text-sm text-gray-600 mt-1">{rfq.special_requirements}</p>}
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
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-900">Rate schedule</h4>
                                    <button type="button" onClick={() => addRateTerm(rfq.id)} className="text-sm text-blue-700 hover:underline">
                                      Add rate
                                    </button>
                                  </div>
                                  {(realQuoteDrafts[rfq.id] || emptyGovernedQuoteDraft()).rateTerms.map((term, termIndex) => (
                                    <div key={term.lineKey} className="rounded-md border border-gray-200 p-3 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-700">Rate {termIndex + 1}: {term.lineKey}</span>
                                        {(realQuoteDrafts[rfq.id] || emptyGovernedQuoteDraft()).rateTerms.length > 1 && (
                                          <button type="button" onClick={() => updateRealQuoteDraft(rfq.id, {
                                            rateTerms: (realQuoteDrafts[rfq.id] || emptyGovernedQuoteDraft()).rateTerms.filter((item) => item.lineKey !== term.lineKey),
                                          })} className="text-xs text-red-700 hover:underline">Remove</button>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <label className="text-xs font-medium text-gray-700">Rate basis *
                                          <select value={term.rateBasis} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { rateBasis: event.target.value as GovernedRateTermDraft['rateBasis'] })} className="industrial-input w-full mt-1">
                                            {RATE_BASES.map((basis) => <option key={basis} value={basis}>Per {rateBasisLabel(basis)}</option>)}
                                          </select>
                                        </label>
                                        <label className="text-xs font-medium text-gray-700">Rate scope *
                                          <select value={term.rateScope} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { rateScope: event.target.value as GovernedRateTermDraft['rateScope'] })} className="industrial-input w-full mt-1">
                                            <option value="per_equipment_item">Per equipment item</option>
                                            <option value="entire_line">Entire equipment line</option>
                                          </select>
                                        </label>
                                        <label className="text-xs font-medium text-gray-700">Unit rate (USD) *
                                          <input inputMode="decimal" value={term.unitRate} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { unitRate: event.target.value })} className="industrial-input w-full mt-1" placeholder="850.0000" />
                                        </label>
                                        <label className="text-xs font-medium text-gray-700">Vendor quoted extension (USD) *
                                          <input inputMode="decimal" value={term.quotedLineAmount} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { quotedLineAmount: event.target.value })} className="industrial-input w-full mt-1" placeholder="3500.00" />
                                        </label>
                                        <label className="text-xs font-medium text-gray-700">Equipment quantity *
                                          <input inputMode="decimal" value={term.equipmentQuantity} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { equipmentQuantity: event.target.value })} className="industrial-input w-full mt-1" />
                                        </label>
                                        <label className="text-xs font-medium text-gray-700">Rental-period quantity *
                                          <input inputMode="decimal" value={term.rentalPeriodQuantity} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { rentalPeriodQuantity: event.target.value })} className="industrial-input w-full mt-1" />
                                        </label>
                                        <label className="text-xs font-medium text-gray-700">Minimum billable quantity
                                          <input inputMode="decimal" value={term.minimumBillableQuantity} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { minimumBillableQuantity: event.target.value })} className="industrial-input w-full mt-1" />
                                        </label>
                                        {term.rateBasis === 'per_calendar_month' && (
                                          <label className="text-xs font-medium text-gray-700">Calendar timezone *
                                            <input value={term.calendarTimezone} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { calendarTimezone: event.target.value })} className="industrial-input w-full mt-1" placeholder="America/Chicago" />
                                          </label>
                                        )}
                                        <label className="text-xs font-medium text-gray-700">Included usage quantity
                                          <input inputMode="decimal" value={term.includedUsageQuantity} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { includedUsageQuantity: event.target.value })} className="industrial-input w-full mt-1" />
                                        </label>
                                        <label className="text-xs font-medium text-gray-700">Included usage unit
                                          <input value={term.includedUsageUnit} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { includedUsageUnit: event.target.value })} className="industrial-input w-full mt-1" placeholder="engine hours" />
                                        </label>
                                        <label className="text-xs font-medium text-gray-700">Overtime rate (USD)
                                          <input inputMode="decimal" value={term.overtimeRate} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { overtimeRate: event.target.value })} className="industrial-input w-full mt-1" />
                                        </label>
                                        <label className="text-xs font-medium text-gray-700">Overtime multiplier
                                          <input inputMode="decimal" value={term.overtimeMultiplier} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { overtimeMultiplier: event.target.value })} className="industrial-input w-full mt-1" placeholder="1.500000" />
                                        </label>
                                        <label className="text-xs font-medium text-gray-700">Proration *
                                          <select value={term.prorationPolicy} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { prorationPolicy: event.target.value as GovernedRateTermDraft['prorationPolicy'] })} className="industrial-input w-full mt-1">
                                            <option value="unknown">Unknown</option><option value="allowed">Allowed</option><option value="not_allowed">Not allowed</option>
                                          </select>
                                        </label>
                                        <label className="text-xs font-medium text-gray-700 md:col-span-3">Rental-period definition *
                                          <input value={term.rentalPeriodDefinition} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { rentalPeriodDefinition: event.target.value })} className="industrial-input w-full mt-1" placeholder="Define when this period begins, ends, and rolls over" />
                                        </label>
                                        <label className="text-xs font-medium text-gray-700 md:col-span-3">Vendor calculation terms *
                                          <textarea value={term.vendorCalculationTerms} onChange={(event) => updateRateTerm(rfq.id, term.lineKey, { vendorCalculationTerms: event.target.value })} className="industrial-input w-full mt-1" rows={2} placeholder="State how quantity, minimums, usage, overtime, and proration determine this line" />
                                        </label>
                                      </div>
                                    </div>
                                  ))}

                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-900">Charges and fee status</h4>
                                    <button type="button" onClick={() => addChargeLine(rfq.id)} className="text-sm text-blue-700 hover:underline">Add charge</button>
                                  </div>
                                  {(realQuoteDrafts[rfq.id] || emptyGovernedQuoteDraft()).chargeLines.map((line) => (
                                    <div key={line.lineKey} className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-md border border-gray-200 p-3">
                                      <label className="text-xs font-medium text-gray-700">Type
                                        <select disabled={REQUIRED_CHARGE_TYPES.includes(line.chargeType as typeof REQUIRED_CHARGE_TYPES[number])} value={line.chargeType} onChange={(event) => updateChargeLine(rfq.id, line.lineKey, { chargeType: event.target.value as GovernedChargeLineDraft['chargeType'] })} className="industrial-input w-full mt-1 disabled:bg-gray-100">
                                          {CHARGE_TYPES.map((type) => <option key={type} value={type}>{chargeTypeLabel(type)}</option>)}
                                        </select>
                                      </label>
                                      <label className="text-xs font-medium text-gray-700">Description *
                                        <input value={line.description} onChange={(event) => updateChargeLine(rfq.id, line.lineKey, { description: event.target.value })} className="industrial-input w-full mt-1" />
                                      </label>
                                      <label className="text-xs font-medium text-gray-700">Status *
                                        <select value={line.amountStatus} onChange={(event) => updateChargeLine(rfq.id, line.lineKey, { amountStatus: event.target.value as GovernedChargeLineDraft['amountStatus'], amount: '' })} className="industrial-input w-full mt-1">
                                          {CHARGE_STATUSES.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                                        </select>
                                      </label>
                                      {line.amountStatus === 'priced' && <label className="text-xs font-medium text-gray-700">Amount (USD) *
                                        <input inputMode="decimal" value={line.amount} onChange={(event) => updateChargeLine(rfq.id, line.lineKey, { amount: event.target.value })} className="industrial-input w-full mt-1" />
                                      </label>}
                                      {line.amountStatus === 'included' && <label className="text-xs font-medium text-gray-700">Included in rate *
                                        <select value={line.includedInLineKey} onChange={(event) => updateChargeLine(rfq.id, line.lineKey, { includedInLineKey: event.target.value })} className="industrial-input w-full mt-1">
                                          <option value="">Select rate</option>{(realQuoteDrafts[rfq.id] || emptyGovernedQuoteDraft()).rateTerms.map((term) => <option key={term.lineKey} value={term.lineKey}>{term.lineKey}</option>)}
                                        </select>
                                      </label>}
                                      {line.amountStatus === 'contingent' && <label className="text-xs font-medium text-gray-700 md:col-span-2">Contingent calculation terms *
                                        <input value={line.contingentTrigger} onChange={(event) => updateChargeLine(rfq.id, line.lineKey, { contingentTrigger: event.target.value })} className="industrial-input w-full mt-1" />
                                      </label>}
                                      {!REQUIRED_CHARGE_TYPES.includes(line.chargeType as typeof REQUIRED_CHARGE_TYPES[number]) && <button type="button" onClick={() => updateRealQuoteDraft(rfq.id, {
                                        chargeLines: (realQuoteDrafts[rfq.id] || emptyGovernedQuoteDraft()).chargeLines.filter((item) => item.lineKey !== line.lineKey),
                                      })} className="self-end text-xs text-red-700 hover:underline">Remove</button>}
                                    </div>
                                  ))}
                                  <label className="block text-xs font-medium text-gray-700">Vendor quoted total excluding tax (USD) *
                                    <input inputMode="decimal" value={(realQuoteDrafts[rfq.id] || emptyGovernedQuoteDraft()).quotedTotalExcludingTax} onChange={(event) => updateRealQuoteDraft(rfq.id, { quotedTotalExcludingTax: event.target.value })} className="industrial-input w-full mt-1" placeholder="Server verifies this equals finalized line extensions" />
                                  </label>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Vendor Notes</label>
                                    <textarea value={(realQuoteDrafts[rfq.id] || emptyGovernedQuoteDraft()).vendorNotes} onChange={(event) => updateRealQuoteDraft(rfq.id, { vendorNotes: event.target.value })} className="industrial-input w-full" rows={2} placeholder="Availability, delivery window, certifications..." />
                                  </div>
                                </div>
                                <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={(realQuoteDrafts[rfq.id] || emptyGovernedQuoteDraft()).complianceConfirmed}
                                    onChange={(event) => updateRealQuoteDraft(rfq.id, { complianceConfirmed: event.target.checked })}
                                    className="rounded"
                                  />
                                  <span>Compliance confirmed for this request</span>
                                </label>
                                <p className="text-xs text-gray-600">
                                  Taxes are not calculated. The database calculates authoritative line totals using USD decimal policy allrentz-usd-1.
                                </p>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleSubmitRealQuote(rfq.id)}
                                    disabled={submittingId === rfq.id}
                                    className="industrial-button text-sm py-1 px-4"
                                  >
                                    {submittingId === rfq.id ? 'Submitting...' : 'Confirm Quote'}
                                  </button>
                                  <button
                                    onClick={() => setQuotingRealId(null)}
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
                {isDemoUser && (
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
                )}
              </div>
            )}

            {activeTab === 'earnings' && (
              <div className="space-y-6">
                {isDemoUser ? (
                <>
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
                </>
                ) : (
                  <div className="industrial-card p-6">
                    <p className="text-gray-600">Earnings reporting is not yet available.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tracking' && (
              <div className="industrial-card p-6">
                {isDemoUser ? (
                <>
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
                </>
                ) : (
                  <p className="text-gray-600">Asset tracking is not yet available.</p>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="industrial-card p-6">
                {isDemoUser ? (
                <>
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
                </>
                ) : (
                  <p className="text-gray-600">Compliance document tracking is not yet available.</p>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="industrial-card p-6">
                {isDemoUser ? (
                <>
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
                </>
                ) : (
                  <p className="text-gray-600">Vendor account settings are not yet available.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Dialog
        open={pendingOffRentAcknowledgmentId !== null}
        onOpenChange={(open) => {
          if (!open && !acknowledgingOffRentId) resetOffRentAcknowledgment();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Acknowledge off-rent pickup</DialogTitle>
            <DialogDescription>
              Record the vendor pickup window. This acknowledgment starts demobilization but does not determine the contractual stop-rent time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="vendor-pickup-start">Pickup window start</label>
                <Input
                  id="vendor-pickup-start"
                  type="datetime-local"
                  value={pickupWindowStart}
                  onChange={(event) => setPickupWindowStart(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="vendor-pickup-end">Pickup window end</label>
                <Input
                  id="vendor-pickup-end"
                  type="datetime-local"
                  value={pickupWindowEnd}
                  onChange={(event) => setPickupWindowEnd(event.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="vendor-pickup-notes">Pickup coordination notes</label>
              <Textarea
                id="vendor-pickup-notes"
                value={pickupNotes}
                onChange={(event) => setPickupNotes(event.target.value)}
                placeholder="Driver coordination, equipment preparation, or pickup constraints"
                rows={4}
                maxLength={4000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetOffRentAcknowledgment} disabled={Boolean(acknowledgingOffRentId)}>
              Cancel
            </Button>
            <Button onClick={handleAcknowledgeOffRent} disabled={Boolean(acknowledgingOffRentId)}>
              {acknowledgingOffRentId ? 'Recording...' : 'Record Acknowledgment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorDashboard;
