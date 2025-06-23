
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Filter } from 'lucide-react';

interface SmartFilteringSystemProps {
  onFiltersChange: (filters: any) => void;
}

const SmartFilteringSystem: React.FC<SmartFilteringSystemProps> = ({ onFiltersChange }) => {
  const [selectedApplication, setSelectedApplication] = useState('');
  const [requirementFilters, setRequirementFilters] = useState({
    visualVerified: false,
    specConfirmed: false,
    highQualityVendor: false,
    preDispatchConfirmation: false
  });

  const applications = [
    {
      id: 'vacuum-dewatering',
      name: 'Vacuum Dewatering',
      requirements: ['Hard-cage required', 'Vacuum-rated', 'DOT transport certified'],
      incompatible: ['Soft-top containers', 'Non-vacuum units']
    },
    {
      id: 'uhp-robotics',
      name: 'UHP Robotics Support',
      requirements: ['Debris containment', 'High-pressure rated', 'Liner compatibility'],
      incompatible: ['Standard cleaning boxes', 'Low-pressure units']
    },
    {
      id: 'tank-cleaning',
      name: 'Tank Terminal Cleaning',
      requirements: ['Chemical resistant', 'Large capacity', 'Multi-compartment'],
      incompatible: ['Small containers', 'Single-use units']
    }
  ];

  const handleApplicationChange = (applicationId: string) => {
    setSelectedApplication(applicationId);
    const application = applications.find(app => app.id === applicationId);
    
    // Auto-enable safety filters for specialized applications
    if (application) {
      setRequirementFilters({
        ...requirementFilters,
        visualVerified: true,
        specConfirmed: true,
        preDispatchConfirmation: true
      });
    }
    
    onFiltersChange({
      application: applicationId,
      requirements: requirementFilters
    });
  };

  const selectedApp = applications.find(app => app.id === selectedApplication);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-allrentz-gray mb-3 flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Smart Equipment Matching</span>
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's your application?
            </label>
            <select
              value={selectedApplication}
              onChange={(e) => handleApplicationChange(e.target.value)}
              className="industrial-input w-full"
            >
              <option value="">Select application type...</option>
              {applications.map(app => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
          </div>

          {selectedApp && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-green-800 mb-2 flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>Required Features</span>
                  </h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {selectedApp.requirements.map((req, index) => (
                      <li key={index}>• {req}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-red-800 mb-2 flex items-center space-x-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Will Block</span>
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {selectedApp.incompatible.map((incomp, index) => (
                      <li key={index}>• {incomp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-allrentz-gray mb-3">Anti-Failure Requirements</h4>
        <div className="space-y-2">
          {Object.entries({
            visualVerified: 'Visual verification required',
            specConfirmed: 'Spec confirmation required',
            highQualityVendor: 'High-quality vendors only (85%+)',
            preDispatchConfirmation: 'Pre-dispatch confirmation required'
          }).map(([key, label]) => (
            <label key={key} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={requirementFilters[key as keyof typeof requirementFilters]}
                onChange={(e) => {
                  const newFilters = {
                    ...requirementFilters,
                    [key]: e.target.checked
                  };
                  setRequirementFilters(newFilters);
                  onFiltersChange({
                    application: selectedApplication,
                    requirements: newFilters
                  });
                }}
                className="rounded border-gray-300 text-allrentz-red focus:ring-allrentz-red"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SmartFilteringSystem;
