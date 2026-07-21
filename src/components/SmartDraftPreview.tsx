
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateSmartDraft } from '@/services/smartDraftService';
import { MapPin, DollarSign, Clock, AlertTriangle, Edit2, Send } from 'lucide-react';

interface SmartDraftPreviewProps {
  draftData: any;
  onBack: () => void;
  onDraftCreated: (id: string) => void;
}

const SmartDraftPreview = ({ draftData, onBack, onDraftCreated }: SmartDraftPreviewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableRates, setEditableRates] = useState({
    dailyRate: 0,
    deliveryFee: 0,
    vendorNotes: ''
  });

  React.useEffect(() => {
    generateDraft();
  }, []);

  const generateDraft = async () => {
    setIsGenerating(true);
    try {
      const draft = await generateSmartDraft(draftData);
      setGeneratedDraft(draft);
      setEditableRates({
        dailyRate: draft.estimatedDailyRate,
        deliveryFee: draft.estimatedDeliveryFee,
        vendorNotes: ''
      });
    } catch (error) {
      console.error('Error generating draft:', error);
      toast({
        title: "Error",
        description: "Failed to generate smart draft. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToVendor = async () => {
    if (!generatedDraft || !user) return;

    try {
      const { data, error } = await supabase
        .from('smart_draft_quotes')
        .insert({
          customer_id: user.id,
          equipment_type: draftData.equipmentType,
          job_type: draftData.jobType,
          delivery_zip_code: draftData.deliveryZipCode,
          delivery_start_date: draftData.deliveryStartDate,
          delivery_end_date: draftData.deliveryEndDate,
          duration_days: draftData.durationDays,
          site_requirements: draftData.siteRequirements,
          special_instructions: draftData.specialInstructions,
          matched_vendor_id: null,
          matched_vendor_name: generatedDraft.matchedVendorName,
          matched_vendor_location: generatedDraft.matchedVendorLocation,
          estimated_daily_rate: editableRates.dailyRate,
          estimated_delivery_fee: editableRates.deliveryFee,
          compliance_notes: generatedDraft.complianceNotes,
          status: 'sent_to_vendor'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Smart draft sent to vendor for confirmation!",
      });

      onDraftCreated(data.id);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to send draft to vendor. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isGenerating) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold mb-2">Generating Smart Draft...</h3>
        <p className="text-gray-600">AI is analyzing your requirements and matching vendors</p>
      </div>
    );
  }

  if (!generatedDraft) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to generate draft. Please try again.</p>
        <Button onClick={onBack} className="mt-4">Back to Form</Button>
      </div>
    );
  }

  const totalCost = (editableRates.dailyRate * draftData.durationDays) + editableRates.deliveryFee;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Smart Draft Preview</h2>
        <Badge variant="outline" className="text-orange-600 border-orange-600">
          Draft - Vendor Confirmation Required
        </Badge>
      </div>

      {/* Matched Vendor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Matched Vendor</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Vendor Name</p>
              <p className="font-semibold">{generatedDraft.matchedVendorName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-semibold">{generatedDraft.matchedVendorLocation}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Response Time</p>
              <p className="font-semibold flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {generatedDraft.responseTime}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Equipment Type</p>
              <p className="font-semibold">{draftData.equipmentType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Job Type</p>
              <p className="font-semibold">{draftData.jobType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rental Duration</p>
              <p className="font-semibold">{draftData.durationDays} days</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Delivery Location</p>
              <p className="font-semibold">{draftData.deliveryZipCode}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Estimated Pricing</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dailyRate">Daily Rate</Label>
              {isEditing ? (
                <Input
                  id="dailyRate"
                  type="number"
                  value={editableRates.dailyRate}
                  onChange={(e) => setEditableRates(prev => ({ ...prev, dailyRate: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              ) : (
                <p className="font-semibold text-lg">${editableRates.dailyRate}/day</p>
              )}
            </div>
            <div>
              <Label htmlFor="deliveryFee">Delivery Fee</Label>
              {isEditing ? (
                <Input
                  id="deliveryFee"
                  type="number"
                  value={editableRates.deliveryFee}
                  onChange={(e) => setEditableRates(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              ) : (
                <p className="font-semibold text-lg">${editableRates.deliveryFee}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Estimated Cost</p>
              <p className="font-bold text-xl text-green-600">${totalCost.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Notes */}
      {generatedDraft.complianceNotes && generatedDraft.complianceNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Compliance Requirements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {generatedDraft.complianceNotes.map((note: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">{note}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Site Requirements */}
      {draftData.siteRequirements && draftData.siteRequirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Site Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {draftData.siteRequirements.map((req: string, index: number) => (
                <Badge key={index} variant="secondary">{req}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Special Instructions */}
      {draftData.specialInstructions && (
        <Card>
          <CardHeader>
            <CardTitle>Special Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{draftData.specialInstructions}</p>
          </CardContent>
        </Card>
      )}

      {/* Additional Notes */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add any additional notes for the vendor..."
              value={editableRates.vendorNotes}
              onChange={(e) => setEditableRates(prev => ({ ...prev, vendorNotes: e.target.value }))}
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Form
        </Button>
        <Button onClick={handleSendToVendor} className="flex items-center space-x-2">
          <Send className="h-4 w-4" />
          <span>Send to Vendor for Confirmation</span>
        </Button>
      </div>
    </div>
  );
};

export default SmartDraftPreview;
