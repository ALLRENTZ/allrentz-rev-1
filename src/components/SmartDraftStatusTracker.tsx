
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, Send, AlertTriangle, DollarSign, MapPin, Calendar } from 'lucide-react';

interface SmartDraftStatusTrackerProps {
  draftId: string;
  onBack: () => void;
}

const SmartDraftStatusTracker = ({ draftId, onBack }: SmartDraftStatusTrackerProps) => {
  const { toast } = useToast();
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDraft();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('smart-draft-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'smart_draft_quotes',
          filter: `id=eq.${draftId}`
        },
        (payload) => {
          setDraft(payload.new);
          if (payload.new.status === 'vendor_confirmed') {
            toast({
              title: "Vendor Confirmed!",
              description: "Your quote has been confirmed by the vendor.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [draftId]);

  const fetchDraft = async () => {
    try {
      const { data, error } = await supabase
        .from('smart_draft_quotes')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error) throw error;
      setDraft(data);
    } catch (error) {
      console.error('Error fetching draft:', error);
      toast({
        title: "Error",
        description: "Failed to fetch draft status.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'sent_to_vendor':
        return <Send className="h-5 w-5 text-blue-500" />;
      case 'vendor_confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft Created';
      case 'sent_to_vendor':
        return 'Sent to Vendor';
      case 'vendor_confirmed':
        return 'Vendor Confirmed';
      case 'quote_finalized':
        return 'Quote Finalized';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent_to_vendor':
        return 'bg-blue-100 text-blue-800';
      case 'vendor_confirmed':
        return 'bg-green-100 text-green-800';
      case 'quote_finalized':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading draft status...</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Draft not found.</p>
        <Button onClick={onBack} className="mt-4">Back</Button>
      </div>
    );
  }

  const totalCost = draft.vendor_adjusted_rate 
    ? (draft.vendor_adjusted_rate * draft.duration_days) + (draft.estimated_delivery_fee || 0)
    : (draft.estimated_daily_rate * draft.duration_days) + (draft.estimated_delivery_fee || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Smart Draft Status</h2>
        <Badge className={getStatusColor(draft.status)}>
          {getStatusIcon(draft.status)}
          <span className="ml-2">{getStatusText(draft.status)}</span>
        </Badge>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold">Draft Created</p>
                <p className="text-sm text-gray-600">
                  {new Date(draft.created_at).toLocaleDateString()} at {new Date(draft.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {draft.status === 'sent_to_vendor' || draft.status === 'vendor_confirmed' || draft.status === 'quote_finalized' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="font-semibold">Sent to Vendor</p>
                {draft.status === 'sent_to_vendor' || draft.status === 'vendor_confirmed' || draft.status === 'quote_finalized' ? (
                  <p className="text-sm text-gray-600">Vendor has been notified</p>
                ) : (
                  <p className="text-sm text-gray-400">Pending</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {draft.status === 'vendor_confirmed' || draft.status === 'quote_finalized' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="font-semibold">Vendor Confirmation</p>
                {draft.status === 'vendor_confirmed' || draft.status === 'quote_finalized' ? (
                  <p className="text-sm text-gray-600">Vendor has confirmed the quote</p>
                ) : (
                  <p className="text-sm text-gray-400">Waiting for vendor response</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quote Details */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Vendor</p>
                  <p className="font-semibold">{draft.matched_vendor_name}</p>
                  <p className="text-sm text-gray-600">{draft.matched_vendor_location}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Rental Period</p>
                  <p className="font-semibold">
                    {new Date(draft.delivery_start_date).toLocaleDateString()} - {new Date(draft.delivery_end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">{draft.duration_days} days</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Daily Rate</p>
                  <p className="font-semibold">
                    ${draft.vendor_adjusted_rate || draft.estimated_daily_rate}/day
                    {draft.vendor_adjusted_rate && (
                      <span className="text-sm text-green-600 ml-2">(Vendor Confirmed)</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Total Estimated Cost</p>
                <p className="font-bold text-xl text-green-600">${totalCost.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Notes */}
      {draft.vendor_notes && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{draft.vendor_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Site Requirements */}
      {draft.site_requirements && draft.site_requirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Site Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {draft.site_requirements.map((req: string, index: number) => (
                <Badge key={index} variant="secondary">{req}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        {draft.status === 'vendor_confirmed' && (
          <Button>
            Proceed to Booking
          </Button>
        )}
      </div>
    </div>
  );
};

export default SmartDraftStatusTracker;
