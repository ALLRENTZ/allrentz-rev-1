
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SmartDraftForm from './SmartDraftForm';
import SmartDraftPreview from './SmartDraftPreview';
import type { SmartDraftRequest } from '@/services/smartDraftService';

type WorkflowStep = 'form' | 'preview';

const SmartDraftWorkflow = () => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('form');
  const [draftData, setDraftData] = useState<SmartDraftRequest | null>(null);

  const handleFormSubmit = (data: SmartDraftRequest) => {
    setDraftData(data);
    setCurrentStep('preview');
  };

  const handleBackToForm = () => {
    setCurrentStep('form');
    setDraftData(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Quote Request Draft</span>
            <div className="flex space-x-2">
              <div className={`w-3 h-3 rounded-full ${currentStep === 'form' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`w-3 h-3 rounded-full ${currentStep === 'preview' ? 'bg-blue-600' : 'bg-gray-300'}`} />
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
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartDraftWorkflow;
