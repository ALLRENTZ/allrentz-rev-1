import React from 'react';
import { AlertTriangle, Calendar, FileText, MapPin, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildSmartDraft, type SmartDraftRequest } from '@/services/smartDraftService';

interface SmartDraftPreviewProps {
  draftData: SmartDraftRequest;
  onBack: () => void;
}

const SmartDraftPreview: React.FC<SmartDraftPreviewProps> = ({ draftData, onBack }) => {
  const draft = buildSmartDraft(draftData);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Quote Request Draft</h2>
        <Badge variant="outline" className="border-blue-600 text-blue-700">
          Customer input only
        </Badge>
      </div>

      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Request draft only — not sent</p>
            <p className="mt-1 text-sm">
              ALLRENTZ has not selected or contacted a vendor. Availability, pricing, delivery fees,
              response times, and other commercial terms remain unknown until a vendor provides them
              through an authorized workflow.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recorded Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <Wrench className="mt-0.5 h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Equipment Type</p>
                <p className="font-semibold">{draft.request.equipmentType}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Job Type</p>
                <p className="font-semibold">{draft.request.jobType}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Delivery ZIP Code</p>
                <p className="font-semibold">{draft.request.deliveryZipCode}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Requested Rental Period</p>
                <p className="font-semibold">
                  {draft.request.deliveryStartDate} to {draft.request.deliveryEndDate}
                </p>
                <p className="text-sm text-gray-600">{draft.request.durationDays} days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commercial and Routing Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <p className="text-gray-500">Vendor</p>
              <p className="font-semibold">Not selected</p>
            </div>
            <div>
              <p className="text-gray-500">Vendor Contact</p>
              <p className="font-semibold">Not contacted</p>
            </div>
            <div>
              <p className="text-gray-500">Availability</p>
              <p className="font-semibold">Not confirmed</p>
            </div>
            <div>
              <p className="text-gray-500">Pricing and Delivery Terms</p>
              <p className="font-semibold">Not provided</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {draft.request.siteRequirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Customer-Entered Site Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {draft.request.siteRequirements.map((requirement) => (
                <Badge key={requirement} variant="secondary">
                  {requirement}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {draft.request.specialInstructions && (
        <Card>
          <CardHeader>
            <CardTitle>Customer-Entered Special Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{draft.request.specialInstructions}</p>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={onBack}>
        Back to Edit
      </Button>
    </div>
  );
};

export default SmartDraftPreview;
