import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Bell, Calendar, DollarSign, Package, Truck, AlertCircle, CheckCircle, Clock, MapPin, FileText, Zap, Settings, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DemoTour from '@/components/DemoTour';
import OffRentControlPanel from '@/components/OffRentControlPanel';
import PickupTaskControlPanel from '@/components/PickupTaskControlPanel';
import { demoCustomerRentalRequests, demoCustomerNotifications } from '@/data/demoDashboardData';
import { getOperationalAuthority, requireOperationalProfile } from '@/lib/operationalAuthority';

const CustomerDashboard = () => {
  const { user, profile, showDemoTour, setShowDemoTour, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [rentalRequests, setRentalRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingVqrId, setAcceptingVqrId] = useState<string | null>(null);
  const [rejectingRfqId, setRejectingRfqId] = useState<string | null>(null);
  const [cancellingRfqId, setCancellingRfqId] = useState<string | null>(null);
  const [requestingOffRentRfqId, setRequestingOffRentRfqId] = useState<string | null>(null);
  const [pendingOffRentRfqId, setPendingOffRentRfqId] = useState<string | null>(null);
  const [requestedStopAt, setRequestedStopAt] = useState('');
  const [pickupAvailableFrom, setPickupAvailableFrom] = useState('');
  const [pickupAvailableUntil, setPickupAvailableUntil] = useState('');
  const [offRentNotes, setOffRentNotes] = useState('');
  const [offRentRefreshVersion, setOffRentRefreshVersion] = useState(0);
  const [recordingAcceptanceRfqId, setRecordingAcceptanceRfqId] = useState<string | null>(null);
  const [pendingAcceptanceRfqId, setPendingAcceptanceRfqId] = useState<string | null>(null);
  const [conditionNotes, setConditionNotes] = useState('');
  const [evidenceReferences, setEvidenceReferences] = useState('');
  const [acceptanceConfirmations, setAcceptanceConfirmations] = useState({
    quantities: false,
    accessories: false,
    documentation: false,
    terms: false,
  });
  const [pendingDecision, setPendingDecision] = useState<{
    rfqId: string;
    newStatus: 'cancelled' | 'rejected';
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');

  const authority = getOperationalAuthority({ user, authLoading, profile });
  const isDemoUser = profile?.is_demo === true;

  useEffect(() => {
    if (!user || authLoading || !profile) return;
    if (profile.is_demo) {
      setNotifications(demoCustomerNotifications);
      setRentalRequests(demoCustomerRentalRequests);
      setLoading(false);
    } else {
      fetchNotifications();
      fetchRentalRequests();
    }
  }, [user, authLoading, profile]);

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
      toast({
        title: 'Unable to load dashboard notifications',
        description: 'Please refresh the page or try again.',
        variant: 'destructive',
      });
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
          ),
          vendor_quote_responses (
            id,
            status,
            daily_rate,
            delivery_fee,
            mobilization_fee,
            vendor_notes,
            compliance_confirmed,
            available_start_date
          )
        `)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRentalRequests(data || []);
    } catch (error) {
      console.error('Error fetching rental requests:', error);
      toast({
        title: 'Unable to load your dashboard',
        description: 'Please refresh the page or try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (rfqId: string, vqrId: string) => {
    if (!requireOperationalProfile({ user, authLoading, profile, toast })) {
      return;
    }
    setAcceptingVqrId(vqrId);
    try {
      const { error } = await supabase.functions.invoke('rfq-transition', {
        body: { rfq_id: rfqId, new_status: 'quote_accepted', vqr_id: vqrId },
      });
      if (error) throw error;
      toast({ title: 'Quote accepted', description: 'The vendor will be notified to confirm.' });
      await fetchRentalRequests();
    } catch (err: any) {
      toast({
        title: 'Accept failed',
        description: err?.message || 'Unable to accept quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAcceptingVqrId(null);
    }
  };

  const handleDecision = async () => {
    if (!pendingDecision) {
      return;
    }
    if (!requireOperationalProfile({ user, authLoading, profile, toast })) {
      return;
    }
    const reason = decisionReason.trim();
    if (!reason) {
      toast({
        title: 'Reason required',
        description: 'Record why this request is being cancelled or rejected.',
        variant: 'destructive',
      });
      return;
    }

    const isCancellation = pendingDecision.newStatus === 'cancelled';
    const setInFlightId = isCancellation ? setCancellingRfqId : setRejectingRfqId;
    setInFlightId(pendingDecision.rfqId);
    try {
      const { error } = await supabase.functions.invoke('rfq-transition', {
        body: {
          rfq_id: pendingDecision.rfqId,
          new_status: pendingDecision.newStatus,
          reason,
        },
      });
      if (error) throw error;
      toast({
        title: isCancellation ? 'RFQ cancelled' : 'Quote rejected',
        description: isCancellation
          ? 'The rental request has been cancelled with its reason recorded.'
          : 'The quote was rejected with its reason recorded.',
      });
      setPendingDecision(null);
      setDecisionReason('');
      await fetchRentalRequests();
    } catch (err: any) {
      toast({
        title: isCancellation ? 'Cancel failed' : 'Reject failed',
        description: err?.message || 'Unable to record this decision. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setInFlightId(null);
    }
  };

  const resetOffRentRequest = () => {
    setPendingOffRentRfqId(null);
    setRequestedStopAt('');
    setPickupAvailableFrom('');
    setPickupAvailableUntil('');
    setOffRentNotes('');
  };

  const handleRequestOffRent = async () => {
    if (!pendingOffRentRfqId) return;
    if (!requireOperationalProfile({ user, authLoading, profile, toast })) {
      return;
    }
    const requestedStop = Date.parse(requestedStopAt);
    const pickupFrom = Date.parse(pickupAvailableFrom);
    const pickupUntil = Date.parse(pickupAvailableUntil);
    if (![requestedStop, pickupFrom, pickupUntil].every(Number.isFinite)) {
      toast({
        title: 'Pickup timing required',
        description: 'Record the requested stop time and the complete pickup availability window.',
        variant: 'destructive',
      });
      return;
    }
    if (pickupFrom < requestedStop || pickupUntil <= pickupFrom) {
      toast({
        title: 'Pickup timing is invalid',
        description: 'Pickup availability must begin at or after the requested stop and end after it begins.',
        variant: 'destructive',
      });
      return;
    }

    setRequestingOffRentRfqId(pendingOffRentRfqId);
    try {
      const { error } = await supabase.functions.invoke('rfq-off-rent', {
        body: {
          action: 'request',
          rfq_id: pendingOffRentRfqId,
          requested_stop_at: new Date(requestedStop).toISOString(),
          pickup_available_from: new Date(pickupFrom).toISOString(),
          pickup_available_until: new Date(pickupUntil).toISOString(),
          notes: offRentNotes,
        },
      });
      if (error) throw error;
      toast({
        title: 'Off-rent requested',
        description: 'Your request was recorded. Billing stops only after the contractual stop-rent determination.',
      });
      resetOffRentRequest();
      await fetchRentalRequests();
      setOffRentRefreshVersion((version) => version + 1);
    } catch (err: any) {
      toast({
        title: 'Off-rent request failed',
        description: err?.message || 'Unable to request off-rent. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRequestingOffRentRfqId(null);
    }
  };

  const resetFieldAcceptance = () => {
    setPendingAcceptanceRfqId(null);
    setConditionNotes('');
    setEvidenceReferences('');
    setAcceptanceConfirmations({
      quantities: false,
      accessories: false,
      documentation: false,
      terms: false,
    });
  };

  const handleRecordFieldAcceptance = async () => {
    if (!pendingAcceptanceRfqId) return;
    if (!requireOperationalProfile({ user, authLoading, profile, toast })) return;

    const references = evidenceReferences
      .split('\n')
      .map((reference) => reference.trim())
      .filter(Boolean);
    if (conditionNotes.trim().length < 5 || references.length === 0) {
      toast({
        title: 'Delivery evidence required',
        description: 'Record the received condition and at least one photo, manifest, or delivery evidence reference.',
        variant: 'destructive',
      });
      return;
    }
    if (conditionNotes.trim().length > 4000 || references.length > 20 || references.some((reference) => reference.length > 500)) {
      toast({
        title: 'Delivery evidence is too large',
        description: 'Use at most 4,000 condition characters and 20 evidence references of 500 characters each.',
        variant: 'destructive',
      });
      return;
    }
    if (Object.values(acceptanceConfirmations).some((confirmed) => !confirmed)) {
      toast({
        title: 'Confirm every acceptance item',
        description: 'Quantity, accessories, documentation, and rental terms must all be acknowledged.',
        variant: 'destructive',
      });
      return;
    }

    setRecordingAcceptanceRfqId(pendingAcceptanceRfqId);
    try {
      const { error } = await supabase.functions.invoke('rfq-field-acceptance', {
        body: {
          rfq_id: pendingAcceptanceRfqId,
          condition_notes: conditionNotes.trim(),
          evidence_references: references,
          quantities_confirmed: acceptanceConfirmations.quantities,
          accessories_confirmed: acceptanceConfirmations.accessories,
          documentation_confirmed: acceptanceConfirmations.documentation,
          terms_acknowledged: acceptanceConfirmations.terms,
        },
      });
      if (error) throw error;
      toast({
        title: 'Field acceptance recorded',
        description: 'The evidence is recorded and the rental is now on rent.',
      });
      resetFieldAcceptance();
      await fetchRentalRequests();
    } catch (err: any) {
      toast({
        title: 'Field acceptance failed',
        description: err?.message || 'Unable to record delivery acceptance. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRecordingAcceptanceRfqId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'pending_vendor_review': return 'bg-yellow-100 text-yellow-800';
      case 'vendor_quote_received': return 'bg-teal-100 text-teal-800';
      case 'quote_accepted': return 'bg-green-100 text-green-800';
      case 'vendor_confirmed': return 'bg-green-100 text-green-800';
      case 'mobilizing': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'on_rent': return 'bg-blue-100 text-blue-800';
      case 'rental_extended': return 'bg-blue-100 text-blue-800';
      case 'off_rent_requested': return 'bg-yellow-100 text-yellow-800';
      case 'demobilizing': return 'bg-yellow-100 text-yellow-800';
      case 'off_rent': return 'bg-gray-100 text-gray-600';
      case 'completed': return 'bg-gray-100 text-gray-600';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'pending_vendor_review': return <Clock className="h-4 w-4" />;
      case 'vendor_quote_received': return <DollarSign className="h-4 w-4" />;
      case 'quote_accepted': return <CheckCircle className="h-4 w-4" />;
      case 'vendor_confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'mobilizing': return <Truck className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'on_rent': return <CheckCircle className="h-4 w-4" />;
      case 'rental_extended': return <Truck className="h-4 w-4" />;
      case 'off_rent_requested': return <Clock className="h-4 w-4" />;
      case 'demobilizing': return <Truck className="h-4 w-4" />;
      case 'off_rent': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
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
                <h3 className="font-semibold text-gray-900">Track Delivery</h3>
                <p className="text-sm text-gray-600">Track equipment deliveries</p>
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
                          <Badge className={getStatusColor(request.operational_status)}>
                            {getStatusIcon(request.operational_status)}
                            <span className="ml-1 capitalize">{request.operational_status?.replace(/_/g, ' ')}</span>
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
                            <p className="font-medium">{request.total_amount != null ? `$${request.total_amount.toLocaleString()}` : 'Quote pending'}</p>
                          </div>
                        </div>
                        
                        {request.delivery_address && (
                          <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>{request.delivery_address}</span>
                          </div>
                        )}
                        {['draft', 'submitted', 'pending_vendor_review'].includes(request.operational_status) &&
                          authority.canUseOperationalData && (
                            <div className="mt-4 flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPendingDecision({ rfqId: request.id, newStatus: 'cancelled' })}
                                disabled={cancellingRfqId === request.id}
                              >
                                {cancellingRfqId === request.id ? 'Cancelling...' : 'Cancel RFQ'}
                              </Button>
                            </div>
                          )}
                        {request.operational_status === 'on_rent' && authority.canUseOperationalData && (
                          <div className="mt-4 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPendingOffRentRfqId(request.id)}
                              disabled={requestingOffRentRfqId === request.id}
                            >
                              {requestingOffRentRfqId === request.id ? 'Requesting...' : 'Request Off-Rent'}
                            </Button>
                          </div>
                        )}
                        {['on_rent', 'off_rent_requested', 'demobilizing', 'off_rent'].includes(request.operational_status)
                          && authority.canUseOperationalData && (
                            <OffRentControlPanel
                              rfqId={request.id}
                              refreshKey={offRentRefreshVersion}
                            />
                          )}
                        {['demobilizing', 'off_rent'].includes(request.operational_status)
                          && authority.canUseOperationalData && (
                            <PickupTaskControlPanel rfqId={request.id} actorMode="customer" />
                          )}
                        {request.operational_status === 'in_transit' && authority.canUseOperationalData && (
                          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <p className="text-sm font-medium text-blue-900">Delivery awaiting field acceptance</p>
                            <p className="mt-1 text-xs text-blue-700">
                              Confirm condition, quantity, accessories, documents, and delivery evidence before the rental clock starts.
                            </p>
                            <div className="mt-3 flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => setPendingAcceptanceRfqId(request.id)}
                                disabled={recordingAcceptanceRfqId === request.id}
                              >
                                {recordingAcceptanceRfqId === request.id ? 'Recording...' : 'Record Field Acceptance'}
                              </Button>
                            </div>
                          </div>
                        )}
                        {request.operational_status === 'vendor_quote_received' && isDemoUser && request.vendor_name && (
                          <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                            <p className="text-sm font-semibold text-teal-900">
                              Quote received — {request.vendor_name}
                            </p>
                            {request.quote_notes && (
                              <p className="text-xs text-teal-700 mt-1">{request.quote_notes}</p>
                            )}
                          </div>
                        )}
                        {request.operational_status === 'vendor_quote_received' && authority.canUseOperationalData &&
                          (request.vendor_quote_responses || [])
                            .filter((v: any) => v.status === 'submitted' || v.status === 'revised')
                            .slice(0, 1)
                            .map((vqr: any) => (
                              <div key={vqr.id} className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-2">
                                <p className="text-sm font-semibold text-teal-900">Quote received</p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-teal-800">
                                  {vqr.daily_rate != null && (
                                    <div><span className="text-teal-600">Daily Rate: </span>${vqr.daily_rate.toFixed(2)}/day</div>
                                  )}
                                  {vqr.delivery_fee != null && (
                                    <div><span className="text-teal-600">Delivery Fee: </span>${vqr.delivery_fee.toFixed(2)}</div>
                                  )}
                                  {vqr.mobilization_fee != null && (
                                    <div><span className="text-teal-600">Mobilization: </span>${vqr.mobilization_fee.toFixed(2)}</div>
                                  )}
                                  {vqr.available_start_date && (
                                    <div><span className="text-teal-600">Available: </span>{new Date(vqr.available_start_date).toLocaleDateString()}</div>
                                  )}
                                  <div><span className="text-teal-600">Compliance: </span>{vqr.compliance_confirmed ? 'Confirmed' : 'Pending'}</div>
                                </div>
                                {vqr.vendor_notes && (
                                  <p className="text-xs text-teal-700 mt-1">{vqr.vendor_notes}</p>
                                )}
                                <div className="flex justify-end gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPendingDecision({ rfqId: request.id, newStatus: 'cancelled' })}
                                    disabled={cancellingRfqId === request.id || rejectingRfqId === request.id || acceptingVqrId === vqr.id}
                                  >
                                    {cancellingRfqId === request.id ? 'Cancelling...' : 'Cancel RFQ'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPendingDecision({ rfqId: request.id, newStatus: 'rejected' })}
                                    disabled={rejectingRfqId === request.id || cancellingRfqId === request.id || acceptingVqrId === vqr.id}
                                  >
                                    {rejectingRfqId === request.id ? 'Rejecting...' : 'Reject Quote'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAcceptQuote(request.id, vqr.id)}
                                    disabled={acceptingVqrId === vqr.id || rejectingRfqId === request.id || cancellingRfqId === request.id}
                                  >
                                    {acceptingVqrId === vqr.id ? 'Accepting...' : 'Accept Quote'}
                                  </Button>
                                </div>
                              </div>
                            ))
                        }
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
      <Dialog
        open={pendingDecision !== null}
        onOpenChange={(open) => {
          if (!open && !cancellingRfqId && !rejectingRfqId) {
            setPendingDecision(null);
            setDecisionReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDecision?.newStatus === 'cancelled' ? 'Cancel rental request' : 'Reject vendor quote'}
            </DialogTitle>
            <DialogDescription>
              This reason becomes part of the governed rental history.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={decisionReason}
            onChange={(event) => setDecisionReason(event.target.value)}
            placeholder="Enter the decision reason"
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingDecision(null);
                setDecisionReason('');
              }}
              disabled={Boolean(cancellingRfqId || rejectingRfqId)}
            >
              Keep Request
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecision}
              disabled={Boolean(cancellingRfqId || rejectingRfqId)}
            >
              {cancellingRfqId || rejectingRfqId ? 'Recording...' : 'Record Decision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={pendingOffRentRfqId !== null}
        onOpenChange={(open) => {
          if (!open && !requestingOffRentRfqId) resetOffRentRequest();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Request governed off-rent</DialogTitle>
            <DialogDescription>
              Record when use should stop and when the equipment is available for pickup. This request does not itself stop billing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium" htmlFor="requested-stop-at">Requested stop time</label>
              <Input
                id="requested-stop-at"
                type="datetime-local"
                value={requestedStopAt}
                onChange={(event) => setRequestedStopAt(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="pickup-available-from">Pickup available from</label>
                <Input
                  id="pickup-available-from"
                  type="datetime-local"
                  value={pickupAvailableFrom}
                  onChange={(event) => setPickupAvailableFrom(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="pickup-available-until">Pickup available until</label>
                <Input
                  id="pickup-available-until"
                  type="datetime-local"
                  value={pickupAvailableUntil}
                  onChange={(event) => setPickupAvailableUntil(event.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="off-rent-notes">Site and pickup notes</label>
              <Textarea
                id="off-rent-notes"
                value={offRentNotes}
                onChange={(event) => setOffRentNotes(event.target.value)}
                placeholder="Gate contact, access restrictions, decontamination status, or other pickup instructions"
                rows={4}
                maxLength={4000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetOffRentRequest} disabled={Boolean(requestingOffRentRfqId)}>
              Cancel
            </Button>
            <Button onClick={handleRequestOffRent} disabled={Boolean(requestingOffRentRfqId)}>
              {requestingOffRentRfqId ? 'Recording...' : 'Submit Off-Rent Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={pendingAcceptanceRfqId !== null}
        onOpenChange={(open) => {
          if (!open && !recordingAcceptanceRfqId) resetFieldAcceptance();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Record delivery field acceptance</DialogTitle>
            <DialogDescription>
              This evidence becomes part of the governed rental history and starts the on-rent clock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="condition-notes">Received condition</label>
              <Textarea
                id="condition-notes"
                value={conditionNotes}
                onChange={(event) => setConditionNotes(event.target.value)}
                placeholder="Describe equipment condition, damage observations, and setup status"
                rows={4}
                maxLength={4000}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="evidence-references">Delivery evidence references</label>
              <Textarea
                id="evidence-references"
                value={evidenceReferences}
                onChange={(event) => setEvidenceReferences(event.target.value)}
                placeholder="Enter one photo, manifest, or delivery evidence ID/URL per line"
                rows={3}
              />
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              {[
                ['quantities', 'Received quantity matches the accepted rental order'],
                ['accessories', 'Required accessories and attachments are present'],
                ['documentation', 'Delivery and operating documentation was received'],
                ['terms', 'Rental terms and the on-rent billing start are acknowledged'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={acceptanceConfirmations[key as keyof typeof acceptanceConfirmations]}
                    onCheckedChange={(checked) => setAcceptanceConfirmations((current) => ({
                      ...current,
                      [key]: checked === true,
                    }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetFieldAcceptance}
              disabled={Boolean(recordingAcceptanceRfqId)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordFieldAcceptance}
              disabled={Boolean(recordingAcceptanceRfqId)}
            >
              {recordingAcceptanceRfqId ? 'Recording...' : 'Accept Delivery and Start Rental'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDashboard;
