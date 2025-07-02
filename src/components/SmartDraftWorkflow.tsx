
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SmartDraftForm from './SmartDraftForm';
import SmartDraftPreview from './SmartDraftPreview';
import SmartDraftStatusTracker from './SmartDraftStatusTracker';

type WorkflowStep = 'form' | 'preview' | 'status';

interface SmartDraftData {
  equipmentType: string;
  jobType: string;
  deliveryZipCode: string;
  deliveryStartDate: string;
  deliveryEndDate: string;
  durationDays: number;
  siteRequirements: string[];
  specialInstructions: string;
}

const SmartDraftWorkflow = () => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('form');
  const [draftData, setDraftData] = useState<SmartDraftData | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const handleFormSubmit = (data: SmartDraftData) => {
    setDraftData(data);
    setCurrentStep('preview');
  };

  const handleDraftCreated = (id: string) => {
    setDraftId(id);
    setCurrentStep('status');
  };

  const handleBackToForm = () => {
    setCurrentStep('form');
    setDraftData(null);
  };

  const handleBackToPreview = () => {
    setCurrentStep('preview');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Smart Draft Quote Generator</span>
            <div className="flex space-x-2">
              <div className={`w-3 h-3 rounded-full ${currentStep === 'form' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`w-3 h-3 rounded-full ${currentStep === 'preview' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`w-3 h-3 rounded-full ${currentStep === 'status' ? 'bg-blue-600' : 'bg-gray-300'}`} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 'form' && (
            <SmartDraftForm onSubmit={handleFormSubmit} />
          )}
          
          {currentStep === 'preview' && draftData && (
            <SmartDraftPreview 
              draftData={draftData}
              onBack={handleBackToForm}
              onDraftCreated={handleDraftCreated}
            />
          )}
          
          {currentStep === 'status' && draftId && (
            <SmartDraftStatusTracker 
              draftId={draftId}
              onBack={handleBackToPreview}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartDraftWorkflow;
